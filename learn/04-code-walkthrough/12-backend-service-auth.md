# 12 — `services/auth_service.py` (111 lines)

**Purpose:** authenticate users, issue/rotate/revoke tokens, change passwords.
**Called by:** `api/v1/auth.py`, `services/user_service.py:11` (`revoke_all_for_user`).
**Calls:** `core/security.py`, `models.User/RefreshToken`.
→ Skill: `15-http-rest-auth-security.md` §3.

## Module constants and `TokenPair` (lines 19-32)

```python
19 # Verified against when the email is unknown, so response time doesn't reveal which
20 # emails exist.
21 _DUMMY_HASH = hash_password("not-a-real-password")    # computed once at import (~tens of ms)
23 REUSE_GRACE = timedelta(seconds=30)

26 @dataclass
27 class TokenPair:
28     access_token: str
29     access_expires: datetime
30     refresh_token: str
31     refresh_expires: datetime
32     refresh_jti: uuid.UUID
```
A dataclass groups the five values the router needs for cookies.

## `_issue_tokens` (35-40)

```python
35 def _issue_tokens(db: Session, user: User) -> TokenPair:
36     jti = uuid.uuid4()
37     refresh, refresh_exp = create_refresh_token(user.id, jti)
38     db.add(RefreshToken(id=jti, user_id=user.id, expires_at=refresh_exp))   # server-side record
39     access, access_exp = create_access_token(user.id, user.role.value)
40     return TokenPair(access, access_exp, refresh, refresh_exp, jti)
```
No commit — callers commit with their other changes (atomic).

## `authenticate` (43-55)

```python
43 def authenticate(db: Session, email: str, password: str) -> tuple[User, TokenPair]:
44     user = db.scalar(select(User).where(User.email == email.lower()))   # emails stored lower-case
45     if user is None:
46         verify_password(password, _DUMMY_HASH)                         # equalise timing
47         raise Unauthorized("Incorrect email or password")
48     if not verify_password(password, user.password_hash):
49         raise Unauthorized("Incorrect email or password")              # same message
50     if not user.is_active:
51         raise Unauthorized("This account has been deactivated. Contact the clinic admin.")
52     user.last_login_at = utcnow()
53     tokens = _issue_tokens(db, user)
54     db.commit()
55     return user, tokens
```
Order matters: the "deactivated" message only appears **after** a correct password — otherwise it would
reveal that an account exists to someone guessing.

## `revoke_all_for_user` (58-63)

```python
58 def revoke_all_for_user(db: Session, user_id: uuid.UUID) -> None:
59     db.execute(
60         update(RefreshToken)
61         .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
62         .values(revoked_at=utcnow())
63     )
```
Bulk UPDATE (one SQL statement); no commit (callers commit).

## `rotate_refresh_token` (66-93)

| Lines | Step | Failure → |
|---|---|---|
| 68-70 | decode JWT, must be type `refresh` | 401 "Session expired" |
| 72-74 | load the DB row by `jti` | unknown jti → 401 |
| 76-83 | already revoked? if revoked > 30 s ago → `revoke_all_for_user` + commit (theft response); always 401 | 401 |
| 85-87 | user inactive or row expired | 401 |
| 89-92 | issue new pair, mark old revoked + `replaced_by_id`, commit | — |

The grace window handles two tabs racing (both send the same refresh token within milliseconds).

## `logout` (96-103)

```python
96  def logout(db: Session, raw_token: str | None) -> None:
97      payload = decode_token(raw_token, "refresh") if raw_token else None
98      if payload is None:
99          return                                   # nothing to revoke; still clear cookies
100     stored = db.get(RefreshToken, uuid.UUID(payload["jti"]))
101     if stored is not None and stored.revoked_at is None:
102         stored.revoked_at = utcnow()
103         db.commit()
```

## `change_password` (106-111)

```python
106 def change_password(db: Session, user: User, current: str, new: str) -> None:
107     if not verify_password(current, user.password_hash):
108         raise BadRequest("Current password is incorrect", code="invalid_password")   # 400, not 401
109     user.password_hash = hash_password(new)
110     revoke_all_for_user(db, user.id)             # sign out everywhere
111     db.commit()
```
400 (not 401) because the *session* is valid; it's the form input that's wrong — and a 401 would trigger
the frontend's silent-refresh logic (`client.ts:119`).

## Q&A

**Q:** 🟢 Why the same "Incorrect email or password" message for both cases?

**A:** Distinct messages would let attackers enumerate which emails have accounts (tested in
`tests/test_auth.py:29-36`).

**Q:** 🟡 What does `_DUMMY_HASH` defend against?

**A:** A timing side channel: without it, unknown emails return instantly while known ones take an
Argon2 verify (~50 ms). Verifying against a dummy hash makes both paths take similar time.

**Q:** 🟡 Why is `change_password`'s wrong-password error a 400?

**A:** The user is authenticated; the request content is invalid. A 401 would make the client think the
session expired and attempt a token refresh, then show "session expired".

**Q:** 🔴 Walk through what happens when an attacker replays a stolen refresh token an hour after the
victim already refreshed.

**A:** `decode_token` succeeds (not expired), the row exists, `revoked_at` is set (rotated an hour
ago) and more than 30 s old → all the victim's refresh tokens are revoked and committed, and the
attacker gets 401. The victim's next refresh also fails, so they log in again — and the attacker's
copy is now useless (`auth_service.py:76-83`).

**Q:** 🔴 Is there a race in `rotate_refresh_token`?

**A:** Two requests with the same token can both read `revoked_at IS NULL` before either commits
(Read Committed), and both issue new pairs. The grace logic tolerates it, but strictly you'd use
`SELECT … FOR UPDATE` on the token row or an atomic `UPDATE … WHERE revoked_at IS NULL RETURNING`.

**Q:** 🟢 Why doesn't `_issue_tokens` commit?

**A:** So the token row is committed together with `last_login_at` (login) or the old token's
revocation (rotation) — one atomic transaction.

**Q:** 🟡 What's `replaced_by_id` useful for?

**A:** Auditing/debugging the rotation chain (which token replaced which) and potentially revoking a
whole chain on reuse; it isn't read by the code today.
