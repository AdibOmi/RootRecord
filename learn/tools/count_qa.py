import re, sys, pathlib
d = pathlib.Path(sys.argv[1])
for p in sorted(d.glob("*.md")):
    t = p.read_text(encoding="utf-8")
    q = len(re.findall(r"(?m)^\*\*Q:\*\*", t)); a = len(re.findall(r"(?m)^\*\*A:\*\*", t))
    tags = {n: len(re.findall(rf"(?m)^\*\*Q:\*\* {e}", t)) for n, e in zip(("B","I","A"), "🟢🟡🔴")}
    print(f"{p.name:40s} Q={q} A={a} {tags}")
