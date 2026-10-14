import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_workspace
from app.models import Task, TaskStatus, Workspace
from app.schemas import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentWorkspace = Annotated[Workspace, Depends(get_workspace)]


def _get_task(db: Session, workspace: Workspace, task_id: uuid.UUID) -> Task:
    # Always filtered by workspace: another workspace's task looks like it does not exist.
    task = db.scalars(
        select(Task).where(Task.id == task_id, Task.workspace_id == workspace.id)
    ).one_or_none()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("", response_model=TaskOut, status_code=201)
def create_task(body: TaskCreate, db: DbSession, workspace: CurrentWorkspace) -> Task:
    task = Task(workspace_id=workspace.id, **body.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=list[TaskOut])
def list_tasks(
    db: DbSession, workspace: CurrentWorkspace, status: TaskStatus | None = None
) -> list[Task]:
    query = select(Task).where(Task.workspace_id == workspace.id)
    if status is not None:
        query = query.where(Task.status == status)
    return list(db.scalars(query.order_by(Task.created_at, Task.id)))


@router.get("/{task_id}", response_model=TaskOut)
def read_task(task_id: uuid.UUID, db: DbSession, workspace: CurrentWorkspace) -> Task:
    return _get_task(db, workspace, task_id)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: uuid.UUID, body: TaskUpdate, db: DbSession, workspace: CurrentWorkspace
) -> Task:
    task = _get_task(db, workspace, task_id)
    changes = body.model_dump(exclude_unset=True)

    # completed_at follows status: set when a task becomes done, cleared when it stops being done.
    new_status = changes.get("status")
    if new_status is not None and new_status != task.status:
        if new_status == TaskStatus.DONE:
            task.completed_at = datetime.now(UTC)
        elif task.status == TaskStatus.DONE:
            task.completed_at = None

    for field, value in changes.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)  # updated_at is set by the database
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: uuid.UUID, db: DbSession, workspace: CurrentWorkspace) -> Response:
    db.delete(_get_task(db, workspace, task_id))
    db.commit()
    return Response(status_code=204)
