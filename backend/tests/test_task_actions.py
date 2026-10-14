"""CP8: the flexible actions (postpone, pick a day, later, bring back, make smaller) are plain
PATCH requests. These tests pin down that each one persists and keeps the scores consistent."""

from datetime import date, timedelta

from fastapi.testclient import TestClient

from tests.test_tasks_crud import new_task, new_workspace


def _in_days(n: int) -> str:
    return (date.today() + timedelta(days=n)).isoformat()


def _patch(client: TestClient, headers: dict, task: dict, **changes) -> dict:
    response = client.patch(f"/tasks/{task['id']}", json=changes, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_move_to_tomorrow_lowers_urgency(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers, due_date=_in_days(0))

    moved = _patch(client, headers, task, due_date=_in_days(1))

    assert moved["due_date"] == _in_days(1)
    assert moved["urgency_score"] == 4
    assert client.get(f"/tasks/{task['id']}", headers=headers).json()["due_date"] == _in_days(1)


def test_pick_another_day(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers, due_date=_in_days(1))

    moved = _patch(client, headers, task, due_date=_in_days(10))

    assert moved["due_date"] == _in_days(10)
    assert moved["urgency_score"] == 1


def test_later_keeps_the_task_details_and_bring_back_rescores_it(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers, due_date=_in_days(0), estimated_minutes=60)

    later = _patch(client, headers, task, status="deferred")
    assert later["status"] == "deferred"
    assert later["due_date"] == _in_days(0) and later["estimated_minutes"] == 60
    assert later["priority_score"] is None
    deferred = client.get("/tasks?status=deferred", headers=headers).json()
    assert [item["id"] for item in deferred] == [task["id"]]

    back = _patch(client, headers, task, status="todo")
    assert back["status"] == "todo"
    assert back["priority_score"] == 8


def test_make_it_smaller_edits_title_and_estimate(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers, title="Write the whole report", estimated_minutes=180)
    assert task["priority_score"] == 3  # long-task penalty

    smaller = _patch(client, headers, task, title="  Write the intro  ", estimated_minutes=30)

    assert smaller["title"] == "Write the intro"
    assert smaller["estimated_minutes"] == 30
    assert smaller["priority_score"] == 4  # penalty gone


def test_make_it_smaller_can_clear_the_estimate(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers, estimated_minutes=180)

    assert _patch(client, headers, task, estimated_minutes=None)["estimated_minutes"] is None


def test_make_it_smaller_rejects_an_empty_title(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers)

    response = client.patch(f"/tasks/{task['id']}", json={"title": "   "}, headers=headers)

    assert response.status_code == 422
