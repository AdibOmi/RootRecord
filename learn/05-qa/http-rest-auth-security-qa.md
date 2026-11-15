# HTTP, REST, Auth & Security — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## HTTP & REST

**Q:** 🟢 What is HTTP?

**A:** A stateless request/response protocol: method + URL + headers + optional body → status code + headers + body.

**Q:** 🟢 What does "stateless" mean?

**A:** Each request carries everything needed (e.g. cookies/tokens); the server doesn't rely on previous requests' in-memory state.

**Q:** 🟢 What is REST?

**A:** An architectural style: resources identified by URLs, manipulated with standard methods, stateless interactions, standard status codes and representations (JSON).

**Q:** 🟢 GET vs POST?

**A:** GET reads (safe, idempotent, cacheable, no body); POST creates/acts (not idempotent).

**Q:** 🟢 PUT vs PATCH?

**A:** PUT replaces a resource entirely (idempotent); PATCH applies partial changes. Here: `PUT /prescriptions/{id}` (full review) and `PATCH /patients/{id}` (partial).

**Q:** 🟢 What does idempotent mean?

**A:** Repeating the request has the same effect as once — GET, PUT, DELETE are idempotent; POST is not.

**Q:** 🟢 What does "safe" mean for methods?

**A:** Doesn't modify server state (GET, HEAD, OPTIONS).

**Q:** 🟢 What is 200 vs 201 vs 204?

**A:** OK with body; Created (new resource, `POST /prescriptions/scan`); No Content (success, empty body, DELETEs).

**Q:** 🟢 What is 400 vs 422?

**A:** 400: generic bad request / broken domain rule (`too_many_pages`); 422: well-formed but semantically invalid input (validation errors).

**Q:** 🟢 401 vs 403?

**A:** 401 Unauthorized = not authenticated (log in); 403 Forbidden = authenticated but not allowed.

**Q:** 🟢 What is 404?

**A:** Resource not found (`NotFound("Patient")`).

**Q:** 🟢 What is 409?

**A:** Conflict with current state, e.g. duplicate email or patient code.

**Q:** 🟢 What is 429?

**A:** Too Many Requests — rate limited (mapped from Gemini errors to a friendly message).

**Q:** 🟢 What is 500 vs 502 vs 503?

**A:** Server error; bad gateway (proxy got an invalid upstream response); service unavailable (overloaded/maintenance).

**Q:** 🟢 What are headers?

**A:** Metadata key/values: `Content-Type`, `Set-Cookie`, `Cache-Control`, `Content-Disposition`, `Authorization`.

**Q:** 🟢 What is `Content-Type`?

**A:** The body's media type: `application/json`, `multipart/form-data`, `application/pdf`, `image/jpeg`.

**Q:** 🟢 What does `Content-Disposition: attachment; filename="x.pdf"` do?

**A:** Tells the browser to download with that filename (`prescriptions.py:92`).

**Q:** 🟢 What does `Cache-Control: private, no-store` mean?

**A:** Only the user's browser may handle it and it must not be stored at all — for the medical PDF (`prescriptions.py:93`).

**Q:** 🟡 What does `Cache-Control: private, max-age=86400` mean?

**A:** Cacheable for a day but only in private (browser) caches, not shared proxies/CDNs (`prescriptions.py:68`).

**Q:** 🟡 How should non-CRUD actions be modelled in REST?

**A:** As sub-resource actions with POST: `/users/{id}/deactivate`, `/prescriptions/{id}/extract` (`users.py:48`, `prescriptions.py:71`).

**Q:** 🟡 How are errors returned in this API?

**A:** `{"error": {"code", "message", "details"}}` with stable codes (`errors.py:54-55`).

**Q:** 🟡 How is pagination exposed?

**A:** `?page=&page_size=` → `{items, total, page, page_size}` (`README.md:118`).

**Q:** 🟡 Why version an API?

**A:** To introduce breaking changes without breaking existing clients (`/api/v1`).

**Q:** 🟡 What is HATEOAS?

**A:** Hypermedia links in responses guiding clients; rarely used in practice. `image_urls` in `PrescriptionDetail` is a small example of server-provided links.

**Q:** 🟡 REST vs GraphQL?

**A:** REST: multiple resource endpoints, HTTP caching; GraphQL: one endpoint, client-specified fields, avoids over/under-fetching, more complex caching/auth.

**Q:** 🟡 REST vs gRPC?

**A:** gRPC: binary Protobuf, HTTP/2, codegen, streaming — great for service-to-service; REST/JSON is simpler for browsers.

**Q:** 🔴 What are idempotency keys?

**A:** Client-generated keys sent with non-idempotent requests so servers can deduplicate retries (e.g. payments). Useful if scans were retried automatically.

**Q:** 🔴 HTTP/1.1 vs HTTP/2 vs HTTP/3?

**A:** HTTP/2 multiplexes streams over one TCP connection with header compression; HTTP/3 runs over QUIC (UDP) avoiding TCP head-of-line blocking.

## Authentication

**Q:** 🟢 Authentication vs authorization?

**A:** AuthN verifies identity (login); AuthZ decides permissions (roles).

**Q:** 🟢 Why hash passwords?

**A:** So a database leak doesn't reveal passwords; hashes can be verified but not reversed.

**Q:** 🟢 What is a salt?

**A:** Random data stored with each hash making identical passwords hash differently and defeating rainbow tables.

**Q:** 🟢 What is Argon2?

**A:** A memory-hard password hashing algorithm (Argon2id recommended) — expensive to crack on GPUs (`core/security.py:12`).

**Q:** 🟢 What is a JWT?

**A:** A signed token `header.payload.signature` carrying claims like `sub` and `exp`; the server verifies the signature without a DB lookup.

**Q:** 🟢 Is a JWT encrypted?

**A:** No (JWS); the payload is base64url and readable. Don't put secrets in it.

**Q:** 🟢 What claims does this app put in tokens?

**A:** `sub` (user id), `exp`, `type` (`access`/`refresh`), plus `role` in access and `jti` in refresh tokens (`core/security.py:35, 41`).

**Q:** 🟢 What is HS256?

**A:** HMAC with SHA-256 using a shared secret to sign/verify JWTs (`config.py:21`).

**Q:** 🟢 Where are tokens stored on the client?

**A:** In httpOnly cookies `rr_access` and `rr_refresh` (`deps.py:15-16`, `auth.py:18-37`).

**Q:** 🟡 Why short-lived access tokens + refresh tokens?

**A:** Stolen access tokens expire quickly (15 min); refresh tokens are long-lived but stored server-side and revocable.

**Q:** 🟡 What is refresh token rotation?

**A:** Every refresh issues a new refresh token and invalidates the old one (`auth_service.py:89-92`).

**Q:** 🟡 What is refresh token reuse detection?

**A:** If an already-rotated token is presented again, assume theft and revoke all the user's tokens (`auth_service.py:76-83`).

**Q:** 🟡 Why the 30-second grace window?

**A:** Two tabs refreshing simultaneously legitimately reuse the same token; the grace window avoids logging everyone out in that case (`auth_service.py:23, 80`).

**Q:** 🟡 What is `jti`?

**A:** JWT ID — here the primary key of the stored `refresh_tokens` row, allowing revocation lookups (`models/user.py:36`).

**Q:** 🟡 How is logout implemented?

**A:** Revoke the presented refresh token server-side and clear both cookies (`auth_service.py:96-103`, `auth.py:63-71`).

**Q:** 🟡 What happens to sessions on password change?

**A:** All refresh tokens are revoked and the current cookies cleared (`auth_service.py:106-111`).

**Q:** 🟡 How does deactivation take effect immediately?

**A:** `get_current_user` reloads the user and checks `is_active` on every request (`deps.py:28-31`), and deactivation revokes refresh tokens (`user_service.py:98`).

**Q:** 🟡 What is user enumeration and how is it prevented here?

**A:** Learning which accounts exist via different messages/timing; prevented by identical messages and a dummy hash verification for unknown emails (`auth_service.py:19-21, 45-49`).

**Q:** 🟡 Why check `type` when decoding?

**A:** To prevent using a refresh token as an access token (token confusion) since both share the signing key (`core/security.py:51-52`).

**Q:** 🟡 Why pass `algorithms=[...]` to `jwt.decode`?

**A:** Pins accepted algorithms, preventing `alg: none` or algorithm-confusion attacks (`core/security.py:48`).

**Q:** 🟡 How does the frontend refresh silently?

**A:** On a 401, it calls `/auth/refresh` once (single-flight) and retries the request; failure triggers "session expired" (`client.ts:100-130`).

**Q:** 🟡 Session cookies vs JWT?

**A:** Server sessions: opaque id + server store, easy revocation; JWT: self-contained, stateless verification, harder revocation. This app is hybrid: JWT access + DB-tracked refresh.

**Q:** 🟡 HS256 vs RS256?

**A:** HS256 uses one shared secret (sign and verify); RS256 uses a private key to sign and a public key to verify — better when other services verify tokens.

**Q:** 🟡 OAuth 2.0 vs OpenID Connect?

**A:** OAuth 2.0 delegates authorization (access tokens); OIDC adds authentication/identity (ID tokens, userinfo).

**Q:** 🔴 What are the weaknesses of this auth design?

**A:** No rate limiting/lockout, no MFA, access tokens remain valid ≤ 15 min after password change on other devices, known default admin password, `COOKIE_SECURE=false` by default.

**Q:** 🔴 How would you invalidate access tokens immediately on password change?

**A:** Store `password_changed_at`/`token_version` on the user, include it in the token, and reject tokens issued before it in `get_current_user`.

**Q:** 🔴 Why is the refresh cookie path-scoped?

**A:** It's only sent to `/api/v1/auth/*`, reducing exposure of the long-lived credential in other requests and logs (`auth.py:15, 36`).

## Cookies, CSRF, CORS

**Q:** 🟢 What does `HttpOnly` do?

**A:** Makes the cookie inaccessible to JavaScript (`document.cookie`), mitigating token theft via XSS.

**Q:** 🟢 What does `Secure` do?

**A:** Sends the cookie only over HTTPS; set via `COOKIE_SECURE=true` in production (`auth.py:19`).

**Q:** 🟢 What does `SameSite=Lax` do?

**A:** Cookies aren't sent on cross-site subrequests (fetch, POST forms, images) but are sent on top-level GET navigations — a strong CSRF defence.

**Q:** 🟡 `SameSite=Strict` vs `Lax` vs `None`?

**A:** Strict: never cross-site (even links); Lax: only top-level GET navigations; None: always (requires Secure) — needed for cross-site embeds.

**Q:** 🟡 What is CSRF?

**A:** A malicious site causing the victim's browser to send an authenticated request using its cookies.

**Q:** 🟡 How is CSRF mitigated here?

**A:** SameSite=Lax cookies, no state-changing GET endpoints, JSON/multipart APIs. A CSRF token or Origin check would add defence in depth.

**Q:** 🟡 What is CORS?

**A:** A browser mechanism letting servers allow cross-origin reads via `Access-Control-Allow-*` headers; preflight `OPTIONS` for non-simple requests.

**Q:** 🟡 Is CORS a security feature for the server?

**A:** No — it relaxes the browser's same-origin policy; it doesn't stop non-browser clients. Servers still need auth.

**Q:** 🟡 Why is CORS usually off in this app?

**A:** The Vite proxy makes the API same-origin; CORS middleware is added only if `CORS_ORIGINS` is configured (`main.py:22-29`).

**Q:** 🟡 What is a preflight request?

**A:** An `OPTIONS` request the browser sends before "non-simple" cross-origin requests (custom headers, JSON, PUT/DELETE) to check permissions.

**Q:** 🔴 Same-site vs same-origin?

**A:** Origin = scheme+host+port; site = scheme + registrable domain (eTLD+1). `a.clinic.com` and `b.clinic.com` are same-site, different origins — SameSite cookies don't protect against a compromised sibling subdomain.

## Authorization & web security

**Q:** 🟢 What is RBAC?

**A:** Role-Based Access Control — permissions assigned to roles (admin, dentist, receptionist) (`deps.py:49-55`).

**Q:** 🟢 Why must authorization be enforced on the backend?

**A:** Frontend checks can be bypassed with direct API calls; UI permissions only hide controls (`lib/permissions.ts:1-4`).

**Q:** 🟡 Which roles can file prescriptions?

**A:** Admins and dentists (`ClinicalUser`, `prescriptions.py:100`); receptionists get 403 (`test_prescriptions.py:124`).

**Q:** 🟡 Who can delete a filed prescription?

**A:** Only admins (service check, `prescription_service.py:338-339`).

**Q:** 🟡 What's an IDOR?

**A:** Insecure Direct Object Reference — accessing others' resources by changing ids. Not an issue in a single-clinic app where all staff may see all patients; multi-tenant would need tenant scoping.

**Q:** 🟡 What is XSS?

**A:** Injecting scripts into pages; prevented by output escaping (React does), CSP, avoiding `dangerouslySetInnerHTML`, and httpOnly cookies limit damage.

**Q:** 🟡 What is a Content Security Policy?

**A:** A header restricting where scripts/styles/images load from, reducing XSS impact. Not configured here (would need allowances for Google Fonts).

**Q:** 🟡 What is SQL injection?

**A:** Executing attacker-controlled SQL; prevented by parameterised queries (SQLAlchemy binds).

**Q:** 🟡 How are file uploads secured?

**A:** Count/size limits, decoding and re-encoding with Pillow (rejecting non-images and decompression bombs), server-generated file names, authenticated serving (`prescription_service.py:56-68, 178-216`).

**Q:** 🟡 What is a decompression bomb?

**A:** A small compressed image that expands to enormous pixel dimensions, exhausting memory; Pillow raises `DecompressionBombError` (caught at `prescription_service.py:65`).

**Q:** 🟡 What is path traversal?

**A:** Using `../` in file names to access unintended paths; avoided by never using client filenames (`prescriptions/{uuid}-{n}.jpg`).

**Q:** 🟡 What is TLS?

**A:** Transport Layer Security encrypting HTTP (HTTPS) and authenticating the server via certificates.

**Q:** 🟡 What is HSTS?

**A:** `Strict-Transport-Security` header telling browsers to use HTTPS only for the domain.

**Q:** 🟡 What is rate limiting and why needed on login?

**A:** Limiting requests per client/time to prevent brute force and abuse; missing on `/auth/login` (⚠️).

**Q:** 🟡 What is the OWASP Top 10?

**A:** A list of common web risks: broken access control, crypto failures, injection, insecure design, misconfiguration, vulnerable components, auth failures, integrity failures, logging failures, SSRF.

**Q:** 🟡 What is SSRF?

**A:** Server-Side Request Forgery — making the server fetch attacker-chosen URLs. The app never fetches user-supplied URLs.

**Q:** 🔴 What is prompt injection and how is the risk contained here?

**A:** Text in the input (handwriting on the photo) trying to override LLM instructions; contained by schema-constrained output, sanitisation, no tool execution, and mandatory dentist review.

**Q:** 🔴 What privacy issues apply to this app?

**A:** Health data sent to a third-party AI (free tier may use data), logs possibly containing patient text, photos stored unencrypted on a volume, no audit log of access.

**Q:** 🔴 How would you add MFA?

**A:** TOTP (authenticator apps) or WebAuthn passkeys after password verification; store secrets encrypted; recovery codes; enforce for admins first.

**Q:** 🔴 How would you store photos more securely?

**A:** Encrypted object storage (S3 with SSE/KMS), short-lived signed URLs or authenticated proxying, retention policies, access logging.

## Predict / find the bug

**Q:** 🟡 Bug: tokens stored in `localStorage`.

**A:** Any XSS can read and exfiltrate them; prefer httpOnly cookies.

**Q:** 🟡 Bug: login returns "No such user" vs "Wrong password".

**A:** Enables user enumeration; use one generic message.

**Q:** 🟡 Bug: `jwt.decode(token, secret)` without `algorithms`.

**A:** PyJWT requires it; omitting or allowing many algorithms risks algorithm confusion.

**Q:** 🟡 Predict: wrong current password on change-password.

**A:** 400 `invalid_password` (not 401), so the client doesn't attempt a token refresh (`auth_service.py:107-108`).

**Q:** 🟡 Bug: `COOKIE_SECURE=false` in production over HTTPS.

**A:** Cookies could be sent over plain HTTP if a downgrade occurs; set it true.

**Q:** 🟡 Bug: logout requires a valid access token.

**A:** Users with expired access tokens couldn't log out; this API correctly doesn't require it.

**Q:** 🔴 Predict: a refresh token revoked 10 seconds ago is replayed.

**A:** 401, but no mass revocation (within the 30 s grace window) (`auth_service.py:80`).

**Q:** 🔴 Predict: a refresh token revoked 10 minutes ago is replayed.

**A:** All the user's refresh tokens are revoked, then 401.

## Scenarios

**Q:** 🟡 Design a login flow for a browser SPA.

**A:** POST credentials over HTTPS → verify Argon2 hash → set short-lived access + rotating refresh tokens in httpOnly, Secure, SameSite cookies → silent refresh on 401 → logout revokes server-side (this project).

**Q:** 🟡 A staff member leaves. What should happen?

**A:** Admin deactivates them: tokens revoked, every request rechecks `is_active`, login blocked (`user_service.py:93-101`).

**Q:** 🟡 A user's laptop was stolen while logged in. What do you do?

**A:** Admin resets their password (revokes all refresh tokens); access token expires within 15 minutes; deactivate if needed.

**Q:** 🟡 How would you protect against brute-force login?

**A:** Rate limit per IP and per account, exponential backoff, temporary lockout, CAPTCHA after failures, alerting.

**Q:** 🔴 How would you make this app multi-clinic safely?

**A:** Add `clinic_id` to users/patients/prescriptions, scope every query by the user's clinic (row-level security in Postgres or enforced in services), include clinic in tokens, test for cross-tenant access.

**Q:** 🟡 How do you rotate the JWT secret?

**A:** Support multiple keys (key ids via `kid` header), sign with the new key, accept old keys until tokens expire, then remove.

**Q:** 🟡 How would you audit access to patient records?

**A:** Log who viewed/changed which record and when in an append-only audit table; review periodically.

## Write-it-quickly

**Q:** 🟡 Write cookie settings for an access token.

**A:** `response.set_cookie("rr_access", token, expires=exp, httponly=True, secure=True, samesite="lax", path="/")`

**Q:** 🟡 Write password hashing and verification with argon2-cffi.

**A:** `ph = PasswordHasher(); h = ph.hash(pw); try: ph.verify(h, pw) except VerificationError: …` (`core/security.py:12-25`).

**Q:** 🟡 Create and verify a JWT with PyJWT.

**A:** `jwt.encode({"sub": uid, "exp": exp, "type": "access"}, SECRET, algorithm="HS256")`; `jwt.decode(t, SECRET, algorithms=["HS256"])`.

**Q:** 🟡 Write a constant-time-ish login check for unknown users.

**A:** `if user is None: verify_password(pw, DUMMY_HASH); raise Unauthorized(...)` (`auth_service.py:45-47`).

## Real interview questions

**Q:** 🟡 What happens in a TLS handshake (simplified)?

**A:** Client hello (supported ciphers) → server hello + certificate → key exchange (ECDHE) → both derive session keys → encrypted traffic.

**Q:** 🟡 What are cookies' scope attributes?

**A:** `Domain`, `Path`, `Expires/Max-Age`, `Secure`, `HttpOnly`, `SameSite`.

**Q:** 🟡 What's the difference between encoding, encryption and hashing?

**A:** Encoding is reversible formatting (base64); encryption is reversible with a key; hashing is one-way.

**Q:** 🟡 How would you design an API error format?

**A:** Consistent envelope, machine-readable code, human message, field-level details, correct HTTP status, no internal leakage (`errors.py`).

**Q:** 🟡 What's the purpose of `Set-Cookie` `Expires` here?

**A:** Matches the token's expiry so the browser discards expired tokens (`auth.py:23, 32`).

**Q:** 🟢 What does the health endpoint return?

**A:** `{"status": "ok"}` at `/api/v1/health` (`router.py:12-14`).

**Q:** 🟡 What's a bearer token?

**A:** A token sent in `Authorization: Bearer <token>`; whoever holds it is authorised — hence short lifetimes and secure storage.

**Q:** 🟡 Why return the user from `/auth/login`?

**A:** The client gets profile and role immediately to seed its `me` cache (`hooks.ts:47`).

**Q:** 🔴 How do you securely bootstrap the first admin?

**A:** Generate a random password at first start and print it once, or require it via secret env var; force a change on first login. The current default is a documented static password (⚠️).

**Q:** 🟡 What's least privilege?

**A:** Grant only the permissions needed — e.g. receptionists can't file or delete filed prescriptions; DB app user shouldn't be superuser.
