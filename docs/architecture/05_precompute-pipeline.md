# The precompute pipeline (two-language)

FragmentIQ's offline lane is **two-language** (like ChancaDEM / DispatchLab / PitForge / CoreLog): the heavy science is
the SAME TypeScript engine the browser runs, driven from Node via `tsx`; Python only orchestrates + reshapes. This
avoids ever re-implementing the CV engine in Python.

## The named stages (`fqlab/stages/`)

| Stage | What (heavy lane) |
|---|---|
| `preprocess` | generate the synthetic muckpiles (the TS generator) |
| `feature_extraction` | assemble the learned-model training data: 16×16 boundary patches (from the per-pixel truth) + the fines rows + the held-out eval scenes (`science/gen_train.mjs`) |
| `train` | fit the frag-edge CNN + the fines regressor → ONNX (`science/train_frag.py`, torch) |
| `infer` | delineate every case's muckpile through the SAME TS engine (`science/bake_cases.mjs`) → `case-results.json`; the trained CNN's downstream P50 is measured by `science/eval_frag.mjs` |
| `evaluate` | the held-out frag-edge P50 vs the classical watershed + the fines raw-vs-corrected P50 |
| `export` | build the compact per-case trace + manifest (CONTRACT 2) — the LIGHT, numpy-only step |

## The two lanes of `fqlab.pipeline`

```bash
python -m fqlab.pipeline all              # LIGHT (numpy): reshape the committed case-results.json -> traces + manifests
python -m fqlab.pipeline all --retrain    # HEAVY: bake -> gen_train -> train_frag -> eval_frag, then reshape
```

The **default is light**: the committed `data/derived/case-results.json` + `fq-learned.json` + the two `.onnx` ARE the
heavy lane's real outputs, so CI, the contract checks and the replay never need torch or Node. `--retrain` regenerates
them (it needs the `.venv-precompute` with torch + Node `tsx`).

```
bake_cases.mjs ──► data/derived/case-results.json            (per-case delineation, baked by the TS engine)
gen_train.mjs  ──► data/raw/{frag-edge-train,fines-train,eval-scenes}.json   (git-ignored training data)
train_frag.py  ──► data/derived/{frag-edge.onnx, fines.onnx} + data/raw/learned-partial.json
eval_frag.mjs  ──► data/derived/fq-learned.json              (CNN downstream P50, measured via onnxruntime-web in Node)
pipeline.export──► data/derived/<case>/trace.json + manifests/<case>.json + index.json   (CONTRACT 2)
```

Determinism: the light pipeline is a pure function of the committed artifacts — re-running it is byte-identical (the
manifest carries no wall-clock; see [02](02_determinism-and-trace.md)).
