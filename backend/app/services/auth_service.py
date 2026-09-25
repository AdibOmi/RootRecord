import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.errors import BadRequest, Unauthorized
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.time import utcnow
from app.models.user import RefreshToken, User

# Verified against when the email is unknown, so response time doesn't reveal which
# emails exist.
_DUMMY_HASH = hash_password("not-a-real-password")

REUSE_GRACE = timedelta(seconds=30)


@dataclass
class TokenPair:
    access_token: str
    access_expires: datetime
    refresh_token: str
    refresh_expires: datetime
    refresh_jti: uuid.UUID


def _issue_tokens(db: Session, user: User) -> TokenPair:
    jti = uuid.uuid4()
    refresh, refresh_exp = create_refresh_token(user.id, jti)
    db.add(RefreshToken(id=jti, user_id=user.id, expires_at=refresh_exp))
    access, access_exp = create_access_token(user.id, user.role.value)
    return TokenPair(access, access_exp, refresh, refresh_exp, jti)


def authenticate(db: Session, email: str, password: str) -> tuple[User, TokenPair]:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        verify_password(password, _DUMMY_HASH)
        raise Unauthorized("Incorrect email or password")
    if not verify_password(password, user.password_hash):
        raise Unauthorized("Incorrect email or password")
    if not user.is_active:
        raise Unauthorized("This account has been deactivated. Contact the clinic admin.")
    user.last_login_at = utcnow()
    tokens = _issue_tokens(db, user)
    db.commit()
    return user, tokens


def revoke_all_for_user(db: Session, user_id: uuid.UUID) -> None:
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )


def rotate_refresh_token(db: Session, raw_token: str | None) -> tuple[User, TokenPair]:
    """Exchange a valid refresh token for a new pair. Detects token reuse."""
    payload = decode_token(raw_token, "refresh") if raw_token else None
    if payload is None:
        raise Unauthorized("Session expired. Please sign in again.")

    stored = db.get(RefreshToken, uuid.UUID(payload["jti"]))
    if stored is None:
        raise Unauthorized("Session expired. Please sign in again.")

    if stored.revoked_at is not None:
        # Two tabs refreshing at the same moment is normal; outside that grace
        # window, a replayed revoked token may have been stolen, so end every
        # session for this user.
        if utcnow() - stored.revoked_at > REUSE_GRACE:
            revoke_all_for_user(db, stored.user_id)
            db.commit()
        raise Unauthorized("Session expired. Please sign in again.")

    user = stored.user
    if not user.is_active or stored.expires_at <= utcnow():
        raise Unauthorized("Session expired. Please sign in again.")

    tokens = _issue_tokens(db, user)
    stored.revoked_at = utcnow()
    stored.replaced_by_id = tokens.refresh_jti
    db.commit()
    return user, tokens


def logout(db: Session, raw_token: str | None) -> None:
    payload = decode_token(raw_token, "refresh") if raw_token else None
    if payload is None:
        return
    stored = db.get(RefreshToken, uuid.UUID(payload["jti"]))
    if stored is not None and stored.revoked_at is None:
        stored.revoked_at = utcnow()
        db.commit()


def change_password(db: Session, user: User, current: str, new: str) -> None:
    if not verify_password(current, user.password_hash):
        raise BadRequest("Current password is incorrect", code="invalid_password")
    user.password_hash = hash_password(new)
    revoke_all_for_user(db, user.id)
    db.commit()
