# 16 — `services/pdf_service.py` (156 lines) + `assets/fonts/`

**Purpose:** render a filed prescription as a clean, typed A4 PDF for the patient (Bangla supported).
**Called by:** `api/v1/prescriptions.py:89-92` (`render`, `filename`). **Calls:** fpdf2, settings.
→ Skill: `19-pillow-fpdf2.md` §3.

## Module setup (1-21)

```python
1  """A filed prescription as a clean PDF for the patient (typed, not the handwritten photo)."""
13 FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"   # app/assets/fonts, independent of CWD
15 INK = (33, 37, 41)          # near-black text
16 MUTED = (108, 117, 125)     # grey labels
17 RULE = (206, 212, 218)      # light lines

20 def _day(value: date | None) -> str:
21     return value.strftime("%d/%m/%Y") if value else ""            # Bangladesh date format
```
`Path(__file__).resolve()` makes font paths work regardless of where the process was started.

## `filename` (24-28)

```python
24 def filename(prescription: Prescription) -> str:
25     assert prescription.patient is not None                        # router guarantees it
26     name = re.sub(r"[^A-Za-z0-9]+", "-", prescription.patient.full_name).strip("-") or "patient"
27     day = prescription.visit_date.isoformat() if prescription.visit_date else "prescription"
28     return f"prescription-{name}-{day}.pdf"                        # prescription-Rahima-Begum-2026-10-08.pdf
```
Safe for the `Content-Disposition` header (no quotes, no non-ASCII). Tested at
`tests/test_prescriptions.py:360`.

## `_Pdf(FPDF)` (31-70)

| Lines | Method | Does |
|---|---|---|
| 32-43 | `__init__` | A4; margins 18/16/18 mm; auto page break 18 mm; register NotoSans (regular/bold) and NotoSansBengali; fallback fonts for Bangla glyphs; enable HarfBuzz shaping; default ink color |
| 45-49 | `footer` | fpdf2 hook called per page: "Page n/{nb}" right-aligned, 8 pt muted (`{nb}` replaced with page total) |
| 51-53 | `rule` | horizontal line across the text width at the current y |
| 55-60 | `heading` | 3 mm gap, bold 10 pt uppercase muted label, new line |
| 62-64 | `body` | 11 pt wrapped paragraph |
| 66-70 | `bullets` | "•" cell (5 mm) + wrapped item per line |

Subclassing to add small helpers keeps `render` readable — a mini "template method" pattern
(fpdf2 calls `footer` automatically).

## `render` (73-156)

```python
73  def render(prescription: Prescription) -> bytes:
74      patient = prescription.patient
75      assert patient is not None
76      settings = get_settings()
77      pdf = _Pdf()
78      pdf.set_title(f"Prescription - {patient.full_name}")          # PDF metadata
79      pdf.set_author(settings.clinic_name)
80      pdf.add_page()
```
| Lines | Section |
|---|---|
| 82-93 | clinic name (16 pt bold); address · phone joined with `filter(None, …)` (skip missing); rule |
| 95-110 | patient name (12 pt bold); details line: ID, age, sex (`.title()`), phone, visit date — `None`s filtered; rule |
| 112-120 | Complaint, Diagnosis (body), Treatment done (bullets) — only if present |
| 122-139 | Medicines table: column widths (38,14,16,16,22 relative units), horizontal lines, bold muted header row, one row per medicine; missing values → `""` |
| 141-143 | Advice bullets |
| 145-148 | "Next visit: DD/MM/YYYY" bold |
| 150-154 | "Checked by <dentist>" (provenance) |
| 156 | `bytes(pdf.output())` — fpdf2 returns `bytearray` |

**Notes are intentionally not printed** — internal clinical notes stay private (`README.md:13`).

## Fonts (`backend/app/assets/fonts/`)

`NotoSans-Regular/Bold.ttf`, `NotoSansBengali-Regular/Bold.ttf`, and `OFL.txt` (SIL Open Font License,
allows bundling). Core PDF fonts can't render Bangla; HarfBuzz shaping (`uharfbuzz`) joins conjuncts.
Test: a Bangla advice line renders without errors (`tests/test_prescriptions.py:355-361`).

## Q&A

**Q:** 🟢 Why generate a typed PDF instead of sending the photo?

**A:** Patients get legible text, the clinic header, Bangla rendered correctly, and internal notes
excluded; the photo may be messy or contain private annotations.

**Q:** 🟡 What does `set_fallback_fonts(["NotoSansBengali"])` do?

**A:** When a character isn't in the current font (NotoSans lacks Bengali glyphs), fpdf2 uses the
fallback font for that run of text, so mixed English/Bangla lines render.

**Q:** 🟡 Why is text shaping needed for Bangla?

**A:** Bangla combines consonants into conjuncts and places vowel signs before/after/around consonants.
Without a shaping engine, glyphs are drawn in Unicode order and look broken.

**Q:** 🔴 What happens to the filename for a patient named only in Bangla?

**A:** The regex replaces every non-ASCII run with `-`, `.strip("-")` leaves an empty string → `or
"patient"` → `prescription-patient-2026-10-08.pdf`. Using RFC 5987 `filename*=UTF-8''…` would preserve
the name.

**Q:** 🟢 Why `Path(__file__).resolve().parent.parent`?

**A:** `__file__` is `app/services/pdf_service.py`; two parents up is `app/`; adding `assets/fonts` gives
an absolute path that works no matter the current working directory.

**Q:** 🟡 Is rendering synchronous? Any risk?

**A:** Yes, inside a sync endpoint (thread pool). A one-page PDF renders in milliseconds, so it's fine;
heavy reports should be generated in the background or cached.
