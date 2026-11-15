# 17 — Docker & Docker Compose

> **Where it lives:** `docker-compose.yml`, `backend/Dockerfile`, `backend/entrypoint.sh`,
> `backend/.dockerignore`, `frontend/Dockerfile`, `frontend/.dockerignore`, `.gitattributes`.

---

## 1. What & why

**Container** — a process running with its own isolated filesystem, network and process view,
sharing the host's kernel. **Image** — a read-only template (layers of files + metadata) from
which containers start. **Docker** — the tooling to build images (from a **Dockerfile**) and run
containers. **Docker Compose** — a YAML file describing a multi-container app (services, networks,
volumes) started with one command.

**Analogy:** an image is a frozen meal with the recipe printed on the box; a container is that meal
heated and served; Compose is the menu that serves the starter, main and dessert together.

**Why here:** one command (`docker compose up --build`, `README.md:22`) starts Postgres, the API and
the frontend with the right versions on any OS — no local Python/Node/Postgres installs.

**When NOT to use:** when a PaaS (Render, Fly, Railway) builds for you, or for tiny scripts.

---

## 2. Fundamentals

### 2.1 Backend Dockerfile

📍 `backend/Dockerfile:1-17`:

```dockerfile
FROM python:3.12-slim                         # base image: Debian slim + Python 3.12

ENV PYTHONDONTWRITEBYTECODE=1 \               # no .pyc files in the image/bind mount
    PYTHONUNBUFFERED=1 \                      # logs appear immediately in `docker logs`
    PIP_NO_CACHE_DIR=1                        # smaller image

WORKDIR /app

COPY requirements.txt requirements-dev.txt ./ # copy ONLY dependency lists first …
RUN pip install -r requirements-dev.txt       # … so this layer is cached until they change

COPY . .                                      # then the source
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000                                   # documentation; doesn't publish the port
ENTRYPOINT ["/app/entrypoint.sh"]             # always runs first
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]  # default args
```

**Layer caching** — each instruction creates a layer; Docker reuses cached layers until an input
changes. Copying requirements before source means editing code doesn't reinstall packages.

### 2.2 The entrypoint

📍 `backend/entrypoint.sh:1-5`:

```sh
#!/bin/sh
set -e                               # exit on first error
alembic upgrade head                 # migrate the DB
python -m app.cli bootstrap-admin    # create the first admin if none
exec "$@"                            # replace the shell with CMD (uvicorn) → it becomes PID 1
```

**ENTRYPOINT vs CMD** — ENTRYPOINT is the fixed executable; CMD supplies default arguments (here
passed to the script as `"$@"`). `exec` matters: the server receives `SIGTERM` directly on
`docker stop` and shuts down gracefully.

📍 `.gitattributes:2` `*.sh text eol=lf` — forces LF line endings. A Windows checkout with CRLF
would make `/bin/sh` fail with `sh\r: not found` inside the Linux container. Subtle and important.

### 2.3 Frontend Dockerfile

📍 `frontend/Dockerfile:1-11`: `node:22-alpine`, copy `package.json` + lockfile, `npm ci`, copy
source, `CMD ["npm", "run", "dev"]`.

### 2.4 `.dockerignore`

📍 `backend/.dockerignore` excludes `__pycache__`, `.venv`, `.env`, `data`; `frontend/.dockerignore`
excludes `node_modules`, `dist`, `.env`. Keeps the **build context** small and keeps secrets out of
images.

---

## 3. Intermediate: Compose

📍 `docker-compose.yml:1-57`:

```yaml
name: rootrecord
services:
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: rootrecord, POSTGRES_PASSWORD: rootrecord, POSTGRES_DB: rootrecord, TZ: UTC }
    ports: ["5432:5432"]                       # host:container
    volumes: [pgdata:/var/lib/postgresql/data] # named volume → data survives container removal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rootrecord -d rootrecord"]
      interval: 3s
      timeout: 3s
      retries: 20

  backend:
    build: ./backend
    env_file: [{ path: ./backend/.env, required: false }]   # optional .env
    environment:
      WATCHFILES_FORCE_POLLING: "true"         # --reload works on Windows/macOS bind mounts
    depends_on:
      db: { condition: service_healthy }       # wait until pg_isready passes
    ports: ["8000:8000"]
    volumes:
      - ./backend:/app                         # bind mount: live code edits
      - uploads:/data/uploads                  # named volume: prescription photos

  frontend:
    build: ./frontend
    environment:
      VITE_PROXY_TARGET: http://backend:8000   # service name = DNS name on the Compose network
      VITE_USE_POLLING: "true"
    depends_on: [backend]
    ports: ["5173:5173"]
    volumes:
      - ./frontend:/app
      - /app/node_modules                      # anonymous volume shadows host node_modules

volumes: { pgdata: {}, uploads: {} }
```

| Concept | Meaning |
|---|---|
| **Service** | a container definition (can be scaled to replicas) |
| **Default network** | services reach each other by name (`db`, `backend`) |
| **Port mapping** | `"8000:8000"` publishes container port to the host |
| **Named volume** | Docker-managed storage that persists (`pgdata`, `uploads`) |
| **Bind mount** | a host folder mounted into the container (`./backend:/app`) |
| **Anonymous volume** | unnamed volume; here protects the image's Linux `node_modules` |
| **healthcheck + `condition: service_healthy`** | real readiness ordering, not just "started" |
| `env_file` with `required: false` | Compose ≥ 2.24 syntax; `.env` is optional |

Why `db:5432` in `DATABASE_URL` (`backend/.env.example:2`)? Inside the network, Postgres is
reachable at host **`db`**, not `localhost` (which would be the backend container itself).

**Why polling?** File-change events (inotify) don't cross from a Windows/macOS host filesystem into
the Linux VM, so Uvicorn's watcher and Vite poll instead (`docker-compose.yml:27-28, 46`,
`vite.config.ts:15-16`).

---

## 4. Advanced

### 4.1 Dev vs production images

⚠️ **Review note:** both images are development images:
- backend installs dev deps (`pytest`, `httpx`) and runs `--reload`;
- frontend runs the Vite **dev server**;
- Compose publishes Postgres on the host with a weak password.

A production setup would use:

```dockerfile
# frontend: multi-stage build
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# + nginx.conf: SPA fallback (try_files $uri /index.html) and proxy /api → backend
```

and for the backend: `pip install -r requirements.txt` only, a non-root `USER`, no `--reload`,
`--workers N` (or Gunicorn), migrations as a separate job, secrets from the platform, TLS at a
reverse proxy, DB not exposed publicly, backups of `pgdata` and `uploads`.

**Multi-stage build** — several `FROM` stages; only the final stage's files ship, so build tools stay
out of the runtime image.

### 4.2 Security

- Run as non-root (`USER app`); read-only filesystem where possible.
- Don't bake secrets into images (`.env` is dockerignored ✅).
- Pin base image digests; scan images (`docker scout`, Trivy).
- `alpine` (musl) vs `slim` (glibc): alpine is smaller but some Python wheels need compiling;
  that's why the backend uses `slim`.

### 4.3 Useful commands

```bash
docker compose up --build            # build + start (foreground)
docker compose up -d                 # detached
docker compose logs -f backend
docker compose exec backend pytest   # run a command in a running container
docker compose exec db psql -U rootrecord
docker compose down                  # stop + remove containers (volumes kept)
docker compose down -v               # also delete volumes (⚠️ wipes the DB and photos)
docker image ls / docker system prune
```

---

## 5. Under the hood

Containers use Linux **namespaces** (pid, net, mnt, uts, ipc, user) for isolation and **cgroups**
for resource limits; images use a **union filesystem** (overlayfs) stacking read-only layers with a
writable container layer. On Windows/macOS, Docker Desktop runs a lightweight Linux VM.

---

## 6. Comparisons

| X vs Y | Answer |
|---|---|
| container vs VM | shared kernel, MB, seconds vs full OS, GB, minutes; VMs isolate more strongly |
| image vs container | template vs running instance |
| `CMD` vs `ENTRYPOINT` | default args vs fixed executable |
| `COPY` vs `ADD` | copy vs copy + URLs/tar extraction (prefer COPY) |
| bind mount vs volume | host path (dev) vs Docker-managed (data) |
| `depends_on` vs healthcheck condition | start order vs readiness |
| Compose vs Kubernetes | single host dev/small prod vs cluster orchestration, self-healing, scaling |
| Docker vs Podman | daemon vs daemonless, rootless by default |

---

## 7. Cheat sheet

```dockerfile
FROM image:tag; WORKDIR /app; COPY deps ./; RUN install; COPY . .; ENV K=V; EXPOSE 8000
USER app; ENTRYPOINT ["script"]; CMD ["arg"]; HEALTHCHECK CMD curl -f localhost:8000/api/v1/health
```

```yaml
services: { svc: { build: ., image: x, ports: ["h:c"], environment: {}, env_file: [],
  volumes: ["./src:/app", "data:/data"], depends_on: { db: { condition: service_healthy } } } }
```

---

## 8. Why chosen

The stack has three runtimes (Python, Node, Postgres with extensions). Compose gives every developer
an identical environment in one command and documents service wiring in code.
