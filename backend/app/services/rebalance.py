"""Spreads an overfull schedule across days ("Rearrange my days"). Pure Python: no DB, no LLM.

The rules are plain on purpose, so the result is predictable and can be checked:

- Only dated, active tasks are planned. Undated tasks are never touched.
- Days are filled in order, best-ranked tasks first (the same ranking as the rest of the app).
  What does not fit moves to the next day that has room. Nothing is ever pulled earlier.
- A task longer than one whole day is split into equal parts, one per day, in order.
  Part 1 is the original task; the others are new tasks.
- A day never ends up with more than the person's daily capacity.
"""

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from math import ceil

from app.models import Task
from app.services.schedule import DEFAULT_MINUTES, rank

# A safety net so a huge backlog can never loop for long. Beyond it, what is left goes on the
# last day (over capacity) rather than being lost.
MAX_DAYS_AHEAD = 366
TITLE_MAX = 200


@dataclass(frozen=True)
class Move:
    task: Task
    from_date: date
    to_date: date


@dataclass(frozen=True)
class Part:
    title: str
    day: date
    minutes: int


@dataclass(frozen=True)
class Split:
    task: Task
    total_minutes: int
    parts: list[Part]  # parts[0] stays on the original task


@dataclass(frozen=True)
class Plan:
    moves: list[Move]
    splits: list[Split]

    @property
    def is_empty(self) -> bool:
        return not self.moves and not self.splits


@dataclass
class _Piece:
    task_id: uuid.UUID
    minutes: int
    index: int
    position: int  # rank of its task, so better tasks are placed first


def part_title(title: str, number: int, count: int) -> str:
    """ "Write report (2/3)". The title is shortened if needed so the whole thing fits."""
    suffix = f" ({number}/{count})"
    return title[: TITLE_MAX - len(suffix)].rstrip() + suffix


def _sizes(total: int, count: int) -> list[int]:
    """`total` minutes in `count` equal-as-possible parts (they add up exactly)."""
    base, extra = divmod(total, count)
    return [base + 1 if index < extra else base for index in range(count)]


def plan_rebalance(tasks: list[Task], today: date, capacity: int) -> Plan:
    ranked = [item for item in rank(tasks, today) if item.task.due_date is not None]
    start: dict[uuid.UUID, date] = {}
    waiting: dict[date, list[_Piece]] = defaultdict(list)
    sizes: dict[uuid.UUID, list[int]] = {}

    for position, item in enumerate(ranked):
        task = item.task
        minutes = task.estimated_minutes or DEFAULT_MINUTES
        parts = _sizes(minutes, ceil(minutes / capacity))  # one part when it fits in a day
        sizes[task.id] = parts
        start[task.id] = max(task.due_date, today)  # past-date tasks count on today
        for index, size in enumerate(parts):
            waiting[start[task.id]].append(_Piece(task.id, size, index, position))

    placed: dict[uuid.UUID, list[date]] = defaultdict(list)
    carry: list[_Piece] = []
    day = today
    for _ in range(MAX_DAYS_AHEAD):
        if not carry and not any(later >= day for later in waiting):
            break
        todays = sorted(carry + waiting.pop(day, []), key=lambda p: (p.position, p.index))
        carry, room, used = [], capacity, set()
        for piece in todays:
            # Parts of one task go on different days, in order: once one is handled today,
            # the rest of that task waits for tomorrow.
            if piece.task_id in used or piece.minutes > room:
                carry.append(piece)
            else:
                placed[piece.task_id].append(day)
                room -= piece.minutes
            used.add(piece.task_id)
        day += timedelta(days=1)
    for piece in carry:  # only reached by an enormous backlog
        placed[piece.task_id].append(day)

    moves: list[Move] = []
    splits: list[Split] = []
    for item in ranked:
        task, days, parts = item.task, placed[item.task.id], sizes[item.task.id]
        if len(parts) == 1:
            if days[0] != start[task.id]:
                moves.append(Move(task, task.due_date, days[0]))
        else:
            count = len(parts)
            splits.append(
                Split(
                    task,
                    sum(parts),
                    [
                        Part(
                            part_title(task.title, number, count),
                            days[number - 1],
                            parts[number - 1],
                        )
                        for number in range(1, count + 1)
                    ],
                )
            )
    return Plan(moves, splits)
