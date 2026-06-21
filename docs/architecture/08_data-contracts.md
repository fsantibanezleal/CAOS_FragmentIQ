# The two data contracts

## CONTRACT 1 — ingestion (`io/contract.py`)

The *bring-your-own-muckpile* gate. Two entry points, one policy: a record is **accepted** iff it passes; ill-formed
records are **rejected** with a reason (never silently coerced); plausible-but-extreme records are **flagged**
(accepted; the flag travels into the manifest). Documented in `data/README.md`.

### Scene descriptors (`validate_records`) — one row per muckpile

| column | unit / range | on violation |
|---|---|---|
| `scene_id` | non-empty | reject (missing) |
| `px_width`, `px_height` | 64–8000 px | reject |
| `mm_per_px` | 0.05–50 mm/px, > 0 | reject (out of range / NaN / Inf) |
| `scale_known` | bool | flag if false (the PSD is in **pixels**, not mm — add a scale bar/object) |
| `mm_per_px` (coarse) | > 20 mm/px | flag (sub-pixel fines are unrecoverable) |
| `regime`, `lighting` | ∈ the known sets (`coarse/medium/fine/mono/known`, `even/shadow`) | reject (unknown regime) |
| aspect width:height | flag outside 0.3–4.0 | flag (unusual crop) |

### Dropped images (`validate_image`) — a real muckpile photo's metadata

`{px_width, px_height, mm_per_px, scale_known, …}` → the same policy. Rejects non-positive dims / out-of-range scale,
flags an unknown scale or a too-coarse mm/px.

Committed sample that must pass: `data/examples/scenes.csv` (a CI test asserts it).

## CONTRACT 2 — artifact (`core/{trace,manifest}.py`)

The pipeline → web contract. The web loads ONLY manifests + traces + the shared artifacts.

- **`fragmentiq.trace/v1`** (per case): the scene spec, the **ground-truth** PSD, the **classical recovered** PSD +
  P10/P50/P80 + the Rosin–Rammler fit (xc, n, r²), the size histogram, and the learned-model metrics
  (`status: trained | pending-training`).
- **`fragmentiq.manifest/v2`** (per case): category, seed, engine + version, the **shared artifacts** (the two ONNX +
  `fq-learned.json` + `case-results.json`), the trace pointer + byte size, the lane/gate verdict, the CONTRACT-1
  flags, the metrics, and an honesty note.
- **`fragmentiq.index/v1`**: the flat inventory of all 7 cases.

A TS mirror — `frontend/src/lib/contract.types.ts` — declares these shapes so a drift **fails `tsc`**.
`scripts/check_artifacts.py` enforces manifest ↔ artifact consistency (existence, byte size, lane == gate verdict).
