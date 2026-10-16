"""Rearranging overfull days: moving overflow to later days and splitting very long tasks."""

import random
import uuid
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.models import Task, TaskStatus
from app.services.rebalance import part_title, plan_rebalance
from tests.test_tasks_crud import new_task, new_workspace

TODAY = date(2026, 10, 16)
CAPACITY = 240


def day(offset: int) -> date:
    return TODAY + timedelta(days=offset)


def make_task(title, offset, minutes, impact=3, status=TaskStatus.TODO, created=0) -> Task:
    return Task(
        id=uuid.uuid4(),
        title=title,
        due_date=None if offset is None else day(offset),
        estimated_minutes=minutes,
        impact_score=impact,
        status=status,
        created_at=datetime(2026, 10, 1, tzinfo=UTC) + timedelta(seconds=created),
    )


def schedule_after(tasks: list[Task], capacity: int = CAPACITY) -> dict[date, int]:
    """Minutes per day once the plan is applied (a simulation, not the API)."""
    plan = plan_rebalance(tasks, TODAY, capacity)
    moved = {move.task.id: move.to_date for move in plan.moves}
    split = {item.task.id: item for item in plan.splits}
    load: dict[date, int] = defaultdict(int)
    for task in tasks:
        if task.due_date is None or task.status not in (TaskStatus.TODO, TaskStatus.IN_PROGRESS):
            continue
        if task.id in split:
            for part in split[task.id].parts:
                load[part.day] += part.minutes
        else:
            when = moved.get(task.id, max(task.due_date, TODAY))
            load[when] += task.estimated_minutes or 30
    return load


# --- nothing to do ---


def test_a_day_that_fits_is_left_alone():
    tasks = [make_task("A", 0, 100), make_task("B", 0, 140)]  # exactly 240

    plan = plan_rebalance(tasks, TODAY, CAPACITY)

    assert plan.is_empty


def test_no_tasks_is_an_empty_plan():
    assert plan_rebalance([], TODAY, CAPACITY).is_empty


# --- moving overflow ---


def test_the_lowest_ranked_task_moves_to_the_next_day():
    tasks = [
        make_task("Important", 0, 120, impact=5),
        make_task("Medium", 0, 100, impact=3),
        make_task("Small deal", 0, 90, impact=1),
    ]

    plan = plan_rebalance(tasks, TODAY, CAPACITY)

    assert [(m.task.title, m.to_date) for m in plan.moves] == [("Small deal", day(1))]
    assert plan.splits == []


def test_overflow_goes_to_the_first_day_that_has_room():
    tasks = [
        make_task("Today A", 0, 200, impact=5),
        make_task("Today B", 0, 100, impact=1),
        make_task("Tomorrow full", 1, 240, impact=5),
        make_task("Day after", 2, 60, impact=3),
    ]

    plan = plan_rebalance(tasks, TODAY, CAPACITY)

    moved = {m.task.title: m.to_date for m in plan.moves}
    assert moved["Today B"] == day(2)  # tomorrow has no room, the day after does


def test_a_big_task_that_does_not_fit_leaves_room_for_smaller_ones_after_it():
    tasks = [
        make_task("First", 0, 150, impact=5),
        make_task("Big", 0, 150, impact=3),
        make_task("Small", 0, 60, impact=1),
    ]

    plan = plan_rebalance(tasks, TODAY, CAPACITY)

    assert {m.task.title: m.to_date for m in plan.moves} == {
        "Big": day(1)
    }  # Small still fits today


def test_nothing_is_ever_moved_earlier():
    tasks = [make_task("Later", 4, 30), make_task("Today", 0, 30)]

    assert plan_rebalance(tasks, TODAY, CAPACITY).is_empty  # room today, but "Later" stays put


def test_past_date_tasks_count_on_today_and_stay_if_they_fit():
    tasks = [make_task("Old", -3, 60), make_task("Today", 0, 60)]

    assert plan_rebalance(tasks, TODAY, CAPACITY).is_empty


def test_a_past_date_task_that_does_not_fit_moves_forward_from_today():
    tasks = [make_task("Old", -3, 200, impact=1), make_task("Today", 0, 200, impact=5)]

    plan = plan_rebalance(tasks, TODAY, CAPACITY)

    assert [(m.task.title, m.to_date) for m in plan.moves] == [("Old", day(1))]


def test_a_task_without_an_estimate_counts_as_30_minutes():
    tasks = [make_task("Blank", 0, None) for _ in range(9)]  # 270 minutes

    plan = plan_rebalance(tasks, TODAY, CAPACITY)

    assert len(plan.moves) == 1  # only one has to move for 240


def test_undated_done_and_deferred_tasks_are_not_touched():
    tasks = [
        make_task("Undated", None, 700),
        make_task("Done", 0, 700, status=TaskStatus.DONE),
        make_task("Later list", 0, 700, status=TaskStatus.DEFERRED),
    ]

    assert plan_rebalance(tasks, TODAY, CAPACITY).is_empty


def test_it_follows_the_capacity_the_person_chose():
    tasks = [make_task("A", 0, 100), make_task("B", 0, 100)]

    assert plan_rebalance(tasks, TODAY, 240).is_empty
    assert len(plan_rebalance(tasks, TODAY, 180).moves) == 1
    assert plan_rebalance(tasks, TODAY, 720).is_empty


def test_the_same_input_always_gives_the_same_plan():
    tasks = [make_task(f"T{n}", n % 3, 90 + n * 5, impact=1 + n % 5, created=n) for n in range(12)]

    first, second = plan_rebalance(tasks, TODAY, CAPACITY), plan_rebalance(tasks, TODAY, CAPACITY)

    assert [(m.task.id, m.to_date) for m in first.moves] == [
        (m.task.id, m.to_date) for m in second.moves
    ]


# --- splitting a task longer than a whole day ---


def test_a_task_longer_than_a_day_is_split_into_equal_parts_on_consecutive_days():
    tasks = [make_task("Write the report", 0, 600)]

    plan = plan_rebalance(tasks, TODAY, CAPACITY)

    assert plan.moves == []
    (split,) = plan.splits
    assert [(p.title, p.day, p.minutes) for p in split.parts] == [
        ("Write the report (1/3)", day(0), 200),
        ("Write the report (2/3)", day(1), 200),
        ("Write the report (3/3)", day(2), 200),
    ]
    assert split.total_minutes == 600


def test_split_parts_add_up_exactly_even_when_they_cannot_be_equal():
    tasks = [make_task("Odd", 0, 601)]

    (split,) = plan_rebalance(tasks, TODAY, CAPACITY).splits

    assert sorted(p.minutes for p in split.parts) == [200, 200, 201]
    assert sum(p.minutes for p in split.parts) == 601


def test_a_task_just_over_a_day_becomes_two_sensible_parts_not_a_tiny_leftover():
    tasks = [make_task("Slightly big", 0, 245)]

    (split,) = plan_rebalance(tasks, TODAY, CAPACITY).splits

    assert [p.minutes for p in split.parts] == [123, 122]


def test_a_task_exactly_a_day_long_is_not_split():
    assert plan_rebalance([make_task("Whole day", 0, 240)], TODAY, CAPACITY).is_empty


def test_split_parts_wait_for_days_with_room_and_stay_in_order():
    tasks = [
        make_task("Busy today", 0, 200, impact=5),
        make_task("Huge", 0, 480, impact=3),
    ]

    (split,) = plan_rebalance(tasks, TODAY, CAPACITY).splits

    assert [p.day for p in split.parts] == [day(1), day(2)]  # today has only 40 minutes left
    assert [p.minutes for p in split.parts] == [240, 240]


def test_a_later_part_never_jumps_ahead_of_an_earlier_one_that_had_to_wait():
    # 245 minutes splits into 123 + 122. Today has exactly 122 minutes of room: part 2 would
    # fit, but part 1 (123) does not, so both must wait and stay in order.
    tasks = [make_task("Busy", 0, 118, impact=5), make_task("Big", 0, 245, impact=3)]

    (split,) = plan_rebalance(tasks, TODAY, CAPACITY).splits

    assert [(p.title, p.day) for p in split.parts] == [
        ("Big (1/2)", day(1)),
        ("Big (2/2)", day(2)),
    ]


def test_an_over_long_title_is_shortened_so_the_part_label_fits():
    title = "x" * 200

    labelled = part_title(title, 2, 3)

    assert labelled.endswith(" (2/3)") and len(labelled) <= 200


# --- properties that must always hold ---


@pytest.mark.parametrize("seed", range(60))
def test_whatever_the_tasks_are_nothing_is_lost_overfilled_or_pulled_earlier(seed: int):
    rng = random.Random(seed)
    capacity = rng.choice([30, 60, 120, 240, 360, 720])
    tasks = [
        make_task(
            f"T{n}",
            rng.choice([None, -2, 0, 0, 0, 1, 1, 2, 5, 9]),
            rng.choice([None, 5, 20, 45, 90, 200, 300, 500, 720]),
            impact=rng.randint(1, 5),
            created=n,
        )
        for n in range(rng.randint(1, 25))
    ]
    planned = [t for t in tasks if t.due_date is not None]

    plan = plan_rebalance(tasks, TODAY, capacity)
    load = schedule_after(tasks, capacity)

    # every minute is still there
    assert sum(load.values()) == sum(t.estimated_minutes or 30 for t in planned)
    # no day is over the person's limit
    assert all(minutes <= capacity for minutes in load.values())
    # nothing moves earlier than where it was
    for move in plan.moves:
        assert move.to_date > max(move.from_date, TODAY)
    # parts go on strictly later days, in order
    for split in plan.splits:
        days = [p.day for p in split.parts]
        assert days == sorted(set(days))
        assert days[0] >= max(split.task.due_date, TODAY)
        assert all(p.minutes <= capacity for p in split.parts)


def test_a_huge_backlog_on_a_tiny_day_still_finishes_and_keeps_every_minute():
    tasks = [make_task(f"Big {n}", 0, 720) for n in range(5)]  # 60 hours into 30-minute days

    plan = plan_rebalance(tasks, TODAY, 30)

    assert sum(sum(p.minutes for p in s.parts) for s in plan.splits) == 5 * 720


# --- through the API ---


def seed_overfull(client, headers):
    for title, minutes, impact in [("Report", 120, 5), ("Email", 100, 3), ("Tidy desk", 90, 1)]:
        new_task(
            client,
            headers,
            title=title,
            due_date=TODAY.isoformat(),
            estimated_minutes=minutes,
            impact_score=impact,
        )


def rebalance(client, headers, *, apply: bool):
    return client.post(
        "/tasks/rebalance", json={"today": TODAY.isoformat(), "apply": apply}, headers=headers
    )


def week_days(client, headers):
    params = {"today": TODAY.isoformat()}
    return client.get("/tasks/week", params=params, headers=headers).json()["days"]


def test_a_preview_changes_nothing(client: TestClient):
    headers = new_workspace(client)
    seed_overfull(client, headers)
    before = client.get("/tasks", headers=headers).json()

    response = rebalance(client, headers, apply=False)

    assert response.status_code == 200
    body = response.json()
    assert body["applied"] is False
    assert [m["title"] for m in body["moves"]] == ["Tidy desk"]
    assert body["moves"][0]["to_date"] == day(1).isoformat()
    assert client.get("/tasks", headers=headers).json() == before


def test_applying_makes_every_day_fit(client: TestClient):
    headers = new_workspace(client)
    seed_overfull(client, headers)
    assert week_days(client, headers)[0]["is_heavy"] is True

    body = rebalance(client, headers, apply=True).json()

    assert body["applied"] is True
    days = week_days(client, headers)
    assert days[0]["total_minutes"] == 220 and days[0]["is_heavy"] is False
    assert days[1]["total_minutes"] == 90
    assert [t["title"] for t in days[1]["tasks"]] == ["Tidy desk"]


def test_applying_twice_changes_nothing_the_second_time(client: TestClient):
    headers = new_workspace(client)
    seed_overfull(client, headers)
    rebalance(client, headers, apply=True)
    after_first = client.get("/tasks", headers=headers).json()

    second = rebalance(client, headers, apply=True).json()

    assert second["applied"] is False and second["moves"] == [] and second["splits"] == []
    assert client.get("/tasks", headers=headers).json() == after_first


def test_a_task_longer_than_the_day_is_split_into_real_tasks(client: TestClient):
    headers = new_workspace(client)
    original = new_task(
        client,
        headers,
        title="Write the thesis chapter",
        description="Chapters 3 and 4",
        due_date=TODAY.isoformat(),
        estimated_minutes=600,
        impact_score=4,
    )

    body = rebalance(client, headers, apply=True).json()

    (split,) = body["splits"]
    assert split["title"] == "Write the thesis chapter"  # the title it had before
    assert [p["minutes"] for p in split["parts"]] == [200, 200, 200]
    tasks = {t["title"]: t for t in client.get("/tasks", headers=headers).json()}
    assert set(tasks) == {f"Write the thesis chapter ({n}/3)" for n in (1, 2, 3)}
    first = tasks["Write the thesis chapter (1/3)"]
    assert first["id"] == original["id"]  # the original task is part 1
    for number, offset in [(1, 0), (2, 1), (3, 2)]:
        part = tasks[f"Write the thesis chapter ({number}/3)"]
        assert part["due_date"] == day(offset).isoformat()
        assert part["estimated_minutes"] == 200
        assert part["impact_score"] == 4
        assert part["description"] == "Chapters 3 and 4"
        assert part["status"] == "todo"
        assert part["priority_score"] is not None  # scored like any task
    assert all(d["total_minutes"] <= CAPACITY for d in week_days(client, headers))


def test_it_uses_the_workspaces_own_capacity(client: TestClient):
    headers = new_workspace(client)
    seed_overfull(client, headers)  # 310 minutes today
    assert rebalance(client, headers, apply=False).json()["moves"] != []

    client.patch(f"/workspaces/{headers['X-Workspace-Id']}", json={"daily_capacity_minutes": 360})
    body = rebalance(client, headers, apply=False).json()

    assert body["capacity_minutes"] == 360 and body["moves"] == []


def test_only_this_workspaces_tasks_are_touched(client: TestClient):
    mine, theirs = new_workspace(client), new_workspace(client)
    seed_overfull(client, mine)
    seed_overfull(client, theirs)
    their_tasks = client.get("/tasks", headers=theirs).json()

    rebalance(client, mine, apply=True)

    assert client.get("/tasks", headers=theirs).json() == their_tasks


def test_done_and_later_tasks_are_never_moved(client: TestClient):
    headers = new_workspace(client)
    seed_overfull(client, headers)
    done = new_task(
        client, headers, title="Done", due_date=TODAY.isoformat(), estimated_minutes=600
    )
    client.patch(f"/tasks/{done['id']}", json={"status": "done"}, headers=headers)

    body = rebalance(client, headers, apply=True).json()

    assert body["splits"] == []
    finished = client.get(f"/tasks/{done['id']}", headers=headers).json()
    assert finished["title"] == "Done" and finished["due_date"] == TODAY.isoformat()


def test_it_needs_the_users_date_and_a_workspace(client: TestClient):
    headers = new_workspace(client)

    assert client.post("/tasks/rebalance", json={}, headers=headers).status_code == 422
    assert client.post("/tasks/rebalance", json={"today": TODAY.isoformat()}).status_code == 422
