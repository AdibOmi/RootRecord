from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import RefreshToken, UserRole
from tests.conftest import TEST_PASSWORD, MakeUser, login


def test_login_sets_httponly_cookies_and_returns_user(client: TestClient, make_user: MakeUser) -> None:
    user = make_user(UserRole.DENTIST)
    res = client.post("/api/v1/auth/login", json={"email": user.email, "password": TEST_PASSWORD})

    assert res.status_code == 200
    assert res.json()["role"] == "dentist"
    assert "password_hash" not in res.json()
    set_cookie = res.headers.get_list("set-cookie")
    assert any(c.startswith("rr_access=") and "HttpOnly" in c for c in set_cookie)
    assert any(c.startswith("rr_refresh=") and "Path=/api/v1/auth" in c for c in set_cookie)


def test_login_is_case_insensitive_on_email(client: TestClient, make_user: MakeUser) -> None:
    user = make_user()
    res = client.post(
        "/api/v1/auth/login", json={"email": user.email.upper(), "password": TEST_PASSWORD}
    )
    assert res.status_code == 200


def test_wrong_password_gives_consistent_error(client: TestClient, make_user: MakeUser) -> None:
    user = make_user()
    bad_pw = client.post("/api/v1/auth/login", json={"email": user.email, "password": "nope-nope"})
    no_user = client.post(
        "/api/v1/auth/login", json={"email": "ghost@test.clinic", "password": "nope-nope"}
    )
    assert bad_pw.status_code == no_user.status_code == 401
    assert bad_pw.json()["error"]["message"] == no_user.json()["error"]["message"]


def test_inactive_user_cannot_log_in(client: TestClient, make_user: MakeUser) -> None:
    user = make_user(is_active=False)
    res = client.post("/api/v1/auth/login", json={"email": user.email, "password": TEST_PASSWORD})
    assert res.status_code == 401


def test_me_requires_authentication(client: TestClient) -> None:
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert res.json() == {
        "error": {"code": "unauthorized", "message": "Not authenticated", "details": None}
    }


def test_me_returns_current_user(client: TestClient, make_user: MakeUser) -> None:
    user = make_user(UserRole.ADMIN)
    login(client, user)
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == user.email


def test_refresh_rotates_token(client: TestClient, make_user: MakeUser, db: Session) -> None:
    user = make_user()
    login(client, user)
    old = client.cookies.get("rr_refresh")

    res = client.post("/api/v1/auth/refresh")
    assert res.status_code == 200
    assert client.cookies.get("rr_refresh") != old

    tokens = db.scalars(select(RefreshToken).where(RefreshToken.user_id == user.id)).all()
    assert len(tokens) == 2
    assert sum(t.revoked_at is None for t in tokens) == 1


def test_refresh_without_cookie_is_rejected(client: TestClient) -> None:
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_logout_revokes_refresh_token(client: TestClient, make_user: MakeUser) -> None:
    user = make_user()
    login(client, user)
    old_refresh = client.cookies.get("rr_refresh")

    assert client.post("/api/v1/auth/logout").status_code == 200
    client.cookies.set("rr_refresh", old_refresh or "", path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_deactivated_user_loses_access_immediately(
    client: TestClient, make_user: MakeUser, db: Session
) -> None:
    user = make_user()
    login(client, user)
    assert client.get("/api/v1/auth/me").status_code == 200

    user.is_active = False
    db.commit()
    assert client.get("/api/v1/auth/me").status_code == 401


def test_change_password(client: TestClient, make_user: MakeUser) -> None:
    user = make_user()
    login(client, user)
    res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "wrong-one", "new_password": "NewSecret@1"},
    )
    assert res.status_code == 400

    res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": TEST_PASSWORD, "new_password": "NewSecret@1"},
    )
    assert res.status_code == 200
    login(client, user, "NewSecret@1")
