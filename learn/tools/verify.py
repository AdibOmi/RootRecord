import fitz, glob, re, sys
tot = 0
for f in sorted(glob.glob("*.pdf")):
    d = fitz.open(f)
    links = sum(1 for p in d[:6] for l in p.get_links() if l.get("kind") == fitz.LINK_GOTO or "page" in l)
    text = "".join(p.get_text() for p in d)
    fences = text.count("```")
    pipes = len(re.findall(r"(?m)^\|.*\|\s*$", text))
    derr = text.count("Diagram error")
    raw_md = len(re.findall(r"\*\*Q:\*\*", text))
    print(f"{f:45s} pages={d.page_count:4d} outline={len(d.get_toc()):4d} toc_links(p1-6)={links:4d} fences={fences} pipe_rows={pipes} diagErr={derr} rawQ={raw_md}")
    tot += d.page_count
print("TOTAL pages", tot)
