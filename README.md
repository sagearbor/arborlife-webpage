# ArborLife — sagearbor.dev

The public face of Sage Arbor's work: AI strategy, safety & evaluation, and
applied ML — for hiring managers and consulting clients alike.

## The site

**`index.html`** is the live, self-contained site (no build step, no
dependencies — just open it or serve it statically).

- **Dark by default**, with a one-click toggle to a warm **light / editorial**
  theme (preference persists via `localStorage`).
- Sections: hero → services ("how I can help") → signature work → selected work
  across four focus areas → about → contact.
- Serif display type (Fraunces) + Inter; subtle motion; fully responsive;
  `prefers-reduced-motion` aware.
- Project descriptions are deliberately **accurate** — research/prototype work is
  labeled as such; proprietary work shows as non-linked "Private / Research"
  cards (social proof without broken links).

## Run / deploy

```bash
# view locally
open index.html            # or: python3 -m http.server

# deploy: GitHub Pages (Settings → Pages → main branch) serves index.html
```

## History

Earlier design explorations live in `mockups/` (neural-garden, clean-showcase,
bold-hub, and the 4-grid hub that this redesign builds on).
