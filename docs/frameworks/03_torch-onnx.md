# Framework — the learned models (torch → ONNX → onnxruntime-web)

Two honest learned models, trained offline. **frag-edge runs live** (onnxruntime-web); the **fines regressor is
evaluated offline only** — its numbers ship in the baked `fq-learned.json` and it is not loaded in the browser. The
generator ground truth is always the authority; the frag-edge CNN competes with the **classical watershed**, and the
fines regressor applies a scalar correction to the recovered P50 toward truth.

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
merging touching fragments. The `morphClose` + the confident-seam cut were tuned on the SAME eval scenes the
downstream numbers are reported on (close radius 3) — see the re-evaluation caveat under Honesty below.

## Inference (`frontend/src/lib/ort.ts`, onnxruntime-web)

WASM execution provider, single-threaded (GitHub Pages has no COOP/COEP for threads); the npm package and the CDN
`wasmPaths` are pinned to the same version (1.27). The loader is **graceful** — if `frag-edge.onnx` is absent (e.g. a
fresh clone before the artifacts are copied) it resolves to `null` and the App falls back to the classical watershed
and says so. Runs are **serialised per session** (an ort-web session is not re-entrant; the App re-runs inference on
every control change).

## Honesty

The frag-edge downstream numbers are **under re-evaluation**
([issue #12](https://github.com/fsantibanezleal/CAOS_FragmentIQ/issues/12)): the recut thresholds were tuned on the
same n=8 eval scenes the result was reported on, so the previously quoted 23.8% vs 27.2% (boundary-F1 0.997) is not a
clean held-out result. Fines regressor: **P50 error 0.040 vs the raw 0.284** (n=17; held-out by seed within the same
generator regime grid — interpolation, not transfer). See [model evaluation](../architecture/06_model-evaluation.md).
Reported whichever way they land; no metric is computed on training data; the generator ground truth is the authority.
