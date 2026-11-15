# 08 — Browser (Web Platform) APIs

> **Where it lives:** `frontend/src/api/client.ts` (fetch, URL), `api/prescriptions.ts`
> (FormData), `lib/image.ts` (createImageBitmap, Canvas), `features/prescriptions/SharePrescription.tsx`
> (Blob, File, object URLs, Web Share), `lib/format.ts` (Intl), `pages/ScanPage.tsx` (file inputs).

---

## 1. What & why

**Web APIs** — features the browser provides to JavaScript (not part of the JS language itself):
networking, files, graphics, sharing, formatting. Knowing them avoids unnecessary libraries.

**Analogy:** JS is the language; the browser is the toolbox the language can reach into.

---

## 2. Fundamentals

### 2.1 `fetch`

📍 `frontend/src/api/client.ts:60-79`:

```ts
await fetch(buildUrl(path, opts.query), {
  method: opts.method ?? 'GET',
  credentials: 'include',           // send cookies (auth lives in httpOnly cookies)
  headers: opts.body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {},
  body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
  signal: opts.signal,              // AbortSignal for cancellation
})
```

| Fact | Detail |
|---|---|
| Resolves on any HTTP status | check `res.ok` (200–299) yourself (`client.ts:128`) |
| Rejects on | network failure, CORS block, abort |
| `credentials` | `'omit' \| 'same-origin'` (default) `\| 'include'` |
| Body helpers | `res.json()`, `res.text()`, `res.blob()` (`client.ts:146`) |
| Streaming | `res.body` is a `ReadableStream` |

Why `'include'` when same-origin is the default? It is harmless here (requests go to the same
origin through the Vite proxy) and keeps working if the API moves to another origin with CORS.

### 2.2 `URL` and `URLSearchParams`

📍 `client.ts:50-58`:

```ts
function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(API_BASE + path, window.location.origin)   // absolute URL object
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))                    // encodes safely
    }
  }
  return url.pathname + url.search                                 // back to a relative URL
}
```

`searchParams.set` URL-encodes values (`q=Rahima Begum` → `q=Rahima+Begum`), preventing broken or
injected query strings. Empty values are dropped so `?q=` isn't sent.

### 2.3 `FormData` and multipart uploads

📍 `frontend/src/api/prescriptions.ts:19-23`:

```ts
scan: (pages: Blob[]) => {
  const form = new FormData()
  pages.forEach((page, i) => form.append('files', page, `page-${i + 1}.jpg`))  // same key, many files
  return api.post<PrescriptionDetail>('/prescriptions/scan', form)
},
```

With a `FormData` body, **don't set `Content-Type`** — the browser sets
`multipart/form-data; boundary=…` itself. That's why `client.ts:66` only adds the JSON header for
non-form bodies. The backend reads the repeated `files` field as `list[UploadFile]`
(`backend/app/api/v1/prescriptions.py:20`).

### 2.4 `AbortController` / `AbortSignal`

`const c = new AbortController(); fetch(url, { signal: c.signal }); c.abort()` → the promise
rejects with a `DOMException` named `AbortError`. 📍 `client.ts:76` re-throws it untouched;
TanStack Query creates the controller for you (`features/patients/hooks.ts:14`).

---

## 3. Intermediate

### 3.1 Files, Blobs and object URLs

- **Blob** — immutable raw binary data with a MIME type.
- **File** — a Blob with a name and `lastModified` (what `<input type=file>` gives you).
- **Object URL** — `URL.createObjectURL(blob)` makes a temporary `blob:` URL pointing at in-memory
  data; must be released with `URL.revokeObjectURL`.

📍 Previews: `ScanPage.tsx:49` `preview: URL.createObjectURL(file)`; released at `:56` and on
unmount `:42`.
📍 Download trick, `SharePrescription.tsx:24-31`:

```ts
function download(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name            // download attribute = save instead of navigate
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
```

### 3.2 Camera capture via file input

📍 `ScanPage.tsx:200-223`: `<input type="file" accept="image/*" capture="environment">` opens the
**rear camera** on phones (desktop shows a file picker); a second input without `capture` but with
`multiple` opens the gallery. No `getUserMedia` needed.

### 3.3 Image processing: `createImageBitmap` + Canvas

📍 `frontend/src/lib/image.ts:9-25`:

```ts
export async function preparePhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }) // decode + apply EXIF rotation
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))     // never upscale
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)   // resize
    bitmap.close()                                                                   // free GPU/memory
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    return blob ?? file
  } catch {
    return file                       // e.g. HEIC on some browsers: let the server handle it
  }
}
```

- **EXIF** — metadata in photos, including orientation; phones often store a sideways image plus
  "rotate 90°". `imageOrientation: 'from-image'` applies it.
- Result: ~5 MB camera photos become ~1 MB JPEGs → faster uploads on mobile data (`README.md:9`).
- **Progressive enhancement / graceful fallback:** any failure returns the original file; the
  server re-validates and normalises anyway (`backend/app/services/prescription_service.py:56-68`).

### 3.4 Web Share API

📍 `SharePrescription.tsx:33-52`:

```ts
// The share sheet (WhatsApp, Messenger, email…) only exists on HTTPS pages.
const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
…
if (mode === 'share' && navigator.canShare({ files: [file] })) {
  try {
    await navigator.share({ files: [file], title: `${t.share.title} – ${patientName}` })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return   // user cancelled
    download(file)                                                          // fallback
  }
}
```

- Requires a **secure context** (HTTPS or localhost) and a **user gesture** (click).
- **Feature detection** — check the API exists before using it, instead of sniffing browsers.
- Browsers may reject `share()` if too much time passed since the click (the PDF download takes
  time) — the comment at `:50` explains the download fallback.

### 3.5 `Intl` — locale-aware formatting

📍 `frontend/src/lib/format.ts:6-10, 25-50`:

```ts
const wholeFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })  // lakh grouping 1,23,456
new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' })
  .formatToParts(date)    // [{type:'day',value:'26'},{type:'literal',value:'/'},…]
```

- `en-IN` gives South Asian digit grouping used in Bangladesh.
- `timeZone: 'Asia/Dhaka'` renders UTC timestamps in clinic time regardless of the device's zone —
  tested at `format.test.ts:20-30` (20:30 UTC → 26/09 02:30 in Dhaka).
- `formatToParts` lets the code assemble `DD/MM/YYYY` exactly, independent of locale punctuation.
- Creating `Intl` objects is relatively expensive → formatters are created once at module scope.

### 3.6 Keyboard events

📍 `GlobalSearch.tsx:25-31` listens on `window` for `keydown`, checks `e.ctrlKey || e.metaKey`
(⌘ on macOS) and calls `preventDefault()` to stop the browser's own shortcut.

---

## 4. Advanced / under the hood

- **Same-origin policy** — scripts can read responses only from the same scheme+host+port unless
  the server sends CORS headers. The Vite proxy makes `/api` same-origin in dev
  (`vite.config.ts:17-22`).
- **Cookies** are attached by the browser, not by JS; `httpOnly` cookies are invisible to
  `document.cookie` (XSS can't steal them).
- **Secure contexts** unlock powerful APIs (Share, clipboard, camera via getUserMedia, service
  workers).
- Memory: decoded images use width×height×4 bytes (a 4000×3000 photo ≈ 48 MB) — another reason to
  downscale and close bitmaps.

---

## 5. Comparisons

| X vs Y | Answer |
|---|---|
| fetch vs XMLHttpRequest vs axios | promise-based standard vs legacy events vs library (interceptors, auto JSON, upload progress) |
| FormData vs JSON body | files/multipart vs structured data |
| object URL vs data URL | reference to memory (fast, must revoke) vs base64 string (bigger, no revoke) |
| `<input capture>` vs getUserMedia | native camera app vs in-page video stream (more control, more code) |
| Canvas resize vs server resize | saves bandwidth vs authoritative; this app does both |
| Intl vs moment/date-fns | built-in, zero-size vs libraries with parsing/arithmetic |

---

## 6. Security & performance

- Never trust client-side resizing for validation — server re-checks (done).
- Revoke object URLs (done).
- Feature-detect + fallback (done for Share and image decoding).

---

## 7. Cheat sheet

```ts
const res = await fetch(url, { method, headers, body, credentials: 'include', signal })
if (!res.ok) throw …; await res.json(); await res.blob()
const u = new URL(path, location.origin); u.searchParams.set('q', v)
const fd = new FormData(); fd.append('files', blob, 'name.jpg')
const url = URL.createObjectURL(blob); URL.revokeObjectURL(url)
const bmp = await createImageBitmap(file); canvas.toBlob(cb, 'image/jpeg', 0.9)
navigator.canShare?.({ files }) && await navigator.share({ files, title })
new Intl.NumberFormat('en-IN').format(n); new Intl.DateTimeFormat('en-GB', { timeZone }).format(d)
```

---

## 8. Why these here

The app targets phones in a clinic: camera capture, on-device shrinking and native sharing make it
feel like an app without building one. Alternatives would be a native/React Native app (camera and
share sheets everywhere, but app-store distribution) or a PWA (installable; could add offline
queueing of scans later).
