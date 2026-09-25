"""Consistent error format: {"error": {"code", "message", "details"}}."""

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("rootrecord")


class AppError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


class NotFound(AppError):
    def __init__(self, what: str = "Resource") -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, "not_found", f"{what} not found")


class Conflict(AppError):
    def __init__(self, message: str, code: str = "conflict", details: Any = None) -> None:
        super().__init__(status.HTTP_409_CONFLICT, code, message, details)


class Unauthorized(AppError):
    def __init__(self, message: str = "Not authenticated") -> None:
        super().__init__(status.HTTP_401_UNAUTHORIZED, "unauthorized", message)


class Forbidden(AppError):
    def __init__(self, message: str = "You do not have permission to do this") -> None:
        super().__init__(status.HTTP_403_FORBIDDEN, "forbidden", message)


class BadRequest(AppError):
    def __init__(self, message: str, code: str = "bad_request", details: Any = None) -> None:
        super().__init__(status.HTTP_400_BAD_REQUEST, code, message, details)


def _body(code: str, message: str, details: Any | None = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details}}


_HTTP_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    429: "too_many_requests",
}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code, content=_body(exc.code, exc.message, exc.details)
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {
                "field": ".".join(
                    str(p) for p in err["loc"] if p not in ("body", "query", "path")
                ),
                "message": str(err["msg"]).removeprefix("Value error, "),
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=_body("validation_error", "Some fields are invalid", details),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _HTTP_CODES.get(exc.status_code, "error")
        return JSONResponse(
            status_code=exc.status_code,
            content=_body(code, str(exc.detail)),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_body("internal_error", "Something went wrong. Please try again."),
        )
