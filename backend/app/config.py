"""Application settings, read from environment variables and an optional local .env file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# Fixed daily capacity until users can set their own (A14, OPT6).
DAILY_CAPACITY_MINUTES = 240


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database (used from CP2). Local development defaults to the Docker Compose Postgres.
    # 127.0.0.1, not localhost: on Windows, localhost tries IPv6 first and stalls for minutes.
    database_url: str = "postgresql+psycopg://orca:orca@127.0.0.1:5432/orca"

    # Comma-separated list of allowed browser origins (wired up in CP3).
    cors_origins: str = "http://localhost:3000"

    # LLM provider (used from CP12). The key lives in the backend only, never in the frontend.
    llm_api_key: str = ""
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = "qwen/qwen3-14b"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
