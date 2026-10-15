from fastapi.testclient import TestClient

from app.services.llm import LLMInvalidOutput, LLMUnavailable
from tests.test_tasks_crud import new_task, new_workspace


def estimate(client: TestClient, headers: dict, **body):
    payload = {"title": "Call the bank about the card", "locale": "en", **body}
    return client.post("/tasks/estimate", json=payload, headers=headers)


def answer(minutes=15, reason="A quick phone call usually takes 10 to 15 minutes."):
    return {"estimated_minutes": minutes, "estimate_reason": reason}


def test_estimate_returns_minutes_and_a_reason_and_saves_nothing(client: TestClient, fake_llm):
    fake_llm(answer())
    headers = new_workspace(client)

    response = estimate(client, headers)

    assert response.status_code == 200
    assert response.json() == answer()
    assert client.get("/tasks", headers=headers).json() == []


def test_the_model_sees_the_title_and_the_notes_and_answers_in_the_users_language(
    client: TestClient, fake_llm
):
    fake = fake_llm(answer())

    estimate(
        client,
        new_workspace(client),
        title="Prepare the slides",
        description="Twelve slides for the board, with charts",
        locale="id",
    )

    system, user = fake.messages
    assert "Indonesian" in system["content"]
    assert "using both the title and the notes" in system["content"]
    assert "Prepare the slides" in user["content"]
    assert "Twelve slides for the board" in user["content"]


def test_estimate_works_without_notes(client: TestClient, fake_llm):
    fake_llm(answer(30))

    assert estimate(client, new_workspace(client)).json()["estimated_minutes"] == 30


def test_estimate_stays_within_task_limits_and_on_the_five_minute_grid(
    client: TestClient, fake_llm
):
    headers = new_workspace(client)

    for raw, expected in [(1, 5), (14, 15), (17, 15), (3000, 720)]:
        fake_llm(answer(raw))
        assert estimate(client, headers).json()["estimated_minutes"] == expected


def test_a_malformed_model_answer_is_a_friendly_502(client: TestClient, fake_llm):
    for bad in [{"estimated_minutes": "soon"}, {"estimate_reason": "x"}, [], {}]:
        fake_llm(bad)
        response = estimate(client, new_workspace(client))
        assert response.status_code == 502
        assert response.json()["detail"] == "ai_invalid_output"


def test_llm_errors_map_to_codes_the_frontend_can_show(client: TestClient, fake_llm):
    headers = new_workspace(client)

    fake_llm(LLMUnavailable("down"))
    assert estimate(client, headers).json()["detail"] == "ai_unavailable"

    fake_llm(LLMInvalidOutput("nonsense"))
    assert estimate(client, headers).json()["detail"] == "ai_invalid_output"


def test_estimate_needs_a_title_a_workspace_and_a_known_language(client: TestClient, fake_llm):
    fake_llm(answer())
    headers = new_workspace(client)

    assert estimate(client, headers, title="   ").status_code == 422
    assert estimate(client, headers, locale="fr").status_code == 422
    assert estimate(client, headers, description="x" * 2001).status_code == 422
    assert client.post("/tasks/estimate", json={"title": "Hi"}).status_code == 422  # no header


def test_an_existing_task_route_is_not_swallowed_by_estimate(client: TestClient):
    headers = new_workspace(client)
    task = new_task(client, headers)

    assert client.get(f"/tasks/{task['id']}", headers=headers).status_code == 200
