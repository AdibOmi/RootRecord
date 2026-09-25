import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import DB, AdminUser
from app.models.user import UserRole
from app.schemas.common import Message, Page, PageParams
from app.schemas.user import PasswordReset, UserCreate, UserOut, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=Page[UserOut])
def list_users(
    db: DB,
    _: AdminUser,
    params: Annotated[PageParams, Depends()],
    q: str | None = Query(None, max_length=100),
    role: UserRole | None = None,
    is_active: bool | None = None,
) -> Page[UserOut]:
    rows, total = user_service.list_users(db, params, q=q, role=role, is_active=is_active)
    return Page(
        items=[UserOut.model_validate(r) for r in rows],
        total=total,
        page=params.page,
        page_size=params.page_size,
    )


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, db: DB, _: AdminUser) -> object:
    return user_service.create(db, body)


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: uuid.UUID, db: DB, _: AdminUser) -> object:
    return user_service.get(db, user_id)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: uuid.UUID, body: UserUpdate, db: DB, _: AdminUser) -> object:
    return user_service.update(db, user_service.get(db, user_id), body)


@router.post("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(user_id: uuid.UUID, db: DB, admin: AdminUser) -> object:
    return user_service.set_active(db, user_service.get(db, user_id), False, admin)


@router.post("/{user_id}/activate", response_model=UserOut)
def activate_user(user_id: uuid.UUID, db: DB, admin: AdminUser) -> object:
    return user_service.set_active(db, user_service.get(db, user_id), True, admin)


@router.post("/{user_id}/reset-password", response_model=Message)
def reset_password(user_id: uuid.UUID, body: PasswordReset, db: DB, _: AdminUser) -> Message:
    user_service.reset_password(db, user_service.get(db, user_id), body.new_password)
    return Message(message="Password reset. The user must sign in again.")
