# Git & Configuration — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

**Q:** 🟢 What is Git?

**A:** A distributed version control system storing snapshots (commits) of a project with full history on every clone.

**Q:** 🟢 Working tree vs staging area vs repository?

**A:** Your files; the index of changes selected for the next commit (`git add`); committed history.

**Q:** 🟢 What is a commit?

**A:** A snapshot with a message, author, timestamp and parent pointer(s), identified by a hash.

**Q:** 🟢 What is a branch?

**A:** A movable pointer to a commit; new commits advance it.

**Q:** 🟢 `git fetch` vs `git pull`?

**A:** Fetch downloads remote changes without merging; pull = fetch + merge (or rebase).

**Q:** 🟢 What does `.gitignore` do?

**A:** Lists files Git shouldn't track — caches, `node_modules`, `dist`, `.env` (`.gitignore:1-21`).

**Q:** 🟢 Why never commit `.env`?

**A:** It contains secrets; history is permanent and shared.

**Q:** 🟢 What is `.env.example` for?

**A:** Documents required variables with safe placeholders (`backend/.env.example`).

**Q:** 🟢 What does `git status` show?

**A:** Modified, staged and untracked files (e.g. the untracked `RootRecord-Interview-Guide.pdf`).

**Q:** 🟡 Merge vs rebase?

**A:** Merge combines histories with a merge commit (preserves context); rebase replays commits on a new base (linear history; don't rebase shared branches).

**Q:** 🟡 `git reset` vs `git revert`?

**A:** Reset moves the branch pointer (rewrites history); revert creates a new commit undoing changes (safe for shared branches).

**Q:** 🟡 What is `git stash`?

**A:** Temporarily shelves uncommitted changes to switch context.

**Q:** 🟡 What is a pull request?

**A:** A request to merge a branch, enabling review, discussion and CI checks before merging.

**Q:** 🟡 What is trunk-based development?

**A:** Short-lived branches merged into main frequently, often behind feature flags.

**Q:** 🟡 What are Conventional Commits?

**A:** Message format `type(scope): summary` (`feat`, `fix`, `docs`…) enabling automated changelogs.

**Q:** 🟡 What does `.gitattributes` `* text=auto` do?

**A:** Normalises line endings to LF in the repository and converts to native on checkout.

**Q:** 🟡 Why `*.sh text eol=lf`?

**A:** Shell scripts must have LF endings to run in Linux containers (`.gitattributes:2`).

**Q:** 🟡 How would you improve this repo's Git history?

**A:** Smaller focused commits with descriptive messages, feature branches, PRs with CI — currently two large commits on `master`.

**Q:** 🟡 What is `git cherry-pick`?

**A:** Applies a specific commit onto the current branch.

**Q:** 🟡 What is `git bisect`?

**A:** Binary search through history to find the commit that introduced a bug.

**Q:** 🟡 What does the Twelve-Factor "config" rule say?

**A:** Store config in the environment, separate from code; the same build runs everywhere with different env vars.

**Q:** 🟡 How does the backend load configuration?

**A:** `Settings(BaseSettings)` reads env vars and optional `.env`, validates types, cached by `get_settings()` (`config.py:10-60`).

**Q:** 🟡 What production guard exists in config?

**A:** The app refuses to start in production with the dev JWT secret (`config.py:51-55`).

**Q:** 🟡 How do frontend env vars work?

**A:** Node-side `process.env` in `vite.config.ts`; only `VITE_*` variables would reach browser code via `import.meta.env` at build time.

**Q:** 🔴 How do you remove a secret accidentally committed?

**A:** Rotate the secret immediately; then rewrite history (`git filter-repo`/BFG) and force-push, knowing clones may still have it.

**Q:** 🔴 How would you manage secrets in production?

**A:** A secret manager (AWS Secrets Manager, Vault, Doppler) or orchestrator secrets injected at runtime, with rotation and least-privilege access.

**Q:** 🔴 What are feature flags and where does the app have an implicit one?

**A:** Runtime switches enabling features; `GEMINI_API_KEY` presence enables automatic reading (`extraction_service.py:142-145`).

**Q:** 🟡 What does `git log --oneline --graph` show?

**A:** A compact visual history of commits and branches.

**Q:** 🟡 What is a tag?

**A:** A fixed name for a commit, often a release (`v0.1.0`).

**Q:** 🟡 How do you undo the last local commit but keep changes?

**A:** `git reset --soft HEAD~1`.

**Q:** 🟡 What does `git add -p` do?

**A:** Stage changes hunk by hunk for focused commits.

**Q:** 🟢 Why is `.vscode/` ignored?

**A:** Editor settings are personal (`.gitignore:19`).

**Q:** 🟡 How do you generate a strong JWT secret?

**A:** `python -c "import secrets; print(secrets.token_urlsafe(48))"` (`.env.example:7`).

**Q:** 🟡 Why are there separate `DATABASE_URL` and `TEST_DATABASE_URL`?

**A:** Tests drop/recreate their schema; isolating them protects development/production data.
