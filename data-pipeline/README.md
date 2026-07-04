# data-pipeline/ — the offline engine (`fqlab`)

The **single source of pipeline/contract truth**; `frontend/` and
`app/` consume it, never re-implement it. Its own venv: **`.venv-pipeline`** (heavy SOTA engines, local-only).
Note: FragmentIQ's CV engine itself is TypeScript (`frontend/src/frag/`), shared by the browser and the Node bake.

## Layout (the package lives directly under `data-pipeline/`)
- `fqlab/pipeline.py` — orchestrator + CLI (`python -m fqlab.pipeline [all|<case>] [--seed N]`)
- `fqlab/registry.py` — cases grouped by CATEGORY · `fqlab/live.py` — dormant marker (the live lane is TypeScript + onnxruntime-web, not Pyodide)
- `fqlab/io/` — `contract.py` (**CONTRACT 1**) · `formats.py` (standard readers/writers) · `schema.py` (types)
- `fqlab/core/` — `rng.py` (seeded determinism) · `trace.py` · `manifest.py` (**CONTRACT 2**) · `gate.py`
- `fqlab/model/` — `learned.py`: the feature contracts of the two learned models, shared by the trainer and the frontend
- `fqlab/stages/` — `preprocess → feature_extraction → train → infer → evaluate → export`
- `fqlab/cases/` — documented cases

Setup + run: `scripts/setup.{sh,ps1}` then `scripts/precompute.{sh,ps1}`. See
[../docs/architecture/05_precompute-pipeline.md](../docs/architecture/05_precompute-pipeline.md).
