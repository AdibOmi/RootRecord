# Node.js, npm, Vite, ESLint — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Node.js

**Q:** 🟢 What is Node.js?

**A:** A JavaScript runtime built on V8 with libuv for asynchronous I/O, used for servers, CLIs and build tools. Here it runs Vite, tsc, ESLint and Vitest.

**Q:** 🟢 Is Node single-threaded?

**A:** JS runs on one thread; libuv uses a thread pool (default 4) for file system, DNS, crypto, compression, and the OS for non-blocking sockets.

**Q:** 🟢 What is `process.env`?

**A:** Environment variables available to Node code — read in `vite.config.ts:16, 19`.

**Q:** 🟢 What are core modules?

**A:** Built-ins like `fs`, `path`, `http`, `crypto`, `os`, `stream`, `events`, `child_process`; import with the `node:` prefix (`vite.config.ts:2`).

**Q:** 🟢 What does `path.resolve(__dirname, './src')` do?

**A:** Builds an absolute path to `src` relative to the config file — used for the `@` alias (`vite.config.ts:10`).

**Q:** 🟡 Describe Node's event loop phases.

**A:** timers → pending callbacks → idle/prepare → poll (I/O) → check (`setImmediate`) → close callbacks; `process.nextTick` and promise microtasks run between phases.

**Q:** 🟡 `process.nextTick` vs `setImmediate` vs `setTimeout(fn, 0)`?

**A:** `nextTick` runs before other microtasks right after the current operation; `setImmediate` runs in the check phase; `setTimeout(0)` in the timers phase (order vs setImmediate varies outside I/O callbacks).

**Q:** 🟡 What are streams?

**A:** Interfaces for processing data incrementally (Readable, Writable, Duplex, Transform) with backpressure — e.g. piping a large file to a response without loading it fully.

**Q:** 🟡 What is backpressure?

**A:** A slow consumer signalling the producer to pause (`write()` returns false; resume on `drain`), preventing unbounded buffering.

**Q:** 🟡 What is the EventEmitter?

**A:** Node's pub/sub primitive (`on`, `emit`, `once`) underlying streams and servers.

**Q:** 🟡 CommonJS vs ES modules in Node?

**A:** CJS: `require`/`module.exports`, synchronous, dynamic; ESM: `import`/`export`, static, async loading, top-level await. `"type": "module"` makes `.js` files ESM (`package.json:5`).

**Q:** 🟡 What is `__dirname` in ESM?

**A:** Not defined natively in ESM (use `import.meta.dirname` in modern Node or `fileURLToPath(import.meta.url)`). Vite's config loader provides it, so `vite.config.ts:10` works.

**Q:** 🔴 How do you handle CPU-heavy work in Node?

**A:** Worker threads, child processes, or offloading to another service; otherwise the event loop blocks all requests.

**Q:** 🔴 What is the libuv thread pool size and how do you change it?

**A:** Default 4; `UV_THREADPOOL_SIZE` env var (max 1024) — relevant for heavy `fs`/`crypto` workloads.

## npm & packages

**Q:** 🟢 What is `package.json`?

**A:** The project manifest: name, version, scripts, dependencies, module type (`frontend/package.json`).

**Q:** 🟢 What are npm scripts?

**A:** Named commands run with `npm run <name>` with `node_modules/.bin` on PATH: `dev`, `build`, `typecheck`, `test`, `preview` (`package.json:6-12`).

**Q:** 🟢 dependencies vs devDependencies?

**A:** Runtime libraries bundled into the app vs tools needed only for development/build/test.

**Q:** 🟢 What is `package-lock.json`?

**A:** The exact resolved dependency tree (versions + integrity hashes) for reproducible installs; commit it.

**Q:** 🟢 What does `^18.3.1` mean?

**A:** Compatible with 18.3.1 up to (not including) 19.0.0 — minor and patch updates allowed.

**Q:** 🟢 What does `~5.8` mean?

**A:** Patch updates only within 5.8.x (`typescript`, `package.json:47`).

**Q:** 🟡 `npm install` vs `npm ci`?

**A:** `install` resolves ranges and may update the lockfile; `ci` installs exactly from the lockfile, removes existing `node_modules`, and fails on mismatch — for CI/Docker (`frontend/Dockerfile:6`).

**Q:** 🟡 What is semantic versioning?

**A:** MAJOR.MINOR.PATCH: breaking changes, backwards-compatible features, fixes.

**Q:** 🟡 What does `"private": true` do?

**A:** Prevents accidental publishing to the npm registry.

**Q:** 🟡 What are peer dependencies?

**A:** Packages a library expects the host app to provide (e.g. React for Radix), avoiding duplicate copies.

**Q:** 🟡 What is `npx`?

**A:** Runs a package binary (local or downloaded) without a global install: `npx eslint src` (`README.md:86`).

**Q:** 🟡 What does `npm audit` do?

**A:** Checks dependencies against known vulnerability databases and suggests fixes.

**Q:** 🔴 What are supply-chain risks with npm?

**A:** Malicious or hijacked packages, typosquatting, install scripts running arbitrary code. Mitigate with lockfiles, `npm ci`, audits, pinning, minimal dependencies, and reviewing new packages.

**Q:** 🔴 npm vs yarn vs pnpm?

**A:** npm is default; yarn added speed/workspaces/PnP; pnpm uses a content-addressed store with symlinks — disk-efficient and strict (no phantom deps).

## Vite

**Q:** 🟢 What is Vite?

**A:** A frontend build tool: a dev server serving native ES modules with HMR, and a Rollup-based production bundler.

**Q:** 🟢 What is HMR?

**A:** Hot Module Replacement — swapping changed modules in the running app without a full reload; React Fast Refresh preserves component state.

**Q:** 🟢 What does `vite build` produce?

**A:** Optimised static files in `dist/` with hashed names, minified JS/CSS, code-split chunks.

**Q:** 🟢 What does `vite preview` do?

**A:** Serves the built `dist/` locally to check the production build.

**Q:** 🟡 Why is Vite's dev server fast?

**A:** It doesn't bundle your code in dev; the browser requests modules on demand and Vite transforms them individually (esbuild), pre-bundling dependencies once.

**Q:** 🟡 What does the `/api` proxy do?

**A:** Forwards requests from the dev server to the backend so the browser sees one origin — avoiding CORS and keeping cookies first-party (`vite.config.ts:17-22`).

**Q:** 🟡 What does `changeOrigin: false` mean?

**A:** The `Host` header stays as the dev server's host; the backend sees the original host (`vite.config.ts:20`).

**Q:** 🟡 Why `host: '0.0.0.0'`?

**A:** Listen on all interfaces so the server is reachable from outside the Docker container (`vite.config.ts:13`).

**Q:** 🟡 Why polling for file watching?

**A:** File change events don't propagate from Windows/macOS hosts into Docker bind mounts; polling detects changes (`vite.config.ts:16`).

**Q:** 🟡 What are `manualChunks`?

**A:** Rollup output config grouping modules into named chunks (`react`, `data`, `ui`) so vendor code is cached separately from app code (`vite.config.ts:28-38`).

**Q:** 🟡 How do Vite env variables work in the browser?

**A:** Only variables prefixed `VITE_` are exposed via `import.meta.env`, inlined at build time — never put secrets there.

**Q:** 🟡 Does Vite type-check TypeScript?

**A:** No, esbuild only strips types; run `tsc` separately (`build` script runs `tsc -b` first).

**Q:** 🟡 What do the Vite plugins do here?

**A:** `@vitejs/plugin-react` adds JSX transform + Fast Refresh; `@tailwindcss/vite` compiles Tailwind (`vite.config.ts:8`).

**Q:** 🟡 What is tree shaking?

**A:** Dropping unused exports from the bundle based on static ESM imports.

**Q:** 🔴 What is dependency pre-bundling?

**A:** Vite uses esbuild to convert CommonJS deps to ESM and combine many small files into one, reducing browser requests in dev.

**Q:** 🔴 What's the "SPA fallback" and who provides it?

**A:** Serving `index.html` for unknown paths; Vite's dev/preview servers do it automatically, a production web server must be configured.

**Q:** 🔴 How do content hashes help caching?

**A:** File names change only when content changes, so assets can be cached for a year (`Cache-Control: immutable`) and new deploys bust caches automatically.

## ESLint & tooling

**Q:** 🟢 What is ESLint?

**A:** A static analysis tool that reports problems (bugs, unsafe patterns, style) in JS/TS.

**Q:** 🟡 What is ESLint's flat config?

**A:** ESLint 9's `eslint.config.js` exporting an array of config objects (files, languageOptions, plugins, rules) instead of `.eslintrc` (`frontend/eslint.config.js`).

**Q:** 🟡 What do the react-hooks rules enforce?

**A:** `rules-of-hooks` (call order) and `exhaustive-deps` (effect dependency arrays) (`eslint.config.js:15`).

**Q:** 🟡 What does `react-refresh/only-export-components` check?

**A:** That files export only components so Fast Refresh can preserve state; relaxed for `components/ui` which also export variant helpers (`eslint.config.js:18, 21-25`).

**Q:** 🟡 ESLint vs Prettier?

**A:** ESLint finds code problems; Prettier formats code. Biome does both.

**Q:** 🟡 What does `tseslint.configs.strict` add?

**A:** Stricter TypeScript-aware rules (e.g. no non-null assertions by default, no `any`, unnecessary conditions), stricter than `recommended`.

## Scenarios & interview

**Q:** 🟡 The Docker frontend doesn't hot-reload on Windows. Why and fix?

**A:** File events don't cross the bind mount; set `VITE_USE_POLLING=true` (Compose does, `docker-compose.yml:46`).

**Q:** 🟡 How do you run the frontend outside Docker against a Docker backend?

**A:** `npm ci && VITE_PROXY_TARGET=http://localhost:8000 npm run dev` (`frontend/.env.example:3`).

**Q:** 🟡 A teammate's build works but yours fails with a type error. Why might that be?

**A:** Different dependency versions (no `npm ci`), or they ran `vite` (no type check) instead of `npm run build`.

**Q:** 🟡 How do you speed up `npm ci` in Docker?

**A:** Copy only `package*.json` first so the install layer is cached (`frontend/Dockerfile:5-6`), use BuildKit cache mounts.

**Q:** 🟡 What's the anonymous `node_modules` volume for?

**A:** Keeping the container's installed packages from being hidden by the bind-mounted host folder (`docker-compose.yml:53`).

**Q:** 🔴 How would you serve this SPA in production?

**A:** Multi-stage Docker: build with Node, serve `dist/` with nginx (SPA fallback, gzip/brotli, long cache for hashed assets, proxy `/api` to the backend).

**Q:** 🟡 Vite vs webpack?

**A:** Vite: native ESM dev server + Rollup builds, minimal config, fast; webpack: bundle-in-dev, very configurable, slower dev startup.

**Q:** 🟡 Why was Create React App replaced?

**A:** CRA (webpack) became slow and unmaintained; it's deprecated in favour of Vite or frameworks.

**Q:** 🟡 What does `tsc -b --noEmit` do?

**A:** Type-checks all referenced projects without emitting output (`package.json:9`).

**Q:** 🟢 Which command runs the frontend tests?

**A:** `npm test` → `vitest run` (`package.json:10`).

**Q:** 🟡 Why are `dist/` and `node_modules/` gitignored?

**A:** They're generated and reproducible from source + lockfile (`.gitignore:10-11`).
