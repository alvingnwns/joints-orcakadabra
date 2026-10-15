"""Database fixtures. Tests use the separate `orca_test` database from docker-compose.

The schema is built once per run with the real migrations, and each test runs inside
a transaction that is rolled back afterwards.
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.db import get_db
from app.main import app
from app.services.llm import get_llm

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://orca:orca@127.0.0.1:5432/orca_test"
)
BACKEND_DIR = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def db_engine() -> Iterator[Engine]:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.downgrade(cfg, "base")  # start from an empty schema every run
    command.upgrade(cfg, "head")

    engine = create_engine(TEST_DATABASE_URL)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(db_engine: Engine) -> Iterator[Session]:
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    """API client whose requests use the rolled-back test session."""
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


class FakeLLM:
    """Stands in for LLMClient's JSON calls: returns `result` or raises it, records the prompt."""

    def __init__(self, result):
        self.result = result
        self.messages = None

    def complete_json(self, *, messages, schema_name, schema):
        self.messages = messages
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


@pytest.fixture
def fake_llm():
    """Call it with the result the model should give (or an exception it should raise)."""

    def install(result) -> FakeLLM:
        fake = FakeLLM(result)
        app.dependency_overrides[get_llm] = lambda: fake
        return fake

    yield install
    app.dependency_overrides.pop(get_llm, None)
