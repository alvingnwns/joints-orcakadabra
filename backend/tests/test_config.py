from app.config import Settings


def test_defaults_are_safe_for_local_development():
    settings = Settings(_env_file=None)

    assert settings.cors_origin_list == ["http://localhost:3000"]
    assert settings.llm_api_key == ""


def test_environment_overrides_defaults(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example, https://b.example ,")
    monkeypatch.setenv("LLM_MODEL", "some/model")

    settings = Settings(_env_file=None)

    assert settings.cors_origin_list == ["https://a.example", "https://b.example"]
    assert settings.llm_model == "some/model"
