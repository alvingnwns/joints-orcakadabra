"""The person's own daily capacity (Settings): stored on the workspace, used by the schedule."""

import json
import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.config import DAILY_CAPACITY_MINUTES
from app.main import app
from app.models import Task, TaskStatus
from app.services.llm import get_llm
from app.services.schedule import build_today, build_week
from tests.test_tasks_crud import new_task, new_workspace

TODAY = date(2026, 10, 14)


def make_task(*, due, minutes) -> Task:
    return Task(
        id=uuid.uuid4(),
        title="Task",
        due_date=due,
        estimated_minutes=minutes,
        impact_score=3,
        status=TaskStatus.TODO,
        created_at=datetime(2026, 10, 1, tzinfo=UTC) + timedelta(seconds=minutes),
    )


def set_capacity(client: TestClient, headers: dict, minutes: int):
    return client.patch(
        f"/workspaces/{headers['X-Workspace-Id']}", json={"daily_capacity_minutes": minutes}
    )


# --- the setting itself ---


def test_a_new_workspace_starts_with_the_default_capacity(client: TestClient):
    created = client.post("/workspaces").json()

    assert created["daily_capacity_minutes"] == DAILY_CAPACITY_MINUTES == 240
    read = client.get(f"/workspaces/{created['id']}").json()
    assert read["daily_capacity_minutes"] == 240


def test_capacity_can_be_changed_and_is_remembered(client: TestClient):
    headers = new_workspace(client)

    response = set_capacity(client, headers, 360)

    assert response.status_code == 200
    assert response.json()["daily_capacity_minutes"] == 360
    assert (
        client.get(f"/workspaces/{headers['X-Workspace-Id']}").json()["daily_capacity_minutes"]
        == 360
    )


@pytest.mark.parametrize("minutes", [30, 45, 240, 720])
def test_every_allowed_value_is_accepted(client: TestClient, minutes: int):
    assert set_capacity(client, new_workspace(client), minutes).status_code == 200


@pytest.mark.parametrize("minutes", [0, 15, 29, 31, 100, 725, 735, 1000, -30])
def test_values_outside_30_to_720_in_steps_of_15_are_rejected(client: TestClient, minutes: int):
    headers = new_workspace(client)

    assert set_capacity(client, headers, minutes).status_code == 422
    assert (
        client.get(f"/workspaces/{headers['X-Workspace-Id']}").json()["daily_capacity_minutes"]
        == 240
    )  # unchanged


def test_capacity_cannot_be_cleared_or_sent_as_text(client: TestClient):
    headers = new_workspace(client)
    url = f"/workspaces/{headers['X-Workspace-Id']}"

    assert client.patch(url, json={"daily_capacity_minutes": None}).status_code == 422
    assert client.patch(url, json={"daily_capacity_minutes": "lots"}).status_code == 422


def test_an_empty_update_changes_nothing(client: TestClient):
    headers = new_workspace(client)
    set_capacity(client, headers, 300)

    response = client.patch(f"/workspaces/{headers['X-Workspace-Id']}", json={})

    assert response.status_code == 200
    assert response.json()["daily_capacity_minutes"] == 300


def test_updating_an_unknown_workspace_is_404(client: TestClient):
    response = client.patch(f"/workspaces/{uuid.uuid4()}", json={"daily_capacity_minutes": 300})

    assert response.status_code == 404


def test_one_workspace_cannot_change_anothers_capacity(client: TestClient):
    mine, theirs = new_workspace(client), new_workspace(client)

    set_capacity(client, mine, 600)

    assert (
        client.get(f"/workspaces/{theirs['X-Workspace-Id']}").json()["daily_capacity_minutes"]
        == 240
    )


# --- the schedule uses it ---


def test_the_same_day_is_heavy_with_a_small_capacity_and_calm_with_a_big_one():
    tasks = [make_task(due=TODAY, minutes=100), make_task(due=TODAY, minutes=100)]

    assert build_today(tasks, TODAY, capacity=180).heavy_load is not None
    assert build_today(tasks, TODAY, capacity=300).heavy_load is None
    assert build_today(tasks, TODAY, capacity=180).heavy_load.capacity_minutes == 180


def test_exactly_at_a_custom_capacity_is_not_heavy():
    tasks = [make_task(due=TODAY, minutes=90), make_task(due=TODAY, minutes=90)]

    assert build_today(tasks, TODAY, capacity=180).heavy_load is None
    assert build_today(tasks, TODAY, capacity=165).heavy_load is not None


def test_the_week_reports_and_applies_the_capacity():
    tasks = [make_task(due=TODAY + timedelta(days=1), minutes=200)]

    small, big = build_week(tasks, TODAY, capacity=150), build_week(tasks, TODAY, capacity=300)

    assert small.capacity_minutes == 150 and big.capacity_minutes == 300
    assert small.days[1][1].is_heavy is True
    assert big.days[1][1].is_heavy is False


def test_without_a_capacity_the_default_is_used():
    tasks = [make_task(due=TODAY, minutes=DAILY_CAPACITY_MINUTES + 5)]

    assert build_today(tasks, TODAY).heavy_load is not None
    assert build_week(tasks, TODAY).capacity_minutes == DAILY_CAPACITY_MINUTES


def test_changing_capacity_changes_what_today_and_week_endpoints_say(client: TestClient):
    headers = new_workspace(client)
    new_task(client, headers, title="Big", due_date=TODAY.isoformat(), estimated_minutes=300)
    params = {"today": TODAY.isoformat()}

    before_today = client.get("/tasks/today", params=params, headers=headers).json()
    assert before_today["heavy_load"]["capacity_minutes"] == 240
    assert client.get("/tasks/week", params=params, headers=headers).json()["days"][0]["is_heavy"]

    set_capacity(client, headers, 360)

    after_today = client.get("/tasks/today", params=params, headers=headers).json()
    assert after_today["heavy_load"] is None
    week = client.get("/tasks/week", params=params, headers=headers).json()
    assert week["capacity_minutes"] == 360
    assert week["days"][0]["is_heavy"] is False


def test_priorities_do_not_depend_on_capacity(client: TestClient):
    headers = new_workspace(client)
    new_task(client, headers, title="A", due_date=TODAY.isoformat(), impact_score=5)
    new_task(client, headers, title="B", due_date=TODAY.isoformat(), impact_score=1)
    params = {"today": TODAY.isoformat()}

    def order():
        top = client.get("/tasks/today", params=params, headers=headers).json()["top"]
        return [(task["title"], task["priority_score"]) for task in top]

    first = order()
    set_capacity(client, headers, 60)

    assert order() == first


# --- the chat is told about it ---


class CapturingLLM:
    def __init__(self):
        self.messages = None

    def complete_text(self, *, messages, max_tokens=400):
        self.messages = messages
        return "ok"


def test_chat_knows_the_workspaces_capacity_and_the_task_notes(client: TestClient):
    fake = CapturingLLM()
    app.dependency_overrides[get_llm] = lambda: fake
    try:
        headers = new_workspace(client)
        set_capacity(client, headers, 420)
        new_task(
            client,
            headers,
            title="Prepare slides",
            description="Twelve slides for the board, with charts",
            due_date=TODAY.isoformat(),
        )

        client.post(
            "/chat/query",
            json={"question": "How long?", "today": TODAY.isoformat(), "locale": "en"},
            headers=headers,
        )
    finally:
        app.dependency_overrides.pop(get_llm, None)

    user = fake.messages[1]["content"]
    context = json.loads(user.split("<schedule>\n")[1].split("\n</schedule>")[0])
    assert context["daily_capacity_minutes"] == 420
    assert context["today"]["start_here"][0]["notes"] == "Twelve slides for the board, with charts"


def test_chat_prompt_allows_labelled_duration_guesses_but_not_changing_the_app():
    from app.services.prompts import chat_system_prompt

    prompt = chat_system_prompt(TODAY, "en")

    assert "call it a guess" in prompt
    assert "The app's own numbers are never changed" in prompt
    assert "titles and notes" in prompt
