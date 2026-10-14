"""Schedule-grounded chat (CP14). The model explains the schedule; it never changes it.

The context holds only the current workspace's tasks, already ranked by the priority engine.
No conversation history is stored.
"""

import json
from datetime import date
from typing import Any

from app.config import DAILY_CAPACITY_MINUTES
from app.models import Task, TaskStatus
from app.services.llm import LLMClient, LLMInvalidOutput
from app.services.prompts import Locale, chat_system_prompt, chat_user_message
from app.services.schedule import ScoredTask, build_today, build_week, rank

IMPACT_WORDS = {1: "small deal", 2: "small deal", 3: "matters", 4: "really matters"}


def _impact(score: int) -> str:
    return IMPACT_WORDS.get(score, "really matters")


def _task(item: ScoredTask) -> dict[str, Any]:
    task = item.task
    return {
        "title": task.title,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "estimated_minutes": task.estimated_minutes,
        "impact": _impact(task.impact_score),
        "label": item.priority.label,
        "reasons": item.priority.reasons,
    }


def schedule_context(tasks: list[Task], today: date) -> dict[str, Any]:
    """Today and the week ahead, as the app already ranked them."""
    day = build_today(tasks, today)
    week = build_week(tasks, today)
    return {
        "daily_capacity_minutes": DAILY_CAPACITY_MINUTES,
        "today": {
            "start_here": [_task(item) for item in day.top],
            "also_today": [_task(item) for item in day.rest],
            "heavy_load": (
                {
                    "reason": day.heavy_load.reason,
                    "planned_minutes": day.heavy_load.total_minutes,
                }
                if day.heavy_load
                else None
            ),
            "could_wait": day.delay_suggestion.task.title if day.delay_suggestion else None,
        },
        "week": [
            {
                "date": f"{day_date:%A} {day_date.isoformat()}",
                "planned_minutes": bucket.total_minutes,
                "is_heavy": bucket.is_heavy,
                "tasks": [item.task.title for item in bucket.tasks],
            }
            for day_date, bucket in week.days
        ],
        "no_date_yet": [item.task.title for item in week.unscheduled.tasks],
        "saved_for_later": [task.title for task in tasks if task.status == TaskStatus.DEFERRED],
    }


def task_context(task: Task, tasks: list[Task], today: date) -> dict[str, Any]:
    """One task's details and reasons, plus where it sits in the ranking ("why is this here?")."""
    ranked = rank(tasks, today)
    position = next((n for n, item in enumerate(ranked, start=1) if item.task.id == task.id), None)
    details: dict[str, Any] = {
        "title": task.title,
        "status": task.status.value,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "estimated_minutes": task.estimated_minutes,
        "impact": _impact(task.impact_score),
    }
    if position is not None:
        details.update(_task(ranked[position - 1]))
    return {
        "task": details,
        "rank": position,  # 1 = the first "start here" task; null if done or saved for later
        "active_task_count": len(ranked),
    }


def answer_question(
    llm: LLMClient, question: str, context: dict[str, Any], today: date, locale: Locale
) -> str:
    messages = [
        {"role": "system", "content": chat_system_prompt(today, locale)},
        {
            "role": "user",
            "content": chat_user_message(json.dumps(context, ensure_ascii=False), question),
        },
    ]
    answer = llm.complete_text(messages=messages)
    if not answer:
        raise LLMInvalidOutput("The model returned an empty answer.")
    return answer
