# 10 — `api/v1/auth.py` and `api/v1/users.py`

## `backend/app/api/v1/auth.py` (85 lines)

**Purpose:** login, refresh, logout, me, change-password endpoints; cookie management.
**Called by:** frontend `api/auth.ts`, `api/client.ts:104` (refresh). **Calls:** `auth_service`.

```python
12 router = APIRouter(prefix="/auth", tags=["auth"])
14 # The refresh cookie is only sent to the auth endpoints.
15 REFRESH_PATH = "/api/v1/auth"
```

```python
18 def _set_auth_cookies(response: Response, tokens: TokenPair) -> None:
19     secure = get_settings().cookie_secure
20     response.set_cookie(ACCESS_COOKIE, tokens.access_token, expires=tokens.access_expires,
23                         httponly=True, secure=secure, samesite="lax", path="/")
29     response.set_cookie(REFRESH_COOKIE, tokens.refresh_token, expires=tokens.refresh_expires,
32                         httponly=True, secure=secure, samesite="lax", path=REFRESH_PATH)

40 def _clear_auth_cookies(response: Response) -> None:
41     response.delete_cookie(ACCESS_COOKIE, path="/")
42     response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH)   # must match the path used when setting
```
`delete_cookie` sets an expired cookie with the same name **and path**; a different path would leave the
original cookie in place.

```python
45 @router.post("/login", response_model=UserOut)
46 def login(body: LoginRequest, response: Response, db: DB) -> object:
47     user, tokens = auth_service.authenticate(db, body.email, body.password)
48     _set_auth_cookies(response, tokens)
49     return user                                   # filtered through UserOut

52 @router.post("/refresh", response_model=UserOut)
53 def refresh(response: Response, db: DB, rr_refresh: Annotated[str | None, Cookie()] = None) -> object:
58     user, tokens = auth_service.rotate_refresh_token(db, rr_refresh)
59     _set_auth_cookies(response, tokens)
60     return user

63 @router.post("/logout", response_model=Message)
64 def logout(response: Response, db: DB, rr_refresh: Annotated[str | None, Cookie()] = None) -> Message:
69     auth_service.logout(db, rr_refresh)           # revoke server-side (no error if already invalid)
70     _clear_auth_cookies(response)
71     return Message(message="Signed out")

74 @router.get("/me", response_model=UserOut)
75 def me(user: CurrentUser) -> object:
76     return user

79 @router.post("/change-password", response_model=Message)
80 def change_password(body: PasswordChange, response: Response, user: CurrentUser, db: DB) -> Message:
83     auth_service.change_password(db, user, body.current_password, body.new_password)
84     _clear_auth_cookies(response)                 # sign this browser out too
85     return Message(message="Password changed. Please sign in again.")
```
- Logout requires **no** auth: a user with an expired access token can still log out.
- `refresh` reads only the refresh cookie (path-scoped so the browser sends it here).
- Returning the user from `/refresh` lets the client update `me` in one round-trip (the client
  currently ignores the body; `client.ts:105`).

## `backend/app/api/v1/users.py` (61 lines)

**Purpose:** admin-only staff management. **Calls:** `user_service`. Every endpoint has `AdminUser`.

```python
15 @router.get("", response_model=Page[UserOut])
16 def list_users(db: DB, _: AdminUser, params: Annotated[PageParams, Depends()],
20                q: str | None = Query(None, max_length=100), role: UserRole | None = None,
22                is_active: bool | None = None) -> Page[UserOut]:
24     rows, total = user_service.list_users(db, params, q=q, role=role, is_active=is_active)
25     return Page(items=[UserOut.model_validate(r) for r in rows], total=total, page=params.page, page_size=params.page_size)

33 @router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
34 def create_user(body: UserCreate, db: DB, _: AdminUser) -> object:
35     return user_service.create(db, body)

38 @router.get("/{user_id}", response_model=UserOut)              → user_service.get
43 @router.patch("/{user_id}", response_model=UserOut)            → user_service.update(db, get(...), body)
48 @router.post("/{user_id}/deactivate", response_model=UserOut)  → set_active(..., False, admin)
53 @router.post("/{user_id}/activate", response_model=UserOut)    → set_active(..., True, admin)
58 @router.post("/{user_id}/reset-password", response_model=Message)
59 def reset_password(user_id, body: PasswordReset, db, _: AdminUser) -> Message:
60     user_service.reset_password(db, user_service.get(db, user_id), body.new_password)
61     return Message(message="Password reset. The user must sign in again.")
```
- `""` path → `/api/v1/users` (no trailing slash).
- `?is_active=false` is parsed to `bool` by FastAPI (`false`, `0`, `no` accepted).
- `deactivate`/`activate` receive the acting `admin` to block self-deactivation.
- No frontend page uses these endpoints yet (Settings is a placeholder) — they're tested in
  `tests/test_users.py`.

## Q&A

**Q:** 🟢 Why does `login` take `response: Response` as a parameter?

**A:** To set cookies on the outgoing response while still returning a Pydantic-serialised body;
FastAPI merges headers set on the injected `Response` into the final response.

**Q:** 🟡 Why is the refresh cookie's path `/api/v1/auth`?

**A:** The browser only attaches it to URLs under that path, so the long-lived token isn't sent with
every API call or photo request — less exposure in logs/proxies (`auth.py:14-15, 36`).

**Q:** 🟡 Why does `change-password` clear cookies on this device?

**A:** The service revokes **all** refresh tokens (`auth_service.py:110`), so the current refresh
cookie is useless anyway; clearing both cookies makes the browser state consistent and the UI sends
the user to login (`ChangePasswordDialog.tsx:53-54`).

**Q:** 🔴 Is it a problem that `/logout` doesn't require authentication?

**A:** No — it can only revoke the refresh token presented in the caller's own cookie and clear cookies;
it can't affect other users. Requiring auth would make logout fail for users whose access token expired.

**Q:** 🟢 What status does `POST /users` return and why?

**A:** 201 Created (`users.py:33`) — the REST convention for successful resource creation.

**Q:** 🟡 How would an admin find inactive dentists?

**A:** `GET /api/v1/users?role=dentist&is_active=false&page=1&page_size=20`; filters map to
`user_service.list_users` `where` clauses (`user_service.py:33-36`).
