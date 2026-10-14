import ast
import inspect
from datetime import date, datetime, timedelta
from types import SimpleNamespace

import pytest

from app.services import priority
from app.services.priority import (
    compute_priority,
    effort_penalty,
    priority_label,
    sort_key,
    urgency,
)

TODAY = date(2026, 10, 14)


def in_days(n: int) -> date:
    return TODAY + timedelta(days=n)


@pytest.mark.parametrize(
    ("due", "expected"),
    [
        (None, 1),
        (in_days(-30), 5),  # long past
        (in_days(-1), 5),  # yesterday
        (in_days(0), 5),  # today
        (in_days(1), 4),  # tomorrow
        (in_days(2), 3),
        (in_days(3), 3),
        (in_days(4), 2),
        (in_days(7), 2),
        (in_days(8), 1),
        (in_days(365), 1),
    ],
)
def test_urgency_boundaries(due, expected):
    assert urgency(due, TODAY) == expected


@pytest.mark.parametrize(
    ("minutes", "expected"),
    [(None, 0), (5, 0), (120, 0), (121, 1), (720, 1)],
)
def test_effort_penalty_boundaries(minutes, expected):
    assert effort_penalty(minutes) == expected


@pytest.mark.parametrize(
    ("score", "label"),
    [(1, "whenever"), (5, "whenever"), (6, "soon"), (7, "soon"), (8, "focus"), (10, "focus")],
)
def test_label_thresholds(score, label):
    assert priority_label(score) == label


@pytest.mark.parametrize(
    ("due", "impact", "minutes", "score", "label"),
    [
        (in_days(0), 3, None, 8, "focus"),  # due today, matters
        (in_days(0), 5, 180, 9, "focus"),  # long task: -1
        (in_days(1), 3, None, 7, "soon"),
        (in_days(10), 3, None, 4, "whenever"),
        (None, 1, None, 2, "whenever"),  # lowest realistic score
        (in_days(0), 5, None, 10, "focus"),  # highest
        (in_days(-2), 1, 600, 5, "whenever"),  # past date but small deal and long
    ],
)
def test_priority_score_and_label(due, impact, minutes, score, label):
    result = compute_priority(
        due_date=due, impact_score=impact, estimated_minutes=minutes, today=TODAY
    )

    assert result.score == score
    assert result.label == label


def test_reasons_explain_the_score():
    result = compute_priority(
        due_date=in_days(1), impact_score=5, estimated_minutes=180, today=TODAY
    )

    assert result.reasons == [
        "it is due tomorrow",
        "you marked it as really mattering",
        "it needs more than 2 hours",
    ]


@pytest.mark.parametrize(
    ("due", "reason"),
    [
        (None, "it has no due date"),
        (in_days(-1), "it is past its date"),
        (in_days(0), "it is due today"),
        (in_days(5), "it is due in 5 days"),
    ],
)
def test_urgency_reasons(due, reason):
    result = compute_priority(due_date=due, impact_score=3, estimated_minutes=None, today=TODAY)

    assert result.reasons[0] == reason


def test_same_input_always_gives_same_output():
    args = {"due_date": in_days(2), "impact_score": 4, "estimated_minutes": 45, "today": TODAY}

    assert compute_priority(**args) == compute_priority(**args)


def _task(score, due, created_hour, task_id):
    return SimpleNamespace(
        priority_score=score,
        due_date=due,
        created_at=datetime(2026, 10, 1, created_hour),
        id=task_id,
    )


def test_ordering_and_tie_breaks():
    higher_score = _task(9, None, 9, "z")
    tie_earlier_due = _task(7, in_days(1), 12, "c")
    tie_later_due = _task(7, in_days(3), 8, "b")
    tie_no_due_old = _task(7, None, 7, "a")
    tie_no_due_new = _task(7, None, 8, "a")
    tie_same_created_id_1 = _task(5, None, 8, "m")
    tie_same_created_id_2 = _task(5, None, 8, "n")

    ordered = sorted(
        [
            tie_same_created_id_2,
            tie_no_due_new,
            tie_later_due,
            tie_same_created_id_1,
            higher_score,
            tie_no_due_old,
            tie_earlier_due,
        ],
        key=sort_key,
    )

    assert ordered == [
        higher_score,
        tie_earlier_due,
        tie_later_due,
        tie_no_due_old,
        tie_no_due_new,
        tie_same_created_id_1,
        tie_same_created_id_2,
    ]


def test_module_is_pure_python_with_no_llm_or_database_imports():
    tree = ast.parse(inspect.getsource(priority))
    imported = {
        (node.module or "").split(".")[0] if isinstance(node, ast.ImportFrom) else alias.name
        for node in ast.walk(tree)
        if isinstance(node, ast.Import | ast.ImportFrom)
        for alias in (node.names if isinstance(node, ast.Import) else [None])
    }

    assert imported <= {"dataclasses", "datetime"}
