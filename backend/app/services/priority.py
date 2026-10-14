"""Deterministic priority scoring. Pure Python: no database, no LLM.

    priority_score = urgency + impact - effort_penalty

The same input always gives the same output, so the schedule stays consistent and explainable.
"""

from dataclasses import dataclass
from datetime import date

LONG_TASK_MINUTES = 120  # longer than this gets an effort penalty


@dataclass(frozen=True)
class Priority:
    urgency: int  # 1 (relaxed) to 5 (today or past)
    score: int
    label: str  # "focus" | "soon" | "whenever"
    reasons: list[str]  # short phrases for explanations, e.g. "due tomorrow"


def urgency(due_date: date | None, today: date) -> int:
    if due_date is None:
        return 1
    days_left = (due_date - today).days
    if days_left <= 0:  # today, or past its date
        return 5
    if days_left == 1:
        return 4
    if days_left <= 3:
        return 3
    if days_left <= 7:
        return 2
    return 1


def effort_penalty(estimated_minutes: int | None) -> int:
    return 1 if estimated_minutes is not None and estimated_minutes > LONG_TASK_MINUTES else 0


def priority_label(score: int) -> str:
    """Gentle wording instead of "high / urgent". Thresholds are a product choice."""
    if score >= 8:
        return "focus"
    if score >= 6:
        return "soon"
    return "whenever"


def _urgency_reason(due_date: date | None, today: date) -> str:
    if due_date is None:
        return "it has no due date"
    days_left = (due_date - today).days
    if days_left < 0:
        return "it is past its date"
    if days_left == 0:
        return "it is due today"
    if days_left == 1:
        return "it is due tomorrow"
    return f"it is due in {days_left} days"


def _impact_reason(impact_score: int) -> str:
    if impact_score <= 2:
        return "you marked it as a small deal"
    if impact_score == 3:
        return "you marked it as something that matters"
    return "you marked it as really mattering"


def compute_priority(
    *,
    due_date: date | None,
    impact_score: int,
    estimated_minutes: int | None,
    today: date,
) -> Priority:
    task_urgency = urgency(due_date, today)
    penalty = effort_penalty(estimated_minutes)
    score = task_urgency + impact_score - penalty

    reasons = [_urgency_reason(due_date, today), _impact_reason(impact_score)]
    if penalty:
        reasons.append("it needs more than 2 hours")

    return Priority(urgency=task_urgency, score=score, label=priority_label(score), reasons=reasons)


def sort_key(task) -> tuple:
    """Order by highest score first, then earliest due date, then oldest, then id (stable)."""
    return (
        -task.priority_score,
        task.due_date is None,  # undated tasks after dated ones
        task.due_date or date.max,
        task.created_at,
        str(task.id),
    )
