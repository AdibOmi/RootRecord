# 05 — `app/core/errors.py` (108 lines)

**Purpose:** domain exception classes and handlers producing one JSON error format
`{"error": {"code", "message", "details"}}`.
**Called by:** services and deps raise `NotFound`, `Conflict`, `Unauthorized`, `Forbidden`,
`BadRequest`; `main.py:30` calls `register_error_handlers`. **Consumed by:** frontend
`api/client.ts:81-98`.

## Imports and logger (lines 1-11)

```python
1  """Consistent error format: {"error": {"code", "message", "details"}}."""
3  import logging
4  from typing import Any
6  from fastapi import FastAPI, Request, status
7  from fastapi.exceptions import RequestValidationError
8  from fastapi.responses import JSONResponse
9  from starlette.exceptions import HTTPException as StarletteHTTPException
11 logger = logging.getLogger("rootrecord")
```
Line 9 imports **Starlette's** `HTTPException` (FastAPI's subclasses it), so the handler catches both
framework 404/405s and any `fastapi.HTTPException`.

## Exception hierarchy (lines 14-51)

```python
14 class AppError(Exception):
15     def __init__(self, status_code: int, code: str, message: str, details: Any | None = None) -> None:
22         super().__init__(message)          # str(exc) == message; nice tracebacks
23         self.status_code = status_code
24         self.code = code                   # stable machine-readable code
25         self.message = message             # human-readable, shown in UI
26         self.details = details             # optional extra data

29 class NotFound(AppError):
30     def __init__(self, what: str = "Resource") -> None:
31         super().__init__(status.HTTP_404_NOT_FOUND, "not_found", f"{what} not found")

34 class Conflict(AppError):          # 409, default code "conflict", callers pass e.g. "email_taken"
39 class Unauthorized(AppError):      # 401 "unauthorized", default "Not authenticated"
44 class Forbidden(AppError):         # 403 "forbidden", default "You do not have permission to do this"
49 class BadRequest(AppError):        # 400, default code "bad_request"
```

Why: services express *what went wrong* in domain terms (`NotFound("Patient")`) without importing
FastAPI responses; one handler maps them to HTTP.

## Helpers (lines 54-67)

```python
54 def _body(code: str, message: str, details: Any | None = None) -> dict[str, Any]:
55     return {"error": {"code": code, "message": message, "details": details}}

58 _HTTP_CODES = {400: "bad_request", 401: "unauthorized", 403: "forbidden", 404: "not_found",
62                405: "method_not_allowed", 409: "conflict", 413: "payload_too_large", 429: "too_many_requests"}
```
`_HTTP_CODES` gives framework-generated errors (e.g. unknown route 404, wrong method 405) the same
codes as domain errors.

## Handlers (lines 70-107)

```python
70 def register_error_handlers(app: FastAPI) -> None:
71     @app.exception_handler(AppError)
72     async def _app_error(_: Request, exc: AppError) -> JSONResponse:
73         return JSONResponse(status_code=exc.status_code, content=_body(exc.code, exc.message, exc.details))
```
Nested functions registered with a decorator; `_` = unused request. Handles every subclass.

```python
77     @app.exception_handler(RequestValidationError)
78     async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
79         details = [
80             {
81                 "field": ".".join(str(p) for p in err["loc"] if p not in ("body", "query", "path")),
84                 "message": str(err["msg"]).removeprefix("Value error, "),
85             }
86             for err in exc.errors()
87         ]
88         return JSONResponse(status_code=422, content=_body("validation_error", "Some fields are invalid", details))
```
- `err["loc"]` is a tuple like `("body", "medications", 0, "name")` → `"medications.0.name"` (the same
  dotted style the UI uses for uncertain fields).
- Custom validators raising `ValueError("…")` produce `msg = "Value error, …"`; stripping the prefix
  gives clean UI text (e.g. "The follow-up date cannot be before the visit date", asserted in
  `tests/test_prescriptions.py:294-305`).
- ⚠️ For model-level validators, `loc` is just `("body",)` → `field` becomes `""` (empty). The frontend
  shows the message in a toast rather than under a field (`PrescriptionReviewPage.tsx:128-129`).

```python
93     @app.exception_handler(StarletteHTTPException)
94     async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
95         code = _HTTP_CODES.get(exc.status_code, "error")
96         return JSONResponse(status_code=exc.status_code, content=_body(code, str(exc.detail)),
99                             headers=getattr(exc, "headers", None))
```
Preserves headers (e.g. `Allow` on 405, `WWW-Authenticate`).

```python
102    @app.exception_handler(Exception)
103    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
104        logger.exception("Unhandled error", exc_info=exc)        # full traceback in server logs
105        return JSONResponse(status_code=500,
107                            content=_body("internal_error", "Something went wrong. Please try again."))
```
Never leak internals (stack traces, SQL) to clients.

→ Skill: `11-fastapi.md` §3.3, `15-http-rest-auth-security.md` §2.4.

## Q&A

**Q:** 🟢 What JSON does a request to a missing patient return?

**A:** 404 with `{"error": {"code": "not_found", "message": "Patient not found", "details": null}}` —
`patient_service.get` raises `NotFound("Patient")` (`services/patient_service.py:22-26`), handled at
`errors.py:71-75`.

**Q:** 🟡 Why are the handlers `async def` while endpoints are `def`?

**A:** Handlers do no blocking I/O (just build a response), so running them on the event loop is
cheapest; endpoints do blocking DB work and run in the thread pool.

**Q:** 🟡 Why separate `code` and `message`?

**A:** `code` is a stable contract for programs (`patient_code_taken` → highlight the ID field,
`EditPatientDialog.tsx:70`); `message` is for people and can be reworded or translated without breaking
the frontend.

**Q:** 🔴 A validation error happens in a `model_validator`. What is `field` in the response, and how
could you improve it?

**A:** `loc` is `("body",)`, filtered out → `field: ""`. Improvement: raise `PydanticCustomError` with
a location, use a field validator for single-field rules, or in the service raise
`BadRequest(details=[{"field": "follow_up_date", …}])`.

**Q:** 🟢 What does `removeprefix("Value error, ")` do?

**A:** Pydantic prefixes messages from `ValueError`s raised in validators with "Value error, "; removing
it leaves the message written by the developer.

**Q:** 🟡 What does the catch-all handler protect against?

**A:** Information disclosure (tracebacks, SQL, file paths in responses) and inconsistent error formats;
it also guarantees a log entry with the stack trace.

**Q:** 🔴 Does catching `Exception` in a FastAPI handler swallow the exception entirely?

**A:** The client gets the JSON 500, but Starlette's `ServerErrorMiddleware` still re-raises it after
sending the response, so the server also logs it. The explicit `logger.exception` ensures it's logged
under the app's own logger.
