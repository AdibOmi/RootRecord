"""FastAPI dependencies: DB session, current user and role checks."""

import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import Cookie, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import Forbidden, Unauthorized
from app.core.security import decode_token
from app.models.user import User, UserRole

ACCESS_COOKIE = "rr_access"
REFRESH_COOKIE = "rr_refresh"

DB = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DB,
    rr_access: Annotated[str | None, Cookie()] = None,
) -> User:
    payload = decode_token(rr_access, "access") if rr_access else None
    if payload is None:
        raise Unauthorized()
    user = db.get(User, uuid.UUID(payload["sub"]))
    # Checked on every request so deactivation takes effect immediately.
    if user is None or not user.is_active:
        raise Unauthorized()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    """Dependency factory: allow only the given roles."""

    def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise Forbidden()
        return user

    return checker


AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]
# Any staff member (usually the assistant) can photograph and upload prescriptions.
ScanUser = Annotated[
    User, Depends(require_roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTIONIST))
]
# Only dentists (and admins) confirm what was read and file it in the record.
ClinicalUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.DENTIST))]
