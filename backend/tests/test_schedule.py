import uuid
from datetime import UTC, date, datetime, timedelta

from fastapi.testclient import TestClient

from app.config import DAILY_CAPACITY_MINUTES
from app.models import Task, TaskStatus
from app.services import schedule
from app.services.schedule import build_today, build_week, heavy_reason, rank
from tests.test_tasks_crud import new_task, new_workspace

TODAY = date(2026, 10, 14)


def in_days(n: int) -> date:
    return TODAY + timedelta(days=n)


_counter = iter(range(10_000))


def make_task(title="Task", *, due=None, minutes=None, impact=3, status=TaskStatus.TODO) -> Task:
    """An unsaved Task. created_at increases with every call, so creation order is known."""
    return Task(
        id=uuid.uuid4(),
        title=title,
        due_date=due,
        estimated_minutes=minutes,
        impact_score=impact,
        status=status,
        created_at=datetime(2026, 10, 1, tzinfo=UTC) + timedelta(seconds=next(_counter)),
    )


def titles(items) -> list[str]:
    return [item.task.title for item in items]


# --- service: ranking ---


def test_empty_workspace():
    today = build_today([], TODAY)
    assert (today.top, today.rest, today.heavy_load, today.delay_suggestion) == ([], [], None, None)

    week = build_week([], TODAY)
    assert [day for day, _ in week.days] == [in_days(n) for n in range(7)]
    assert all(bucket.tasks == [] and bucket.total_minutes == 0 for _, bucket in week.days)
    assert week.unscheduled.tasks == []


def test_done_and_deferred_tasks_are_left_out():
    tasks = [
        make_task("Open", due=TODAY),
        make_task("Done", due=TODAY, status=TaskStatus.DONE),
        make_task("Later", due=TODAY, status=TaskStatus.DEFERRED),
        make_task("Started", status=TaskStatus.IN_PROGRESS),
    ]

    assert titles(rank(tasks, TODAY)) == ["Open", "Started"]


def test_scores_use_the_given_today_not_the_stored_scores():
    task = make_task(due=in_days(1))
    task.priority_score = 1  # stale stored value is ignored

    (item,) = rank([task], TODAY)
    assert (item.priority.urgency, item.priority.score) == (4, 7)
    (item,) = rank([task], in_days(1))
    assert item.priority.urgency == 5


def test_ranking_is_stable_for_the_same_input():
    tasks = [make_task(f"T{n}", due=in_days(n % 3), impact=1 + n % 5) for n in range(12)]

    first = titles(rank(tasks, TODAY))
    assert titles(rank(list(reversed(tasks)), TODAY)) == first


# --- service: today ---


def test_light_day_top_three_and_rest():
    tasks = [
        make_task("Due today, really matters", due=TODAY, impact=5, minutes=30),
        make_task("Past its date", due=in_days(-2), impact=3, minutes=30),
        make_task("Tomorrow", due=in_days(1), impact=3, minutes=30),
        make_task("Undated small", impact=1),
        make_task("Next week", due=in_days(6), impact=1),
    ]

    today = build_today(tasks, TODAY)

    assert titles(today.top) == ["Due today, really matters", "Past its date", "Tomorrow"]
    # "Also today" keeps undated tasks and leaves future-dated ones for the week view.
    assert titles(today.rest) == ["Undated small"]
    assert today.heavy_load is None and today.delay_suggestion is None


def test_heavy_day_over_capacity_suggests_the_lowest_past_date_task():
    tasks = [
        make_task("Big today", due=TODAY, impact=5, minutes=120),
        make_task("Old small deal", due=in_days(-1), impact=1, minutes=90),
        make_task("Old matters", due=in_days(-1), impact=3, minutes=60),
    ]

    today = build_today(tasks, TODAY)

    assert today.heavy_load is not None
    assert today.heavy_load.reason == "over_capacity"
    assert today.heavy_load.total_minutes == 270
    assert today.heavy_load.capacity_minutes == DAILY_CAPACITY_MINUTES
    assert today.delay_suggestion.task.title == "Old small deal"


def test_exactly_at_capacity_is_not_heavy():
    tasks = [make_task(due=TODAY, minutes=120), make_task(due=TODAY, minutes=120)]

    assert build_today(tasks, TODAY).heavy_load is None


def test_tasks_without_estimate_count_as_30_minutes():
    tasks = [make_task(due=TODAY) for _ in range(8)]  # 8 x 30 = 240, at capacity
    assert build_today(tasks, TODAY).heavy_load is None

    tasks.append(make_task(due=TODAY))
    assert build_today(tasks, TODAY).heavy_load.total_minutes == 270


def test_more_than_two_long_tasks_is_heavy_even_under_capacity(monkeypatch):
    # With the fixed 240 minutes, 3 long tasks always go over capacity first. The rule matters
    # once capacity is higher (OPT6), so it is checked with a raised capacity.
    monkeypatch.setattr(schedule, "DAILY_CAPACITY_MINUTES", 720)
    two_long = rank([make_task(minutes=180) for _ in range(2)], TODAY)
    three_long = rank([make_task(minutes=121) for _ in range(3)], TODAY)

    assert heavy_reason(two_long) is None
    assert heavy_reason(three_long) == "many_long_tasks"
    assert heavy_reason([]) is None


def test_heavy_day_with_everything_due_today_still_suggests_one():
    tasks = [
        make_task("Matters", due=TODAY, impact=3, minutes=150),
        make_task("Small deal", due=TODAY, impact=1, minutes=150),
    ]

    today = build_today(tasks, TODAY)

    assert today.heavy_load is not None
    assert today.delay_suggestion.task.title == "Small deal"


def test_future_and_undated_tasks_do_not_make_today_heavy():
    tasks = [make_task(minutes=600), make_task(due=in_days(1), minutes=600)]

    assert build_today(tasks, TODAY).heavy_load is None


# --- service: week ---


def test_week_buckets():
    tasks = [
        make_task("Past", due=in_days(-3), minutes=60),
        make_task("Today", due=TODAY, minutes=200),
        make_task("Day 6", due=in_days(6)),
        make_task("Too far", due=in_days(7)),
        make_task("Undated", minutes=45),
        make_task("Done", due=in_days(2), status=TaskStatus.DONE),
    ]

    week = build_week(tasks, TODAY)
    days = dict(week.days)

    assert titles(days[TODAY].tasks) == ["Past", "Today"]  # 8 vs 7 (long-task penalty)
    assert days[TODAY].total_minutes == 260
    assert days[TODAY].is_heavy is True
    assert titles(days[in_days(6)].tasks) == ["Day 6"]
    assert days[in_days(6)].is_heavy is False
    assert days[in_days(2)].tasks == []
    assert all("Too far" not in titles(bucket.tasks) for bucket in days.values())
    assert titles(week.unscheduled.tasks) == ["Undated"]
    assert week.unscheduled.total_minutes == 45


# --- API ---


def test_today_endpoint_shape_and_fresh_scores(client: TestClient):
    headers = new_workspace(client)
    new_task(client, headers, title="Due on the 15th", due_date=in_days(1).isoformat())

    body = client.get(f"/tasks/today?today={TODAY}", headers=headers).json()

    assert body["today"] == TODAY.isoformat()
    (task,) = body["top"]
    assert task["title"] == "Due on the 15th"
    assert (task["urgency_score"], task["priority_score"]) == (4, 7)  # relative to ?today=
    assert task["reasons"][0] == "it is due tomorrow"
    assert body["rest"] == []
    assert body["heavy_load"] is None and body["delay_suggestion"] is None


def test_today_endpoint_heavy_load_and_suggestion(client: TestClient):
    headers = new_workspace(client)
    new_task(
        client, headers, title="Big", due_date=str(TODAY), estimated_minutes=200, impact_score=5
    )
    small = new_task(
        client,
        headers,
        title="Small",
        due_date=str(in_days(-1)),
        estimated_minutes=60,
        impact_score=1,
    )

    body = client.get(f"/tasks/today?today={TODAY}", headers=headers).json()

    assert body["heavy_load"] == {
        "is_heavy": True,
        "reason": "over_capacity",
        "total_minutes": 260,
        "capacity_minutes": 240,
    }
    assert body["delay_suggestion"] == {"task_id": small["id"], "reason": "past_its_date"}


def test_today_endpoint_excludes_done_deferred_and_other_workspaces(client: TestClient):
    mine, theirs = new_workspace(client), new_workspace(client)
    new_task(client, mine, title="Open")
    for status in ("done", "deferred"):
        task = new_task(client, mine, title=status)
        client.patch(f"/tasks/{task['id']}", json={"status": status}, headers=mine)
    new_task(client, theirs, title="Theirs")

    body = client.get(f"/tasks/today?today={TODAY}", headers=mine).json()

    assert [task["title"] for task in body["top"] + body["rest"]] == ["Open"]


def test_week_endpoint(client: TestClient):
    headers = new_workspace(client)
    new_task(client, headers, title="Day 2", due_date=str(in_days(2)), estimated_minutes=90)
    new_task(client, headers, title="Undated")

    body = client.get(f"/tasks/week?today={TODAY}", headers=headers).json()

    assert body["capacity_minutes"] == 240
    assert [day["date"] for day in body["days"]] == [str(in_days(n)) for n in range(7)]
    day_2 = body["days"][2]
    assert (day_2["task_count"], day_2["total_minutes"], day_2["is_heavy"]) == (1, 90, False)
    assert day_2["tasks"][0]["title"] == "Day 2"
    assert body["unscheduled"]["date"] is None
    assert body["unscheduled"]["task_count"] == 1
    assert body["unscheduled"]["total_minutes"] == 30


def test_today_defaults_to_the_server_date(client: TestClient):
    headers = new_workspace(client)

    for path in ("/tasks/today", "/tasks/week"):
        assert client.get(path, headers=headers).json()["today"] == date.today().isoformat()


def test_invalid_today_is_rejected(client: TestClient):
    response = client.get("/tasks/today?today=14-10-2026", headers=new_workspace(client))

    assert response.status_code == 422


def test_schedule_needs_a_workspace(client: TestClient):
    assert client.get("/tasks/today").status_code == 422
