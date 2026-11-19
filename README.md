[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/dexalot4-wq/gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/dexalot4-wq/gta6-cover-art/reward.svg)](https://make.fun/c/gta6-cover-art-01)

# Neon Coast Cover Studio

A GTA-style cover art maker for the [gta6-cover-art-01 bounty on make.fun](https://make.fun/c/gta6-cover-art-01): turn any photo into a multi-panel poster-style cover with bold lettering and a sunset or neon grade, and export it as a PNG to share. It runs offline in a desktop browser from its own static files — your photos never leave your machine.

## What it does

- **Six layouts** — Grid 2×2, Hero + 3, Full bleed, Grid 3×3, tilted Snapshots, Duo split
- **Any photo** — upload your own or use the four built-in samples; click a panel to select it, drag to reposition the photo, scroll to zoom, reset the crop any time
- **Five colour grades** — Sunset, Neon, Vice, Noir, Gold, each a gradient-map grade with film grain and vignette
- **Lettering** — editable Anton title with a sunset gradient fill and dark outline, Pacifico script subtitle, a heat meter of stars and a badge ribbon
- **Export** — one click to a PNG in 1080 × 1080, 1080 × 1350 or 1920 × 1080
- **Undo / redo / shuffle** — every edit is reversible; shuffle deals a fresh layout, grade and photos

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests. The app is plain static files under `app/`.

## Originality

All art, lettering and fonts are original: no Rockstar Games logo, wordmark, artwork or font. The display fonts (Anton and Pacifico, under `app/fonts/`) are licensed under the SIL Open Font License (see `app/fonts/OFL.txt`). The sample photos under `app/samples/` were made with an image model and are free to use.

## Entry

- Competition: [gta6-cover-art-01](https://make.fun/c/gta6-cover-art-01) — $250 across 50 places
- Program: `main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library
- License: MIT — see [LICENSE](LICENSE)
