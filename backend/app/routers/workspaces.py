import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Workspace
from app.schemas import WorkspaceOut

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceOut, status_code=201)
def create_workspace(db: Annotated[Session, Depends(get_db)]) -> Workspace:
    workspace = Workspace()
    db.add(workspace)
    db.commit()
    return workspace


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def read_workspace(workspace_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace
