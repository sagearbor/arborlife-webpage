#!/usr/bin/env python3
"""Re-embed Sage's master CV into the matcher worker's SAGE_PROFILE.

The profile in worker.js is: honesty rules + a KEY STRENGTHS note + the full
master CV. Everything BEFORE the "CANDIDATE CV" line is hand-edited and
preserved; this script only refreshes the CV block from the master CV so the
matcher always scores against the current record.

Usage:  python3 embed_cv.py [path-to-master-cv.md]
Then Sage must run `wrangler deploy` for it to go live.
"""
import re
import sys

DEFAULT_CV = "/home/scb2/PROJECTS/gitRepos-wsl/cv-improve-skills/cv/sage-arbor-cv-master.md"
WORKER = "/home/scb2/PROJECTS/gitRepos-wsl/arborlife-webpage/matcher/worker.js"

cv_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CV
cv = open(cv_path, encoding="utf-8").read()

# Make the CV safe to embed inside a JS template literal, and keep it dash-clean.
cv = cv.replace("`", "'")
cv = cv.replace("—", " - ").replace("–", "-")  # em / en dash -> hyphen
cv = re.sub(r"\b20\+\s+years", "25+ years", cv)          # keep the year count current
cv = "\n".join(l for l in cv.splitlines() if not l.strip().startswith(">"))  # drop repo-internal notes
cv = re.sub(r"\n{3,}", "\n\n", cv).strip()
assert "`" not in cv and "${" not in cv, "unsafe chars remain in CV; fix before embedding"

w = open(WORKER, encoding="utf-8").read()
pat = re.compile(r"(CANDIDATE CV\n).*?(\n\nReturn a fair)", re.S)
if not pat.search(w):
    sys.exit("ERROR: could not find the 'CANDIDATE CV ... Return a fair' block in worker.js")
w = pat.sub(lambda m: m.group(1) + cv + m.group(2), w)
open(WORKER, "w", encoding="utf-8").write(w)
print("Re-embedded CV (%d chars) from %s. Run `cd matcher && wrangler deploy` to go live." % (len(cv), cv_path))
