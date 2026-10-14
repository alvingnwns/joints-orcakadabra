import uuid

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import SourceType, Task, TaskStatus, Workspace


def test_task_round_trip_with_defaults(db_session: Session):
    workspace = Workspace(name="Test space")
    db_session.add(workspace)
    db_session.flush()
    task = Task(workspace_id=workspace.id, title="Finish proposal")
    db_session.add(task)
    db_session.commit()
    db_session.expire_all()

    loaded = db_session.scalars(select(Task).where(Task.id == task.id)).one()

    assert loaded.title == "Finish proposal"
    assert loaded.status is TaskStatus.TODO
    assert loaded.source_type is SourceType.MANUAL
    assert loaded.impact_score == 3
    assert loaded.created_at is not None
    assert loaded.completed_at is None


@pytest.mark.parametrize("column", ["status", "source_type"])
def test_database_rejects_invalid_enum_values(db_session: Session, column: str):
    workspace = Workspace()
    db_session.add(workspace)
    db_session.flush()
    sql = f"INSERT INTO tasks (id, workspace_id, title, {column}) VALUES (:id, :ws, 'x', 'nope')"

    with pytest.raises(IntegrityError):
        db_session.execute(text(sql), {"id": uuid.uuid4(), "ws": workspace.id})
