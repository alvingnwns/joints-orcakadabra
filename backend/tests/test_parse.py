import json
import logging
from datetime import date

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app
from app.services.llm import LLMClient, LLMInvalidOutput, LLMUnavailable, get_llm
from tests.test_tasks_crud import new_task, new_workspace

TODAY = date(2026, 10, 14)  # a Wednesday
SECRET_KEY = "sk-or-test-secret"
USER_TEXT = "call mum tomorrow, finish the 2 hour report by friday"


def settings(**overrides) -> Settings:
    values = {"llm_api_key": SECRET_KEY, "llm_model": "test/model", **overrides}
    return Settings(_env_file=None, **values)


def completion(content: str) -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})


def draft(**fields) -> dict:
    return {
        "title": "Call mum",
        "due_date": None,
        "estimated_minutes": None,
        "needs_confirmation": False,
        "note": None,
        **fields,
    }


class FakeLLM:
    """Stands in for LLMClient: returns `result` or raises it, and records the prompt."""

    def __init__(self, result):
        self.result = result
        self.messages = None

    def complete_json(self, *, messages, schema_name, schema):
        self.messages = messages
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


@pytest.fixture
def fake_llm():
    def install(result) -> FakeLLM:
        fake = FakeLLM(result)
        app.dependency_overrides[get_llm] = lambda: fake
        return fake

    yield install
    app.dependency_overrides.pop(get_llm, None)


def parse(client: TestClient, headers: dict, text: str = USER_TEXT, locale: str = "en"):
    return client.post(
        "/tasks/parse",
        json={"text": text, "today": TODAY.isoformat(), "locale": locale},
        headers=headers,
    )


# --- LLM client (real class, fake HTTP) ---


def client_with(handler) -> LLMClient:
    return LLMClient(settings(), transport=httpx.MockTransport(handler))


def test_client_sends_a_strict_schema_request_and_parses_json():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers["Authorization"]
        seen["body"] = json.loads(request.content)
        return completion('{"drafts": []}')

    result = client_with(handler).complete_json(
        messages=[{"role": "user", "content": "hi"}], schema_name="x", schema={"type": "object"}
    )

    assert result == {"drafts": []}
    assert seen["auth"] == f"Bearer {SECRET_KEY}"
    body = seen["body"]
    assert body["model"] == "test/model"
    assert body["response_format"]["type"] == "json_schema"
    assert body["response_format"]["json_schema"]["strict"] is True
    assert body["provider"] == {"require_parameters": True}
    assert body["reasoning"] == {"enabled": False}


def test_client_rejects_malformed_json():
    llm = client_with(lambda request: completion("Sure! Here are your tasks: ..."))

    with pytest.raises(LLMInvalidOutput):
        llm.complete_json(messages=[], schema_name="x", schema={})


def test_client_maps_error_status_to_unavailable():
    llm = client_with(lambda request: httpx.Response(429, json={"error": "rate limited"}))

    with pytest.raises(LLMUnavailable):
        llm.complete_json(messages=[], schema_name="x", schema={})


def test_client_retries_once_after_a_timeout():
    calls = []

    def handler(request):
        calls.append(request)
        if len(calls) == 1:
            raise httpx.ReadTimeout("slow", request=request)
        return completion('{"drafts": []}')

    assert client_with(handler).complete_json(messages=[], schema_name="x", schema={}) == {
        "drafts": []
    }
    assert len(calls) == 2


def test_client_gives_up_after_the_retry():
    calls = []

    def handler(request):
        calls.append(request)
        raise httpx.ConnectError("down", request=request)

    with pytest.raises(LLMUnavailable):
        client_with(handler).complete_json(messages=[], schema_name="x", schema={})
    assert len(calls) == 2


def test_client_without_a_key_makes_no_request():
    def handler(request):
        raise AssertionError("must not be called")

    llm = LLMClient(settings(llm_api_key=""), transport=httpx.MockTransport(handler))

    with pytest.raises(LLMUnavailable):
        llm.complete_json(messages=[], schema_name="x", schema={})


def test_client_never_logs_the_key_or_the_text(caplog, monkeypatch):
    def handler(request):
        raise httpx.ConnectError("down", request=request)

    # Alembic's fileConfig (run by the DB fixture) disables existing loggers in this process.
    monkeypatch.setattr(logging.getLogger("app.services.llm"), "disabled", False)
    with caplog.at_level(logging.DEBUG), pytest.raises(LLMUnavailable):
        client_with(handler).complete_json(
            messages=[{"role": "user", "content": USER_TEXT}], schema_name="x", schema={}
        )

    assert caplog.records  # the failure is logged...
    assert SECRET_KEY not in caplog.text  # ...without secrets or user text
    assert USER_TEXT not in caplog.text


# --- POST /tasks/parse ---


def test_parse_returns_validated_drafts_and_saves_nothing(client: TestClient, fake_llm):
    fake_llm(
        {
            "drafts": [
                draft(title="  Call mum ", due_date="2026-10-15"),
                draft(
                    title="Finish the report",
                    due_date="2026-10-16",
                    estimated_minutes=120,
                    needs_confirmation=True,
                    note="Is Friday right?",
                ),
            ]
        }
    )
    headers = new_workspace(client)

    response = parse(client, headers)

    assert response.status_code == 200
    assert response.json() == {
        "drafts": [
            draft(due_date="2026-10-15"),
            draft(
                title="Finish the report",
                due_date="2026-10-16",
                estimated_minutes=120,
                needs_confirmation=True,
                note="Is Friday right?",
            ),
        ]
    }
    assert client.get("/tasks", headers=headers).json() == []


def test_prompt_includes_today_the_week_ahead_and_the_locale(client: TestClient, fake_llm):
    fake = fake_llm({"drafts": [draft()]})

    parse(client, new_workspace(client), locale="id")

    system, user = fake.messages
    assert "Today is Wednesday 2026-10-14" in system["content"]
    assert "Friday 2026-10-16" in system["content"]
    assert "Indonesian" in system["content"]
    assert USER_TEXT in user["content"]  # the notes go in the user message, as data


def test_parse_fixes_small_problems_instead_of_failing(client: TestClient, fake_llm):
    fake_llm(
        {
            "drafts": [
                draft(title="Quick one", estimated_minutes=1),
                draft(title="Huge one", estimated_minutes=5000),
                draft(title="Misread date", due_date="2026-10-12"),
            ]
        }
    )

    drafts = parse(client, new_workspace(client)).json()["drafts"]

    assert [item["estimated_minutes"] for item in drafts[:2]] == [5, 720]
    assert drafts[2]["needs_confirmation"] is True  # a past date is flagged for the user


@pytest.mark.parametrize(
    "bad_output",
    [
        {"tasks": []},  # wrong key
        {"drafts": [{"title": ""}]},  # empty title
        {"drafts": [draft(due_date="next friday")]},  # not a date
        ["not", "an", "object"],
    ],
)
def test_schema_violation_is_a_friendly_502(client: TestClient, fake_llm, bad_output):
    fake_llm(bad_output)

    response = parse(client, new_workspace(client))

    assert response.status_code == 502
    assert response.json() == {"detail": "ai_invalid_output"}


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (LLMUnavailable("timeout"), "ai_unavailable"),
        (LLMInvalidOutput("malformed JSON"), "ai_invalid_output"),
    ],
)
def test_llm_errors_are_friendly_502s(client: TestClient, fake_llm, error, detail):
    fake_llm(error)

    response = parse(client, new_workspace(client))

    assert response.status_code == 502
    assert response.json() == {"detail": detail}


def test_no_tasks_found_is_a_422(client: TestClient, fake_llm):
    fake_llm({"drafts": []})

    response = parse(client, new_workspace(client), text="just thinking out loud")

    assert response.status_code == 422
    assert response.json() == {"detail": "no_tasks_found"}


@pytest.mark.parametrize("text", ["   ", "x" * 5001])
def test_text_must_be_1_to_5000_characters(client: TestClient, fake_llm, text):
    fake = fake_llm({"drafts": [draft()]})

    assert parse(client, new_workspace(client), text=text).status_code == 422
    assert fake.messages is None  # the LLM is never called


def test_parse_needs_a_workspace(client: TestClient, fake_llm):
    fake_llm({"drafts": [draft()]})

    assert parse(client, {}).status_code == 422


# --- POST /tasks/bulk ---


def test_bulk_saves_all_drafts_as_ai_parsed_and_scored(client: TestClient):
    headers = new_workspace(client)
    body = {
        "tasks": [
            {"title": "Call mum", "due_date": date.today().isoformat()},
            {"title": "Finish the report", "estimated_minutes": 120, "impact_score": 5},
        ]
    }

    response = client.post("/tasks/bulk", json=body, headers=headers)

    assert response.status_code == 201
    saved = response.json()
    assert [task["title"] for task in saved] == ["Call mum", "Finish the report"]
    assert {task["source_type"] for task in saved} == {"ai_parsed"}
    assert saved[0]["priority_score"] == 8  # due today, matters
    assert len(client.get("/tasks", headers=headers).json()) == 2


def test_bulk_with_one_invalid_item_saves_nothing(client: TestClient):
    headers = new_workspace(client)
    new_task(client, headers, title="Already here")
    body = {"tasks": [{"title": "Fine"}, {"title": "Too long", "estimated_minutes": 9999}]}

    response = client.post("/tasks/bulk", json=body, headers=headers)

    assert response.status_code == 422
    assert [task["title"] for task in client.get("/tasks", headers=headers).json()] == [
        "Already here"
    ]


def test_bulk_rejects_an_empty_list(client: TestClient):
    response = client.post("/tasks/bulk", json={"tasks": []}, headers=new_workspace(client))

    assert response.status_code == 422


def test_bulk_tasks_belong_to_the_callers_workspace(client: TestClient):
    mine, theirs = new_workspace(client), new_workspace(client)

    client.post("/tasks/bulk", json={"tasks": [{"title": "Mine"}]}, headers=mine)

    assert client.get("/tasks", headers=theirs).json() == []
