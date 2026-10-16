import uuid
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_workspace
from app.models import SourceType, Task, TaskStatus, Workspace
from app.schemas import (
    BulkCreate,
    DayOut,
    DelaySuggestionOut,
    EstimateOut,
    EstimateRequest,
    HeavyLoadOut,
    ParseRequest,
    RebalanceMoveOut,
    RebalanceOut,
    RebalancePartOut,
    RebalanceRequest,
    RebalanceSplitOut,
    ScheduledTaskOut,
    TaskCreate,
    TaskOut,
    TaskUpdate,
    TodayOut,
    WeekOut,
)
from app.services.estimate import estimate_task
from app.services.llm import LLMClient, LLMInvalidOutput, LLMUnavailable, get_llm
from app.services.parse import Draft, parse_brain_dump
from app.services.priority import compute_priority
from app.services.rebalance import plan_rebalance
from app.services.schedule import ACTIVE_STATUSES, Bucket, ScoredTask, build_today, build_week

router = APIRouter(prefix="/tasks", tags=["tasks"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentWorkspace = Annotated[Workspace, Depends(get_workspace)]
# The user's local date (Q1). Without it the server date is used, which can be a day off
# for users in another timezone; the frontend always sends it.
UserToday = Annotated[date | None, Query()]


def _apply_priority(task: Task) -> None:
    """Writes the scores onto the task (C4). Done and deferred tasks are not scored.

    "Today" is the server date here; the schedule endpoints (CP9) take the user's local date.
    """
    if task.status not in ACTIVE_STATUSES:
        task.urgency_score = task.priority_score = task.priority_label = None
        return
    result = compute_priority(
        due_date=task.due_date,
        impact_score=task.impact_score,
        estimated_minutes=task.estimated_minutes,
        today=date.today(),
    )
    task.urgency_score = result.urgency
    task.priority_score = result.score
    task.priority_label = result.label


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
    task = Task(workspace_id=workspace.id, status=TaskStatus.TODO, **body.model_dump())
    _apply_priority(task)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


# --- brain dump (CP12) ---


class DraftsOut(BaseModel):
    drafts: list[Draft]


@router.post(
    "/parse",
    response_model=DraftsOut,
    responses={422: {"description": "no_tasks_found"}, 502: {"description": "ai_unavailable"}},
)
def parse_tasks(
    body: ParseRequest, workspace: CurrentWorkspace, llm: Annotated[LLMClient, Depends(get_llm)]
) -> DraftsOut:
    """Turns a brain dump into drafts for review. Nothing is saved."""
    # Error details are codes; the frontend shows its own calm text in the user's language.
    try:
        drafts = parse_brain_dump(llm, body.text, body.today, body.locale)
    except LLMUnavailable as error:
        raise HTTPException(status_code=502, detail="ai_unavailable") from error
    except LLMInvalidOutput as error:
        raise HTTPException(status_code=502, detail="ai_invalid_output") from error
    if not drafts:
        raise HTTPException(status_code=422, detail="no_tasks_found")
    return DraftsOut(drafts=drafts)


@router.post(
    "/estimate",
    response_model=EstimateOut,
    responses={502: {"description": "ai_unavailable or ai_invalid_output"}},
)
def estimate_duration(
    body: EstimateRequest, workspace: CurrentWorkspace, llm: Annotated[LLMClient, Depends(get_llm)]
) -> EstimateOut:
    """Suggests how long one task will take, with a reason. Nothing is saved or changed."""
    try:
        estimate = estimate_task(llm, body.title, body.description, body.locale)
    except LLMUnavailable as error:
        raise HTTPException(status_code=502, detail="ai_unavailable") from error
    except LLMInvalidOutput as error:
        raise HTTPException(status_code=502, detail="ai_invalid_output") from error
    return EstimateOut(
        estimated_minutes=estimate.estimated_minutes, estimate_reason=estimate.estimate_reason
    )


@router.post("/bulk", response_model=list[TaskOut], status_code=201)
def create_tasks_bulk(body: BulkCreate, db: DbSession, workspace: CurrentWorkspace) -> list[Task]:
    """Saves approved AI drafts in one transaction (C7)."""
    tasks = [
        Task(
            workspace_id=workspace.id,
            status=TaskStatus.TODO,
            source_type=SourceType.AI_PARSED,
            **item.model_dump(),
        )
        for item in body.tasks
    ]
    for task in tasks:
        _apply_priority(task)
    db.add_all(tasks)
    db.commit()
    for task in tasks:
        db.refresh(task)
    return tasks


@router.post("/rebalance", response_model=RebalanceOut)
def rebalance(body: RebalanceRequest, db: DbSession, workspace: CurrentWorkspace) -> RebalanceOut:
    """Spreads overfull days out, and splits tasks longer than a whole day (see services/rebalance).

    With apply=false nothing changes: the response only shows what would happen.
    """
    capacity = workspace.daily_capacity_minutes
    plan = plan_rebalance(_active_tasks(db, workspace), body.today, capacity)
    # Described before anything changes, so it shows each task's original title and dates.
    result = RebalanceOut(
        applied=body.apply and not plan.is_empty,
        capacity_minutes=capacity,
        moves=[
            RebalanceMoveOut(
                task_id=move.task.id,
                title=move.task.title,
                from_date=move.from_date,
                to_date=move.to_date,
            )
            for move in plan.moves
        ],
        splits=[
            RebalanceSplitOut(
                task_id=split.task.id,
                title=split.task.title,
                total_minutes=split.total_minutes,
                parts=[
                    RebalancePartOut(title=part.title, date=part.day, minutes=part.minutes)
                    for part in split.parts
                ],
            )
            for split in plan.splits
        ],
    )

    if body.apply and not plan.is_empty:
        for move in plan.moves:
            move.task.due_date = move.to_date
            _apply_priority(move.task)
        for split in plan.splits:
            original, first = split.task, split.parts[0]
            for part in split.parts[1:]:
                extra = Task(
                    workspace_id=workspace.id,
                    title=part.title,
                    description=original.description,
                    due_date=part.day,
                    estimated_minutes=part.minutes,
                    impact_score=original.impact_score,
                    status=TaskStatus.TODO,
                    source_type=original.source_type,
                )
                _apply_priority(extra)
                db.add(extra)
            original.title, original.due_date = first.title, first.day
            original.estimated_minutes = first.minutes
            _apply_priority(original)
        db.commit()

    return result


@router.get("", response_model=list[TaskOut])
def list_tasks(
    db: DbSession, workspace: CurrentWorkspace, status: TaskStatus | None = None
) -> list[Task]:
    query = select(Task).where(Task.workspace_id == workspace.id)
    if status is not None:
        query = query.where(Task.status == status)
    return list(db.scalars(query.order_by(Task.created_at, Task.id)))


# --- schedule (CP9). Declared before /{task_id} so "today" and "week" are not read as ids. ---


def _active_tasks(db: Session, workspace: Workspace) -> list[Task]:
    return list(
        db.scalars(
            select(Task).where(Task.workspace_id == workspace.id, Task.status.in_(ACTIVE_STATUSES))
        )
    )


def _scheduled(item: ScoredTask) -> ScheduledTaskOut:
    base = TaskOut.model_validate(item.task).model_dump()
    base.update(
        urgency_score=item.priority.urgency,
        priority_score=item.priority.score,
        priority_label=item.priority.label,
    )
    return ScheduledTaskOut(**base, reasons=item.priority.reasons)


def _day(day: date | None, bucket: Bucket) -> DayOut:
    return DayOut(
        date=day,
        total_minutes=bucket.total_minutes,
        task_count=len(bucket.tasks),
        is_heavy=bucket.is_heavy,
        tasks=[_scheduled(item) for item in bucket.tasks],
    )


@router.get("/today", response_model=TodayOut)
def today_schedule(db: DbSession, workspace: CurrentWorkspace, today: UserToday = None) -> TodayOut:
    today = today or date.today()
    result = build_today(_active_tasks(db, workspace), today, workspace.daily_capacity_minutes)
    load, suggestion = result.heavy_load, result.delay_suggestion
    return TodayOut(
        today=today,
        top=[_scheduled(item) for item in result.top],
        rest=[_scheduled(item) for item in result.rest],
        heavy_load=HeavyLoadOut(
            reason=load.reason,
            total_minutes=load.total_minutes,
            capacity_minutes=load.capacity_minutes,
        )
        if load
        else None,
        delay_suggestion=DelaySuggestionOut(
            task_id=suggestion.id,
            reason="past_its_date" if suggestion.due_date < today else "lowest_priority",
        )
        if suggestion
        else None,
    )


@router.get("/week", response_model=WeekOut)
def week_schedule(db: DbSession, workspace: CurrentWorkspace, today: UserToday = None) -> WeekOut:
    today = today or date.today()
    result = build_week(_active_tasks(db, workspace), today, workspace.daily_capacity_minutes)
    return WeekOut(
        today=today,
        capacity_minutes=result.capacity_minutes,
        days=[_day(day, bucket) for day, bucket in result.days],
        unscheduled=_day(None, result.unscheduled),
    )


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
    _apply_priority(task)
    db.commit()
    db.refresh(task)  # updated_at is set by the database
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: uuid.UUID, db: DbSession, workspace: CurrentWorkspace) -> Response:
    db.delete(_get_task(db, workspace, task_id))
    db.commit()
    return Response(status_code=204)
