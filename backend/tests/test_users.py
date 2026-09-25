from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.models.user import User, UserRole
from tests.conftest import MakeUser, login

AsRole = Callable[[UserRole], tuple[TestClient, User]]

NEW_STAFF = {
    "email": "Rahim.Dentist@Test.Clinic",
    "full_name": "Dr. Rahim Uddin",
    "phone": "01712345678",
    "role": "dentist",
    "password": "Welcome@123",
}


@pytest.mark.parametrize("role", [UserRole.DENTIST, UserRole.RECEPTIONIST])
def test_non_admins_cannot_manage_staff(as_role: AsRole, role: UserRole) -> None:
    client, _ = as_role(role)
    assert client.get("/api/v1/users").status_code == 403
    res = client.post("/api/v1/users", json=NEW_STAFF)
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "forbidden"


def test_admin_creates_staff_with_normalized_fields(as_role: AsRole) -> None:
    client, _ = as_role(UserRole.ADMIN)
    res = client.post("/api/v1/users", json=NEW_STAFF)

    assert res.status_code == 201, res.text
    body = res.json()
    assert body["email"] == "rahim.dentist@test.clinic"
    assert body["phone"] == "+8801712345678"
    assert body["is_active"] is True


def test_duplicate_email_is_rejected(as_role: AsRole) -> None:
    client, _ = as_role(UserRole.ADMIN)
    assert client.post("/api/v1/users", json=NEW_STAFF).status_code == 201
    res = client.post("/api/v1/users", json=NEW_STAFF)
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "email_taken"


def test_invalid_phone_and_short_password_are_rejected(as_role: AsRole) -> None:
    client, _ = as_role(UserRole.ADMIN)
    res = client.post(
        "/api/v1/users", json={**NEW_STAFF, "phone": "01212345678", "password": "short"}
    )
    assert res.status_code == 422
    fields = {d["field"] for d in res.json()["error"]["details"]}
    assert fields == {"phone", "password"}


def test_list_users_is_paginated(as_role: AsRole, make_user: MakeUser) -> None:
    client, _ = as_role(UserRole.ADMIN)
    for _ in range(3):
        make_user(UserRole.DENTIST)

    res = client.get("/api/v1/users", params={"page": 1, "page_size": 2, "role": "dentist"})
    body = res.json()
    assert res.status_code == 200
    assert body["total"] == 3
    assert body["page_size"] == 2
    assert len(body["items"]) == 2


def test_deactivate_and_reset_password(
    as_role: AsRole, make_user: MakeUser, client: TestClient
) -> None:
    admin_client, _ = as_role(UserRole.ADMIN)
    staff = make_user(UserRole.RECEPTIONIST)

    res = admin_client.post(f"/api/v1/users/{staff.id}/deactivate")
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    res = admin_client.post(
        f"/api/v1/users/{staff.id}/reset-password", json={"new_password": "Fresh@1234"}
    )
    assert res.status_code == 200

    admin_client.post(f"/api/v1/users/{staff.id}/activate")
    client.cookies.clear()
    login(client, staff, "Fresh@1234")


def test_admin_cannot_deactivate_self(as_role: AsRole) -> None:
    client, admin = as_role(UserRole.ADMIN)
    res = client.post(f"/api/v1/users/{admin.id}/deactivate")
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "self_deactivate"


def test_last_admin_cannot_be_demoted(as_role: AsRole) -> None:
    client, admin = as_role(UserRole.ADMIN)
    res = client.patch(f"/api/v1/users/{admin.id}", json={"role": "dentist"})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "last_admin"


def test_unknown_user_returns_404(as_role: AsRole) -> None:
    client, _ = as_role(UserRole.ADMIN)
    res = client.get("/api/v1/users/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404
