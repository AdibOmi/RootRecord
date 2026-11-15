# SQLAlchemy & Alembic — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## SQLAlchemy concepts

**Q:** 🟢 What is an ORM?

**A:** An Object-Relational Mapper maps tables to classes and rows to objects, letting you query and persist data with code instead of raw SQL.

**Q:** 🟢 What are SQLAlchemy Core and ORM?

**A:** Core is the SQL expression language and engine/connection layer; ORM adds mapped classes, sessions, identity map and relationships on top.

**Q:** 🟢 What is an Engine?

**A:** The entry point for a database URL with a connection pool: `create_engine(url, pool_pre_ping=True)` (`core/db.py:8`).

**Q:** 🟢 What is a Session?

**A:** A unit of work tracking loaded objects and pending changes inside a transaction; you `add`, `commit`, `rollback`, `close`.

**Q:** 🟢 What is `sessionmaker`?

**A:** A factory producing Sessions with preset options (`core/db.py:9`).

**Q:** 🟢 What is `DeclarativeBase`?

**A:** The base class for mapped models in 2.0 (`models/base.py:16`).

**Q:** 🟢 What does `__tablename__` set?

**A:** The table name for a model (`models/patient.py:32`).

**Q:** 🟢 What is `Mapped[...]`?

**A:** The 2.0 typed annotation declaring a mapped attribute and its Python type; `Mapped[str | None]` means nullable.

**Q:** 🟢 What does `mapped_column()` configure?

**A:** Column details: type, primary key, unique, index, FK, defaults (`models/user.py:20`).

**Q:** 🟢 What does `db.get(Model, pk)` do?

**A:** Loads by primary key, returning the identity-map object without SQL if already loaded; `None` if missing (`deps.py:28`).

**Q:** 🟢 What does `db.add(obj)` do?

**A:** Marks a new object as pending; it's INSERTed on flush/commit.

**Q:** 🟢 What does `db.commit()` do?

**A:** Flushes pending changes and commits the transaction.

**Q:** 🟢 What does `db.delete(obj)` do?

**A:** Marks the object for DELETE on flush (`prescription_service.py:341`).

**Q:** 🟢 What is `select()` in 2.0?

**A:** The unified query builder: `select(User).where(User.email == x)` executed via `db.scalar`, `db.scalars`, or `db.execute` (`auth_service.py:44`).

**Q:** 🟢 `scalar` vs `scalars` vs `execute`?

**A:** `scalar` returns the first column of the first row (or None); `scalars` returns an iterable of first-column values (ORM objects); `execute` returns Row tuples.

**Q:** 🟢 What is a relationship?

**A:** An ORM attribute linking objects via FKs: `patient: Mapped[Patient | None] = relationship(back_populates="prescriptions")` (`models/patient.py:78`).

**Q:** 🟡 What does `back_populates` do?

**A:** Links two relationship attributes so changes on one side update the other in memory.

**Q:** 🟡 Why `foreign_keys=[created_by_id]`?

**A:** `Prescription` has two FKs to `users`; SQLAlchemy needs to know which column each relationship uses (`models/patient.py:79-80`).

**Q:** 🟡 What does `cascade="all, delete-orphan"` do?

**A:** Session operations (save, delete) cascade to children; removing a child from the collection deletes it (`models/user.py:30-32`).

**Q:** 🟡 ORM cascade vs DB `ON DELETE CASCADE`?

**A:** ORM cascade acts on loaded objects within the Session; DB cascade acts in SQL for any delete. Using both keeps them consistent.

**Q:** 🟡 What is flush?

**A:** Sending pending INSERT/UPDATE/DELETE statements to the database within the current transaction without committing (`patient_service.py:105`).

**Q:** 🟡 Why flush without commit in `patient_service.create`?

**A:** To get constraint checks and the row inserted while letting the caller commit the patient and prescription together atomically.

**Q:** 🟡 What does `autoflush=False` change?

**A:** Queries don't auto-flush pending changes first; behaviour is more predictable, flushes are explicit (`core/db.py:9`).

**Q:** 🟡 What does `expire_on_commit=False` change?

**A:** Attributes stay loaded after commit; no reload queries when serialising, and objects remain usable after the session closes.

**Q:** 🟡 What is the identity map?

**A:** Per-Session mapping from primary key to object, ensuring one object per row per session.

**Q:** 🟡 What is the unit of work pattern?

**A:** The Session collects changes and writes them in the correct order at flush (parents before children).

**Q:** 🟡 What are object states?

**A:** Transient (new), pending (added), persistent (in session with identity), detached (session closed), deleted.

**Q:** 🟡 What is lazy loading?

**A:** Related objects load on first access with a separate query (default `select` strategy).

**Q:** 🟡 What is eager loading?

**A:** Loading relationships up front: `joinedload` (JOIN), `selectinload` (second IN query), `subqueryload`.

**Q:** 🟡 When `joinedload` vs `selectinload`?

**A:** `joinedload` for many-to-one/one-to-one (one row per parent); `selectinload` for collections (avoids row multiplication).

**Q:** 🟡 Where is N+1 avoided in this project?

**A:** `list_prescriptions` uses `options(joinedload(Prescription.patient))` because summaries read `p.patient` per row (`prescription_service.py:244, 257`).

**Q:** 🟡 What is `raiseload`?

**A:** A loader option raising an error if a relationship is lazily accessed — catches accidental N+1 in tests.

**Q:** 🟡 What does `.subquery()` do?

**A:** Turns a select into a derived table usable in FROM/JOIN; columns accessed via `.c` (`patient_service.py:56, 60-63`).

**Q:** 🟡 What is `func`?

**A:** A generator of SQL function calls: `func.count()`, `func.lower(col)`, `func.coalesce(a, 0)`, `func.similarity(a, b)` (`patient_service.py:165`).

**Q:** 🟡 How do you write `IS NULL`?

**A:** `col.is_(None)` (`auth_service.py:61`) — Python's `is` can't be overloaded.

**Q:** 🟡 How do you write OR conditions?

**A:** `or_(A, B)` — `or_(User.full_name.ilike(like), User.email.ilike(like))` (`user_service.py:32`).

**Q:** 🟡 How do you add `NULLS LAST` ordering?

**A:** `col.desc().nulls_last()` (`patient_service.py:69`).

**Q:** 🟡 How do you write an aggregate FILTER?

**A:** `func.min(col).filter(cond)` (`patient_service.py:50-51`).

**Q:** 🟡 How do you run a bulk UPDATE?

**A:** `db.execute(update(Model).where(...).values(...))` (`auth_service.py:59-63`).

**Q:** 🟡 How do you run raw SQL?

**A:** `db.scalar(text("SELECT nextval('patient_code_seq')"))` (`patient_service.py:19, 88`) — use bound params for any input.

**Q:** 🟡 What does `db.refresh(obj)` do?

**A:** Re-SELECTs the object's attributes from the DB — used after a long Gemini call (`prescription_service.py:167`).

**Q:** 🟡 What is `type_annotation_map`?

**A:** Maps Python types to SQL types for annotations without explicit types: `datetime → DateTime(timezone=True)`, `uuid.UUID → Uuid` (`models/base.py:18`).

**Q:** 🟡 What are mixins in declarative models?

**A:** Plain classes with mapped columns inherited by models — `UUIDPk`, `Timestamps` (`models/base.py:21-27`).

**Q:** 🟡 `default` vs `server_default`?

**A:** `default` is applied by SQLAlchemy in Python on insert; `server_default` is DDL `DEFAULT` applied by the database.

**Q:** 🟡 What does `onupdate=func.now()` do?

**A:** SQLAlchemy adds `updated_at = now()` to ORM UPDATEs; raw SQL updates won't trigger it.

**Q:** 🟡 How are Python enums stored?

**A:** With `Enum(PyEnum, name="…", values_callable=…)` storing values in a Postgres enum type (`models/patient.py:27-28`).

**Q:** 🟡 Why `values_callable`?

**A:** Default stores member names (`ADMIN`); this stores values (`admin`) to match the DB enum and API.

**Q:** 🟡 How do JSONB columns work?

**A:** `mapped_column(JSONB, default=list)` stores Python lists/dicts as JSONB (`models/patient.py:63-66`).

**Q:** 🟡 Why must JSON columns be reassigned rather than mutated?

**A:** SQLAlchemy doesn't track in-place mutations of JSON values unless using `MutableList/MutableDict`; the code assigns new lists (`prescription_service.py:322-325`).

**Q:** 🟡 What is a naming convention in `MetaData`?

**A:** Templates for constraint/index names so they're deterministic (`models/base.py:7-13`).

**Q:** 🟡 What is `pool_pre_ping`?

**A:** A liveness check on checkout that recycles dead connections (`core/db.py:8`).

**Q:** 🟡 What is the default pool?

**A:** `QueuePool` with `pool_size=5` and `max_overflow=10` for most dialects.

**Q:** 🟡 Why `NullPool` in Alembic's env?

**A:** Migrations are one-shot; no need to keep connections pooled (`alembic/env.py:35`).

**Q:** 🟡 What does `join_transaction_mode="create_savepoint"` do?

**A:** A Session bound to a connection with an outer transaction uses savepoints for its own commits, so tests can roll back everything (`conftest.py:54`).

**Q:** 🔴 What happens on `db.refresh` of a row deleted by another transaction?

**A:** SQLAlchemy raises because the row can't be found — the background task would error if staff discarded the draft mid-read (`prescription_service.py:167`).

**Q:** 🔴 Why is holding a Session open during a slow external call bad?

**A:** After the first query the connection is checked out "idle in transaction", holding a pool slot and an old snapshot (blocking vacuum, risking pool exhaustion). Close/commit before the call, reopen after.

**Q:** 🔴 How does lazy loading fail after a session is closed?

**A:** Accessing an unloaded relationship on a detached object raises `DetachedInstanceError`. Eager-load or keep the session open while serialising.

**Q:** 🔴 What is "insertmanyvalues"?

**A:** SQLAlchemy 2.0's batching of many INSERTs into multi-row statements with RETURNING for performance.

**Q:** 🔴 Is a Session thread-safe?

**A:** No. Use one Session per request/thread/task — the background task opens its own (`prescription_service.py:155`).

**Q:** 🔴 How do you use SQLAlchemy asynchronously?

**A:** `create_async_engine` + `AsyncSession` with an async driver (asyncpg, psycopg async), `await session.execute(...)`; lazy loading must be avoided or use `AsyncAttrs`.

**Q:** 🔴 What's the difference between `Session.get` and `select(...).where(id == x)`?

**A:** `get` checks the identity map first (may skip SQL); a select always queries (but still returns the identity-mapped object).

**Q:** 🔴 What does `with_for_update()` do?

**A:** Adds `FOR UPDATE` to a select to lock rows until commit — prevents concurrent modifications.

## Alembic

**Q:** 🟢 What is Alembic?

**A:** SQLAlchemy's migration tool: versioned scripts with `upgrade()`/`downgrade()`, tracked in `alembic_version`.

**Q:** 🟢 What does `alembic upgrade head` do?

**A:** Applies all migrations newer than the current version (`entrypoint.sh:3`).

**Q:** 🟢 What does `alembic revision --autogenerate -m "msg"` do?

**A:** Compares models' metadata with the database and writes a migration script with detected changes (`README.md:81`).

**Q:** 🟢 What do `revision` and `down_revision` mean?

**A:** This migration's id and its parent's id, forming a chain (`0004` → `0003` → …).

**Q:** 🟢 What is `env.py`?

**A:** The script Alembic runs to configure the connection and metadata (`alembic/env.py`).

**Q:** 🟢 What does `script.py.mako` do?

**A:** Templates new migration files (`alembic/script.py.mako`).

**Q:** 🟡 What does `target_metadata` do?

**A:** Tells autogenerate which models' tables to compare (`alembic/env.py:17`).

**Q:** 🟡 Why import all models in `app/models/__init__.py`?

**A:** So `Base.metadata` contains all tables when `env.py` imports it.

**Q:** 🟡 What does `compare_type=True` do?

**A:** Autogenerate detects column type changes (`alembic/env.py:25, 38`).

**Q:** 🟡 Offline vs online migrations?

**A:** Offline renders SQL scripts without a DB connection (`--sql`); online executes against the DB.

**Q:** 🟡 What can't autogenerate detect?

**A:** Renames (seen as drop+add), extension creation, some server default/index details, enum value changes, data migrations.

**Q:** 🟡 What's a data migration?

**A:** A migration changing data, not only schema — `UPDATE prescriptions SET image_paths = jsonb_build_array(image_path)` (`0003:24`).

**Q:** 🟡 Why `create_type=False` on the enum in migrations?

**A:** To create the type explicitly once with `checkfirst=True` and avoid `create_table` re-creating it (`0001:18, 26`).

**Q:** 🟡 What does `op.f("pk_users")` mean?

**A:** Marks the name as final so the naming convention isn't re-applied.

**Q:** 🟡 How do tests run migrations?

**A:** `command.upgrade(Config("alembic.ini") with attributes["url"]=test_url, "head")` (`conftest.py:43-45`).

**Q:** 🟡 Why escape `%` in the URL with `%%`?

**A:** Alembic's INI parsing uses ConfigParser interpolation; `%` in passwords must be doubled (`alembic/env.py:15`).

**Q:** 🟡 What is `alembic downgrade -1`?

**A:** Reverts the latest migration by running its `downgrade()`.

**Q:** 🟡 What does `0003` teach about adding NOT NULL columns?

**A:** Add with a temporary server default, backfill, remove the default, drop the old column (`0003:20-26`).

**Q:** 🟡 Why does `0002` use a helper `_timestamps()` function?

**A:** Column objects can belong to only one table; a function returns fresh columns per table (`0002:24-28`).

**Q:** 🔴 How do you handle branching migrations (two heads)?

**A:** `alembic merge -m "merge" <rev1> <rev2>` creates a merge revision; or rebase one migration's `down_revision` before merging code.

**Q:** 🔴 How do you make migrations zero-downtime?

**A:** Backwards-compatible steps across deploys (expand/contract), avoid long locks (`CREATE INDEX CONCURRENTLY` outside transactions), batch backfills.

**Q:** 🔴 What's risky about running migrations on app startup with many replicas?

**A:** Concurrent upgrades race; use a single migration job or advisory locks.

**Q:** 🔴 Why might autogenerate want to drop `ix_patients_full_name_trgm`?

**A:** The index exists only in the migration (raw SQL), not in model metadata; autogenerate thinks it's extra. Declare it in the model or add it to an ignore filter.

**Q:** 🔴 How do you test migrations?

**A:** Run upgrade from empty (done by the test fixture), optionally downgrade/upgrade round-trips, and compare the result to model metadata (alembic `check`).

## Predict / find the bug

**Q:** 🟡 Bug: `prescription.procedures.append("Scaling")` then `commit()` doesn't save.

**A:** In-place JSON mutation isn't tracked; assign a new list or use `MutableList`.

**Q:** 🟡 Bug: listing 20 prescriptions issues 21 queries.

**A:** Lazy loading `p.patient` per row; add `joinedload(Prescription.patient)`.

**Q:** 🟡 Predict: `db.scalar(select(User).where(User.email == "x"))` with no match.

**A:** `None`.

**Q:** 🟡 Bug: `select(User).where(User.revoked_at == None)` lint warning.

**A:** Works (SQLAlchemy overloads `==`), but `is_(None)` is clearer and avoids linters' `E711`.

**Q:** 🟡 Bug: using `session.query()` in new 2.0 code.

**A:** Legacy API; prefer `select()` with `session.scalars/execute`.

**Q:** 🔴 Bug: background task uses the request session.

**A:** That session is closed after the response; open a new one per task (`prescription_service.py:155`).

**Q:** 🟡 Predict: deleting a `User` object via the ORM with tokens loaded.

**A:** Tokens are deleted too (`cascade="all, delete-orphan"` + DB CASCADE).

**Q:** 🟡 Bug: an Alembic migration fails because `user_role` already exists.

**A:** Use `create_type=False` and `.create(bind, checkfirst=True)` (`0001:18, 26`).

## Scenarios & tasks

**Q:** 🟡 Write a model with a UUID PK, timestamps and an indexed FK.

**A:**
```python
class Visit(UUIDPk, Timestamps, Base):
    __tablename__ = "visits"
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id", ondelete="RESTRICT"), index=True)
    note: Mapped[str | None] = mapped_column(Text)
```

**Q:** 🟡 Write a paginated, filtered query with total count.

**A:** Build `stmt`, `total = db.scalar(select(func.count()).select_from(stmt.subquery()))`, then `db.scalars(stmt.order_by(...).offset(o).limit(n)).all()` (`user_service.py:29-42`).

**Q:** 🟡 Load prescriptions with patients in one query.

**A:** `db.scalars(select(Prescription).options(joinedload(Prescription.patient))).all()`.

**Q:** 🟡 Load patients with their prescriptions efficiently.

**A:** `select(Patient).options(selectinload(Patient.prescriptions))` — one query for patients, one IN query for prescriptions.

**Q:** 🟡 Lock a draft while saving.

**A:** `db.scalar(select(Prescription).where(Prescription.id == id).with_for_update())`.

**Q:** 🟡 Write a migration adding an optional column.

**A:** `op.add_column("prescriptions", sa.Column("reading_started_at", sa.DateTime(timezone=True), nullable=True))` and drop it in `downgrade` (`0004:19-21`).

**Q:** 🟡 Add a functional unique index in a migration.

**A:** `op.execute("CREATE UNIQUE INDEX uq_patients_code_lower ON patients (lower(patient_code))")`.

**Q:** 🔴 How would you add soft delete?

**A:** Add the `SoftDelete` mixin (`models/base.py:30-31`) to models, migrate `deleted_at`, set it instead of deleting, filter `deleted_at IS NULL` everywhere (global criteria via `with_loader_criteria`), and purge via a retention job.

**Q:** 🔴 How would you split `read_in_background` into two sessions?

**A:** Session 1: load image paths, close. Call Gemini. Session 2: load the prescription (`get`, return if None), check status, apply results, commit.

**Q:** 🟡 Map an `IntegrityError` to a 409.

**A:** Wrap the flush/commit in `try/except IntegrityError as e:` → inspect `e.orig.diag.constraint_name` (`uq_patients_patient_code`) → `raise Conflict(...)`; roll back the session first.

## Comparisons & interview

**Q:** 🟡 ORM vs raw SQL?

**A:** ORM: productivity, safety, portability, relationships; raw SQL: full control and transparency for complex/perf-critical queries. SQLAlchemy lets you mix both.

**Q:** 🟡 SQLAlchemy vs Django ORM?

**A:** SQLAlchemy: explicit Session, data-mapper, Core + ORM, very flexible; Django ORM: active-record style, simpler, tied to Django.

**Q:** 🟡 SQLAlchemy vs SQLModel?

**A:** SQLModel combines SQLAlchemy models and Pydantic schemas in one class; less duplication, fewer advanced features.

**Q:** 🟡 Active Record vs Data Mapper?

**A:** Active Record: objects save themselves (`obj.save()`); Data Mapper: a separate session/mapper persists objects — SQLAlchemy is a Data Mapper.

**Q:** 🟡 Alembic vs Django migrations?

**A:** Alembic is standalone and explicit (you review scripts); Django migrations are integrated and auto-generated from models.

**Q:** 🟡 1.x vs 2.0 style?

**A:** 2.0 uses `select()` everywhere, typed `Mapped[]` columns, explicit `commit`, and removes legacy autocommit and `session.query` emphasis.

**Q:** 🟢 Where is the Session created per request?

**A:** `get_db()` yields `SessionLocal()` (`core/db.py:12-14`), injected via `DB` (`deps.py:18`).

**Q:** 🟡 Why do services commit rather than routers?

**A:** Services own business transactions; routers stay HTTP-only.

**Q:** 🟡 Why does `_issue_tokens` not commit?

**A:** So login/rotation commit the token row together with other changes atomically (`auth_service.py:35-40`).

**Q:** 🟡 How is `updated_at` maintained?

**A:** `onupdate=func.now()` on ORM updates (`models/base.py:27`).

**Q:** 🔴 How do you debug the SQL SQLAlchemy emits?

**A:** `create_engine(url, echo=True)` or set the `sqlalchemy.engine` logger to INFO (`alembic.ini:22-25` keeps it at WARNING).

**Q:** 🟡 Why are revision ids `0001`… instead of hashes?

**A:** Readable ordering; chosen manually (Alembic allows any unique string).
