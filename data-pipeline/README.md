# data-pipeline/, the offline engine (`pipeline`)

The **single source of pipeline/contract truth**; `frontend/` and
`app/` consume it, never re-implement it. Its own venv: **`.venv-pipeline`** (heavy SOTA engines, local-only).
Note: FragmentIQ's CV engine itself is TypeScript (`frontend/src/frag/`), shared by the browser and the Node bake.

## Layout (the package lives directly under `data-pipeline/`)
- `pipeline/pipeline.py`, orchestrator + CLI (`python data-pipeline/run.py [all|<case>] [--seed N]`)
- `pipeline/registry.py`, cases grouped by CATEGORY · `pipeline/live.py`, dormant marker (the live lane is TypeScript + onnxruntime-web, not Pyodide)
- `pipeline/io/`, `contract.py` (**CONTRACT 1**) · `formats.py` (standard readers/writers) · `schema.py` (types)
- `pipeline/core/`, `rng.py` (seeded determinism) · `trace.py` · `manifest.py` (**CONTRACT 2**) · `gate.py`
- `pipeline/model/`, `learned.py`: the feature contracts of the two learned models, shared by the trainer and the frontend
- `pipeline/stages/`, `preprocess → feature_extraction → train → infer → evaluate → export`
- `pipeline/cases/`, documented cases

Setup + run: `scripts/setup.{sh,ps1}` then `scripts/precompute.{sh,ps1}`. See
[../docs/architecture/05_precompute-pipeline.md](../docs/architecture/05_precompute-pipeline.md).
