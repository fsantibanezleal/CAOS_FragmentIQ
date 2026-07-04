# FragmentIQ, muckpile fragmentation PSD from a drill-&-blast image

[![CI](https://img.shields.io/github/actions/workflow/status/fsantibanezleal/CAOS_FragmentIQ/ci.yml?branch=main&label=CI)](https://github.com/fsantibanezleal/CAOS_FragmentIQ/actions)
[![License](https://img.shields.io/github/license/fsantibanezleal/CAOS_FragmentIQ)](LICENSE)
[![Live demo](https://img.shields.io/badge/demo-live-2ea44f)](https://fragmentiq.fasl-work.com)

[![CI](https://github.com/fsantibanezleal/CAOS_FragmentIQ/actions/workflows/ci.yml/badge.svg)](https://github.com/fsantibanezleal/CAOS_FragmentIQ/actions)
**Live:** https://fragmentiq.fasl-work.com

FragmentIQ answers *"how well did the blast fragment the rock?"* from a muckpile image: pick a synthetic case and get
the **particle-size distribution**, the recovered passing curve, a **Rosin–Rammler** fit, and **P10/P50/P80**. The
whole CV pipeline, the synthetic muckpile generator, the watershed delineation, the PSD + the fit, runs **live in
your browser**. (There is no photo upload in this build; the 7 cases are the inputs.)

A CAOS/Faena mining web-app instantiated on the **product-repo archetype** ([ADR-0057](docs/architecture/01_overview.md)),
with the in-app ⓘ **Architecture modal** ([ADR-0058](docs/frameworks/02_viz.md)).

## What it does

- **Watershed delineation**, grayscale foreground → distance transform → marker non-maximum suppression (one marker
  per fragment) → descending-DT flood → labelled fragments. The WipFrag/Split-style classical method, run live in TS.
- **Mass-weighted PSD + Rosin–Rammler**, fragment areas → equivalent diameters → `% passing ∝ d³` → a Rosin–Rammler
  fit `P(x)=1−exp[−(x/xc)ⁿ]` (linearised least squares) → P10/P50/P80, xc, n, r².
- **frag-edge CNN (learned)**, a per-patch boundary CNN refines the foreground (close intra-fragment grain + re-cut
  only confident seams) to reduce the over-segmentation. Trained offline (torch → ONNX), run **live** (onnxruntime-web).
- **fines-bias regressor (learned)**, a scalar multiplicative correction of the recovered P50 toward the truth from
  PSD-shape features. Trained + evaluated **offline**; its numbers ship in the baked `fq-learned.json` (it does not run
  in the browser).
- **Bring your own muckpile (Python-side contract only)**, CONTRACT 1 validates a scene descriptor
  `{scene_id, px dims, mm/px, scale_known, …}`; a missing scale is flagged (the PSD would be pixel-only). The web app
  has no ingestion UI yet, external data goes through the `fqlab` pipeline.

## Honesty

The muckpile images are **synthetic** (fragments sized by Rosin–Rammler, non-overlap tiling, dark gaps, shading) , 
there is no real-photo ingestion calibrated to a sieve. The delineation + metrics are real (scored against the
generator ground truth); image-based delineation has a known **over-segmentation bias**, which FragmentIQ states. The
frag-edge-vs-classical numbers now use **three disjoint seed banks (train / tune / test)**
([issue #12](https://github.com/fsantibanezleal/CAOS_FragmentIQ/issues/12)): the seam-recut thresholds are SELECTED
on the tune bank (n=8) and REPORTED on the test bank (n=8), so the test error is clean for those hyperparameters , 
**frag-edge CNN 23.8% vs classical watershed 27.2%** (test n=8). The small n makes the delta indicative, not
significant. The fines regressor's **0.040 vs 0.284** (n=17) is held-out by seed but drawn from the same generator regime
grid, an interpolation result, not transfer, and it says nothing about real rock. `C-MONO`/`C-KNOWN` are closed-form
analytic controls. Numbers are reported whichever way they land.

## Quickstart

```bash
# light lane (numpy only), rebuild the replay artifacts + run the checks
python -m venv .venv-pipeline && .venv-pipeline/Scripts/pip install -r data-pipeline/requirements.txt -r requirements-dev.txt -e .
.venv-pipeline/Scripts/python -m fqlab.pipeline all      # 7 cases → traces + manifests
.venv-pipeline/Scripts/python scripts/check_artifacts.py # CONTRACT 2 OK

# the SPA (the CV engine + CNN run live in the browser)
cd frontend && npm ci && npm run dev                     # http://localhost:5173
npm test                                                 # frag 4 + contract 4

# heavy lane (local only), re-bake + train the learned models (torch → ONNX)
python -m venv .venv-precompute && .venv-precompute/Scripts/pip install -r data-pipeline/requirements-precompute.txt
.venv-pipeline/Scripts/python -m fqlab.pipeline all --retrain
```

## Layout

See [STRUCTURE.md](STRUCTURE.md) and the wiki in [docs/](docs/README.md). The CV engine is the TypeScript code in
[`frontend/src/frag/`](frontend/src/frag/) (it runs in the browser **and** in the offline Node bake, no Python
re-port); `data-pipeline/fqlab/` is the two contracts + the staged pipeline + the lane gate.

## License

MIT, see [LICENSE](LICENSE). Third-party components in [LICENSES.md](LICENSES.md); attributions in
[ATTRIBUTION.md](ATTRIBUTION.md).
