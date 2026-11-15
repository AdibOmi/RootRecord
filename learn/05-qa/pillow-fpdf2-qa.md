# Pillow & fpdf2 — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

**Q:** 🟢 What is Pillow?

**A:** Python's imaging library (fork of PIL) for opening, converting, resizing and saving images.

**Q:** 🟢 How do you open image bytes without a file?

**A:** `Image.open(io.BytesIO(data))` (`prescription_service.py:59`).

**Q:** 🟢 Why use `with Image.open(...) as img`?

**A:** Ensures the underlying file handle is closed.

**Q:** 🟢 What does `img.convert("RGB")` do?

**A:** Converts modes like RGBA, P (palette), CMYK, L to RGB — required for JPEG output.

**Q:** 🟢 What does `img.thumbnail((2400, 2400))` do?

**A:** Resizes in place so the image fits within the box, keeping aspect ratio and never upscaling.

**Q:** 🟢 How do you save as JPEG to memory?

**A:** `out = io.BytesIO(); img.save(out, "JPEG", quality=88, optimize=True); out.getvalue()`.

**Q:** 🟢 What is fpdf2?

**A:** A pure-Python library for generating PDFs by placing text, cells, tables and images.

**Q:** 🟢 What does `pdf.output()` return?

**A:** A `bytearray` of the PDF (converted with `bytes(...)`, `pdf_service.py:156`).

**Q:** 🟡 What does `ImageOps.exif_transpose` do?

**A:** Applies the EXIF orientation tag by rotating/flipping pixels, then removes the tag — photos display upright everywhere.

**Q:** 🟡 What is a decompression bomb?

**A:** An image claiming enormous dimensions to exhaust memory; Pillow raises `DecompressionBombError` beyond a pixel limit.

**Q:** 🟡 Which exceptions does `_normalize_image` catch?

**A:** `UnidentifiedImageError` (not an image), `OSError` (truncated/corrupt), `DecompressionBombError` → 400 `invalid_image` (`prescription_service.py:65-68`).

**Q:** 🟡 Why re-encode uploads?

**A:** Validation, uniform format, size control for AI cost, and stripping metadata (e.g. GPS) and malicious payloads.

**Q:** 🟡 `thumbnail` vs `resize`?

**A:** `thumbnail` modifies in place, keeps aspect, only shrinks; `resize` returns a new image of exact size (may distort).

**Q:** 🟡 What do `quality=88` and `optimize=True` control?

**A:** JPEG compression level (higher = better quality/larger) and an extra pass for optimal Huffman tables (smaller file).

**Q:** 🟡 Why does Bangla need special fonts in PDFs?

**A:** Built-in PDF fonts cover Latin only; a Unicode TTF with Bengali glyphs (Noto Sans Bengali) must be embedded.

**Q:** 🟡 What does `set_fallback_fonts` do?

**A:** Uses the fallback font for characters missing in the current font, enabling mixed English/Bangla text (`pdf_service.py:41`).

**Q:** 🟡 What does `set_text_shaping(True)` do?

**A:** Enables HarfBuzz shaping (via uharfbuzz) so complex scripts render with correct conjuncts and vowel placement (`pdf_service.py:42`).

**Q:** 🟡 What is `cell` vs `multi_cell`?

**A:** `cell` draws one line box; `multi_cell` wraps text across lines.

**Q:** 🟡 What do `new_x=XPos.LMARGIN, new_y=YPos.NEXT` do?

**A:** After drawing, move the cursor to the left margin of the next line.

**Q:** 🟡 How is the footer added?

**A:** Override `footer()` in an `FPDF` subclass; fpdf2 calls it on each page; `{nb}` is replaced with the total page count (`pdf_service.py:45-49`).

**Q:** 🟡 How are tables drawn?

**A:** `with pdf.table(col_widths=…, borders_layout=…, headings_style=…) as table: row = table.row(); row.cell(text)` (`pdf_service.py:125-139`).

**Q:** 🟡 Why are internal notes not printed?

**A:** The PDF is for patients; clinical notes stay internal (`README.md:13`).

**Q:** 🟡 How is the PDF filename made safe?

**A:** Non-alphanumerics replaced by `-`, trimmed, fallback `patient` (`pdf_service.py:24-28`).

**Q:** 🔴 What's lost for Bangla-only names in the filename and how to fix?

**A:** They become `patient`; use RFC 5987 `filename*=UTF-8''<percent-encoded>` in `Content-Disposition` alongside an ASCII fallback.

**Q:** 🔴 Why use `Path(__file__).resolve().parent.parent / "assets" / "fonts"`?

**A:** Absolute font paths independent of the working directory (`pdf_service.py:13`).

**Q:** 🔴 What licence allows bundling Noto fonts?

**A:** SIL Open Font License (`assets/fonts/OFL.txt`).

**Q:** 🔴 How would you generate PDFs at scale?

**A:** Cache rendered PDFs per prescription version, render in background workers, or use HTML-to-PDF services; one-page fpdf2 renders are fast enough per request.

**Q:** 🟡 Pillow vs OpenCV?

**A:** Pillow for general image I/O and simple transforms; OpenCV for computer vision (deskewing, perspective correction).

**Q:** 🟡 fpdf2 vs ReportLab vs HTML→PDF?

**A:** fpdf2: simple, lightweight; ReportLab: powerful layout engine; HTML→PDF (WeasyPrint/Chromium): CSS layouts but heavier dependencies.

**Q:** 🟡 How could you improve photo legibility for the AI?

**A:** Auto-crop/deskew (OpenCV perspective transform), contrast enhancement (`ImageOps.autocontrast`), but avoid destroying faint handwriting.

**Q:** 🟢 What does the test `_photo()` generate?

**A:** An 800×1100 white PNG in memory for upload tests (`test_prescriptions.py:46-49`).

**Q:** 🟢 How do tests check images were re-encoded?

**A:** The fake extractor asserts each page starts with JPEG magic bytes `FF D8` (`test_prescriptions.py:72`).

**Q:** 🟡 What MIME type are photos served with?

**A:** `image/jpeg` via `FileResponse` (`prescriptions.py:68`).

**Q:** 🟡 What does `filter(None, [address, phone])` do in the PDF header?

**A:** Drops missing parts before joining with " · " (`pdf_service.py:85`).
