from typing import Annotated

from fastapi import APIRouter, Cookie, Response

from app.api.deps import ACCESS_COOKIE, DB, REFRESH_COOKIE, CurrentUser
from app.core.config import get_settings
from app.schemas.common import Message
from app.schemas.user import LoginRequest, PasswordChange, UserOut
from app.services import auth_service
from app.services.auth_service import TokenPair

router = APIRouter(prefix="/auth", tags=["auth"])

# The refresh cookie is only sent to the auth endpoints.
REFRESH_PATH = "/api/v1/auth"


def _set_auth_cookies(response: Response, tokens: TokenPair) -> None:
    secure = get_settings().cookie_secure
    response.set_cookie(
        ACCESS_COOKIE,
        tokens.access_token,
        expires=tokens.access_expires,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        tokens.refresh_token,
        expires=tokens.refresh_expires,
        httponly=True,
        secure=secure,
        samesite="lax",
        path=REFRESH_PATH,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH)


@router.post("/login", response_model=UserOut)
def login(body: LoginRequest, response: Response, db: DB) -> object:
    user, tokens = auth_service.authenticate(db, body.email, body.password)
    _set_auth_cookies(response, tokens)
    return user


@router.post("/refresh", response_model=UserOut)
def refresh(
    response: Response,
    db: DB,
    rr_refresh: Annotated[str | None, Cookie()] = None,
) -> object:
    user, tokens = auth_service.rotate_refresh_token(db, rr_refresh)
    _set_auth_cookies(response, tokens)
    return user


@router.post("/logout", response_model=Message)
def logout(
    response: Response,
    db: DB,
    rr_refresh: Annotated[str | None, Cookie()] = None,
) -> Message:
    auth_service.logout(db, rr_refresh)
    _clear_auth_cookies(response)
    return Message(message="Signed out")


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> object:
    return user


@router.post("/change-password", response_model=Message)
def change_password(
    body: PasswordChange, response: Response, user: CurrentUser, db: DB
) -> Message:
    auth_service.change_password(db, user, body.current_password, body.new_password)
    _clear_auth_cookies(response)
    return Message(message="Password changed. Please sign in again.")
