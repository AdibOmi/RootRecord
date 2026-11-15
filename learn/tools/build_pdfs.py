"""Build all course PDFs from /learn markdown.

Usage: python build_pdfs.py <learn_dir> [only_pdf_name ...]
"""
import html
import json
import re
import subprocess
import sys
from pathlib import Path

import markdown
from pygments.formatters import HtmlFormatter

TOOLS = Path(__file__).resolve().parent
LEARN = Path(sys.argv[1]).resolve()
ONLY = set(sys.argv[2:])
OUT = LEARN / "pdf"
WORK = TOOLS / "html"
OUT.mkdir(exist_ok=True)
WORK.mkdir(exist_ok=True)
MERMAID_JS = (TOOLS / "node_modules" / "mermaid" / "dist" / "mermaid.min.js").as_uri()

# (number, title, skill file, qa file, cheatsheet heading slug)
TECHS = [
    ("01", "JavaScript", "01-javascript.md", "javascript-qa.md", "javascript"),
    ("02", "TypeScript", "02-typescript.md", "typescript-qa.md", "typescript"),
    ("03", "React", "03-react.md", "react-qa.md", "react"),
    ("04", "React-Router", "04-react-router.md", "react-router-qa.md", "react-router"),
    ("05", "TanStack-Query", "05-tanstack-query.md", "tanstack-query-qa.md", "tanstack-query"),
    ("06", "React-Hook-Form-and-Zod", "06-react-hook-form-zod.md", "react-hook-form-zod-qa.md", "react-hook-form-zod"),
    ("07", "Tailwind-shadcn-Radix", "07-tailwind-shadcn-radix.md", "tailwind-shadcn-radix-qa.md", "tailwind-shadcn-radix"),
    ("08", "Browser-APIs", "08-browser-apis.md", "browser-apis-qa.md", "browser-apis"),
    ("09", "Node-npm-Vite", "09-node-npm-vite.md", "node-npm-vite-qa.md", "node-npm-vite"),
    ("10", "Python", "10-python.md", "python-qa.md", "python"),
    ("11", "FastAPI", "11-fastapi.md", "fastapi-qa.md", "fastapi"),
    ("12", "Pydantic", "12-pydantic.md", "pydantic-qa.md", "pydantic"),
    ("13", "SQL-PostgreSQL", "13-sql-postgresql.md", "sql-postgresql-qa.md", "sql-postgresql"),
    ("14", "SQLAlchemy-Alembic", "14-sqlalchemy-alembic.md", "sqlalchemy-alembic-qa.md", "sqlalchemy-alembic"),
    ("15", "HTTP-REST-Auth-Security", "15-http-rest-auth-security.md", "http-rest-auth-security-qa.md", "http-rest-auth-security"),
    ("16", "Testing-pytest-Vitest", "16-testing-pytest-vitest.md", "testing-qa.md", "testing"),
    ("17", "Docker-Compose", "17-docker-compose.md", "docker-qa.md", "docker"),
    ("18", "LLM-Gemini", "18-llm-gemini.md", "llm-gemini-qa.md", "llm-gemini"),
    ("19", "Pillow-fpdf2", "19-pillow-fpdf2.md", "pillow-fpdf2-qa.md", "pillow-fpdf2"),
    ("20", "Git-Config", "20-git-config.md", "git-config-qa.md", "git-config"),
]

CSS = """
@page { size: A4; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1f2328; }
h1 { font-size: 20pt; border-bottom: 2px solid #0f766e; padding-bottom: 4px; margin-top: 28px; color: #0f4c45; page-break-before: always; }
h1.first, .cover + h1 { page-break-before: avoid; }
h2 { font-size: 15pt; color: #115e59; margin-top: 22px; border-bottom: 1px solid #d0d7de; padding-bottom: 2px; }
h3 { font-size: 12.5pt; color: #134e4a; margin-top: 16px; }
h4 { font-size: 11pt; }
h2, h3, h4 { page-break-after: avoid; }
a { color: #0969da; text-decoration: none; }
code { font-family: Consolas, 'Cascadia Mono', monospace; font-size: 9pt; background: #f2f4f6; padding: 1px 3px; border-radius: 3px; }
pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 8px 10px; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; page-break-inside: auto; }
pre code { background: none; padding: 0; font-size: 8.6pt; }
.codehilite { background: #f6f8fa; border-radius: 6px; margin: 8px 0; }
.codehilite pre { margin: 0; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th, td { border: 1px solid #d0d7de; padding: 4px 6px; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
th { background: #e6f2f1; }
blockquote { border-left: 4px solid #14b8a6; margin: 8px 0; padding: 4px 12px; color: #444; background: #f0fdfa; }
.mermaid { text-align: center; margin: 12px 0; page-break-inside: avoid; }
.mermaid svg { max-width: 100%; height: auto; }
.cover { text-align: center; padding-top: 220px; page-break-after: always; }
.cover h1 { border: none; font-size: 30pt; page-break-before: avoid; }
.cover p { color: #555; font-size: 12pt; }
.toc { page-break-after: always; }
.toc ul { list-style: none; padding-left: 14px; }
.toc > ul { padding-left: 0; }
.toc li { margin: 2px 0; }
.toc > ul > li > a { font-weight: 600; }
.qa-q { margin-top: 10px; }
hr { border: none; border-top: 1px solid #d0d7de; margin: 16px 0; }
"""


def pyg_css() -> str:
    # Pygments marks tokens it can't lex (e.g. `…`, `$1`) as errors with a red box; hide that.
    return HtmlFormatter(style="friendly").get_style_defs(".codehilite") + (
        "\n.codehilite .err { border: none !important; background: none !important; color: inherit !important; }"
    )


MERMAID_RE = re.compile(r"^```mermaid\s*\n(.*?)\n```\s*$", re.S | re.M)


def prep(md_text: str) -> str:
    """Turn mermaid fences into raw divs before markdown conversion."""

    def repl(m: re.Match[str]) -> str:
        return f'\n<div class="mermaid">\n{html.escape(m.group(1))}\n</div>\n'

    return MERMAID_RE.sub(repl, md_text)


def demote_first_h1(md_text: str, title: str) -> str:
    return md_text


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def cheatsheet_section(slug: str) -> str:
    text = read(LEARN / "07-cheatsheets.md")
    m = re.search(rf"<!-- cheat:{re.escape(slug)} -->(.*?)(?=<!-- cheat:|\Z)", text, re.S)
    if not m:
        raise SystemExit(f"cheatsheet section missing: {slug}")
    body = m.group(1).strip()
    # Promote the section heading to an H1 for the PDF.
    body = re.sub(r"^## ", "# ", body, count=1, flags=re.M)
    return body


QA_SPLIT = re.compile(r"(?m)^(?=\*\*Q:\*\*)")


def qa_blocks(text: str) -> list[str]:
    """Return each Q&A block (from **Q:** to before the next **Q:** or heading)."""
    blocks = []
    for chunk in QA_SPLIT.split(text):
        if not chunk.startswith("**Q:**"):
            continue
        # Stop at the next heading.
        chunk = re.split(r"(?m)^#{1,6} ", chunk)[0]
        blocks.append(chunk.strip())
    return blocks


def all_qa_regrouped() -> str:
    parts = ["# All Interview Q&A — grouped by technology and difficulty\n"]
    banks = [(t[1].replace("-", " "), t[3]) for t in TECHS] + [("Root Record project", "project-qa.md")]
    for title, fname in banks:
        blocks = qa_blocks(read(LEARN / "05-qa" / fname))
        parts.append(f"\n# {title} ({len(blocks)} Q&As)\n")
        for label, emoji in (("Beginner", "🟢"), ("Intermediate", "🟡"), ("Advanced", "🔴")):
            group = [b for b in blocks if emoji in b.split("\n", 1)[0]]
            if not group:
                continue
            parts.append(f"\n## {title} — {emoji} {label} ({len(group)})\n")
            parts.extend(f"\n{b}\n" for b in group)
        untagged = [b for b in blocks if not any(e in b.split("\n", 1)[0] for e in "🟢🟡🔴")]
        if untagged:
            parts.append(f"\n## {title} — other ({len(untagged)})\n")
            parts.extend(f"\n{b}\n" for b in untagged)
    return "\n".join(parts)


def to_html(md_text: str, title: str, subtitle: str) -> str:
    md = markdown.Markdown(
        extensions=["extra", "toc", "codehilite", "sane_lists"],
        extension_configs={
            "codehilite": {"guess_lang": False, "css_class": "codehilite"},
            "toc": {"toc_depth": "1-2"},
        },
    )
    body = md.convert(prep(md_text))
    toc = md.toc
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{html.escape(title)}</title>
<style>{CSS}{pyg_css()}</style>
<script src="{MERMAID_JS}"></script>
</head><body>
<div class="cover"><h1>{html.escape(title)}</h1><p>{html.escape(subtitle)}</p><p>Root Record — self-study course</p></div>
<div class="toc"><h2>Contents</h2>{toc}</div>
{body}
<script>
window.__mermaidErrors = 0;
(async () => {{
  try {{
    mermaid.initialize({{ startOnLoad: false, theme: 'neutral', securityLevel: 'loose', flowchart: {{ useMaxWidth: true }} }});
    const nodes = Array.from(document.querySelectorAll('.mermaid'));
    for (const [i, el] of nodes.entries()) {{
      try {{
        const {{ svg }} = await mermaid.render('m' + i, el.textContent);
        el.innerHTML = svg;
      }} catch (e) {{
        window.__mermaidErrors++;
        el.innerHTML = '<pre>Diagram error: ' + String(e).replace(/</g,'&lt;') + '</pre>';
      }}
    }}
  }} finally {{ window.__mermaidDone = true; }}
}})();
</script>
</body></html>"""


def walkthrough_files() -> list[Path]:
    return sorted((LEARN / "04-code-walkthrough").glob("*.md"))


def jobs() -> list[tuple[str, str, str, str]]:
    """(pdf name, title, subtitle, markdown)."""
    out = []
    guide = [read(LEARN / "00-overview.md"), read(LEARN / "02-architecture.md"), read(LEARN / "03-decision-log.md")]
    guide += [read(p) for p in walkthrough_files()]
    out.append(("00-Project-Guide.pdf", "Project Guide", "Overview · Architecture · Decision log · File-by-file walkthrough", "\n\n".join(guide)))
    for num, title, skill, qa, slug in TECHS:
        md_text = "\n\n".join(
            [read(LEARN / "01-skills" / skill), read(LEARN / "05-qa" / qa), cheatsheet_section(slug)]
        )
        out.append((f"{num}-{title}-Complete.pdf", title.replace("-", " "), "Skill module · Q&A bank · Cheatsheet", md_text))
    kit = "\n\n".join([read(LEARN / "05-qa" / "project-qa.md"), read(LEARN / "05-qa" / "project-interview-kit.md")])
    out.append(("90-Project-Interview-Kit.pdf", "Project Interview Kit", "Project Q&A · Scripts · STAR answers", kit))
    out.append(("95-All-Interview-QA.pdf", "All Interview Q&A", "Every bank, grouped by technology and difficulty", all_qa_regrouped()))
    gc = "\n\n".join([read(LEARN / "06-glossary.md"), read(LEARN / "07-cheatsheets.md")])
    out.append(("99-Glossary-and-Cheatsheets.pdf", "Glossary & Cheatsheets", "A–Z terms · One page per technology", gc))
    return out


def main() -> None:
    render_jobs = []
    for name, title, subtitle, md_text in jobs():
        if ONLY and name not in ONLY:
            continue
        html_path = WORK / (name.removesuffix(".pdf") + ".html")
        html_path.write_text(to_html(md_text, title, subtitle), encoding="utf-8")
        render_jobs.append({"html": str(html_path), "pdf": str(OUT / name), "title": title})
    jobs_file = WORK / "jobs.json"
    jobs_file.write_text(json.dumps(render_jobs), encoding="utf-8")
    subprocess.run(["node", str(TOOLS / "render.mjs"), str(jobs_file)], check=True, cwd=TOOLS)


if __name__ == "__main__":
    main()
