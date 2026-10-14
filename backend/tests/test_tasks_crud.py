import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session


def new_workspace(client: TestClient) -> dict[str, str]:
    """Creates a workspace and returns the headers that identify it."""
    return {"X-Workspace-Id": client.post("/workspaces").json()["id"]}


def new_task(client: TestClient, headers: dict[str, str], **fields) -> dict:
    response = client.post("/tasks", json={"title": "Write report", **fields}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


# --- create ---


def test_create_task_with_defaults(client: TestClient):
    headers = new_workspace(client)

    task = new_task(client, headers)

    assert task["title"] == "Write report"
    assert task["status"] == "todo"
    assert task["source_type"] == "manual"
    assert task["impact_score"] == 3
    assert task["due_date"] is None and task["estimated_minutes"] is None
    assert task["completed_at"] is None
    assert task["workspace_id"] == headers["X-Workspace-Id"]


def test_create_task_with_all_fields_and_trimmed_title(client: TestClient):
    task = new_task(
        client,
        new_workspace(client),
        title="  Finish proposal  ",
        description="Section 2 onwards",
        due_date="2026-10-16",
        estimated_minutes=90,
        impact_score=5,
    )

    assert task["title"] == "Finish proposal"
    assert task["due_date"] == "2026-10-16"
    assert task["estimated_minutes"] == 90
    assert task["impact_score"] == 5


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"title": ""}, "title"),
        ({"title": "   "}, "title"),
        ({"title": "x" * 201}, "title"),
        ({"title": "ok", "estimated_minutes": 4}, "estimated_minutes"),
        ({"title": "ok", "estimated_minutes": 721}, "estimated_minutes"),
        ({"title": "ok", "impact_score": 0}, "impact_score"),
        ({"title": "ok", "impact_score": 6}, "impact_score"),
        ({"title": "ok", "due_date": "tomorrow"}, "due_date"),
        ({}, "title"),
    ],
)
def test_create_rejects_invalid_input_with_field_errors(client: TestClient, payload, field):
    response = client.post("/tasks", json=payload, headers=new_workspace(client))

    assert response.status_code == 422
    assert field in [error["loc"][-1] for error in response.json()["detail"]]


def test_boundary_values_are_accepted(client: TestClient):
    headers = new_workspace(client)

    new_task(client, headers, title="x" * 200, estimated_minutes=5, impact_score=1)
    new_task(client, headers, estimated_minutes=720, impact_score=5)


def test_workspace_header_is_required_and_must_exist(client: TestClient):
    assert client.post("/tasks", json={"title": "x"}).status_code == 422
    unknown = {"X-Workspace-Id": str(uuid.uuid4())}
    assert client.post("/tasks", json={"title": "x"}, headers=unknown).status_code == 404


# --- read ---


def test_list_returns_only_the_workspaces_own_tasks(client: TestClient):
    mine, theirs = new_workspace(client), new_workspace(client)
    new_task(client, mine, title="Mine 1")
    new_task(client, mine, title="Mine 2")
    new_task(client, theirs, title="Theirs")

    titles = [task["title"] for task in client.get("/tasks", headers=mine).json()]

    # Sorted: inside one test transaction both rows get the same created_at (Postgres now()),
    # so their order is decided by random ids. This test is about isolation, not order.
    assert sorted(titles) == ["Mine 1", "Mine 2"]


def test_list_filters_by_status(client: TestClient):
    headers = new_workspace(client)
    new_task(client, headers, title="Open")
    done = new_task(client, headers, title="Finished")
    client.patch(f"/tasks/{done['id']}", json={"status": "done"}, headers=headers)

    only_done = client.get("/tasks", params={"status": "done"}, headers=headers).json()

    assert [task["title"] for task in only_done] == ["Finished"]
    assert client.get("/tasks", params={"status": "nope"}, headers=headers).status_code == 422


def test_get_one_task_and_unknown_id(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers)

    assert client.get(f"/tasks/{task['id']}", headers=headers).json() == task
    assert client.get(f"/tasks/{uuid.uuid4()}", headers=headers).status_code == 404
    assert client.get("/tasks/not-a-uuid", headers=headers).status_code == 422


# --- workspace isolation ---


def test_another_workspace_cannot_read_change_or_delete_a_task(client: TestClient):
    owner, other = new_workspace(client), new_workspace(client)
    task = new_task(client, owner)
    url = f"/tasks/{task['id']}"

    assert client.get(url, headers=other).status_code == 404
    assert client.patch(url, json={"title": "Hijacked"}, headers=other).status_code == 404
    assert client.delete(url, headers=other).status_code == 404
    assert client.get(url, headers=owner).json()["title"] == "Write report"


# --- update ---


def test_patch_changes_only_the_sent_fields(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers, due_date="2026-10-16", estimated_minutes=60)

    response = client.patch(f"/tasks/{task['id']}", json={"title": "Smaller"}, headers=headers)

    body = response.json()
    assert response.status_code == 200
    assert body["title"] == "Smaller"
    assert body["due_date"] == "2026-10-16"
    assert body["estimated_minutes"] == 60


def test_patch_can_clear_optional_fields(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers, due_date="2026-10-16", estimated_minutes=60)

    body = client.patch(
        f"/tasks/{task['id']}", json={"due_date": None, "estimated_minutes": None}, headers=headers
    ).json()

    assert body["due_date"] is None and body["estimated_minutes"] is None


@pytest.mark.parametrize(
    "payload",
    [
        {"title": ""},
        {"title": None},
        {"impact_score": None},
        {"status": None},
        {"status": "finished"},
        {"estimated_minutes": 3},
        {"impact_score": 9},
    ],
)
def test_patch_rejects_invalid_input(client: TestClient, payload):
    headers = new_workspace(client)
    task = new_task(client, headers)

    response = client.patch(f"/tasks/{task['id']}", json=payload, headers=headers)

    assert response.status_code == 422


def test_completed_at_is_set_when_done_and_cleared_when_reopened(client: TestClient):
    headers = new_workspace(client)
    url = f"/tasks/{new_task(client, headers)['id']}"

    done = client.patch(url, json={"status": "done"}, headers=headers).json()
    assert done["completed_at"] is not None

    # Saving "done" again must not move the original completion time.
    again = client.patch(url, json={"status": "done"}, headers=headers).json()
    assert again["completed_at"] == done["completed_at"]

    reopened = client.patch(url, json={"status": "todo"}, headers=headers).json()
    assert reopened["completed_at"] is None


def test_other_status_changes_do_not_touch_completed_at(client: TestClient):
    headers = new_workspace(client)
    url = f"/tasks/{new_task(client, headers)['id']}"

    for status in ("in_progress", "deferred", "todo"):
        body = client.patch(url, json={"status": status}, headers=headers).json()
        assert body["status"] == status
        assert body["completed_at"] is None


def test_updated_at_moves_forward_on_change(client: TestClient, db_session: Session):
    headers = new_workspace(client)
    task = new_task(client, headers)
    db_session.execute(
        text("UPDATE tasks SET updated_at = '2000-01-01T00:00:00+00' WHERE id = :id"),
        {"id": task["id"]},
    )

    body = client.patch(f"/tasks/{task['id']}", json={"title": "Changed"}, headers=headers).json()

    assert body["updated_at"] > "2020-01-01"


# --- delete ---


def test_delete_removes_the_task(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers)

    assert client.delete(f"/tasks/{task['id']}", headers=headers).status_code == 204
    assert client.get(f"/tasks/{task['id']}", headers=headers).status_code == 404
    assert client.delete(f"/tasks/{task['id']}", headers=headers).status_code == 404
