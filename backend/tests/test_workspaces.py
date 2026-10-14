import uuid
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_workspace
from app.models import Workspace


def test_create_workspace_returns_a_new_workspace(client: TestClient):
    response = client.post("/workspaces")

    assert response.status_code == 201
    body = response.json()
    assert uuid.UUID(body["id"])
    assert body["name"] is None
    assert body["created_at"]


def test_each_create_makes_a_different_workspace(client: TestClient):
    first = client.post("/workspaces").json()["id"]
    second = client.post("/workspaces").json()["id"]

    assert first != second


def test_read_existing_workspace(client: TestClient):
    created = client.post("/workspaces").json()

    response = client.get(f"/workspaces/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_read_unknown_workspace_is_404(client: TestClient):
    assert client.get(f"/workspaces/{uuid.uuid4()}").status_code == 404


def test_read_malformed_workspace_id_is_422(client: TestClient):
    assert client.get("/workspaces/not-a-uuid").status_code == 422


# The X-Workspace-Id dependency is used by later endpoints (tasks). Test it on a tiny app.
def _dependency_client(db_session: Session) -> TestClient:
    mini = FastAPI()

    @mini.get("/whoami")
    def whoami(workspace: Annotated[Workspace, Depends(get_workspace)]):
        return {"id": str(workspace.id)}

    mini.dependency_overrides[get_db] = lambda: db_session
    return TestClient(mini)


def test_workspace_header_resolves_the_workspace(client: TestClient, db_session: Session):
    workspace_id = client.post("/workspaces").json()["id"]

    response = _dependency_client(db_session).get(
        "/whoami", headers={"X-Workspace-Id": workspace_id}
    )

    assert response.status_code == 200
    assert response.json() == {"id": workspace_id}


def test_workspace_header_unknown_is_404(db_session: Session):
    response = _dependency_client(db_session).get(
        "/whoami", headers={"X-Workspace-Id": str(uuid.uuid4())}
    )

    assert response.status_code == 404


def test_workspace_header_malformed_or_missing_is_422(db_session: Session):
    dependency_client = _dependency_client(db_session)

    assert dependency_client.get("/whoami", headers={"X-Workspace-Id": "nope"}).status_code == 422
    assert dependency_client.get("/whoami").status_code == 422
