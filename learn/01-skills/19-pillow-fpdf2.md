# 19 — Pillow (images in) & fpdf2 + HarfBuzz (PDFs out)

> **Where it lives:** `backend/app/services/prescription_service.py:56-68` (Pillow),
> `backend/app/services/pdf_service.py` (fpdf2), fonts in `backend/app/assets/fonts/`.
> Packages: `pillow>=11.0`, `fpdf2>=2.8,<3`, `uharfbuzz>=0.39` (`requirements.txt:14-17`).

---

## 1. What & why

**Pillow** — the maintained fork of PIL, Python's standard imaging library: open/convert/resize/save
images in many formats. **fpdf2** — a pure-Python library for generating PDFs by drawing text,
cells, tables and images on pages. **HarfBuzz** (via `uharfbuzz`) — a **text-shaping** engine that
turns Unicode characters into correctly positioned glyphs; essential for complex scripts like
Bangla where letters combine into conjuncts.

**Analogy:** Pillow is the photo lab that develops every incoming photo the same way; fpdf2 is the
typewriter that types a clean copy; HarfBuzz is the calligrapher who knows how Bangla letters join.

---

## 2. Pillow in this project

📍 `prescription_service.py:56-68`:

```python
def _normalize_image(data: bytes) -> bytes:
    """Validate the upload, apply the camera's rotation and re-encode as JPEG."""
    try:
        with Image.open(io.BytesIO(data)) as img:           # lazy: reads header, detects format
            img = ImageOps.exif_transpose(img).convert("RGB")  # rotate per EXIF; drop alpha/CMYK/palette
            img.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE))    # in-place, keeps aspect ratio, never upscales
            out = io.BytesIO()
            img.save(out, "JPEG", quality=88, optimize=True)   # uniform format for storage + Gemini
            return out.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise BadRequest("This file is not a supported photo. Use a JPEG or PNG image.", code="invalid_image") from exc
```

| Step | Why |
|---|---|
| `io.BytesIO(data)` | treat bytes as a file (no temp files) |
| `Image.open` | **lazy** — pixels decoded only when needed |
| `exif_transpose` | phones store rotation in EXIF; bake it into pixels so every viewer shows it upright |
| `.convert("RGB")` | JPEG can't store alpha (PNG with transparency) or palette modes |
| `thumbnail((2400, 2400))` | cap size for storage and AI token cost |
| `quality=88, optimize=True` | good text legibility vs size |
| re-encode | strips metadata (GPS EXIF!), neutralises malformed/polyglot files |
| `DecompressionBombError` | Pillow refuses images with absurd pixel counts (default limit ≈ 179 MP warns, 2× errors) |

Test: uploading `b"%PDF-1.7 nope"` returns 400 `invalid_image` and never calls Gemini
(`tests/test_prescriptions.py:210-218`); the stub asserts every page starts with JPEG magic bytes
(`:72`).

**Resampling filters:** `thumbnail` uses a high-quality filter by default (LANCZOS/BICUBIC with
reducing gap); `resize` lets you choose. `thumbnail` vs `resize`: in-place + keeps aspect ratio vs
returns a new image of exact size.

---

## 3. fpdf2 in this project

📍 `pdf_service.py:31-71` subclasses `FPDF`:

```python
class _Pdf(FPDF):
    def __init__(self) -> None:
        super().__init__(format="A4")
        self.set_margins(18, 16, 18)                       # mm: left, top, right
        self.set_auto_page_break(True, margin=18)
        self.add_font("NotoSans", "", FONTS / "NotoSans-Regular.ttf")
        self.add_font("NotoSans", "B", FONTS / "NotoSans-Bold.ttf")
        # Bangla falls back to its own font, shaped with HarfBuzz so conjuncts join up.
        self.add_font("NotoSansBengali", "", FONTS / "NotoSansBengali-Regular.ttf")
        self.add_font("NotoSansBengali", "B", FONTS / "NotoSansBengali-Bold.ttf")
        self.set_fallback_fonts(["NotoSansBengali"])       # glyphs missing in NotoSans come from here
        self.set_text_shaping(True)                         # uses uharfbuzz
        self.set_text_color(*INK)

    def footer(self) -> None:                               # hook called on every page
        self.set_y(-12)
        self.set_font("NotoSans", "", 8)
        self.cell(0, 5, f"Page {self.page_no()}/{{nb}}", align="R")   # {nb} = total pages alias
```

| API | Meaning |
|---|---|
| `cell(w, h, text, new_x, new_y)` | one-line box; `w=0` = to right margin |
| `multi_cell(...)` | wrapping text block |
| `XPos.LMARGIN, YPos.NEXT` | after the cell, go to the left margin of the next line |
| `ln(h)` | line break / vertical space |
| `line(x1, y1, x2, y2)` | draw a rule |
| `table(col_widths, borders_layout, headings_style)` | context-manager table builder (`pdf_service.py:125-139`) |
| `output()` | returns a `bytearray` → `bytes(...)` (`:156`) |

📍 `render()` (`pdf_service.py:73-156`) lays out: clinic header (from settings), patient line,
complaint, diagnosis, treatment bullets, medicines table, advice, next visit, "Checked by" — and
deliberately **omits internal notes** (`README.md:13`).

📍 `filename()` (`pdf_service.py:24-28`) builds `prescription-Rahima-Begum-2026-10-08.pdf` by
replacing non-alphanumerics with `-`. ⚠️ A Bangla-only name becomes `patient`; the header uses plain
`filename="…"`. RFC 6266/5987 `filename*=UTF-8''…` would allow Unicode names. The frontend mirrors
this function (`SharePrescription.tsx:18-22`) — duplicated logic.

**Why typed PDFs instead of the photo?** Patients get a legible document; Bangla advice renders
correctly; internal notes stay private.

---

## 4. Under the hood

- **Fonts:** PDFs embed font subsets (only used glyphs). Non-Latin text needs a font that contains
  those glyphs — core PDF fonts (Helvetica) only cover Latin-1.
- **Shaping:** Bangla uses conjuncts (যুক্তাক্ষর) and vowel signs that reorder around consonants;
  without HarfBuzz, letters appear disconnected/in the wrong order.
- **Licence:** Noto fonts are under the SIL Open Font License (`assets/fonts/OFL.txt`) — redistributable.

---

## 5. Comparisons

| X vs Y | Answer |
|---|---|
| Pillow vs OpenCV | general imaging vs computer vision (heavier) |
| Pillow vs pyvips | simple vs very fast, low-memory streaming for huge images |
| fpdf2 vs ReportLab | lightweight, simple API vs powerful, older, platypus layout engine |
| fpdf2 vs HTML→PDF (WeasyPrint, Playwright) | code-drawn layout, no browser vs CSS layout, heavier dependencies |
| client-side PDF (jsPDF) vs server | no server load vs consistent fonts, authoritative data |

---

## 6. Cheat sheet

```python
with Image.open(io.BytesIO(b)) as im:
    im = ImageOps.exif_transpose(im).convert("RGB"); im.thumbnail((2400, 2400))
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=88, optimize=True)
pdf = FPDF(format="A4"); pdf.add_font("N", "", "N.ttf"); pdf.set_fallback_fonts(["B"]); pdf.set_text_shaping(True)
pdf.add_page(); pdf.set_font("N", "", 11); pdf.multi_cell(0, 6, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
with pdf.table(col_widths=(38, 14, 16)) as t: r = t.row(); r.cell("x")
bytes(pdf.output())
```

---

## 7. Why chosen

Both are pure-Python-friendly, small, and enough for the job: normalise photos and produce a
one-page typed prescription with Bangla. A browser-based HTML→PDF renderer would need Chromium in the
image.
