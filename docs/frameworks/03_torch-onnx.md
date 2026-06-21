# Framework — the learned models (torch → ONNX → onnxruntime-web)

Two honest learned models, trained offline and run live. The generator ground truth is always the authority; the
frag-edge CNN competes with the **classical watershed**, and the fines regressor corrects the recovered PSD toward
truth.

## Training (`science/train_frag.py`, torch, `.venv-precompute`)

| Model | Architecture | Trained on | Scored against | Export |
|---|---|---|---|---|
| `frag-edge` | conv(1→16)·pool·conv(16→32)·pool·fc(48)·fc(1), sigmoid | 16×16 grayscale patches labelled boundary/interior from the per-pixel truth (`gen_train.mjs`) | the classical watershed P50, **downstream** (`eval_frag.mjs`) | `frag-edge.onnx` (x → p = P(boundary)) |
| `fines` | MLP 4→16→1, softplus (k > 0) | PSD-shape features → the multiplicative P50 correction toward truth | the raw recovered P50 | `fines.onnx` (x → k) |

`gen_train.mjs` runs the SAME TS engine the browser runs, so the models train on exactly the textures + seams the App
shows. The frag-edge CNN's **boundary-F1** is held-out; its real value is the **downstream** effect on the recovered
P50, measured honestly in the engine's own language (`eval_frag.mjs` runs the trained `.onnx` via onnxruntime-web in
Node, re-delineating each held-out scene classical-vs-CNN).

## How the CNN actually helps (`frontend/src/lib/ort.ts :: cnnForeground`)

A boundary-eroding foreground only makes the over-segmentation worse (it shrinks fragments → P50 too small). So the CNN
is used the other way: **close** the classical foreground (fill intra-fragment dark grain → fewer false splits) and then
**re-cut only the seams the CNN is confident about** (P > 0.7 → no false merges). Net: less over-segmentation without
merging touching fragments. The `morphClose` + the confident-seam cut are tuned on the held-out eval (close radius 3).

## Inference (`frontend/src/lib/ort.ts`, onnxruntime-web)

WASM execution provider, single-threaded (GitHub Pages has no COOP/COEP for threads); the npm package and the CDN
`wasmPaths` are pinned to the same version (1.27). The loader is **graceful** — if `frag-edge.onnx` is absent (not yet
trained) it resolves to `null` and the App falls back to the classical watershed + shows the honest "pending training"
state. Runs are **serialised per session** (an ort-web session is not re-entrant; the App re-runs inference on every
control change).

## Honesty

Held-out numbers (see [model evaluation](../architecture/06_model-evaluation.md)): frag-edge CNN **P50 error 23.8% vs
the classical 27.2%** (boundary-F1 0.997); fines regressor **P50 error 0.040 vs the raw 0.284**. Reported whichever way
they land; no metric is computed on training data; the generator ground truth is the authority.
