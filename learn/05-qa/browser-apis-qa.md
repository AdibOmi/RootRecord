# Browser APIs — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

**Q:** 🟢 What does `fetch` return?

**A:** A promise of a `Response`; you read the body with `res.json()`, `res.text()` or `res.blob()`.

**Q:** 🟢 When does `fetch` reject?

**A:** Only on network failure, CORS blocking, or abort — not on HTTP 4xx/5xx (check `res.ok`, `client.ts:128`).

**Q:** 🟢 What does `credentials: 'include'` do?

**A:** Sends cookies (and accepts `Set-Cookie`) even for cross-origin requests; needed because auth lives in cookies (`client.ts:65`).

**Q:** 🟢 What is `FormData`?

**A:** A key/value body for `multipart/form-data`, supporting files; `form.append('files', blob, 'page-1.jpg')` (`api/prescriptions.ts:21`).

**Q:** 🟢 Why not set `Content-Type` manually for FormData?

**A:** The browser must add the multipart `boundary`; setting the header yourself breaks parsing (`client.ts:66`).

**Q:** 🟢 What are `Blob` and `File`?

**A:** Blob = raw binary with a MIME type; File = Blob + name + lastModified (from file inputs).

**Q:** 🟢 What is an object URL?

**A:** A temporary `blob:` URL created by `URL.createObjectURL(blob)` to display/download in-memory data; revoke it when done.

**Q:** 🟢 What does `capture="environment"` on a file input do?

**A:** Asks mobile browsers to open the rear camera directly (`ScanPage.tsx:204`).

**Q:** 🟢 What is the `download` attribute on `<a>`?

**A:** Tells the browser to save the linked resource with the given filename instead of navigating (`SharePrescription.tsx:28`).

**Q:** 🟢 What does `URLSearchParams.set` do?

**A:** Sets a query parameter with proper encoding (`client.ts:54`).

**Q:** 🟡 How do you cancel a fetch?

**A:** `AbortController`: pass `controller.signal`, call `abort()`; the promise rejects with `AbortError` (`client.ts:73-76`).

**Q:** 🟡 What does `createImageBitmap(file, { imageOrientation: 'from-image' })` do?

**A:** Decodes the image (off the main thread) and applies EXIF orientation, producing a drawable bitmap (`lib/image.ts:11`).

**Q:** 🟡 How do you resize an image in the browser?

**A:** Draw it onto a `<canvas>` at the target size with `drawImage`, then `canvas.toBlob(cb, 'image/jpeg', quality)` (`lib/image.ts:13-20`).

**Q:** 🟡 Why call `bitmap.close()`?

**A:** Releases the decoded pixel memory immediately (large photos use tens of MB).

**Q:** 🟡 What is the Web Share API?

**A:** `navigator.share({ files, title, text, url })` opens the OS share sheet; `navigator.canShare({ files })` checks support (`SharePrescription.tsx:45-47`).

**Q:** 🟡 What are the requirements for `navigator.share`?

**A:** A secure context (HTTPS/localhost), a user gesture, and browser support for the data type (files).

**Q:** 🟡 What error do you get when the user cancels sharing?

**A:** A `DOMException` with `name === 'AbortError'`, which should be ignored (`SharePrescription.tsx:49`).

**Q:** 🟡 What is `Intl.NumberFormat` used for here?

**A:** Formatting taka with lakh grouping (`en-IN`) and fixed fraction digits (`lib/format.ts:6-10`).

**Q:** 🟡 How do you format a date in a specific time zone?

**A:** `new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', … }).format(date)` (`lib/format.ts:27`).

**Q:** 🟡 What does `formatToParts` return?

**A:** An array of `{ type, value }` pieces (day, month, literal…) for custom assembly (`lib/format.ts:28-32`).

**Q:** 🟡 What is feature detection?

**A:** Checking an API exists before using it (`typeof navigator.canShare === 'function'`) instead of sniffing user agents (`SharePrescription.tsx:34`).

**Q:** 🟡 What is a secure context?

**A:** A page served over HTTPS (or localhost); required for powerful APIs like Share, clipboard, camera and service workers.

**Q:** 🟡 How do keyboard shortcuts detect Ctrl vs Cmd?

**A:** Check `e.ctrlKey || e.metaKey` in a `keydown` listener (`GlobalSearch.tsx:26`).

**Q:** 🟡 What does `e.preventDefault()` do in the shortcut handler?

**A:** Stops the browser's default action for Ctrl+K (focusing the address/search bar).

**Q:** 🟡 Why reset a file input's value after reading files?

**A:** So selecting the same file again fires `change` (`ScanPage.tsx:209`).

**Q:** 🔴 What is the same-origin policy?

**A:** Scripts may only read responses from the same scheme+host+port unless the server allows cross-origin access via CORS.

**Q:** 🔴 Object URL vs data URL?

**A:** Object URLs reference memory (fast, small string, must revoke); data URLs embed base64 content (≈33% larger, no revoke, can be stored).

**Q:** 🔴 How much memory does a decoded 4000×3000 image take?

**A:** About 4000 × 3000 × 4 bytes ≈ 48 MB — why the app downsizes and closes bitmaps.

**Q:** 🔴 Why might `navigator.share` fail after a slow download even though the user clicked?

**A:** Transient user activation expires after a short time; the async PDF download can outlast it, so the code falls back to download (`SharePrescription.tsx:50-52`).

**Q:** 🔴 When would you use `getUserMedia` instead of `<input capture>`?

**A:** For an in-page live camera preview with custom UI (framing guides, auto-capture); more code and permissions handling.

**Q:** 🟡 What happens if `createImageBitmap` can't decode a HEIC photo?

**A:** It throws; `preparePhoto` catches and returns the original file for the server to validate (`lib/image.ts:22-24`).

**Q:** 🟡 How does the app build URLs with query strings safely?

**A:** `new URL(API_BASE + path, window.location.origin)` + `url.searchParams.set` for non-empty values, then `pathname + search` (`client.ts:50-58`).

**Q:** 🟡 Why are `Intl` formatters created once at module level?

**A:** Construction is costly; reuse is faster for lists (`lib/format.ts:6-10`).

**Q:** 🟢 What does `typeof navigator !== 'undefined'` protect against?

**A:** Running module code outside browsers (tests, SSR) where `navigator` doesn't exist.

**Q:** 🟡 How do you download a fetched PDF?

**A:** `const blob = await res.blob(); const url = URL.createObjectURL(blob); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)` (`SharePrescription.tsx:24-31`).

**Q:** 🟡 Why does an `<img src="/api/v1/prescriptions/.../pages/1">` work with cookie auth?

**A:** Same-origin image requests automatically include cookies, so the authenticated endpoint serves the photo.
