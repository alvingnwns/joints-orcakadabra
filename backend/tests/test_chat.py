import json
from datetime import date, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.llm import LLMClient, LLMInvalidOutput, LLMUnavailable, get_llm
from app.services.prompts import OFF_TOPIC_REDIRECT
from tests.test_parse import completion, settings
from tests.test_tasks_crud import new_task, new_workspace

TODAY = date(2026, 10, 14)  # a Wednesday


class FakeChatLLM:
    """Stands in for LLMClient.complete_text and records the messages it was given."""

    def __init__(self, result="Start with the report."):
        self.result = result
        self.messages = None

    def complete_text(self, *, messages, max_tokens=400):
        self.messages = messages
        if isinstance(self.result, Exception):
            raise self.result
        return self.result

    @property
    def schedule(self) -> dict:
        user = self.messages[1]["content"]
        return json.loads(user.split("<schedule>\n")[1].split("\n</schedule>")[0])


@pytest.fixture
def fake_chat():
    def install(result="Start with the report.") -> FakeChatLLM:
        fake = FakeChatLLM(result)
        app.dependency_overrides[get_llm] = lambda: fake
        return fake

    yield install
    app.dependency_overrides.pop(get_llm, None)


def ask(client: TestClient, headers: dict, question="What should I do first?", **extra):
    body = {"question": question, "today": TODAY.isoformat(), "locale": "en", **extra}
    return client.post("/chat/query", json=body, headers=headers)


def in_days(n: int) -> str:
    return (TODAY + timedelta(days=n)).isoformat()


# --- context ---


def test_schedule_context_holds_only_this_workspaces_data(client: TestClient, fake_chat):
    fake = fake_chat()
    mine, theirs = new_workspace(client), new_workspace(client)
    new_task(client, mine, title="Write report", due_date=in_days(0), impact_score=5)
    new_task(client, mine, title="Buy milk")
    later = new_task(client, mine, title="Sort photos")
    client.patch(f"/tasks/{later['id']}", json={"status": "deferred"}, headers=mine)
    new_task(client, theirs, title="Their secret plan", due_date=in_days(0))

    response = ask(client, mine)

    assert response.status_code == 200
    assert response.json() == {"answer": "Start with the report."}
    assert "Their secret plan" not in json.dumps(fake.messages)
    context = fake.schedule
    assert [task["title"] for task in context["today"]["start_here"]] == [
        "Write report",
        "Buy milk",
    ]
    assert context["today"]["start_here"][0]["reasons"][0] == "it is due today"
    assert context["week"][0]["date"] == "Wednesday 2026-10-14"
    assert context["week"][0]["tasks"] == ["Write report"]
    assert context["no_date_yet"] == ["Buy milk"]
    assert context["saved_for_later"] == ["Sort photos"]
    assert context["daily_capacity_minutes"] == 240


def test_heavy_day_and_suggestion_are_in_the_context(client: TestClient, fake_chat):
    fake = fake_chat()
    headers = new_workspace(client)
    new_task(client, headers, title="Big", due_date=in_days(0), estimated_minutes=250)
    new_task(client, headers, title="Old one", due_date=in_days(-1), impact_score=1)

    ask(client, headers, question="What can wait?")

    today = fake.schedule["today"]
    assert today["heavy_load"] == {"reason": "over_capacity", "planned_minutes": 280}
    assert today["could_wait"] == "Old one"


def test_task_context_explains_one_task_and_its_rank(client: TestClient, fake_chat):
    fake = fake_chat()
    headers = new_workspace(client)
    new_task(client, headers, title="Urgent", due_date=in_days(0), impact_score=5)
    task = new_task(client, headers, title="Report", due_date=in_days(1))

    ask(client, headers, question="Why is this here?", task_id=task["id"])

    context = fake.schedule
    assert context["task"]["title"] == "Report"
    assert context["task"]["reasons"] == [
        "it is due tomorrow",
        "you marked it as something that matters",
    ]
    assert context["rank"] == 2
    assert context["active_task_count"] == 2
    assert "week" not in context  # only that task, not the whole schedule


def test_task_context_for_a_task_saved_for_later_has_no_rank(client: TestClient, fake_chat):
    fake = fake_chat()
    headers = new_workspace(client)
    task = new_task(client, headers, title="Someday")
    client.patch(f"/tasks/{task['id']}", json={"status": "deferred"}, headers=headers)

    ask(client, headers, task_id=task["id"])

    assert fake.schedule["rank"] is None
    assert fake.schedule["task"]["status"] == "deferred"


def test_another_workspaces_task_is_not_found(client: TestClient, fake_chat):
    fake = fake_chat()
    mine, theirs = new_workspace(client), new_workspace(client)
    their_task = new_task(client, theirs, title="Theirs")

    response = ask(client, mine, task_id=their_task["id"])

    assert response.status_code == 404
    assert fake.messages is None  # the LLM is never called


# --- prompt ---


def test_prompt_has_the_rules_the_date_and_the_language(client: TestClient, fake_chat):
    fake = fake_chat()

    ask(client, new_workspace(client), question="Apa yang harus kulakukan dulu?", locale="id")

    system, user = fake.messages
    assert OFF_TOPIC_REDIRECT in system["content"]  # off-topic questions are redirected
    assert "Answer only from the provided schedule" in system["content"]
    assert "Never change or contradict" in system["content"]
    assert "Reply in Indonesian" in system["content"]
    assert "Today is Wednesday 2026-10-14" in system["content"]
    assert "<question>\nApa yang harus kulakukan dulu?\n</question>" in user["content"]


def test_off_topic_question_still_gets_the_redirect_rule(client: TestClient, fake_chat):
    fake = fake_chat("I can only help with your schedule. Try: what can wait?")

    response = ask(client, new_workspace(client), question="Write me a poem about cats")

    assert response.json()["answer"].startswith("I can only help")
    assert OFF_TOPIC_REDIRECT in fake.messages[0]["content"]


# --- errors and validation ---


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (LLMUnavailable("timeout"), "ai_unavailable"),
        (LLMInvalidOutput("bad"), "ai_invalid_output"),
        ("", "ai_invalid_output"),  # an empty answer
    ],
)
def test_llm_errors_are_friendly_502s(client: TestClient, fake_chat, error, detail):
    fake_chat(error)

    response = ask(client, new_workspace(client))

    assert response.status_code == 502
    assert response.json() == {"detail": detail}


@pytest.mark.parametrize("question", ["   ", "x" * 501])
def test_question_must_be_1_to_500_characters(client: TestClient, fake_chat, question):
    fake = fake_chat()

    assert ask(client, new_workspace(client), question=question).status_code == 422
    assert fake.messages is None


def test_chat_needs_a_workspace(client: TestClient, fake_chat):
    fake_chat()

    assert ask(client, {}).status_code == 422


# --- LLM client: chat request ---


def test_complete_text_uses_the_chat_model_with_a_fallback_and_plain_text():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = json.loads(request.content)
        return completion("  Start with the report.  ")

    llm = LLMClient(settings(llm_chat_model="chat/model"), transport=httpx.MockTransport(handler))

    assert llm.complete_text(messages=[{"role": "user", "content": "hi"}]) == (
        "Start with the report."
    )
    body = seen["body"]
    assert body["models"] == ["chat/model", "test/model"]  # chat first, parsing model as fallback
    assert "response_format" not in body
    assert body["max_tokens"] == 400
    assert body["reasoning"] == {"enabled": False}
