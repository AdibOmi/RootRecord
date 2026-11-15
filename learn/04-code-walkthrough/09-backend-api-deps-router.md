# 09 — `api/deps.py` and `api/v1/router.py`

## `backend/app/api/deps.py` (55 lines)

**Purpose:** reusable FastAPI dependencies: DB session, current user, role checks.
**Called by:** every router. **Calls:** `core/db.get_db`, `core/security.decode_token`, `models.User`.

```python
1  """FastAPI dependencies: DB session, current user and role checks."""
3  import uuid
4  from collections.abc import Callable
5  from typing import Annotated
7  from fastapi import Cookie, Depends
8  from sqlalchemy.orm import Session
10 from app.core.db import get_db
11 from app.core.errors import Forbidden, Unauthorized
12 from app.core.security import decode_token
13 from app.models.user import User, UserRole

15 ACCESS_COOKIE = "rr_access"                   # rr_ prefix avoids clashes on shared domains
16 REFRESH_COOKIE = "rr_refresh"

18 DB = Annotated[Session, Depends(get_db)]       # type alias with DI metadata
```

```python
21 def get_current_user(
22     db: DB,
23     rr_access: Annotated[str | None, Cookie()] = None,   # parameter name = cookie name
24 ) -> User:
25     payload = decode_token(rr_access, "access") if rr_access else None
26     if payload is None:
27         raise Unauthorized()
28     user = db.get(User, uuid.UUID(payload["sub"]))       # PK lookup
29     # Checked on every request so deactivation takes effect immediately.
30     if user is None or not user.is_active:
31         raise Unauthorized()
32     return user

35 CurrentUser = Annotated[User, Depends(get_current_user)]
```
- Line 23: `Cookie()` tells FastAPI to read the value from the `Cookie` header; the parameter name
  must match the cookie name (`rr_access`) — which is why it isn't `ACCESS_COOKIE`.
- Line 28: deleted user → `None` → 401. (A forged `sub` isn't possible without the secret.)
- The user object from this session is the same one services modify (same `db`, cached per request).

```python
38 def require_roles(*roles: UserRole) -> Callable[[User], User]:
39     """Dependency factory: allow only the given roles."""
41     def checker(user: CurrentUser) -> User:
42         if user.role not in roles:
43             raise Forbidden()
44         return user
46     return checker

49 AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]
50 # Any staff member (usually the assistant) can photograph and upload prescriptions.
51 ScanUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTIONIST))]
54 # Only dentists (and admins) confirm what was read and file it in the record.
55 ClinicalUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.DENTIST))]
```
- `checker` depends on `CurrentUser` → authentication happens first (401), then authorisation (403).
- `ScanUser` currently allows every role — equivalent to `CurrentUser` today, but documents intent and
  survives adding new roles (e.g. a "viewer").

→ Skill: `11-fastapi.md` §3.1, `15-http-rest-auth-security.md` §4.1.

## `backend/app/api/v1/router.py` (14 lines)

```python
3  from app.api.v1 import auth, patients, prescriptions, users
5  api_router = APIRouter(prefix="/api/v1")
6  api_router.include_router(auth.router)            # /api/v1/auth/*
7  api_router.include_router(users.router)           # /api/v1/users/*
8  api_router.include_router(patients.router)        # /api/v1/patients/*
9  api_router.include_router(prescriptions.router)   # /api/v1/prescriptions/*

12 @api_router.get("/health", tags=["meta"])
13 def health() -> dict[str, str]:
14     return {"status": "ok"}                        # liveness: process is up (no DB check)
```

## Q&A

**Q:** 🟢 What's the difference between the 401 and 403 raised here?

**A:** `get_current_user` raises `Unauthorized` (401) when there's no valid token or the user is
missing/inactive; `checker` raises `Forbidden` (403) when the user is known but lacks the role.

**Q:** 🟡 If an endpoint uses both `db: DB` and `user: ClinicalUser`, how many sessions are created?

**A:** One. FastAPI caches dependency results per request, so `get_db` runs once and the same Session
is passed to `get_current_user` and the endpoint.

**Q:** 🟡 Why check `is_active` on every request instead of trusting the token?

**A:** Tokens are valid until they expire; checking the DB makes deactivation immediate
(`tests/test_auth.py:89-98`). The cost is one primary-key lookup per request.

**Q:** 🔴 How would you add a "read-only auditor" role?

**A:** Add `AUDITOR` to `UserRole` + an Alembic migration (`ALTER TYPE user_role ADD VALUE`), leave
`ScanUser`/`ClinicalUser`/`AdminUser` as they are (auditor excluded), and decide whether
`CurrentUser`-only endpoints (e.g. `PATCH /patients`) should become role-restricted. Mirror it in
`frontend/src/lib/permissions.ts`.

**Q:** 🟢 Why a dependency *factory* instead of three hand-written functions?

**A:** `require_roles(*roles)` generates checkers for any role combination with one implementation;
the `Annotated` aliases keep endpoint signatures readable.

**Q:** 🟡 What would a better health check include?

**A:** A readiness endpoint that runs `SELECT 1` against the DB (and optionally checks the storage dir
is writable), separate from liveness, so orchestrators don't route traffic to an instance without a DB.
