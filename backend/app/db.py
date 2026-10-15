"""Database engine, session factory, and the FastAPI session dependency."""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

# Stable constraint names, so Alembic migrations stay deterministic and reviewable.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


@lru_cache
def get_engine() -> Engine:
    # Created lazily, so importing the app never needs a running database.
    # prepare_threshold=None turns off psycopg's server-side prepared statements, which a
    # transaction-mode pooler (Supabase port 6543) cannot handle. Harmless everywhere else.
    return create_engine(
        get_settings().database_url, pool_pre_ping=True, connect_args={"prepare_threshold": None}
    )


@lru_cache
def get_sessionmaker() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed afterwards."""
    with get_sessionmaker()() as session:
        yield session
