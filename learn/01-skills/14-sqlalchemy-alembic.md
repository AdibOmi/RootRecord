# 14 — SQLAlchemy 2.0 ORM + Alembic migrations

> **Where it lives:** engine/session `backend/app/core/db.py`; models `backend/app/models/*.py`;
> queries in `backend/app/services/*.py`; migrations `backend/alembic/` + `backend/alembic.ini`;
> test transactions `backend/tests/conftest.py`.

---

## 1. What & why

**ORM (Object-Relational Mapper)** — maps database tables to classes and rows to objects, so you
work with `patient.full_name` instead of hand-written SQL strings, while still being able to
express complex queries.

**SQLAlchemy** — Python's most widely used database toolkit. Two layers:
- **Core** — a SQL expression language (`select(...)`, `update(...)`) and connection/engine.
- **ORM** — classes, sessions, identity map, relationships, unit of work.

**Alembic** — SQLAlchemy's migration tool: versioned Python scripts that change the schema
(`upgrade`/`downgrade`), tracked in an `alembic_version` table.

**Analogy:** the ORM is an interpreter between Python and SQL; the Session is a shopping basket you
fill with changes and pay for once (`commit`); Alembic is the building's renovation log.

**When NOT to use an ORM:** heavy analytics/reporting (write SQL directly), bulk ETL (Core or COPY),
or tiny scripts.

---

## 2. Fundamentals

### 2.1 Engine and Session

📍 `backend/app/core/db.py:1-14`:

```python
engine = create_engine(get_settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
```

| Concept | Meaning |
|---|---|
| **Engine** | the connection factory + pool for one database URL (`postgresql+psycopg://…` = dialect+driver) |
| **Session** | a unit of work: tracks loaded objects, pending changes, and a transaction |
| `sessionmaker` | a factory producing configured sessions |
| `pool_pre_ping=True` | test a pooled connection with a cheap ping before using it |
| `autoflush=False` | don't automatically send pending changes before each query |
| `expire_on_commit=False` | keep object attributes loaded after `commit()` (no surprise reload queries; objects usable after the session ends) |

Why `expire_on_commit=False` matters here: services `commit()` and then return the object, and the
router serialises it *after* — with expiry on, every attribute access would trigger a new SELECT
(and fail if the session was closed).

### 2.2 Declarative models (2.0 typed style)

📍 `backend/app/models/base.py:16-31`:

```python
class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    type_annotation_map = {datetime: DateTime(timezone=True), uuid.UUID: Uuid}

class UUIDPk:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

class Timestamps:
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
```

- `Mapped[T]` — the column's Python type; **nullability is inferred**: `Mapped[str]` → NOT NULL,
  `Mapped[str | None]` → NULL allowed.
- `mapped_column(...)` — column options. Without it, type comes from `type_annotation_map`.
- **Mixins** (`UUIDPk`, `Timestamps`) add columns to any model that inherits them.
- `default=uuid.uuid4` — Python-side default (callable, evaluated per insert).
- `server_default=func.now()` — DB-side default (`DEFAULT now()` in DDL).
- `onupdate=func.now()` — SQLAlchemy adds `updated_at = now()` to every ORM UPDATE (not a DB
  trigger — raw SQL updates won't touch it).
- `type_annotation_map` makes every `datetime` a `timestamptz`.
- **Naming convention** gives constraints predictable names (`pk_users`, `uq_users_email`,
  `fk_prescriptions_patient_id_patients`) so migrations can drop them reliably.

📍 `backend/app/models/patient.py:31-41`:

```python
class Patient(UUIDPk, Timestamps, Base):
    __tablename__ = "patients"
    patient_code: Mapped[str] = mapped_column(String(40), unique=True)
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(20), index=True)
    age_years: Mapped[int | None]                                   # type from annotation alone
    sex: Mapped[PatientSex | None] = mapped_column(_enum(PatientSex, "patient_sex"))
    prescriptions: Mapped[list["Prescription"]] = relationship(back_populates="patient")
```

📍 Enum mapping, `models/patient.py:27-28`:

```python
def _enum(cls, name):
    return Enum(cls, name=name, values_callable=lambda e: [m.value for m in e])
```

By default SQLAlchemy stores enum **names** (`MALE`); `values_callable` stores the **values**
(`male`), matching the Postgres enum created in the migration (`0002:18`).

### 2.3 Relationships

📍 `models/patient.py:78-80` and `models/user.py:30-32, 45`:

```python
patient: Mapped[Patient | None] = relationship(back_populates="prescriptions")
created_by: Mapped[User] = relationship(foreign_keys=[created_by_id])
confirmed_by: Mapped[User | None] = relationship(foreign_keys=[confirmed_by_id])

refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
```

- `back_populates` links both sides: setting `prescription.patient = p` also appends to
  `p.prescriptions` in memory.
- Two FKs to `users` → `foreign_keys=[...]` tells SQLAlchemy which column each relationship uses.
- `cascade="all, delete-orphan"` — deleting a user via the ORM deletes their token rows; removing a
  token from the list deletes it.

| Relationship | Pattern |
|---|---|
| one-to-many | FK on the "many" side + `relationship()` on both |
| many-to-one | `prescription.patient` |
| one-to-one | `relationship(uselist=False)` |
| many-to-many | association table + `secondary=` |

### 2.4 CRUD with the Session

```python
db.add(obj)          # INSERT on flush
db.get(Model, pk)    # by primary key (uses the identity map first)
db.delete(obj)       # DELETE on flush
db.flush()           # send pending SQL now, inside the transaction (get generated values)
db.commit()          # flush + COMMIT
db.rollback()
db.refresh(obj)      # re-SELECT from the DB
```

📍 `services/patient_service.py:93-106` — `create` calls `db.add(patient)` then `db.flush()`
(without commit) so the caller can commit the patient together with the prescription
(`prescription_service.py:316-333`).

📍 `services/prescription_service.py:166-169`:

```python
# The draft may have been filed or discarded while it was being read.
db.refresh(prescription)
if prescription.status != PrescriptionStatus.DRAFT:
    return
```

`refresh` re-reads the row after a 15–40 s Gemini call, so the background task doesn't overwrite a
draft that a dentist saved meanwhile. (If it was deleted, `refresh` raises — see review notes.)

---

## 3. Intermediate

### 3.1 2.0-style queries

```python
db.scalar(select(User).where(User.email == email.lower()))       # one object or None
db.scalars(select(Patient).where(...)).all()                     # list of objects
db.execute(select(Patient, func.count()) ...).all()              # list of Row tuples
db.execute(update(RefreshToken).where(...).values(revoked_at=utcnow()))   # bulk UPDATE
```

📍 Building a query step by step, `services/user_service.py:29-42`:

```python
stmt = select(User)
if q:
    like = f"%{q.strip()}%"
    stmt = stmt.where(or_(User.full_name.ilike(like), User.email.ilike(like)))
if role is not None:
    stmt = stmt.where(User.role == role)
if is_active is not None:
    stmt = stmt.where(User.is_active == is_active)
total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
rows = db.scalars(stmt.order_by(User.full_name).offset(params.offset).limit(params.page_size)).all()
```

Statements are **immutable** builders — each `.where()` returns a new statement, which makes
conditional filters easy. The `f"%{q}%"` is passed as a **bound parameter**, not concatenated into
SQL — no injection.

📍 Bulk update, `services/auth_service.py:58-63`:

```python
db.execute(update(RefreshToken)
           .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
           .values(revoked_at=utcnow()))
```

One SQL statement revokes every active session — no loading of objects.

📍 Subquery + outer join + aggregate FILTER, `services/patient_service.py:44-73` (SQL shown in
module 13 §3.1): `.subquery()`, `stats.c.visit_count` (columns of a subquery via `.c`),
`.outerjoin(stats, stats.c.patient_id == Patient.id)`, `func.min(...).filter(...)`,
`.desc().nulls_last()`.

📍 Database functions via `func`: `func.lower`, `func.count`, `func.coalesce`, and even extension
functions: `func.similarity(Patient.full_name, name)` (`patient_service.py:165`) — `func.<anything>`
renders as that SQL function.

### 3.2 Loading strategies: lazy vs eager

| Strategy | How | Queries for 20 prescriptions + patients |
|---|---|---|
| `lazyload` (default `select`) | load on first attribute access | 1 + 20 (**N+1**) |
| `joinedload` | LEFT JOIN in the same query | 1 |
| `selectinload` | second query `WHERE id IN (...)` | 2 (best for collections) |
| `subqueryload` | legacy | 2 |
| `raiseload` | raise if accessed (catch accidental N+1) | — |

📍 `services/prescription_service.py:243-248`:

```python
rows = db.scalars(
    stmt.options(joinedload(Prescription.patient))       # many-to-one → joinedload is ideal
    .order_by(Prescription.visit_date.desc().nulls_first(), Prescription.created_at.desc())
    .offset(params.offset).limit(params.page_size)
).all()
```

`to_summary` reads `p.patient` for each row (`:257`) — without `joinedload` that would be N+1.
`to_detail` lazily loads `created_by`/`confirmed_by` (`:299-300`) — only one prescription, so 2
extra small queries are acceptable.

### 3.3 Identity map and unit of work

**Identity map** — within one Session, each DB row maps to exactly one Python object; `db.get` returns
the cached object without SQL if already loaded. **Unit of work** — the Session collects changes and
emits INSERT/UPDATE/DELETE in dependency order on flush (parents before children).

📍 `services/auth_service.py:85` `user = stored.user` — lazy load; then modifying
`stored.revoked_at` (`:90`) is just attribute assignment; SQLAlchemy's change tracking turns it into
an UPDATE at `commit()` (`:92`).

### 3.4 Object states

`transient` (new, not added) → `pending` (added) → `persistent` (flushed, has identity) →
`detached` (session closed) / `deleted`.

### 3.5 JSONB mutation gotcha

SQLAlchemy only detects **re-assignment** of JSON columns, not in-place mutation:
`prescription.procedures.append("x")` would *not* be saved. 📍 The code always assigns new lists
(`prescription.procedures = data.procedures`, `prescription_service.py:322`). Use `MutableList` /
`MutableDict` if you need in-place tracking.

### 3.6 Transactions in tests: savepoints

📍 `backend/tests/conftest.py:50-60`:

```python
conn = engine.connect()
trans = conn.begin()                                              # outer transaction
session = Session(bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False)
try:
    yield session
finally:
    session.close()
    trans.rollback()                                              # undo everything the test did
    conn.close()
```

`join_transaction_mode="create_savepoint"` makes each `session.commit()` inside app code commit
only a **SAVEPOINT** (nested transaction), so services can call `commit()` normally while the
test's outer transaction is rolled back at the end — fast, isolated tests against real Postgres.

---

## 4. Alembic

### 4.1 Configuration

📍 `backend/alembic.ini:2-5`:

```ini
script_location = alembic
file_template = %%(year)d%%(month).2d%%(day).2d_%%(rev)s_%%(slug)s   # 20261031_0004_background_reading.py
prepend_sys_path = .                                                # so `import app` works
```

📍 `backend/alembic/env.py:13-17`:

```python
# Tests pass their own URL via `config.attributes["url"]`.
url = config.attributes.get("url") or get_settings().database_url
config.set_main_option("sqlalchemy.url", url.replace("%", "%%"))   # escape % for ConfigParser
target_metadata = Base.metadata                                    # for --autogenerate
```

`run_migrations_online` (`env.py:31-40`) uses `poolclass=pool.NullPool` (no pooling for a one-shot
command) and `compare_type=True` (autogenerate detects column type changes).

### 4.2 A migration file

📍 `alembic/versions/20261025_0003_prescription_pages.py:13-34`:

```python
revision = "0003"
down_revision = "0002"           # the chain: 0001 → 0002 → 0003 → 0004

def upgrade() -> None:
    op.add_column("prescriptions",
        sa.Column("image_paths", postgresql.JSONB(), server_default="[]", nullable=False))
    op.execute("UPDATE prescriptions SET image_paths = jsonb_build_array(image_path)")  # backfill
    op.alter_column("prescriptions", "image_paths", server_default=None)               # drop temp default
    op.drop_column("prescriptions", "image_path")

def downgrade() -> None:
    op.add_column("prescriptions", sa.Column("image_path", sa.String(255), nullable=True))
    # Only the first page survives a downgrade.
    op.execute("UPDATE prescriptions SET image_path = image_paths->>0")
    op.alter_column("prescriptions", "image_path", nullable=False)
    op.drop_column("prescriptions", "image_paths")
```

This is a **schema + data migration**: add → backfill → constrain → drop old. The downgrade is honest
about data loss.

📍 Hand-written enum handling, `0001:18, 26`: `postgresql.ENUM(..., create_type=False)` +
`user_role.create(op.get_bind(), checkfirst=True)` — create the type explicitly once, so
`create_table` doesn't try to create it again.
📍 Raw SQL where Alembic lacks an op: extensions, GIN trigram index, sequence (`0001:23-24`,
`0002:36, 53-55`).
📍 `op.f("pk_users")` marks a name as already final (don't re-apply the naming convention).

### 4.3 Workflow

```bash
alembic revision --autogenerate -m "describe change"   # diff models vs DB → new script
# REVIEW the generated script (autogenerate misses some things)
alembic upgrade head                                    # apply
alembic downgrade -1                                    # undo one
alembic current / alembic history
```

📍 `README.md:80-82`; production runs `alembic upgrade head` on container start
(`backend/entrypoint.sh:3`). Tests run migrations programmatically:
`command.upgrade(cfg, "head")` (`tests/conftest.py:43-45`) — so tests also verify that migrations
produce the schema the models expect.

**What autogenerate can't detect:** renames (shows drop + add), extensions, custom index types
(partly), server defaults changes (partly), data migrations, enum value changes.

⚠️ Running migrations automatically at app start is convenient for one instance, but with several
replicas they race; run migrations as a separate deploy step in production.

---

## 5. Under the hood

- Session flush computes a dependency graph (unit of work) and batches statements
  ("insertmanyvalues").
- Lazy loading works via instrumented attributes: accessing `p.patient` triggers a SELECT through
  the object's session.
- `select()` compiles to dialect-specific SQL (Postgres: `ILIKE`, `NULLS LAST`, `FILTER`).
- psycopg 3 is the DBAPI driver underneath (`requirements.txt:5`).

---

## 6. Comparisons

| X vs Y | Answer |
|---|---|
| ORM vs raw SQL | productivity, safety, portability vs full control/perf transparency |
| SQLAlchemy vs Django ORM | explicit sessions, Core+ORM, very flexible vs simpler active-record style, tied to Django |
| SQLAlchemy vs SQLModel | SQLModel = SQLAlchemy + Pydantic in one class (less duplication, less flexibility) |
| SQLAlchemy vs Prisma/TypeORM (Node) | Python vs TS ecosystems; Prisma is schema-first with codegen |
| 1.x `session.query()` vs 2.0 `select()` | legacy vs unified Core/ORM style |
| `flush` vs `commit` | send SQL vs end transaction |
| `joinedload` vs `selectinload` | JOIN (many-to-one) vs IN query (collections) |
| `default` vs `server_default` | Python vs DB default |
| Alembic vs Django migrations | standalone, explicit scripts vs integrated, auto-generated |
| active record vs data mapper | model saves itself vs Session (SQLAlchemy) persists |

---

## 7. Patterns & anti-patterns

- ✅ Services own transactions; helpers that should compose don't commit (`patient_service.create`).
- ✅ Typed `Mapped[]` columns; mixins; naming conventions.
- ✅ Bulk `update()` for mass changes.
- ❌ N+1 lazy loads in loops; long-lived sessions; sharing a Session across threads.
- ❌ Calling slow external APIs while holding a transaction open (⚠️ `read_in_background`).

⚠️ **Review notes**
1. `read_in_background` does `db.refresh(prescription)` (`prescription_service.py:167`); if staff
   **discarded** the draft during reading, the row no longer exists and `refresh` raises
   `InvalidRequestError` — the background task crashes (logged), and the photos were already deleted.
   Harmless to data, but noisy; re-`get` and return if `None`.
2. File writes happen *before* `db.commit()` in `scan()` (`prescription_service.py:199-215`); if the
   commit fails, orphaned images remain. Deletes correctly happen *after* commit (`:341-344`).

---

## 8. Cheat sheet

```python
class M(UUIDPk, Timestamps, Base):
    __tablename__ = "m"
    name: Mapped[str] = mapped_column(String(120), index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("p.id", ondelete="RESTRICT"))
    parent: Mapped["P | None"] = relationship(back_populates="children")
db.scalar(select(M).where(M.name == x)); db.scalars(stmt).all(); db.execute(stmt).all()
stmt.options(joinedload(M.parent), selectinload(P.children))
db.add(o); db.flush(); db.commit(); db.refresh(o); db.delete(o)
update(M).where(...).values(...); func.count(); func.coalesce(a, 0); col.ilike('%x%'); col.is_(None)
alembic revision --autogenerate -m "msg"; alembic upgrade head; alembic downgrade -1
```

---

## 9. Why chosen + alternatives

SQLAlchemy 2.0 gives typed models, Postgres-specific features (JSONB, enums, `FILTER`,
`func.similarity`) and fine control over loading — and Alembic is its standard migration tool.
SQLModel would cut the Pydantic/SQLAlchemy duplication but is less mature; Django ORM would require
Django.
