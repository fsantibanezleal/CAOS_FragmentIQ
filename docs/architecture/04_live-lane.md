# The live lane (TypeScript)

Unlike the SIR template (whose live lane is Pyodide-Python), FragmentIQ's live lane is **TypeScript** — the CV engine in
[`frontend/src/frag/`](../../frontend/src/frag/). The same modules run in the browser and in the offline Node bake (via
`tsx`), so there is exactly **one** implementation of the CV science — no Python re-port, no drift.

## The modules

| Module | Role |
|---|---|
| `rng.ts` | seeded mulberry32 (deterministic muckpiles) |
| `rosinrammler.ts` | RR inverse-CDF sampling, the mass %-passing curve, percentile sizes, the least-squares RR fit, `summarise` |
| `scene.ts` | the synthetic muckpile generator (fragments sized by RR, non-overlap tiling, dark gaps, shading) + the RGBA image + ground-truth fragments + the per-pixel `labels` map |
| `watershed.ts` | grayscale, classical foreground, `morphClose`, distance transform, marker-NMS, the descending-DT flood (`delineate`) |
| `analyze.ts` | delineate (classical or CNN foreground) → recovered PSD vs the truth PSD + the headline P50 error |
| `cases.ts` | the 7 canonical cases (shared by the App and the bake) |

The frag-edge CNN runs via **onnxruntime-web** (`frontend/src/lib/ort.ts`) — WASM EP, single-threaded (GitHub Pages has
no COOP/COEP for threads); the npm package and the CDN wasmPaths are pinned to the same version (1.27). `cnnForeground`
slides the edge CNN over the image in ONE batched `run()` call, then closes the classical foreground and re-cuts the
CNN's confident seams (see [the learned models](../frameworks/03_torch-onnx.md)). Runs are serialised per session (the
session is not re-entrant). If the model is absent (not yet trained) the loader resolves to `null` and the App falls
back to the classical watershed.

## Live re-delineate in the App

The App holds `(case, mmPerPxScale, classifier)` in state. On every change it re-generates the muckpile from the spec
and re-delineates it (the classical watershed synchronously, or the CNN-refined foreground via a batched ONNX call),
driving the segmentation overlay, the PSD curve, the size histogram, the Rosin–Rammler fit and the vs-truth comparison.
This is the "interactive value-readout viz that reacts to the controls" — a live delineation, not a replay.
