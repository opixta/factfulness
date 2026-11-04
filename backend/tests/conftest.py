import os
from collections.abc import Generator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.db import get_db
from app.main import create_app
from app.models import Base

ALEMBIC_CFG = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")


def _truncate(session: Session) -> None:
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(text(f"TRUNCATE {table.name} CASCADE"))
    session.commit()


@pytest.fixture(scope="session")
def database_url() -> str:
    return os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://factfulness:factfulness@localhost:5432/factfulness",
    )


@pytest.fixture(scope="session")
def engine(database_url: str):
    eng = create_engine(database_url, pool_pre_ping=True)
    cfg = Config(ALEMBIC_CFG)
    cfg.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(cfg, "head")
    yield eng


@pytest.fixture()
def db_session(engine) -> Generator[Session, None, None]:
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = SessionLocal()
    _truncate(session)
    yield session
    session.close()
    session = SessionLocal()
    _truncate(session)
    session.close()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    app = create_app()

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
