# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Sage Arbor's personal marketing site (consulting + selective roles), served at
https://sagearbor.github.io/arborlife-webpage via **GitHub Pages from the `main`
branch**. It is a hand-built static site: `index.html` is the entire site (inline
CSS + JS), `cv.html` is the hosted resume. The only server-side piece is a
Cloudflare Worker under `matcher/` that powers the AI "does my background fit your
role?" tool.

## Hard rules (these override defaults)

- **Never use em-dashes or en-dashes** anywhere: copy, code comments, commit
  messages. Sage reads them as an AI tell. Use a hyphen, a comma, or a new
  sentence. Check before shipping: `grep -c $'—\|–' index.html` must be `0`.
- **Do not steer his brand toward biosecurity / biowarfare.** Position him as
  hands-on AI safety + healthcare AI + alignment/interpretability. Computational
  biology is foundational credibility, not the headline.
- **Be honest in the matcher.** A poor-fit role (e.g. "artist") must come back
  weak with low bars, never inflated.

## Layout

- `index.html` - the whole site: nav, hero, stats, services, signature/selected
  work, about, the AI matcher (`#match`), contact, footer. All CSS in one
  `<style>`; all JS in `<script>` blocks at the end. Dark theme is default; a
  toggle switches to light via `[data-theme]` custom properties.
- `cv.html` - hosted resume (the "Résumé" link).
- `img/` - `sage-headshot-cutout.png` (transparent, circle-masked hero photo),
  `rotunda.mp4` (compressed 3D "megacity" clip used in an easter egg), source
  headshots.
- `matcher/worker.js` - the Cloudflare Worker (AI proxy). `matcher/README.md` -
  deploy steps.
- `.nojekyll` - REQUIRED. Without it, Pages runs legacy Jekyll and builds hang.
- `tmp/` - scratch; do not ship.

## The AI matcher (two boxes, on purpose)

A static site cannot hold a secret or fetch cross-origin URLs, so a **Cloudflare
Worker** does both:

- `matcher/worker.js` holds the Anthropic API key as an **encrypted secret**
  (`env.ANTHROPIC_API_KEY`, never in the repo) and calls the Messages API
  (`claude-haiku-4-5`).
- `index.html` calls it via `MATCHER_ENDPOINT =
  "https://arborlife-matcher.sagearbor.workers.dev"`. The `#match` widget POSTs
  `{jobText}` or `{jobUrl}`; the Worker returns JSON:
  `overall_fit`, `summary`, `aspects[{label, requirement, score (0..1), evidence}]`,
  `top_gaps`.
- The frontend renders `aspects` as a vertical bar chart (`drawMatchChart`):
  height = `score`, color band (>=0.67 green, >=0.34 amber, else red), sorted
  best-to-worst left-to-right, x-labels rotated 90 CCW, canvas sized to its
  displayed width x DPR so text stays crisp.
- Worker knobs: `SAGE_PROFILE` (what the AI is told about Sage + honesty rules),
  `SCHEMA`, `MODEL`, `ALLOWED_ORIGIN` (CORS lock), `MAX_INPUT_CHARS`.

**When does Sage need to `wrangler deploy`?** ONLY when `matcher/worker.js`
changes. Site changes (index.html, cv.html) go live automatically on push to
`main`. Deploy is `cd matcher && wrangler deploy` and **Sage runs it himself**
(you cannot; the key is his). So batch worker edits and tell him once.

## The easter egg

Clicking the accent dot after "Sage Arbor" (`.brand .dot`) steps through a
FIXED-order cycle of quotes + animations (the `items` array in the easter-egg
IIFE). Quick tap = forward one; **press-and-hold = run backwards** (works with a
finger on mobile). Text toasts auto-fade after ~4.5s so they do not block the
page. Do NOT start the cycle on Sage's own email-signature quotes (he has seen
them). Animations: `rings` (plays `img/rotunda.mp4` behind the headshot),
`windmill` (a wall gets knocked down and stays down while a windmill keeps
turning), `constellation` (a star-map of his projects). Add an item by writing a
function and dropping it into `items`.

## Ship + verify workflow

1. Edit, then: `grep -c $'—\|–' index.html` (must be 0), HTML-parse check, and
   `node --check` on the last `<script>` block.
2. `git add <files> && git commit && git push origin main`. End commit messages
   with a `Claude-Session:` trailer.
3. **Pages builds here are flaky** - they often sit in `building` or error. Poll
   `gh api repos/sagearbor/arborlife-webpage/pages/builds/latest --jq .status`
   until `built`; if it stalls or errors past ~90s, force one with
   `gh api -X POST repos/sagearbor/arborlife-webpage/pages/builds` (may take a
   couple tries).
4. Verify live, cache-busted:
   `curl -s "https://sagearbor.github.io/arborlife-webpage/?cb=$(date +%s%N)"`.

## Assets

- Compress a video for the site (keep it small, it sits behind the photo):
  `ffmpeg -y -ss 0 -t 10 -i src.mp4 -an -vf "crop=W:H:X:Y,scale=460:460" -c:v libx264 -crf 31 -movflags +faststart -pix_fmt yuv420p img/out.mp4`.
- The hero headshot is a transparent PNG, circle-masked with PIL.

## Working style

- `index.html` is one large file: multiple agents editing it in parallel will
  conflict, and two agents pushing to `main` at the same instant can hit a git
  race. Parallelize across DIFFERENT files (e.g. `worker.js` + `cv.html`), and
  serialize edits to `index.html`.
