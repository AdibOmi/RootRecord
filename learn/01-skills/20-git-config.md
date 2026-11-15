# 20 — Git workflow & configuration management

> **Where it lives:** `.gitignore`, `.gitattributes`, `backend/.env.example`,
> `frontend/.env.example`, `backend/app/core/config.py`, `.vscode/settings.json`, Git history
> (`ee3fc76 MVP` 2026-09-25, `e337cc4 Added prescription scanning` 2026-10-31).

---

## 1. What & why

**Git** — a distributed version-control system: it records snapshots (**commits**) of your files,
lets you branch, merge and go back in time, and synchronise with remotes (GitHub).

**Configuration management** — keeping settings (DB URLs, secrets, feature flags) *out of code*,
supplied per environment, validated at startup.

**Analogy:** Git is a lab notebook where every page is dated, signed and can be photocopied into a
side notebook (branch) for experiments. Config is the list of dials you set differently in the test
lab and the real clinic.

---

## 2. Git fundamentals

| Concept | Meaning |
|---|---|
| **Working tree** | your files |
| **Index / staging area** | what goes into the next commit (`git add`) |
| **Commit** | snapshot + message + parent pointer(s), identified by a SHA hash |
| **Branch** | a movable pointer to a commit |
| **HEAD** | the commit/branch you're on |
| **Remote** | another copy (e.g. `origin` on GitHub) |
| **Merge** | combine histories (merge commit) |
| **Rebase** | replay your commits on top of another branch (linear history) |
| **Tag** | fixed pointer, e.g. a release `v0.1.0` |

```bash
git status / git diff / git diff --staged
git add -p                 # stage hunks interactively (in a normal terminal)
git commit -m "Add prescription PDF download"
git switch -c feature/recalls
git fetch && git rebase origin/master   # or: git merge origin/master
git push -u origin feature/recalls      # then open a pull request
git log --oneline --graph
git restore file / git revert <sha>     # undo safely (revert = new commit)
git stash                               # park uncommitted work
```

### 2.1 This repo's history

Only two commits: an "MVP" and "Added prescription scanning" — large, feature-sized commits on
`master`. ⚠️ For a team (or to *show* your process in interviews), prefer small commits with clear
messages ("feat(prescriptions): read pages in background"), feature branches and pull requests with
CI checks.

### 2.2 Workflows

| Workflow | Shape |
|---|---|
| **Trunk-based** | short-lived branches merged to main daily; feature flags |
| **GitHub Flow** | branch → PR → review → merge → deploy |
| **Git Flow** | develop/release/hotfix branches; heavier, for versioned releases |

**Conventional Commits** — `type(scope): summary` (`feat`, `fix`, `docs`, `refactor`, `test`,
`chore`) enables changelogs and semantic versioning.

### 2.3 `.gitignore` and `.gitattributes`

📍 `.gitignore:1-21` ignores Python caches, `.venv`, `node_modules`, `dist`, **`.env`**,
`backend/data/`, logs and editor folders. Committing `.env` would leak secrets; committing
`node_modules`/`dist` bloats the repo with generated files.

📍 `.gitattributes:1-2`:
```
* text=auto          # normalise line endings to LF in the repo, native on checkout
*.sh text eol=lf     # shell scripts always LF (they run in Linux containers)
```

⚠️ `.vscode/` is ignored (`.gitignore:19`) yet `.vscode/settings.json` exists locally — fine; it's
your personal editor setting (`python.terminal.useEnvFile: true`).

---

## 3. Configuration management

### 3.1 The Twelve-Factor rule

**Twelve-Factor App, factor III** — store config in the **environment**, not in code; the same build
runs in dev, test and prod with different env vars.

### 3.2 How it's done here

| Layer | Mechanism | 📍 |
|---|---|---|
| Backend | `Settings(BaseSettings)` reads env vars + optional `.env`; typed and validated | `backend/app/core/config.py:10-60` |
| Backend defaults | safe dev defaults so `.env` is optional | `README.md:43` |
| Production guard | refuse dev JWT secret when `ENVIRONMENT=production` | `config.py:51-55` |
| Caching | `@lru_cache get_settings()` — parsed once | `config.py:58-60` |
| Templates | `.env.example` lists every variable with comments; real `.env` is gitignored | `backend/.env.example`, `frontend/.env.example` |
| Compose | `env_file` (optional) + `environment` overrides | `docker-compose.yml:23-28, 40-46` |
| Frontend | build-time only; Node reads `process.env` in `vite.config.ts`; only `VITE_*` would reach the browser | `vite.config.ts:16, 19` |
| Tests | separate `TEST_DATABASE_URL`; Alembic URL passed via `config.attributes` | `config.py:16-18`, `alembic/env.py:13-15` |

### 3.3 Secrets

**Secret** — any value that grants access (JWT secret, DB password, API keys). Rules: never commit;
rotate if leaked; inject at runtime (Docker/K8s secrets, cloud secret managers, Vault); least
privilege; different per environment.

⚠️ Defaults that are secrets-like: `POSTGRES_PASSWORD: rootrecord` (`docker-compose.yml:8`),
`BOOTSTRAP_ADMIN_PASSWORD=Admin@12345` (`.env.example:34`). Fine for local dev; must be overridden
anywhere real.

### 3.4 Feature flags

The Gemini key acts as an implicit flag: no key → automatic reading disabled, manual entry still
works (`extraction_service.py:142-145`).

---

## 4. Comparisons

| X vs Y | Answer |
|---|---|
| merge vs rebase | preserves history with merge commits vs linear history (don't rebase shared branches) |
| `reset` vs `revert` | move branch pointer (rewrites history) vs new inverse commit (safe on shared branches) |
| `fetch` vs `pull` | download only vs fetch + merge/rebase |
| Git vs SVN | distributed vs centralised |
| `.env` vs secret manager | simple local file vs audited, rotated, access-controlled |
| env vars vs config files | 12-factor, container friendly vs structured, versioned |

---

## 5. Cheat sheet

```bash
git switch -c feat/x; git add -p; git commit -m "feat: …"; git push -u origin feat/x
git rebase -i HEAD~3        # squash/fixup (interactive; in a normal terminal)
git cherry-pick <sha>; git bisect start/good/bad; git blame file
cp backend/.env.example backend/.env   # local config
python -c "import secrets; print(secrets.token_urlsafe(48))"   # generate JWT_SECRET
```

---

## 6. Why this approach

Typed settings with safe defaults make the project run with zero setup while failing fast on the one
dangerous default in production. Adding CI, branch protection and smaller commits would be the next
step for team work.
