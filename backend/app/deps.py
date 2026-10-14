"""Shared FastAPI dependencies."""

import uuid
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Workspace


def get_workspace(
    # Header name is X-Workspace-Id. A missing or malformed UUID is rejected with 422.
    x_workspace_id: Annotated[uuid.UUID, Header()],
    db: Annotated[Session, Depends(get_db)],
) -> Workspace:
    """The workspace of the current request. Unknown ids get a 404."""
    workspace = db.get(Workspace, x_workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace
