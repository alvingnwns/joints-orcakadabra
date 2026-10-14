from datetime import date, timedelta

from fastapi.testclient import TestClient

from tests.test_tasks_crud import new_task, new_workspace


def _days_from_today(n: int) -> str:
    return (date.today() + timedelta(days=n)).isoformat()


def test_new_task_gets_scores_written_back(client: TestClient):
    headers = new_workspace(client)

    task = new_task(client, headers, due_date=_days_from_today(0), impact_score=3)

    assert task["urgency_score"] == 5
    assert task["priority_score"] == 8
    assert task["priority_label"] == "focus"


def test_task_without_date_is_relaxed(client: TestClient):
    task = new_task(client, new_workspace(client))

    assert (task["urgency_score"], task["priority_score"], task["priority_label"]) == (
        1,
        4,
        "whenever",
    )


def test_scores_update_when_the_task_changes(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers)
    url = f"/tasks/{task['id']}"

    moved = client.patch(url, json={"due_date": _days_from_today(1)}, headers=headers).json()
    assert (moved["urgency_score"], moved["priority_score"]) == (4, 7)

    longer = client.patch(url, json={"estimated_minutes": 180}, headers=headers).json()
    assert longer["priority_score"] == 6

    cleared = client.patch(url, json={"due_date": None}, headers=headers).json()
    assert (cleared["urgency_score"], cleared["priority_score"]) == (1, 3)


def test_done_and_deferred_tasks_are_not_scored_and_come_back_scored(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers, due_date=_days_from_today(0))
    url = f"/tasks/{task['id']}"

    for status in ("done", "deferred"):
        body = client.patch(url, json={"status": status}, headers=headers).json()
        assert body["priority_score"] is None
        assert body["urgency_score"] is None
        assert body["priority_label"] is None

    back = client.patch(url, json={"status": "todo"}, headers=headers).json()
    assert back["priority_score"] == 8
