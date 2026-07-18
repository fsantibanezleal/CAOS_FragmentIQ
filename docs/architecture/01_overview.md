# Architecture, overview

FragmentIQ is an instance of the **CAOS product-repo archetype** ([ADR-0057]): an offline-pipeline-heavy, backend-
optional product that deploys as a static, deterministic-replay viewer. The base is **frozen** (instantiated, never
re-litigated); per-product rework lives only in the **core**, the CV engine, the visualisations, the cases, content.

The distinctive thing about FragmentIQ is that the **CV pipeline is the live lane**: the muckpile generator + the
watershed delineation + the PSD are TypeScript that run in the browser, and the frag-edge CNN runs via onnxruntime-web,
so the App re-delineates the muckpile as the case, the mm/px scale, or the classifier changes.

## The lanes (and what runs where)

| Lane | Where | Deps | Notes |
|---|---|---|---|
| **Live (client-side)** | `frontend/src/frag/` (generator + watershed + PSD) + onnxruntime-web (the CNN) | web npm | the interactive core; re-delineates on every control change |
| **Offline (precompute)** | `fqlab/science/`, Node bake of the same TS engine + torch training | `data-pipeline/requirements-precompute.txt` | bakes `case-results.json` + the ONNX |
| **Replay (light)** | `fqlab.pipeline` (numpy) | `data-pipeline/requirements.txt` | reshapes the committed bake → per-case traces + manifests |
| **API (backend)** | `app/` (FastAPI) | `requirements-api.txt` | DORMANT; activate only on an ADR-0002 trigger |

A measured **[gate](03_the-gate.md)** records the live-vs-replay verdict per case (at teaching scale every case is live).

## The flow

`muckpile image (synthetic or yours)` → **[Contract 1](08_data-contracts.md)** (`io/contract.py`) → the TS CV engine
(bake) → `case-results.json` → **[Contract 2](08_data-contracts.md)** (`core/manifest.py` + `core/trace.py`, the
compact per-case trace) → `data/derived/` (committed) → the `frontend/` App replays it **and** re-delineates it live.

## Frozen base vs rework

- **Frozen:** the folder layout, the two contracts, the staged pipeline names, the gate, the manifest/trace, the
  two-venv split, the cases-by-category mechanism, CI guards.
- **Rework (the only per-product surface):** the CV engine (`frontend/src/frag/` + the stage bodies), the `frontend/`
  visualisations, and the cases + content.

## What FragmentIQ is and is not

- **Is:** a watershed-class fragment delineator + a mass-weighted PSD + a Rosin–Rammler fit over synthetic muckpile
  imagery, with an honest frag-edge-CNN-vs-classical-watershed comparison and a fines-bias correction.
- **Is not:** a production fragmentation product (no real-photo ingestion calibrated to a sieve, no 3-D / stereo
  sizing, no fines-deconvolution beyond the documented regressor). The muckpile images are synthetic; the metrics are
  scored against the generator ground truth.

[ADR-0057]: ../../../conventions/architecture/0-archetype/ADR-0057-product-repo-archetype.md
