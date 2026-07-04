# data/ — the data contract + layout

This folder is governed by the **two data contracts** of ADR-0057, adapted to FragmentIQ (muckpile scenes).

## Layout

| Path | What | Git |
|---|---|---|
| `raw/` | private/large source inputs (training patches, eval scenes — regenerable) | **git-ignored** |
| `examples/` | a tiny standard-format sample that PASSES Contract 1 (clone-verify): `scenes.csv`. (`params.csv` is an unused template leftover, SIR) | committed |
| `derived/<case>/` | the compact, standard-format artifacts the web replays | committed |
| `derived/manifests/` | per-case `<case>.json` (Contract 2) + the flat `index.json` inventory | committed |
| `derived/` (root) | `case-results.json` + `frag-edge.onnx` + `fines.onnx` + `fq-learned.json` (the baked cross-case + learned artifacts) | committed |

## CONTRACT 1 — ingestion (raw → pipeline) — the *bring-your-own-muckpile* gate

Defined in `data-pipeline/fqlab/io/contract.py`. A scene-descriptor row is **accepted** iff it satisfies the schema;
**rejected** with a reason otherwise (never silently coerced); plausible-but-suspicious rows are **flagged**.
`validate_image` applies the same policy to a single photo's metadata `{width, height, mm_per_px, scale_known}`
(Python-side; the web app has no photo upload yet).

Schema (`examples/scenes.csv`):

| Column | Unit | Range | Notes |
|---|---|---|---|
| `scene_id` | — | non-empty | identifier |
| `px_width` | px | [64, 8000] | outside → reject |
| `px_height` | px | [64, 8000] | outside → reject |
| `mm_per_px` | mm/px | [0.05, 50] | outside / NaN / Inf → reject |
| `scale_known` | bool | — | `false` → **flag** (the PSD would be in PIXELS, not mm) |
| `regime` | — | coarse · medium · fine · known · mono | unknown → reject (default `medium`) |
| `lighting` | — | even · shadow | unknown → reject (default `even`) |

**Outlier policy:** missing/empty required column → reject · non-numeric → reject · NaN/Inf → reject ·
out-of-range → reject · `scale_known=false` → **flag** · `mm_per_px > 20` (very coarse; sub-pixel fines) → **flag** ·
aspect outside [0.3, 4] → **flag** (flags are recorded in the manifest).

## CONTRACT 2 — artifact (pipeline → web)

Each pipeline run writes a compact trace (`derived/<case>/trace.json`, schema `fragmentiq.trace/v1`) and a manifest
(`derived/manifests/<case>.json`, schema `fragmentiq.manifest/v2`) recording params, seed, engine+version, the
artifact byte size, the measured **lane/gate** verdict, Contract-1 flags, and the evaluation metrics.
`frontend/src/lib/contract.types.ts` mirrors these schemas so any drift fails the web build. The web loads ONLY
these committed artifacts for replay/cross-case views; the App additionally runs the same TS engine live.

## Provenance / license

The muckpile images are **synthetic**, produced by the seeded TypeScript generator (`frontend/src/frag/scene.ts`)
with per-pixel ground-truth labels; there is no real-photo dataset in this build. No external data sources or
licenses are involved yet; when real photos land they must be documented here (source, license, redistribution
terms; public derived artifacts only; raw/private sources stay in the vault per ADR-0055).
