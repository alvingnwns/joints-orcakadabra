"""SQLAlchemy models matching the ERD in system-design.md.

`projects` and `attachments` are optional in the design and are added later (OPT1/OPT2),
together with `tasks.project_id`.
"""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class TaskStatus(enum.StrEnum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    DEFERRED = "deferred"  # "Later" list (decision C3)


class SourceType(enum.StrEnum):
    MANUAL = "manual"
    AI_PARSED = "ai_parsed"


def _enum_column(enum_cls: type[enum.Enum], name: str) -> Enum:
    # Stored as plain strings with a CHECK constraint (not a native Postgres enum),
    # which keeps migrations simple. The stored values are the lowercase enum values.
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=20,
        values_callable=lambda members: [member.value for member in members],
        validate_strings=True,
    )


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    name: Mapped[str | None] = mapped_column(String(100))


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    # A calendar date in the user's local time (Q1), so no timezone.
    due_date: Mapped[date | None] = mapped_column(Date)
    estimated_minutes: Mapped[int | None] = mapped_column(Integer)
    impact_score: Mapped[int] = mapped_column(Integer, default=3, server_default="3")
    urgency_score: Mapped[int | None] = mapped_column(Integer)
    priority_score: Mapped[int | None] = mapped_column(Integer)
    priority_label: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[TaskStatus] = mapped_column(
        _enum_column(TaskStatus, "status"),
        default=TaskStatus.TODO,
        server_default=TaskStatus.TODO.value,
    )
    source_type: Mapped[SourceType] = mapped_column(
        _enum_column(SourceType, "source_type"),
        default=SourceType.MANUAL,
        server_default=SourceType.MANUAL.value,
    )
    ai_summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
