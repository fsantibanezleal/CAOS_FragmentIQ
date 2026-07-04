# Model evaluation

FragmentIQ has two kinds of "model": the **deterministic CV pipeline** (the generator + watershed delineation + PSD,
checked against the generator's own ground truth) and **two learned models** (the frag-edge CNN + the fines regressor,
measured against the classical watershed / the raw recovery).

## The pipeline — oracles, not accuracy-on-faith

The generator emits the ground-truth fragments + PSD for free, so the delineation is checked for **correctness**:

- **The MONO oracle (`C-MONO`)** — a mono-disperse muckpile (all fragments one size): the recovered P50 must match the
  known size within a closed-form tolerance (`|recovered P50 − 120| / 120 < 0.5`).
- **The KNOWN-RR oracle (`C-KNOWN`)** — a muckpile drawn from a known Rosin–Rammler(xc=160, n=1.7): the recovered PSD
  must be ordered (P10 ≤ P50 ≤ P80) and RR-shaped (fit r² > 0.85).
- **Size-regime ordering** — coarse > medium > fine recovered P50 (a sanity property of the whole pipeline, checked in
  Benchmark) — and the recovered PSD must track the truth within the realistic delineation bias.

## The learned models — held-out, vs a classical baseline

Both are trained offline (`science/train_frag.py`, torch) and reported next to the baseline they refine. The metrics
live in `data/derived/fq-learned.json` and show in the App's Learned-models tab + Benchmark.

| Model | Task | Baseline | Metric (this build) |
|---|---|---|---|
| `frag-edge` | 16×16 patch → P(boundary); refines the watershed foreground | the classical watershed P50 (downstream) | **23.8% vs 27.2%** (boundary-F1 0.997): the recut thresholds are SELECTED on a disjoint TUNE bank (n=8) and REPORTED on the disjoint TEST bank (n=8), so the test error is clean for them ([issue #12](https://github.com/fsantibanezleal/CAOS_FragmentIQ/issues/12)) |
| `fines` | PSD-shape features → multiplicative P50 correction | the raw recovered P50 | **P50 error 0.040** vs 0.284 (n=17; held-out by seed within the same generator regime grid — interpolation, not transfer) |

**Honesty.** A boundary-eroding foreground made the over-segmentation WORSE — so the CNN instead closes intra-fragment
grain (fewer false splits) and re-cuts only its confident seams (no false merges). Those recut hyperparameters
(foreground threshold, seam probability) are now SELECTED on a disjoint TUNE seed bank (gen_train.mjs writes
`tune-scenes.json`, seeds 401/409; eval_frag.mjs grid-searches over them) and REPORTED on the disjoint TEST bank
(seeds 307/311), so the test error is clean for them (issue #12 fixed). The App's live `cnnForeground` uses the same
selected threshold, so what you see is what was measured. The downstream P50 effect is measured in the engine's own
language (`eval_frag.mjs` runs the trained ONNX via
onnxruntime-web in Node). The fines regressor's win (0.284 → 0.040, n=17) is on a held-out-by-seed split drawn from
the same generator regime grid — an interpolation result that says nothing about transfer beyond that grid or about
real rock. No metric is computed on training data; the generator ground truth is always the authority.
