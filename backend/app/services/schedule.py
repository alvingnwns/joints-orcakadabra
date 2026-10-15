"""Deterministic today and week schedule, built on the priority engine. No database, no LLM.

Scores are computed fresh for the user's own `today` on every read (C4, Q1), so the stored
scores (which use the server date) are never relied on here.
"""

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

from app.config import DAILY_CAPACITY_MINUTES
from app.models import Task, TaskStatus
from app.services.priority import LONG_TASK_MINUTES, Priority, compute_priority, sort_key

ACTIVE_STATUSES = (TaskStatus.TODO, TaskStatus.IN_PROGRESS)
DEFAULT_MINUTES = 30  # tasks without an estimate count as 30 minutes, for load only (A8)
TOP_COUNT = 3
MAX_LONG_TASKS_PER_DAY = 2
WEEK_DAYS = 7

HeavyReason = Literal["over_capacity", "many_long_tasks"]


@dataclass(frozen=True)
class ScoredTask:
    task: Task
    priority: Priority

    # The attributes sort_key() reads, so ordering uses the fresh score.
    @property
    def priority_score(self) -> int:
        return self.priority.score

    @property
    def due_date(self) -> date | None:
        return self.task.due_date

    @property
    def created_at(self):
        return self.task.created_at

    @property
    def id(self):
        return self.task.id


@dataclass(frozen=True)
class HeavyLoad:
    reason: HeavyReason
    total_minutes: int
    capacity_minutes: int


@dataclass(frozen=True)
class Today:
    top: list[ScoredTask]
    rest: list[ScoredTask]
    heavy_load: HeavyLoad | None
    delay_suggestion: ScoredTask | None


@dataclass(frozen=True)
class Bucket:
    tasks: list[ScoredTask]
    total_minutes: int
    is_heavy: bool


@dataclass(frozen=True)
class Week:
    days: list[tuple[date, Bucket]]
    unscheduled: Bucket
    capacity_minutes: int


def rank(tasks: list[Task], today: date) -> list[ScoredTask]:
    """Active tasks only (done and deferred are left out), best first."""
    scored = [
        ScoredTask(
            task,
            compute_priority(
                due_date=task.due_date,
                impact_score=task.impact_score,
                estimated_minutes=task.estimated_minutes,
                today=today,
            ),
        )
        for task in tasks
        if task.status in ACTIVE_STATUSES
    ]
    return sorted(scored, key=sort_key)


def _minutes(item: ScoredTask) -> int:
    return item.task.estimated_minutes or DEFAULT_MINUTES


def _total_minutes(items: list[ScoredTask]) -> int:
    return sum(_minutes(item) for item in items)


def heavy_reason(items: list[ScoredTask], capacity: int | None = None) -> HeavyReason | None:
    limit = DAILY_CAPACITY_MINUTES if capacity is None else capacity
    if _total_minutes(items) > limit:
        return "over_capacity"
    long_tasks = sum(1 for item in items if _minutes(item) > LONG_TASK_MINUTES)
    if long_tasks > MAX_LONG_TASKS_PER_DAY:
        return "many_long_tasks"
    return None


def _bucket(items: list[ScoredTask], capacity: int | None = None) -> Bucket:
    return Bucket(items, _total_minutes(items), heavy_reason(items, capacity) is not None)


def build_today(tasks: list[Task], today: date, capacity: int | None = None) -> Today:
    """`capacity` is the workspace's daily minutes; the default constant is used when it is None."""
    limit = DAILY_CAPACITY_MINUTES if capacity is None else capacity
    ranked = rank(tasks, today)
    top = ranked[:TOP_COUNT]
    # "Also today": what is due today or past its date, plus undated tasks (they fit any day).
    rest = [item for item in ranked[TOP_COUNT:] if item.due_date is None or item.due_date <= today]

    # Today's load is what is actually planned for today: due today or past its date.
    planned = [item for item in ranked if item.due_date is not None and item.due_date <= today]
    reason = heavy_reason(planned, limit)
    if reason is None:
        return Today(top, rest, None, None)

    # Suggest moving the lowest-ranked planned task, preferring one not due today itself
    # (past-date tasks first). If all are due today, still suggest one: the heavy-load notice
    # always comes with something concrete to move (C5).
    not_due_today = [item for item in planned if item.due_date != today]
    suggestion = (not_due_today or planned)[-1]
    load = HeavyLoad(reason, _total_minutes(planned), limit)
    return Today(top, rest, load, suggestion)


def build_week(tasks: list[Task], today: date, capacity: int | None = None) -> Week:
    """Seven days from `today`. Past-date tasks count on today; later ones are left out."""
    limit = DAILY_CAPACITY_MINUTES if capacity is None else capacity
    ranked = rank(tasks, today)
    days = [today + timedelta(days=offset) for offset in range(WEEK_DAYS)]
    by_day: dict[date, list[ScoredTask]] = {day: [] for day in days}
    unscheduled: list[ScoredTask] = []

    for item in ranked:
        if item.due_date is None:
            unscheduled.append(item)
        elif item.due_date <= today:
            by_day[today].append(item)
        elif item.due_date in by_day:
            by_day[item.due_date].append(item)

    return Week(
        days=[(day, _bucket(by_day[day], limit)) for day in days],
        unscheduled=_bucket(unscheduled, limit),
        capacity_minutes=limit,
    )
