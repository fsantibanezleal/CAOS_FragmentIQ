# FragmentIQ, repository structure

Instantiated from the CAOS product-repo archetype ([ADR-0057](docs/architecture/01_overview.md)). The **frozen base**
(layout, the two contracts, the staged pipeline, the lane gate, the manifest/trace, CI guards) is never re-litigated;
the **per-product surface** is the CV engine + the visualisations + the cases + content.

```
CAOS_FragmentIQ/
├─ README.md · CHANGELOG.md · STRUCTURE.md · LICENSE · LICENSES.md · ATTRIBUTION.md
├─ pyproject.toml · .env.example · .gitignore · .gitattributes
├─ requirements*.txt · data-pipeline/requirements*.txt (incl. requirements-precompute.txt: torch+onnx)
├─ scripts/            setup · precompute · smoke · dev (.sh + .ps1)
├─ data-pipeline/
│  └─ fqlab/                          # the two contracts + the staged pipeline (the CV engine itself is TS, below)
│     ├─ __init__.py (version) · pipeline.py (orchestrator+CLI, numpy-light + --retrain) · registry.py
│     ├─ io/     contract.py (CONTRACT 1: scene descriptor + dropped image) · schema.py · formats.py
│     ├─ core/   gate.py (live/precompute gate) · trace.py + manifest.py (CONTRACT 2) · rng.py
│     ├─ model/  learned.py (the 2 learned models' feature contracts, the SOURCE OF TRUTH the SPA reproduces)
│     ├─ stages/ preprocess · feature_extraction · train · infer · evaluate · export (thin over the science)
│     ├─ science/  bake_cases.mjs · gen_train.mjs · eval_frag.mjs (Node+tsx, the SAME TS engine) · train_frag.py (torch → ONNX)
│     └─ live.py  (dormant, the live lane is TypeScript, not Pyodide)
├─ data/
│  ├─ examples/  scenes.csv (tiny committed CONTRACT-1 sample) · params.csv (unused template leftover, SIR)
│  ├─ derived/   case-results.json + per-case <case>/trace.json + manifests/ + frag-edge.onnx + fines.onnx + fq-learned.json  (committed)
│  └─ raw/       (git-ignored, regenerable training patches + eval scenes)
├─ frontend/
│  ├─ src/frag/   THE CV ENGINE: rng · rosinrammler · scene (+ truth labels) · watershed (DT+NMS+morphClose+flood) · analyze · cases · index
│  ├─ src/pages/  Tool (App) · Introduction · Methodology · Implementation · Experiments · Benchmark
│  ├─ src/viz/    SceneView (canvas muckpile+overlay) · PSDChart (µPlot) · SizeHist · UPlotChart
│  ├─ src/lib/    contract.types.ts (CONTRACT 2 mirror) · artifacts.ts · ort.ts (batched CNN foreground)
│  ├─ public/svg/tech/  the 5 themed Architecture-modal SVGs (ADR-0058)
│  ├─ src/architecture.ts  the ⓘ Architecture modal config (ADR-0058)
│  ├─ test/       frag.test.ts (oracles) · contract.test.ts   (node:test + tsx)
│  └─ copy-data.mjs · vite.config.ts · package.json
├─ app/           (dormant FastAPI, activate only on an ADR-0002 trigger)
├─ docs/          the navigable wiki (architecture · frameworks · cases · guides)
└─ .github/workflows/  ci.yml (python + frontend) · deploy-pages.yml
```

## The lanes

| Lane | Where | Deps |
|---|---|---|
| **Live (client)** | `frontend/src/frag/` (generator + watershed + PSD) + onnxruntime-web (the CNN) | web npm |
| **Offline (precompute)** | `fqlab/science/` (Node bake of the TS engine + torch training) | `requirements-precompute.txt` |
| **Replay (light)** | `fqlab.pipeline` reshapes the committed bake → traces/manifests | `data-pipeline/requirements.txt` (numpy) |
| **API** | `app/` | dormant |
