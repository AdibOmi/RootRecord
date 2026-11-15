# Rebuilding the PDFs

1. In an empty folder: `npm init -y && npm install playwright-core@1.49.1 mermaid@11.4.1`
2. Copy `build_pdfs.py` and `render.mjs` there (render.mjs uses Microsoft Edge at its default install path).
3. `pip install markdown pygments pymupdf`
4. `python build_pdfs.py "<path>/learn"` (optionally list specific PDF names to rebuild only those).
5. Check: run `verify.py` inside `learn/pdf`, and `count_qa.py learn/05-qa` for Q&A counts.
