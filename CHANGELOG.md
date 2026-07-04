# Changelog

All notable changes to FragmentIQ. Format: `X.XX.XXX` (display) — see `fqlab.__version__`. Keep `0.x` while on
mock/synthetic data. Tag every release.

## [0.07.000] — 2026-07-04

### Fixed — disjoint tune/test seed banks for the recut hyperparameters (#12, deep-review critical)
- The frag-edge recut hyperparameters (foreground threshold, seam probability) used to be tuned on
  the SAME 8 eval scenes the downstream 23.8% was reported on, so that eval was not clean for them.
  gen_train.mjs now writes a THIRD disjoint seed bank (`tune-scenes.json`, seeds 401/409); eval_frag.mjs
  grid-searches the recut over the TUNE bank and REPORTS on the disjoint TEST bank (seeds 307/311).
  Selected: foreground 61 / seam 0.7 on tune → frag-edge CNN 23.8% vs classical 27.2% on TEST (clean).
- The App's live `cnnForeground` default is bumped to the selected threshold (61), so what the App
  shows is what the benchmark measured. fq-learned.json records `nTune`, `nEval` and the `recut`
  block (thresholds, tuneErr, selectedOn). Benchmark/Tool/README/docs render the tune/test protocol
  and state nEval next to every number, with the small-n caveat. +2 guard tests (the three seed
  banks are mutually disjoint; the artifact records the tune-selected recut). 11 tests + build green.

## [0.06.000] — 2026-06-21

### Added
- **The 6-page SPA** on `@fasl-work/caos-app-shell` (App · Introduction · Methodology · Implementation · Experiments ·
  Benchmark). The App re-delineates the muckpile live on every control (case selector, mm/px scale, watershed↔CNN
  toggle): segmentation overlay (SceneView) + the PSD curve (PSDChart, µPlot) + the size histogram + the Rosin–Rammler
  fit + the vs-truth comparison. 5 bilingual doc pages with KaTeX + sourced citations.
- **The two learned models** (torch → ONNX, run live via onnxruntime-web): a **frag-edge** boundary CNN that refines
  the foreground (close grain + re-cut confident seams) and a **fines-bias** regressor. Honest held-out numbers:
  frag-edge **P50 error 23.8% vs the classical 27.2%** (boundary-F1 0.997); fines **0.040 vs 0.284**. The `--retrain`
  heavy lane: `science/{gen_train.mjs, train_frag.py, eval_frag.mjs}` + `requirements-precompute.txt`.
- **The in-app ⓘ Architecture modal** (ADR-0058): 5 themed SVGs (`frontend/public/svg/tech/`) + `architecture.ts`.
- **The docs/ wiki** (ADR-0056): architecture (01–08), frameworks (CV pipeline · viz · torch→ONNX), the 7 cases, guides.
- Root files: README, STRUCTURE, LICENSE, LICENSES, ATTRIBUTION.

### Changed
- The CV science core (`frontend/src/frag/`): the synthetic muckpile generator now emits a per-pixel ground-truth
  `labels` map (supervises the frag-edge CNN); `morphClose` added to the watershed; marker non-maximum suppression +
  non-overlap tiling fixed the original 5× over-segmentation (recovered PSD now tracks truth within a realistic bias).
- onnxruntime-web runs are serialised per session (the session is not re-entrant) so the live CNN toggle is robust to
  rapid control changes.

## [0.03.000] — 2026-06-21

### Added
- The full FragmentIQ Python core: the two data contracts (ingestion + artifact), the 7 cases-by-category, the
  numpy-light staged pipeline, the two-language bake (Node runs the SAME TS engine), the live/precompute gate.

## [0.01.000] — 2026-06-21

### Added
- Initial instantiation from the CAOS product-repo template (ADR-0057): the `fqlab` package, identity (CNAME,
  vite base, titles), the `examplelab → fqlab` rename across imports + `.yml`/`.sh`/`.ps1`, the CV science core
  (`frontend/src/frag/`: muckpile generator + watershed delineation + PSD + Rosin–Rammler).
