# data-pipeline/ — the offline engine (`fqlab`)

Rename `fqlab` → `<slug>lab` per product. The **single source of physics/algorithm truth**; `frontend/` and
`app/` consume it, never re-implement it. Its own venv: **`.venv-pipeline`** (heavy SOTA engines, local-only).

## Layout (the package lives directly under `data-pipeline/`)
- `fqlab/pipeline.py` — orchestrator + CLI (`python -m fqlab.pipeline [all|<case>] [--seed N]`)
- `fqlab/registry.py` — cases grouped by CATEGORY · `fqlab/live.py` — Pyodide live entrypoint
- `fqlab/io/` — `contract.py` (**CONTRACT 1**) · `formats.py` (standard readers/writers) · `schema.py` (types)
- `fqlab/core/` — `rng.py` (seeded determinism) · `trace.py` · `manifest.py` (**CONTRACT 2**) · `gate.py`
- `fqlab/model/` — the shared pure-Python core (Pyodide-safe); EXAMPLE = SIR
- `fqlab/stages/` — `preprocess → feature_extraction → train → infer → evaluate → export`
- `fqlab/cases/` — documented cases

Setup + run: `scripts/setup.{sh,ps1}` then `scripts/precompute.{sh,ps1}`. See
[../docs/architecture/05_precompute-pipeline.md](../docs/architecture/05_precompute-pipeline.md).
