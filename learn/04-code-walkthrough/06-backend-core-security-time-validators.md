# 06 — `core/security.py`, `core/time.py`, `core/validators.py`

## `backend/app/core/security.py` (53 lines)

**Purpose:** password hashing (Argon2) and JWT creation/verification.
**Called by:** `services/auth_service.py`, `services/user_service.py:7`, `api/deps.py:12`,
`tests/conftest.py:16`.

```python
1  import uuid
2  from datetime import datetime, timedelta
3  from typing import Any, Literal
5  import jwt                                            # PyJWT
6  from argon2 import PasswordHasher
7  from argon2.exceptions import InvalidHashError, VerificationError
9  from app.core.config import get_settings
10 from app.core.time import utcnow

12 _hasher = PasswordHasher()                            # argon2id, library-default cost params
14 TokenType = Literal["access", "refresh"]
```

```python
17 def hash_password(password: str) -> str:
18     return _hasher.hash(password)                     # salt generated internally; params encoded in the string

21 def verify_password(password: str, password_hash: str) -> bool:
22     try:
23         return _hasher.verify(password_hash, password)    # note argument order: hash first
24     except (VerificationError, InvalidHashError):
25         return False                                  # wrong password or corrupt hash → just False
```
`VerifyMismatchError` is a subclass of `VerificationError`. Returning a bool keeps callers simple.
(Not implemented: `_hasher.check_needs_rehash(hash)` to upgrade parameters over time.)

```python
28 def _encode(payload: dict[str, Any]) -> str:
29     s = get_settings()
30     return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)

33 def create_access_token(user_id: uuid.UUID, role: str) -> tuple[str, datetime]:
34     expires = utcnow() + timedelta(minutes=get_settings().access_token_minutes)
35     token = _encode({"sub": str(user_id), "role": role, "type": "access", "exp": expires})
36     return token, expires                             # expiry returned for the cookie's Expires

39 def create_refresh_token(user_id: uuid.UUID, jti: uuid.UUID) -> tuple[str, datetime]:
40     expires = utcnow() + timedelta(days=get_settings().refresh_token_days)
41     token = _encode({"sub": str(user_id), "jti": str(jti), "type": "refresh", "exp": expires})
42     return token, expires
```
PyJWT converts a `datetime` `exp` to a Unix timestamp. UUIDs are stringified (JSON has no UUID type).

```python
45 def decode_token(token: str, expected_type: TokenType) -> dict[str, Any] | None:
46     s = get_settings()
47     try:
48         payload: dict[str, Any] = jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
49     except jwt.PyJWTError:                            # bad signature, expired, malformed…
50         return None
51     if payload.get("type") != expected_type:          # stop refresh-as-access (token confusion)
52         return None
53     return payload
```
`algorithms=[...]` must be a list of allowed algorithms — pinning it prevents algorithm-confusion
attacks. → Skill: `15-http-rest-auth-security.md` §3.1-3.2.

## `backend/app/core/time.py` (25 lines)

**Purpose:** one place for "now" and clinic-local dates. **Called by:** `security.py`,
`auth_service.py`, `patient_service.py:10`, `prescription_service.py:17`.

```python
1  """Time helpers. The database stores UTC; the clinic operates in Asia/Dhaka."""
3  from datetime import UTC, date, datetime, time, timedelta
4  from zoneinfo import ZoneInfo
6  CLINIC_TZ = ZoneInfo("Asia/Dhaka")                     # UTC+6, no DST

9  def utcnow() -> datetime:
10     return datetime.now(UTC)                           # timezone-AWARE (never datetime.utcnow(), which is naive & deprecated)

13 def clinic_today() -> date:
14     return datetime.now(CLINIC_TZ).date()              # "today" for the clinic, not the server

17 def to_clinic(dt: datetime) -> datetime:
18     return dt.astimezone(CLINIC_TZ)                    # currently unused

21 def clinic_day_bounds_utc(day: date) -> tuple[datetime, datetime]:
22     """Return the half-open interval [start, end) of a clinic-local day, in UTC."""
23     start = datetime.combine(day, time.min, tzinfo=CLINIC_TZ)
24     end = start + timedelta(days=1)
25     return start.astimezone(UTC), end.astimezone(UTC)  # currently unused (for "today's appointments")
```

Why `clinic_today()` matters: between 00:00 and 06:00 Dhaka time it's still "yesterday" in UTC. The
next-follow-up calculation (`patient_service.py:51`) and the prompt's "Today's date"
(`prescription_service.py:161`) must use the clinic's date. **Half-open interval** `[start, end)`
avoids double-counting midnight. `to_clinic` and `clinic_day_bounds_utc` are prepared for future
features (no callers — grep confirms).

## `backend/app/core/validators.py` (23 lines)

**Purpose:** Bangladesh mobile number normalisation as a reusable Pydantic type.
**Called by:** `schemas/user.py:7`, `schemas/patient.py:7`, `services/patient_service.py:11,157`.

```python
8  _BD_MOBILE = re.compile(r"^01[3-9]\d{8}$")            # 11 digits: 01 + operator digit 3-9 + 8 digits

11 def normalize_bd_phone(value: str) -> str:
12     """Accept 01XXXXXXXXX, 8801XXXXXXXXX or +8801XXXXXXXXX; return +8801XXXXXXXXX."""
13     digits = re.sub(r"[\s\-()]", "", value)            # strip spaces, dashes, brackets
14     if digits.startswith("+"):
15         digits = digits[1:]
16     if digits.startswith("880"):
17         digits = "0" + digits[3:]                      # 8801712… → 01712…
18     if not _BD_MOBILE.match(digits):
19         raise ValueError("Enter a valid Bangladeshi mobile number (01XXXXXXXXX)")
20     return "+88" + digits                              # canonical: +8801712345678

23 BDPhone = Annotated[str, AfterValidator(normalize_bd_phone)]
```
Pre-compiling the regex (line 8) avoids recompiling per call. The frontend has the same logic in
`lib/phone.ts:1-19` (tested in `format.test.ts:32-45`).

## Q&A

**Q:** 🟢 Why does `verify_password` catch exceptions instead of letting them propagate?

**A:** argon2-cffi raises on mismatch; the caller only needs yes/no. Catching `InvalidHashError` also
means a corrupt stored hash behaves like a wrong password rather than a 500.

**Q:** 🟡 What stops someone from using a refresh token as an access token?

**A:** The `type` claim: `decode_token(..., "access")` returns `None` unless `payload["type"] ==
"access"` (`security.py:51-52`). Both are signed with the same secret, so without this check they'd
be interchangeable.

**Q:** 🟡 Why `datetime.now(UTC)` rather than `datetime.utcnow()`?

**A:** `utcnow()` returns a *naive* datetime (no tzinfo) and is deprecated since 3.12; comparing naive
and aware datetimes raises `TypeError`. Aware UTC datetimes match the `timestamptz` columns.

**Q:** 🟡 Why is `clinic_today()` used instead of `date.today()` for follow-ups?

**A:** The server runs in UTC; at 02:00 in Dhaka, `date.today()` on the server is the previous day,
which would show an already-passed follow-up as "next".

**Q:** 🔴 What's the downside of `PasswordHasher()` defaults?

**A:** Defaults are reasonable (argon2id, 64 MiB, t=3, p=4) but fixed by library version; there's no
`check_needs_rehash` on login to upgrade old hashes when parameters change, and each login costs
~64 MiB of RAM — combined with no rate limiting, many parallel logins could pressure memory.

**Q:** 🟢 What does `+88` + `017…` produce and why store that form?

**A:** `+8801712345678` — an E.164-style international number usable by SMS/WhatsApp gateways and
consistent for exact matching (`patient_service.py:161`).

**Q:** 🟡 Is the JWT payload secret?

**A:** No. It's base64url-encoded JSON; anyone holding the token can read `sub`, `role`, `exp`. Only
the signature prevents tampering. That's why there's nothing sensitive in it.
