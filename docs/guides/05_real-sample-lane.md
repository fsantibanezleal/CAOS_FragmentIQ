# Guide, the Synthetic | Real source selector

The App has a first-level **Source** selector at the top of the sidebar: **Synthetic** (the seeded generator, with
ground truth) and **Real sample** (genuine post-blast photos, no ground truth). Both run the SAME live CV pipeline.

## What the Real lane is

Real mode runs the delineation + PSD chain on real post-blast rock-fragment photographs bundled as static assets
under `data/derived/real/` (copied into the SPA by `frontend/copy-data.mjs`). The datum contract is
`data/derived/real/real-cases.json`:

```json
{ "id": "FR-01", "file": "data/real/FR-01.jpg", "width": 289, "height": 560,
  "rockType": { "en": "hematite, medium-coarse", "es": "..." },
  "scale": { "mm_per_px": null, "scale_known": false, "source": "red scale ball, physical diameter unverified" },
  "label": "RELATIVE" }
```

A thin browser adapter (`frontend/src/frag/realScene.ts`) decodes the photo on a canvas into the same `Scene` shape
the synthetic generator produces (`truth: []`, `labels` all zero). From there the existing engine runs unchanged:
adaptive Otsu foreground, then watershed / CNN / connected-components delineation, then `summarise` to a PSD +
Rosin-Rammler fit. A red scale-ball is detected by colour and excluded from the rock foreground.

## RELATIVE, never accuracy (the hard honesty rule)

There is **no openly-licensed dataset that pairs a muckpile photo with a sieve-measured PSD ground truth**. So the
Real lane reports **RELATIVE agreement**, not accuracy:

- **REAL:** the photo, its pixels, the live segmentation, and the derived pixel-size PSD are genuine measurements.
- **RELATIVE:** the `vs reference` tab compares the selected delineation against a delineation-free morphological
  granulometry on the SAME photo. Both are biased, image-based estimates; their difference is method uncertainty,
  not error against truth.
- **Scale is unset:** the red scale ball's physical diameter is undocumented in the source dataset, so sizes are in
  **pixels**. Only a verified mm/px would switch the axes to mm.

## Data source + license

The 5 bundled real photos are a curated subset of **Yaghoobi, H. (2018), "fragmented rocks by blasting",
Mendeley Data V1, doi:10.17632/z78ghz96bn.1, licensed CC BY 4.0** (226 photographs from the Gole-Gohar iron ore
mine, Iran). Redistributed under CC BY 4.0 with attribution; see `ATTRIBUTION.md`. The state-of-the-art deep
segmentation reference (SAM, U-Net; Zhao et al. 2024) is cited as an offline reference, it is not run in-browser.
