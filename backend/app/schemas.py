"""Request/response models for the API."""

import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.models import SourceType, TaskStatus

# Limits from IMPLEMENTATION.md (CP5).
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Minutes = Annotated[int, Field(ge=5, le=720)]
Impact = Annotated[int, Field(ge=1, le=5)]


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str | None
    created_at: datetime


class TaskCreate(BaseModel):
    title: Title
    description: str | None = None
    due_date: date | None = None
    estimated_minutes: Minutes | None = None
    impact_score: Impact = 3


class TaskUpdate(BaseModel):
    """Partial update: only the fields that are sent are changed.

    due_date, estimated_minutes and description may be sent as null to clear them.
    """

    title: Title | None = None
    description: str | None = None
    due_date: date | None = None
    estimated_minutes: Minutes | None = None
    impact_score: Impact | None = None
    status: TaskStatus | None = None

    @model_validator(mode="after")
    def _required_fields_cannot_be_cleared(self) -> "TaskUpdate":
        for field in ("title", "impact_score", "status"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    title: str
    description: str | None
    due_date: date | None
    estimated_minutes: int | None
    impact_score: int
    urgency_score: int | None
    priority_score: int | None
    priority_label: str | None
    status: TaskStatus
    source_type: SourceType
    ai_summary: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


# --- schedule (CP9) ---


class ScheduledTaskOut(TaskOut):
    """A task with scores computed for the user's `today`, plus short English reasons.

    The reasons are context for the AI chat (CP14); the UI uses its own dictionaries.
    """

    reasons: list[str]


class HeavyLoadOut(BaseModel):
    is_heavy: bool = True
    # A code, not a sentence, so the frontend can show it in the user's language.
    reason: Literal["over_capacity", "many_long_tasks"]
    total_minutes: int
    capacity_minutes: int


class DelaySuggestionOut(BaseModel):
    task_id: uuid.UUID
    reason: Literal["past_its_date", "lowest_priority"]


class TodayOut(BaseModel):
    today: date
    top: list[ScheduledTaskOut]
    rest: list[ScheduledTaskOut]
    heavy_load: HeavyLoadOut | None
    delay_suggestion: DelaySuggestionOut | None


class DayOut(BaseModel):
    date: date | None  # None for the "unscheduled" bucket
    total_minutes: int
    task_count: int
    is_heavy: bool
    tasks: list[ScheduledTaskOut]


class WeekOut(BaseModel):
    today: date
    capacity_minutes: int
    days: list[DayOut]
    unscheduled: DayOut
