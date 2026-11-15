# 29 — `pages/ScanPage.tsx` (238 lines)

**Purpose:** pick or photograph up to 6 pages, preview/reorder-by-removal, shrink on the device and
upload them as one prescription. **Route:** `/scan` (`App.tsx:44-50`). **Calls:** `useScanPrescription`,
`preparePhoto`, `useNavigate`.

## State and refs (21-42)

```tsx
21 /** Matches prescription_service.MAX_PAGES on the backend. */
22 const MAX_PAGES = 6

24 interface PickedPage { id: number; file: File; preview: string }   // preview = object URL

31   const navigate = useNavigate()
32   const scan = useScanPrescription()
33   const cameraInput = useRef<HTMLInputElement>(null)
34   const galleryInput = useRef<HTMLInputElement>(null)
35   const nextId = useRef(0)                             // stable React keys for pages
36   const [pages, setPages] = useState<PickedPage[]>([])
37   const [preparing, setPreparing] = useState(false)    // shrinking photos (before the upload starts)

39   // Revoke preview URLs when pages are removed or the page unmounts.
40   const previews = useRef<string[]>([])
41   previews.current = pages.map((p) => p.preview)       // updated every render ("latest ref" pattern)
42   useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), [])
```

## Handlers (44-74)

```tsx
44   const addFiles = (files: FileList | null) => {
45     if (!files?.length) return
46     scan.reset()                                        // clear a previous upload error
47     const added = Array.from(files)
48       .slice(0, MAX_PAGES - pages.length)                // never exceed 6 total
49       .map((file) => ({ id: nextId.current++, file, preview: URL.createObjectURL(file) }))
50     setPages((prev) => [...prev, ...added])
51   }

53   const removePage = (id: number) => {
54     setPages((prev) => {
55       const page = prev.find((p) => p.id === id)
56       if (page) URL.revokeObjectURL(page.preview)       // free memory now
57       return prev.filter((p) => p.id !== id)
58     })
59   }
```
⚠️ Side effect (revoking) inside a state updater: updaters should be pure; in StrictMode dev, React may
call updaters twice — revoking twice is harmless here, but the cleaner pattern is to revoke outside.
⚠️ `addFiles` reads `pages.length` from the render closure; two quick picks before a re-render could
exceed the limit slightly (the backend still rejects > 6).

```tsx
61   const read = async () => {
62     setPreparing(true)
63     try {
64       const photos = await Promise.all(pages.map((p) => preparePhoto(p.file)))   // parallel shrink
65       scan.mutate(photos, {
66         onSuccess: (draft) => navigate(`/prescriptions/${draft.id}`, { replace: true }),
67       })
68     } finally {
69       setPreparing(false)
70     }
71   }

73   const busy = preparing || scan.isPending              // derived, not stored
74   const full = pages.length >= MAX_PAGES
```
`mutate` isn't awaited, so `preparing` flips back immediately — `busy` stays true via `scan.isPending`.

## Render (76-237)

| Lines | UI | Notes |
|---|---|---|
| 78 | `PageHeader` | |
| 81-140 | thumbnails grid (`<ol>` — order matters), "Page N" label, Discard button per page (`aria-label` includes number), "+ Add page" tile opening the camera; translucent overlay with spinner while busy (`role="status" aria-live="polite"`) | `aspect-[3/4] object-cover` previews |
| 143-154 | upload error banner (`role="alert"`) | `errorMessage(scan.error)` — e.g. "This file is not a supported photo" from the backend |
| 156-167 | big "Read prescription (N pages)" button; hint about adding more pages / max reached | |
| 169-197 | no pages: "Take photo" + "Choose photo"; with pages: "Add page from gallery" | |
| 199-223 | two hidden inputs: camera (`capture="environment"`) and gallery (`multiple`); `sr-only`, `tabIndex={-1}` (not focusable — buttons trigger them); reset `value` after change | |
| 225-233 | photo tips list | |

## Q&A

**Q:** 🟢 Why are there two file inputs?

**A:** One with `capture="environment"` opens the rear camera directly on phones; the other with
`multiple` opens the gallery to pick several existing photos (`ScanPage.tsx:200-223`).

**Q:** 🟡 Why `useRef` for `nextId` instead of state?

**A:** It's a counter for unique keys; changing it shouldn't trigger a re-render, and it must persist
across renders.

**Q:** 🟡 Explain the `previews` ref and the empty-deps effect.

**A:** The effect's cleanup runs on unmount; if it captured `pages` directly it would see the initial
empty array (stale closure). Writing the latest URLs into a ref every render lets the cleanup revoke all
current previews.

**Q:** 🔴 Why reset `e.target.value = ''` after reading files?

**A:** Browsers fire `change` only when the value changes; without resetting, picking the same photo
again (e.g. after discarding it) would do nothing.

**Q:** 🟡 Why shrink photos in the browser if the server re-encodes anyway?

**A:** Upload time on mobile data: ~5 MB → ~1 MB per page. The server still validates and normalises
(authoritative), and `preparePhoto` falls back to the original file if decoding fails.

**Q:** 🟢 Why navigate with `replace: true` after upload?

**A:** Back from the review page should go to where the user came from, not to a scan page that has
already been submitted.
