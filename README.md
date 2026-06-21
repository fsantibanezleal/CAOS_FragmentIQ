# FragmentIQ — muckpile fragmentation PSD from a drill-&-blast image

[![CI](https://github.com/fsantibanezleal/CAOS_FragmentIQ/actions/workflows/ci.yml/badge.svg)](https://github.com/fsantibanezleal/CAOS_FragmentIQ/actions)
**Live:** https://fragmentiq.fasl-work.com

FragmentIQ answers *"how well did the blast fragment the rock?"* from a muckpile image: drop one (or pick a synthetic
case) and get the **particle-size distribution** — the recovered passing curve, a **Rosin–Rammler** fit, and
**P10/P50/P80** + the oversize/fines fractions. The whole CV pipeline — the synthetic muckpile generator, the
watershed delineation, the PSD + the fit — runs **live in your browser**.

A CAOS/Faena mining web-app instantiated on the **product-repo archetype** ([ADR-0057](docs/architecture/01_overview.md)),
with the in-app ⓘ **Architecture modal** ([ADR-0058](docs/frameworks/02_viz.md)).

## What it does

- **Watershed delineation** — grayscale foreground → distance transform → marker non-maximum suppression (one marker
  per fragment) → descending-DT flood → labelled fragments. The WipFrag/Split-style classical method, run live in TS.
- **Mass-weighted PSD + Rosin–Rammler** — fragment areas → equivalent diameters → `% passing ∝ d³` → a Rosin–Rammler
  fit `P(x)=1−exp[−(x/xc)ⁿ]` (linearised least squares) → P10/P50/P80, xc, n, r².
- **frag-edge CNN (learned)** — a per-patch boundary CNN refines the foreground (close intra-fragment grain + re-cut
  only confident seams) to reduce the over-segmentation. Trained offline (torch → ONNX), run **live** (onnxruntime-web).
- **fines-bias regressor (learned)** — corrects the recovered P50 toward the truth from PSD-shape features.
- **Bring your own muckpile** — CONTRACT 1 validates a scene descriptor `{scene_id, px dims, mm/px, scale_known, …}`;
  without a known scale the PSD is reported in pixels, not mm (and flagged).

## Honesty

The muckpile images are **synthetic** (fragments sized by Rosin–Rammler, non-overlap tiling, dark gaps, shading) —
there is no real-photo ingestion calibrated to a sieve. The delineation + metrics are real (scored against the
generator ground truth); image-based delineation has a known **over-segmentation bias**, which FragmentIQ states. The
learned models are held-out: **frag-edge P50 error 23.8% vs the classical 27.2%** (boundary-F1 0.997); **fines 0.040 vs
0.284**. `C-MONO`/`C-KNOWN` are closed-form analytic controls. No fabricated wins.

## Quickstart

```bash
# light lane (numpy only) — rebuild the replay artifacts + run the checks
python -m venv .venv-pipeline && .venv-pipeline/Scripts/pip install -r data-pipeline/requirements.txt -r requirements-dev.txt -e .
.venv-pipeline/Scripts/python -m fqlab.pipeline all      # 7 cases → traces + manifests
.venv-pipeline/Scripts/python scripts/check_artifacts.py # CONTRACT 2 OK

# the SPA (the CV engine + CNN run live in the browser)
cd frontend && npm ci && npm run dev                     # http://localhost:5173
npm test                                                 # frag 4 + contract 4

# heavy lane (local only) — re-bake + train the learned models (torch → ONNX)
python -m venv .venv-precompute && .venv-precompute/Scripts/pip install -r data-pipeline/requirements-precompute.txt
.venv-pipeline/Scripts/python -m fqlab.pipeline all --retrain
```

## Layout

See [STRUCTURE.md](STRUCTURE.md) and the wiki in [docs/](docs/README.md). The CV engine is the TypeScript code in
[`frontend/src/frag/`](frontend/src/frag/) (it runs in the browser **and** in the offline Node bake — no Python
re-port); `data-pipeline/fqlab/` is the two contracts + the staged pipeline + the lane gate.

## License

MIT — see [LICENSE](LICENSE). Third-party components in [LICENSES.md](LICENSES.md); attributions in
[ATTRIBUTION.md](ATTRIBUTION.md).
