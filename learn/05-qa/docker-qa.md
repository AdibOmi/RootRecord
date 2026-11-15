# Docker & Docker Compose — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Concepts

**Q:** 🟢 What is a container?

**A:** An isolated process with its own filesystem, network and process namespace, sharing the host kernel.

**Q:** 🟢 What is an image?

**A:** A read-only, layered template (filesystem + metadata) used to start containers.

**Q:** 🟢 Container vs virtual machine?

**A:** Containers share the host kernel (lightweight, fast start); VMs run full guest OSes with a hypervisor (stronger isolation, heavier).

**Q:** 🟢 What is a Dockerfile?

**A:** A script of instructions (`FROM`, `COPY`, `RUN`, `CMD`) to build an image (`backend/Dockerfile`).

**Q:** 🟢 What does `FROM python:3.12-slim` do?

**A:** Starts from the official Python 3.12 slim Debian image.

**Q:** 🟢 What does `WORKDIR /app` do?

**A:** Sets the working directory for following instructions and the container.

**Q:** 🟢 `COPY` vs `ADD`?

**A:** `COPY` copies files; `ADD` also fetches URLs and extracts tarballs — prefer `COPY`.

**Q:** 🟢 What does `RUN` do?

**A:** Executes a command at build time, creating a new layer (`pip install`, `npm ci`).

**Q:** 🟢 What does `EXPOSE` do?

**A:** Documents the port; publishing happens with `ports:` / `-p`.

**Q:** 🟢 What is Docker Compose?

**A:** A tool that defines multi-container apps in YAML and runs them together (`docker-compose.yml`).

**Q:** 🟢 What is a service in Compose?

**A:** A container configuration (db, backend, frontend) with image/build, env, ports, volumes, dependencies.

**Q:** 🟢 What does `ports: "8000:8000"` mean?

**A:** Map host port 8000 to container port 8000.

**Q:** 🟢 What is a volume?

**A:** Persistent storage managed by Docker (`pgdata`, `uploads`) surviving container recreation.

**Q:** 🟢 What is a bind mount?

**A:** Mounting a host directory into a container (`./backend:/app`) — live code editing.

**Q:** 🟢 How do containers find each other in Compose?

**A:** By service name on the default network (`db`, `backend`), e.g. `postgresql://…@db:5432/…`.

**Q:** 🟢 What does `docker compose up --build` do?

**A:** Builds images if needed and starts all services (`README.md:22`).

**Q:** 🟢 What does `docker compose exec backend pytest` do?

**A:** Runs a command inside the running backend container.

**Q:** 🟢 What is `.dockerignore`?

**A:** Files excluded from the build context (`node_modules`, `.env`, caches).

**Q:** 🟡 `CMD` vs `ENTRYPOINT`?

**A:** ENTRYPOINT is the fixed executable; CMD provides default arguments (or the command if no ENTRYPOINT). Here the entrypoint script runs migrations then `exec "$@"` with CMD (`Dockerfile:16-17`).

**Q:** 🟡 Exec form vs shell form?

**A:** `["a", "b"]` runs directly (proper signals, PID 1); `CMD a b` runs via `/bin/sh -c`, which may swallow signals.

**Q:** 🟡 Why `exec "$@"` in the entrypoint?

**A:** Replaces the shell so the server is PID 1 and receives SIGTERM for graceful shutdown.

**Q:** 🟡 What is layer caching?

**A:** Docker reuses unchanged layers; ordering instructions from least to most frequently changing (deps before source) speeds rebuilds.

**Q:** 🟡 Why copy requirements before source?

**A:** Code edits don't invalidate the dependency-install layer (`Dockerfile:9-12`, `frontend/Dockerfile:5-8`).

**Q:** 🟡 What does `depends_on: condition: service_healthy` do?

**A:** Waits until the dependency's healthcheck passes before starting (`docker-compose.yml:29-31`).

**Q:** 🟡 What is a healthcheck?

**A:** A command Docker runs periodically to determine container health — `pg_isready` for Postgres (`docker-compose.yml:15-19`).

**Q:** 🟡 What does `env_file` do?

**A:** Loads environment variables from a file; `required: false` makes it optional (`docker-compose.yml:23-25`).

**Q:** 🟡 What's an anonymous volume used for in the frontend service?

**A:** `/app/node_modules` keeps the container's installed packages from being hidden by the bind mount (`docker-compose.yml:53`).

**Q:** 🟡 Why polling env vars (`WATCHFILES_FORCE_POLLING`, `VITE_USE_POLLING`)?

**A:** File change events don't cross Windows/macOS bind mounts into Docker's Linux VM; polling enables reload/HMR.

**Q:** 🟡 Why `--host 0.0.0.0` for servers in containers?

**A:** `127.0.0.1` inside the container isn't reachable from the host; `0.0.0.0` listens on all interfaces.

**Q:** 🟡 Why `PYTHONUNBUFFERED=1`?

**A:** Logs flush immediately to `docker logs`.

**Q:** 🟡 alpine vs slim base images?

**A:** Alpine (musl) is tiny but may need compiling Python wheels; slim (glibc) is larger but compatible with prebuilt wheels — backend uses slim, frontend alpine.

**Q:** 🟡 What does `.gitattributes *.sh eol=lf` have to do with Docker?

**A:** CRLF line endings break shell scripts in Linux containers (`/bin/sh^M`).

**Q:** 🟡 What does `docker compose down -v` do?

**A:** Removes containers and volumes — wiping the database and photos.

**Q:** 🟡 What is a multi-stage build?

**A:** Multiple `FROM` stages where later stages copy only artifacts from earlier ones — small runtime images without build tools.

**Q:** 🔴 How do namespaces and cgroups relate to containers?

**A:** Namespaces isolate views (pid, net, mount, user…); cgroups limit resources (CPU, memory). Together they make containers.

**Q:** 🔴 What is a union filesystem?

**A:** OverlayFS stacks read-only image layers with a writable container layer, enabling layer sharing.

**Q:** 🔴 Why run containers as non-root?

**A:** Limits damage if the app is compromised (container escapes, file permissions). Add `USER app` in production images.

**Q:** 🔴 How do you pass secrets to containers safely?

**A:** Runtime env vars from a secret manager, Docker/Kubernetes secrets, mounted files — never bake into images or commit `.env`.

## Project-specific

**Q:** 🟢 Which three services does the project run?

**A:** `db` (Postgres 16), `backend` (FastAPI/Uvicorn), `frontend` (Vite dev server) (`docker-compose.yml:3-53`).

**Q:** 🟡 What happens when the backend container starts?

**A:** `entrypoint.sh` runs `alembic upgrade head`, bootstraps the admin, then execs uvicorn with `--reload` (`entrypoint.sh:3-5`).

**Q:** 🟡 Where are uploaded photos stored?

**A:** In the `uploads` named volume mounted at `/data/uploads` (`docker-compose.yml:36`, `config.py:27`).

**Q:** 🟡 Where is the Postgres data stored?

**A:** The `pgdata` named volume (`docker-compose.yml:14`).

**Q:** 🟡 Why is `VITE_PROXY_TARGET` `http://backend:8000`?

**A:** Inside the Compose network, the backend is reachable by service name (`docker-compose.yml:45`).

**Q:** 🟡 Why is Postgres published on port 5432?

**A:** For local tools (psql, DBeaver); in production it shouldn't be exposed.

**Q:** 🔴 What makes these images development-only?

**A:** Dev dependencies installed, `--reload`, Vite dev server, root user, bind mounts, default credentials.

**Q:** 🔴 Sketch a production setup for this project.

**A:** Backend image without dev deps, non-root, Gunicorn/Uvicorn workers, migrations as a job; frontend multi-stage build served by nginx with SPA fallback and `/api` proxy; managed Postgres with backups; object storage for photos; TLS at the proxy; secrets from the platform.

**Q:** 🟡 What happens if you edit backend code with Compose running?

**A:** The bind mount updates `/app`; Uvicorn (`--reload` + polling) restarts automatically.

**Q:** 🟡 What does `TZ: UTC` on the db service do?

**A:** Sets the server's time zone to UTC, matching the app's storage convention.

## Predict / find the bug

**Q:** 🟡 Bug: backend connects to `localhost:5432` inside the container and fails.

**A:** `localhost` is the backend container itself; use the service name `db`.

**Q:** 🟡 Bug: `pip install` runs on every code change.

**A:** `COPY . .` before `pip install` invalidates the cache; copy requirements first.

**Q:** 🟡 Bug: `docker stop` takes 10 s and kills the app.

**A:** The app isn't PID 1 / doesn't receive SIGTERM (shell form or missing `exec`); use exec form and `exec "$@"`.

**Q:** 🟡 Bug: secrets appear in `docker history`.

**A:** They were passed as build args/ENV or copied in; inject at runtime and dockerignore `.env`.

**Q:** 🟡 Bug: backend starts before Postgres is ready and crashes.

**A:** Use a healthcheck with `condition: service_healthy` (done) or retry logic.

**Q:** 🔴 Bug: a Windows checkout makes `entrypoint.sh` fail with "not found".

**A:** CRLF line endings; enforce LF via `.gitattributes` (done).

## Write-it-quickly

**Q:** 🟡 Write a minimal Python API Dockerfile.

**A:**
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
USER 1000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Q:** 🟡 Write a multi-stage frontend Dockerfile.

**A:**
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

**Q:** 🟡 Write a Postgres healthcheck in Compose.

**A:** `healthcheck: { test: ["CMD-SHELL", "pg_isready -U app -d app"], interval: 3s, retries: 20 }` (`docker-compose.yml:15-19`).

**Q:** 🟡 Open a psql shell in the db container.

**A:** `docker compose exec db psql -U rootrecord -d rootrecord`.

## Interview

**Q:** 🟡 Docker Compose vs Kubernetes?

**A:** Compose: single-host multi-container (dev/small prod); Kubernetes: cluster orchestration with scheduling, self-healing, scaling, rolling updates.

**Q:** 🟡 Docker vs Podman?

**A:** Podman is daemonless and rootless by default with a compatible CLI.

**Q:** 🟡 How do you reduce image size?

**A:** Slim/alpine bases, multi-stage builds, no caches (`PIP_NO_CACHE_DIR=1`), `.dockerignore`, fewer layers, no dev deps.

**Q:** 🟡 How do you debug a failing container?

**A:** `docker compose logs -f svc`, `docker compose exec svc sh`, `docker inspect`, check healthchecks, run the command manually.

**Q:** 🟡 What is an image tag vs digest?

**A:** Tags (`16-alpine`) are mutable labels; digests (`@sha256:…`) are immutable content hashes — pin digests for reproducibility.

**Q:** 🟡 What's Docker Desktop doing on Windows/macOS?

**A:** Running a lightweight Linux VM to host containers, with file sharing to the host (hence slow file events/polling).
