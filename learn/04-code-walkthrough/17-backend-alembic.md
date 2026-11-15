# 17 — Alembic: `env.py`, `script.py.mako`, migrations 0001–0004

→ Skill: `14-sqlalchemy-alembic.md` §4, `13-sql-postgresql.md`.

## `backend/alembic/env.py` (46 lines)

| Lines | Code | Explanation |
|---|---|---|
| 1-7 | imports `fileConfig`, `engine_from_config`, `pool`, `context`, settings, `Base` | importing `app.models` registers all tables on `Base.metadata` |
| 9 | `config = context.config` | the parsed `alembic.ini` |
| 10-11 | `fileConfig(config.config_file_name)` | apply logging sections from the INI |
| 13-15 | `url = config.attributes.get("url") or get_settings().database_url`; `set_main_option("sqlalchemy.url", url.replace("%", "%%"))` | tests inject their URL via `attributes`; `%` escaped because ConfigParser interpolates `%` |
| 17 | `target_metadata = Base.metadata` | what autogenerate compares against |
| 20-28 | `run_migrations_offline()` | `alembic upgrade head --sql` → prints SQL instead of executing (`literal_binds=True` inlines values), `compare_type=True` |
| 31-40 | `run_migrations_online()` | build an engine from the INI section (`prefix="sqlalchemy."`), `NullPool` (one-shot), connect, configure, run inside a transaction |
| 43-46 | choose offline/online | |

Postgres supports **transactional DDL**, so a failing migration rolls back entirely (`begin_transaction`).

## `backend/alembic/script.py.mako` (24 lines)

Mako template for new revisions: docstring with message/ids/date, imports (`Sequence`, `sa`, `op`),
typed `revision`/`down_revision`/`branch_labels`/`depends_on`, empty `upgrade()`/`downgrade()` filled
by autogenerate. Customised to use modern type hints (`str | None`).

## `versions/20260925_0001_auth_foundation.py` (66 lines) — 2026-09-25

```python
13 revision: str = "0001"
14 down_revision: str | None = None                       # first migration
18 user_role = postgresql.ENUM("admin", "dentist", "receptionist", name="user_role", create_type=False)

21 def upgrade() -> None:
22     # pg_trgm: fast ILIKE search on patient names. btree_gist: appointment overlap constraint.
23     op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
24     op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
26     user_role.create(op.get_bind(), checkfirst=True)    # CREATE TYPE user_role AS ENUM (...)
28     op.create_table("users", … columns …,
40         sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
41         sa.UniqueConstraint("email", name=op.f("uq_users_email")))
44     op.create_table("refresh_tokens", …,
53         sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_refresh_tokens_user_id_users"), ondelete="CASCADE"),
57         sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_tokens")))
59     op.create_index(op.f("ix_refresh_tokens_user_id"), "refresh_tokens", ["user_id"])

62 def downgrade() -> None:      # reverse order: index → child table → parent table → type
63     op.drop_index(...); op.drop_table("refresh_tokens"); op.drop_table("users")
66     user_role.drop(op.get_bind(), checkfirst=True)
```
- Revision ids are short hand-chosen strings (`"0001"`) instead of random hashes — readable ordering.
- `create_type=False` + explicit `.create(checkfirst=True)` avoids "type already exists" errors.
- `btree_gist` is enabled for a future appointments overlap constraint (YAGNI-ish but harmless).
- Extensions need privileges (`CREATE` on database / superuser on older PG) — works with the Compose
  superuser; a locked-down production DB may need a DBA to create them.

## `versions/20261010_0002_patients_prescriptions.py` (101 lines) — 2026-10-10

- 18-21: enum types `patient_sex`, `prescription_status`.
- 24-28: `_timestamps()` helper returns fresh `Column` objects each call (a Column can belong to one
  table only — that's why it's a function, not a constant list).
- 36: `CREATE SEQUENCE IF NOT EXISTS patient_code_seq`.
- 38-50: `patients` (with an `address` column, later dropped in 0004) + unique `patient_code`.
- 51: btree index on `phone`; 53-55: **GIN trigram index** on `full_name` (raw SQL).
- 57-88: `prescriptions` with JSONB lists, single `image_path` (later replaced), FKs:
  `patient_id → patients` RESTRICT, `created_by_id`, `confirmed_by_id` → users.
- 89-90: loop creating btree indexes on `status`, `patient_id`, `visit_date`, `follow_up_date`.
- 93-101: downgrade drops in reverse dependency order, including the raw index and the sequence.

## `versions/20261025_0003_prescription_pages.py` (34 lines) — 2026-10-25

Single photo → ordered list of pages: add `image_paths` JSONB NOT NULL with temporary default `'[]'`,
backfill with `jsonb_build_array(image_path)`, drop the default, drop `image_path`. Downgrade keeps only
the first page (`image_paths->>0`) — comment admits the data loss. Classic **expand → migrate →
contract** in one step (fine with downtime; zero-downtime deploys would split it across releases).

## `versions/20261031_0004_background_reading.py` (27 lines) — 2026-10-31

Adds `prescriptions.reading_started_at timestamptz NULL` (for background reads) and drops
`patients.address` (no longer collected). Downgrade re-adds `address` (data lost) and drops the column.

## Q&A

**Q:** 🟢 How does Alembic know which migrations have run?

**A:** It stores the current revision in the `alembic_version` table; `upgrade head` applies every
revision after it, following `down_revision` links (0001 → 0002 → 0003 → 0004).

**Q:** 🟡 Why use `op.execute` for the trigram index instead of `op.create_index`?

**A:** It needs `USING gin (full_name gin_trgm_ops)` — an index method and operator class. Raw SQL is
the clearest way (Alembic can do it with `postgresql_using`/`postgresql_ops`, but autogenerate doesn't
round-trip it well).

**Q:** 🟡 Why add `image_paths` with a server default and then remove it?

**A:** Adding a NOT NULL column to a table with rows needs a value for existing rows. The temporary
default fills them; after the backfill, removing it means new rows must set the value explicitly
(the ORM does, `default=list`).

**Q:** 🔴 Why might `0002` fail on a managed Postgres in production?

**A:** `CREATE EXTENSION` in `0001` requires elevated privileges on some providers, and extension
availability varies (pg_trgm and btree_gist are widely available, but must be allow-listed on some
platforms).

**Q:** 🟢 What's the purpose of downgrades if they lose data?

**A:** They let developers roll back schema changes locally and in emergencies; documenting data loss
(as `0003:31` does) sets expectations. In production, "roll forward" with a new migration is more common.

**Q:** 🟡 How do the tests use these migrations?

**A:** The session fixture runs `command.upgrade(cfg, "head")` with the test URL
(`tests/conftest.py:43-45`), so every test run verifies the migration chain builds the schema the code
expects.
