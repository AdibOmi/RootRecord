# SQL & PostgreSQL — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Definitions & concepts

**Q:** 🟢 What is a relational database?

**A:** A database storing data in tables of rows and columns, related through keys, queried with SQL, with integrity enforced by constraints.

**Q:** 🟢 What is a primary key?

**A:** A column (or set) uniquely identifying each row; NOT NULL and unique. Here every table uses a UUID `id` (`pk_users`, migration `0001:40`).

**Q:** 🟢 What is a foreign key?

**A:** A column referencing another table's key, enforcing that the referenced row exists — `prescriptions.patient_id → patients.id` (`0002:77-80`).

**Q:** 🟢 What is a unique constraint?

**A:** Ensures no two rows share a value — `users.email`, `patients.patient_code` (`0001:41`, `0002:49`).

**Q:** 🟢 What is NULL?

**A:** "Unknown/missing" — not equal to anything, even NULL; test with `IS NULL`. Aggregates ignore NULLs.

**Q:** 🟢 What does `SELECT … WHERE … ORDER BY … LIMIT` do?

**A:** Retrieves columns from rows matching a filter, sorted, limited to N rows.

**Q:** 🟢 What is an INNER JOIN?

**A:** Returns rows that match in both tables on the join condition.

**Q:** 🟢 What is a LEFT JOIN?

**A:** Returns all rows from the left table plus matches from the right (NULLs where none) — patients with zero visits still appear in the list (`patient_service.py:63`).

**Q:** 🟢 What does `GROUP BY` do?

**A:** Groups rows sharing values so aggregates (`count`, `max`, `min`) compute per group — visit stats per patient (`patient_service.py:46-56`).

**Q:** 🟢 `WHERE` vs `HAVING`?

**A:** `WHERE` filters rows before grouping; `HAVING` filters groups after aggregation.

**Q:** 🟢 What is `COALESCE`?

**A:** Returns the first non-NULL argument — `COALESCE(visit_count, 0)` (`patient_service.py:60`).

**Q:** 🟢 What is `ILIKE`?

**A:** PostgreSQL's case-insensitive `LIKE` — name search `full_name ILIKE '%rahima%'` (`patient_service.py:32`).

**Q:** 🟢 What does `ORDER BY x DESC NULLS LAST` do?

**A:** Sorts descending with NULLs at the end — never-visited patients last (`patient_service.py:69`).

**Q:** 🟢 What is OFFSET/LIMIT pagination?

**A:** Skip N rows and return M: `OFFSET (page-1)*size LIMIT size` (`schemas/common.py:31-33`).

**Q:** 🟢 What is an index?

**A:** A data structure (usually B-tree) that speeds up lookups and sorting at the cost of extra writes and storage.

**Q:** 🟢 What is a transaction?

**A:** A group of statements executed atomically — all commit or all roll back.

**Q:** 🟢 What is ACID?

**A:** Atomicity, Consistency, Isolation, Durability — guarantees of reliable transactions.

**Q:** 🟢 What is a schema migration?

**A:** A versioned script changing the database structure (Alembic revisions `0001…0004`).

**Q:** 🟢 What is `timestamptz`?

**A:** Timestamp with time zone: stored as a UTC instant, converted on input/output. Used for all timestamps here (`models/base.py:18`).

**Q:** 🟢 `date` vs `timestamptz`?

**A:** `date` is a calendar day without time/zone (visit dates); `timestamptz` an exact instant (created_at).

**Q:** 🟢 What is JSONB?

**A:** Binary JSON column type supporting indexing and operators — used for medications, procedures, advice, image paths, raw AI output.

**Q:** 🟢 What is a sequence?

**A:** A database object generating unique increasing numbers via `nextval` — `patient_code_seq` for `P-00001` codes (`0002:36`).

**Q:** 🟢 What is an enum type in Postgres?

**A:** A custom type with a fixed set of labels: `CREATE TYPE user_role AS ENUM ('admin','dentist','receptionist')` (`0001:18, 26`).

**Q:** 🟡 What is normalization?

**A:** Structuring tables to reduce redundancy and anomalies (1NF atomic values, 2NF no partial dependencies, 3NF no transitive dependencies).

**Q:** 🟡 What is denormalization and where does this schema do it?

**A:** Intentionally storing redundant/nested data for simplicity or speed — medications as a JSONB array instead of a child table, and raw `extracted` output alongside reviewed fields.

**Q:** 🟡 What are ON DELETE options?

**A:** `CASCADE` (delete children), `RESTRICT`/`NO ACTION` (block), `SET NULL`, `SET DEFAULT`. Tokens cascade with users; prescriptions restrict patient deletion (`0001:55`, `0002:79`).

**Q:** 🟡 Why does deleting a patient require deleting prescriptions first here?

**A:** The FK is `ON DELETE RESTRICT`, so the service deletes prescriptions, then the patient, in one transaction (`patient_service.py:127-132`).

**Q:** 🟡 What is a subquery?

**A:** A query nested in another; here an aggregated derived table joined to patients (`patient_service.py:45-63`).

**Q:** 🟡 What is a CTE?

**A:** `WITH name AS (SELECT …) SELECT … FROM name` — a named subquery for readability; non-recursive CTEs are inlined by PG 12+.

**Q:** 🟡 What does an aggregate `FILTER (WHERE …)` do?

**A:** Aggregates only rows matching the condition: `min(follow_up_date) FILTER (WHERE follow_up_date >= today)` (`patient_service.py:50-51`).

**Q:** 🟡 What's the difference between `COUNT(*)` and `COUNT(col)`?

**A:** `COUNT(*)` counts rows; `COUNT(col)` counts non-NULL values.

**Q:** 🟡 How does the app count total rows for pagination?

**A:** `SELECT count(*) FROM (<filtered query>) AS sub` (`user_service.py:38`).

**Q:** 🟡 Why is OFFSET pagination slow for deep pages?

**A:** The database must scan and discard all skipped rows; keyset pagination (`WHERE (k) < (last) ORDER BY k LIMIT n`) seeks via index.

**Q:** 🟡 What is a B-tree index good for?

**A:** Equality, ranges, sorting, prefix LIKE (`'abc%'`). Default index type.

**Q:** 🟡 What is a GIN index?

**A:** Generalized Inverted Index for multi-valued data: JSONB keys, arrays, full-text, trigrams (`0002:53-55`).

**Q:** 🟡 What is pg_trgm?

**A:** An extension that splits text into trigrams to compute similarity and accelerate `LIKE/ILIKE '%…%'` with GIN/GiST indexes (`0001:23`).

**Q:** 🟡 What does `similarity('Rahima Begum', 'Rahema Begum')` return?

**A:** A number in [0, 1] — the shared-trigram ratio; the app treats ≥ 0.35 as a possible match (`patient_service.py:17, 165`).

**Q:** 🟡 Why can't a normal B-tree index help `ILIKE '%x%'`?

**A:** A leading wildcard prevents using the sorted prefix order; trigram indexes solve this.

**Q:** 🟡 What is a composite index and the leftmost-prefix rule?

**A:** An index on `(a, b)` supports filters on `a` or `a AND b` but not `b` alone.

**Q:** 🟡 What is a partial index?

**A:** An index over rows matching a predicate (`WHERE status = 'draft'`) — smaller and faster for that subset.

**Q:** 🟡 What is an expression (functional) index?

**A:** An index on an expression like `lower(patient_code)`, making `WHERE lower(patient_code) = ?` sargable (`patient_service.py:77` would benefit).

**Q:** 🟡 What does "sargable" mean?

**A:** A predicate that can use an index (search-argument-able), e.g. `col = x`, not `func(col) = x` without an expression index.

**Q:** 🟡 What does `EXPLAIN ANALYZE` show?

**A:** The executed plan with actual row counts and timings (scan types, joins, sorts), for diagnosing slow queries.

**Q:** 🟡 What isolation level does Postgres use by default?

**A:** Read Committed — each statement sees data committed before it began.

**Q:** 🟡 Describe the isolation levels and anomalies.

**A:** Read Uncommitted (≈ Read Committed in PG), Read Committed (non-repeatable reads, phantoms possible), Repeatable Read (snapshot; no phantoms in PG; serialization failures), Serializable (SSI; full serializability, retry on conflict).

**Q:** 🟡 What is MVCC?

**A:** Multi-Version Concurrency Control: writers create new row versions, readers see a consistent snapshot without blocking; VACUUM removes dead versions.

**Q:** 🟡 What is a deadlock?

**A:** Two transactions waiting on each other's locks; Postgres detects and aborts one. Prevent by consistent lock ordering and short transactions.

**Q:** 🟡 What is a savepoint?

**A:** A nested rollback point inside a transaction (`SAVEPOINT s; ROLLBACK TO s;`) — used by the test fixture so app commits don't escape (`conftest.py:54`).

**Q:** 🟡 What is the N+1 query problem?

**A:** Loading N parent rows then issuing one query per row for related data; fix with joins/eager loading (`joinedload`, `prescription_service.py:244`).

**Q:** 🟡 What is connection pooling and why needed?

**A:** Reusing open connections instead of opening one per request (Postgres forks a process per connection); SQLAlchemy pools by default, PgBouncer at scale.

**Q:** 🟡 What does `pool_pre_ping` do?

**A:** Tests a pooled connection before use, discarding dead ones after a DB restart (`core/db.py:8`).

**Q:** 🟡 UUID vs serial primary keys?

**A:** UUIDs: generated client-side, non-guessable, merge-friendly; larger and random (index fragmentation). Serials: compact, ordered, but reveal counts and need the DB to assign.

**Q:** 🟡 Why are naming conventions for constraints useful?

**A:** Predictable names (`uq_users_email`) make migrations and error mapping reliable (`models/base.py:7-13`).

**Q:** 🟡 What is a CHECK constraint?

**A:** A boolean rule per row (`CHECK (age_years BETWEEN 0 AND 130)`) — none exist here; validation is in Pydantic only.

**Q:** 🟡 What is a sequence gap and is it a problem?

**A:** `nextval` values aren't rolled back, so numbers can be skipped; harmless for codes like `P-00042`.

**Q:** 🔴 How does `nextval` stay unique under concurrency?

**A:** Sequences are non-transactional atomic counters; each call returns a new value even across concurrent transactions.

**Q:** 🔴 What is a check-then-insert race and where does it exist here?

**A:** Two requests check "email free" and both insert; the unique constraint rejects one with `IntegrityError` → currently a 500. Seen in `_ensure_email_free` and `_ensure_code_free` (`user_service.py:45-50`, `patient_service.py:76-83`). Catch `IntegrityError` or use `ON CONFLICT`.

**Q:** 🔴 What is a lost update and how do you prevent it?

**A:** Two transactions read-modify-write the same row; the last overwrites the first. Prevent with `SELECT … FOR UPDATE`, optimistic locking (version column), or atomic UPDATEs.

**Q:** 🔴 What is `SELECT … FOR UPDATE SKIP LOCKED` used for?

**A:** Job queues in Postgres: workers lock and claim rows without waiting on rows locked by others.

**Q:** 🔴 What is the WAL?

**A:** Write-Ahead Log — changes are logged before data pages are written, providing durability, crash recovery and replication.

**Q:** 🔴 What is VACUUM?

**A:** Reclaims space from dead tuples (MVCC), updates visibility maps; autovacuum runs it automatically; `VACUUM FULL` rewrites tables (locks).

**Q:** 🔴 What is a HOT update?

**A:** Heap-Only Tuple update: if no indexed columns change and the page has space, the new version stays on the page without index updates.

**Q:** 🔴 How do you create an index without locking writes?

**A:** `CREATE INDEX CONCURRENTLY` (can't run inside a transaction).

**Q:** 🔴 What's the expand/contract migration pattern?

**A:** Add new structure (expand), backfill and dual-write, switch reads, then remove old structure (contract) — zero-downtime schema changes. `0003` does a compact version.

**Q:** 🔴 How does Postgres choose a join strategy?

**A:** The planner estimates costs using statistics and picks Nested Loop (small inputs/indexed), Hash Join (large unsorted), or Merge Join (sorted inputs).

**Q:** 🔴 What is `btree_gist` for?

**A:** Lets GiST indexes include scalar columns — needed for exclusion constraints like "no overlapping appointments for the same dentist" (`0001:22`).

**Q:** 🔴 What is an exclusion constraint?

**A:** `EXCLUDE USING gist (dentist_id WITH =, tstzrange(start, end) WITH &&)` — prevents rows that conflict by operators (overlapping ranges).

## Predict / find the bug

**Q:** 🟢 Predict: `SELECT NULL = NULL`

**A:** `NULL` (unknown), not true. Use `IS NULL`.

**Q:** 🟡 Predict: `SELECT count(*), count(phone) FROM patients` when 2 of 5 phones are NULL

**A:** `5, 3`.

**Q:** 🟡 Bug: `SELECT name, count(*) FROM t GROUP BY id`

**A:** `name` must be grouped or aggregated (unless `id` is the primary key, where PG allows functional dependency).

**Q:** 🟡 Bug: `WHERE lower(email) = 'a@b.com'` is slow.

**A:** Function on the column prevents the plain index; store lower-cased emails (as the app does) or add an expression index.

**Q:** 🟡 Predict: `LEFT JOIN … WHERE right.col = 'x'`

**A:** Turns it into an inner join (rows with NULL right side are filtered out); put the condition in `ON` to keep left rows.

**Q:** 🟡 Bug: pagination without ORDER BY.

**A:** Row order is undefined; pages can overlap or skip rows. Always order deterministically (the app orders by date then name/created_at).

**Q:** 🟡 Predict: `SELECT '2026-10-15' >= '2026-10-08'` as text

**A:** `true` — ISO dates compare correctly as strings (used by the frontend schema, `form.ts:44`).

**Q:** 🔴 Bug: `WHERE similarity(full_name, :n) >= 0.35` is slow on 1M rows.

**A:** The GIN trigram index can't serve a function comparison; use `full_name % :n` (with `pg_trgm.similarity_threshold`) and `ORDER BY full_name <-> :n` with a GiST index.

**Q:** 🟡 Predict: deleting a user with refresh tokens.

**A:** Tokens are deleted automatically (`ON DELETE CASCADE`).

**Q:** 🟡 Predict: deleting a patient with prescriptions directly in SQL.

**A:** Error — FK `RESTRICT` blocks it.

**Q:** 🔴 Bug: `UPDATE t SET n = n + 1` vs read in app then write — which is safe?

**A:** The single UPDATE is atomic; read-then-write in the app can lose updates under concurrency.

## Scenarios

**Q:** 🟡 Write SQL for patients with visit count and last visit.

**A:**
```sql
SELECT p.*, COALESCE(s.cnt, 0), s.last
FROM patients p
LEFT JOIN (SELECT patient_id, count(*) cnt, max(visit_date) last
           FROM prescriptions WHERE status = 'confirmed' GROUP BY patient_id) s ON s.patient_id = p.id
ORDER BY s.last DESC NULLS LAST, p.full_name;
```

**Q:** 🟡 Find patients with a follow-up in the next 7 days.

**A:** `SELECT DISTINCT p.* FROM patients p JOIN prescriptions r ON r.patient_id = p.id WHERE r.status='confirmed' AND r.follow_up_date BETWEEN current_date AND current_date + 7;` (use the clinic's date in app code).

**Q:** 🟡 Find duplicate patient names.

**A:** `SELECT lower(full_name), count(*) FROM patients GROUP BY 1 HAVING count(*) > 1;`

**Q:** 🟡 Find the most prescribed medicines from JSONB.

**A:** `SELECT m->>'name' AS name, count(*) FROM prescriptions, jsonb_array_elements(medications) m WHERE status='confirmed' GROUP BY 1 ORDER BY 2 DESC LIMIT 10;`

**Q:** 🟡 Which index would speed up the drafts list?

**A:** `CREATE INDEX ON prescriptions (status, visit_date DESC NULLS FIRST, created_at DESC);` matching filter + sort (`prescription_service.py:237-246`).

**Q:** 🟡 How would you enforce case-insensitive unique patient codes?

**A:** `CREATE UNIQUE INDEX uq_patients_code_lower ON patients (lower(patient_code));`

**Q:** 🟡 Make "start reading" atomic.

**A:** `UPDATE prescriptions SET reading_started_at = now() WHERE id = :id AND status = 'draft' AND (reading_started_at IS NULL OR reading_started_at < now() - interval '5 minutes') RETURNING id;` — start only if a row is returned.

**Q:** 🔴 How would you prevent two dentists filing the same draft simultaneously?

**A:** `SELECT … FOR UPDATE` on the prescription at the start of `save`, or an optimistic `UPDATE … WHERE id = :id AND status = 'draft'` checking the affected row count.

**Q:** 🟡 How would you back up this database?

**A:** Scheduled `pg_dump` (logical) plus WAL archiving for point-in-time recovery; test restores; also back up the `uploads` volume (photos).

**Q:** 🟡 A query got slow after data growth. Steps?

**A:** `EXPLAIN (ANALYZE, BUFFERS)`, check for seq scans/sorts, add or adjust indexes, rewrite non-sargable predicates, `ANALYZE` stats, consider keyset pagination.

**Q:** 🔴 How would you add full-text search on diagnoses?

**A:** A generated `tsvector` column (`to_tsvector('simple', diagnosis)`) with a GIN index and `@@ plainto_tsquery(...)` queries; Bangla needs the `simple` config or an external engine.

**Q:** 🟡 How do you add a NOT NULL column to a table with data?

**A:** Add with a default (or nullable), backfill, then set NOT NULL / drop the default — as `0003` does (`0003:20-25`).

## Write-it-quickly

**Q:** 🟢 Write a query for drafts newest first.

**A:** `SELECT * FROM prescriptions WHERE status = 'draft' ORDER BY created_at DESC LIMIT 20;`

**Q:** 🟡 Write a GIN trigram index.

**A:** `CREATE INDEX ix_patients_full_name_trgm ON patients USING gin (full_name gin_trgm_ops);` (`0002:53-55`).

**Q:** 🟡 Write an upsert.

**A:** `INSERT INTO patients (id, patient_code, full_name) VALUES (…) ON CONFLICT (patient_code) DO UPDATE SET full_name = EXCLUDED.full_name;`

**Q:** 🟡 Count total and drafts in one query.

**A:** `SELECT count(*), count(*) FILTER (WHERE status = 'draft') FROM prescriptions;`

**Q:** 🟡 Revoke all active tokens for a user.

**A:** `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL;` (`auth_service.py:58-63`).

**Q:** 🟡 Convert a text column to a one-element JSONB array.

**A:** `UPDATE prescriptions SET image_paths = jsonb_build_array(image_path);` (`0003:24`).

**Q:** 🟡 Window function: rank prescriptions per patient by date.

**A:** `SELECT *, row_number() OVER (PARTITION BY patient_id ORDER BY visit_date DESC) AS rn FROM prescriptions;`

## Real interview questions

**Q:** 🟡 SQL vs NoSQL?

**A:** SQL: schemas, joins, ACID, strong consistency; NoSQL: flexible schemas, horizontal scale, varied consistency. Postgres + JSONB gives both relational integrity and document flexibility here.

**Q:** 🟡 PostgreSQL vs MySQL?

**A:** Postgres: richer types (JSONB, arrays, ranges), extensions (pg_trgm, PostGIS), stricter SQL, transactional DDL; MySQL: simpler ops, popular in LAMP stacks.

**Q:** 🟡 `DELETE` vs `TRUNCATE` vs `DROP`?

**A:** Delete rows (filterable, fires triggers) vs remove all rows quickly vs remove the table.

**Q:** 🟡 `UNION` vs `UNION ALL`?

**A:** `UNION` deduplicates (sort/hash cost); `UNION ALL` keeps all rows.

**Q:** 🟡 What are window functions?

**A:** Aggregates over a window of rows without collapsing them: `row_number()`, `rank()`, `lag()`, `sum() OVER (PARTITION BY …)`.

**Q:** 🟡 What is a view vs materialized view?

**A:** A view is a stored query; a materialized view stores results and must be refreshed.

**Q:** 🟡 What are triggers and why might you avoid them?

**A:** Functions run on INSERT/UPDATE/DELETE; powerful (audit logs) but hide logic. `updated_at` here is set by the ORM, not a trigger.

**Q:** 🟡 What is SQL injection and how is it prevented here?

**A:** Injecting SQL via user input; prevented by parameterised queries — SQLAlchemy binds values (`ilike(like)` passes `like` as a parameter).

**Q:** 🟡 JSON vs JSONB?

**A:** JSON stores text as-is (preserves formatting/duplicates); JSONB stores parsed binary (faster queries, indexable, deduplicated keys).

**Q:** 🔴 How do you scale reads in Postgres?

**A:** Read replicas (streaming replication), caching, connection pooling, query/index tuning, partitioning large tables.

**Q:** 🔴 What is table partitioning?

**A:** Splitting a large table into child tables by range/list/hash (e.g. prescriptions by year) for maintenance and pruning.

**Q:** 🟡 Why store time in UTC?

**A:** Unambiguous instants, no DST issues, easy conversion to any display zone (`README.md:120`).

**Q:** 🟡 What is referential integrity?

**A:** Every FK value matches an existing referenced row (or is NULL), enforced by the database.

**Q:** 🟢 What is the difference between `CHAR`, `VARCHAR(n)` and `TEXT` in Postgres?

**A:** `CHAR(n)` pads; `VARCHAR(n)` limits length; `TEXT` unlimited. Performance is the same; `varchar(n)` documents limits (`String(120)`).

**Q:** 🟡 What are extensions?

**A:** Add-on features installed per database (`CREATE EXTENSION pg_trgm`) — need appropriate privileges.

**Q:** 🟡 What does `RETURNING` do?

**A:** Returns columns from rows affected by INSERT/UPDATE/DELETE, avoiding an extra SELECT.

**Q:** 🟡 What is `DISTINCT ON` (Postgres)?

**A:** Keeps the first row per group according to ORDER BY — e.g. latest prescription per patient.

**Q:** 🔴 How would you audit who changed a prescription?

**A:** An `audit_log` table written by the service (user, action, before/after JSONB, timestamp), or triggers; never update audit rows.

**Q:** 🟡 What happens to a transaction if one statement fails in Postgres?

**A:** The transaction is aborted; further statements error until ROLLBACK (or ROLLBACK TO a savepoint).

**Q:** 🟡 Why is `test_database_url` separate?

**A:** Tests drop and recreate the schema; isolating them protects real data (`config.py:16-18`, `conftest.py:41`).

**Q:** 🟡 What is `pg_isready`?

**A:** A Postgres utility checking if the server accepts connections — used in the Compose healthcheck (`docker-compose.yml:16`).

**Q:** 🟡 What are Postgres roles/privileges best practices?

**A:** App user with only needed privileges (no superuser), separate migration user, no public network exposure, strong passwords.
