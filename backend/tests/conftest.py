"""Test setup: a dedicated Postgres database, migrated once, with each test
wrapped in a transaction that is rolled back afterwards."""

from collections.abc import Callable, Iterator

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from alembic import command
from app.core.config import get_settings
from app.core.db import get_db
from app.core.security import hash_password
from app.main import app
from app.models.user import User, UserRole

TEST_PASSWORD = "Secret@123"


def _ensure_database(url: str) -> None:
    parsed = make_url(url)
    admin = create_engine(parsed.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        exists = conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": parsed.database}
        )
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{parsed.database}"'))
    admin.dispose()


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    url = get_settings().test_database_url
    _ensure_database(url)
    eng = create_engine(url)
    with eng.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))

    cfg = Config("alembic.ini")
    cfg.attributes["url"] = url
    command.upgrade(cfg, "head")
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    conn = engine.connect()
    trans = conn.begin()
    session = Session(bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False)
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        conn.close()


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


MakeUser = Callable[..., User]


@pytest.fixture
def make_user(db: Session) -> MakeUser:
    counter = {"n": 0}

    def _make(role: UserRole = UserRole.RECEPTIONIST, **kwargs: object) -> User:
        counter["n"] += 1
        user = User(
            email=str(kwargs.pop("email", f"{role.value}{counter['n']}@test.clinic")),
            full_name=str(kwargs.pop("full_name", f"Test {role.value.title()} {counter['n']}")),
            role=role,
            password_hash=hash_password(TEST_PASSWORD),
            **kwargs,
        )
        db.add(user)
        db.commit()
        return user

    return _make


def login(client: TestClient, user: User, password: str = TEST_PASSWORD) -> None:
    res = client.post("/api/v1/auth/login", json={"email": user.email, "password": password})
    assert res.status_code == 200, res.text


@pytest.fixture
def as_role(
    client: TestClient, make_user: MakeUser
) -> Callable[[UserRole], tuple[TestClient, User]]:
    """Log the test client in as a fresh user with the given role."""

    def _as(role: UserRole) -> tuple[TestClient, User]:
        user = make_user(role)
        login(client, user)
        return client, user

    return _as
