import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Workspace
from app.schemas import WorkspaceOut, WorkspaceUpdate

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=WorkspaceOut, status_code=201)
def create_workspace(db: DbSession) -> Workspace:
    workspace = Workspace()
    db.add(workspace)
    db.commit()
    db.refresh(workspace)  # the database fills in the default capacity
    return workspace


def _get(db: Session, workspace_id: uuid.UUID) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def read_workspace(workspace_id: uuid.UUID, db: DbSession) -> Workspace:
    return _get(db, workspace_id)


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
def update_workspace(workspace_id: uuid.UUID, body: WorkspaceUpdate, db: DbSession) -> Workspace:
    """Changes settings such as the daily capacity. Scores do not depend on it; the heavy-load
    notice and the week's load bars do, and they are computed on every read."""
    workspace = _get(db, workspace_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(workspace, field, value)
    db.commit()
    db.refresh(workspace)
    return workspace
