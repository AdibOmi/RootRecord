import uuid
from datetime import datetime, timedelta
from typing import Any, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import get_settings
from app.core.time import utcnow

_hasher = PasswordHasher()

TokenType = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def _encode(payload: dict[str, Any]) -> str:
    s = get_settings()
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def create_access_token(user_id: uuid.UUID, role: str) -> tuple[str, datetime]:
    expires = utcnow() + timedelta(minutes=get_settings().access_token_minutes)
    token = _encode({"sub": str(user_id), "role": role, "type": "access", "exp": expires})
    return token, expires


def create_refresh_token(user_id: uuid.UUID, jti: uuid.UUID) -> tuple[str, datetime]:
    expires = utcnow() + timedelta(days=get_settings().refresh_token_days)
    token = _encode({"sub": str(user_id), "jti": str(jti), "type": "refresh", "exp": expires})
    return token, expires


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any] | None:
    s = get_settings()
    try:
        payload: dict[str, Any] = jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    return payload
