# Changelog

All notable changes to FragmentIQ. Format: `X.XX.XXX` (display), see `fqlab.__version__`. Keep `0.x` while on
mock/synthetic data. Tag every release.

## [0.09.001] · 2026-08-01

### Fixed - the image canvas ran past the shell, and the docs routes clipped

The App route drew its canvas 929px tall (y 224-1153) inside a 900px shell, 253px past the bottom, with no
ancestor able to scroll. The floor sizes `.page-body.pf-layout`, but every descendant between it and the
canvas grew to CONTENT, so the constraint never reached the thing that needed it. The height chain is
propagated now and the canvas contain-fits.

Prose routes get their own scroll (floor v2).

Note for the next application of the floor: this repo renders `page-body pf-layout`, NOT an `fq-` prefix, so
the applier must be given `pf` or it emits a selector matching nothing and silently changes nothing. Same
trap as CoreLog. The applier should read the class from the source rather than trust its argument.

Tab grouping and the ADR-0070 focus view are still outstanding for this product.

## [0.09.000] · 2026-07-30

### Fixed
- **Version coherence.** Every version source in this repo now declares the same number. They had drifted
  apart (0.08.001), which `conventions/versioning.md` forbids: `VERSION`, the manifests, the CHANGELOG and the
  git tag are required to move together on every release.
- A line-wide sweep on 2026-07-30 found 79 tags across 9 CAOS repos pointing at commits declaring a
  different version, plus 13 repos whose working tree was internally incoherent. The cause is one habit: a
  release gets merged, tagged and deployed while the version files stay where they were. The cost is not
  cosmetic, since a product footer reads its version from a manifest, so a deployed app reported a version
  older than the release it was running.
- This is a MINOR bump rather than a patch: it puts the whole repo onto one clean number regardless of
  development stage, so the numbering is in order from here rather than carrying the drift forward.
- Historical tags are left untouched. A published tag is the accurate record of a release that happened, so
  drift is fixed by moving the files forward, never by rewriting or deleting a tag.
- Guarded going forward by `tools/version-audit/check_version_coherence.py` in CAOS_MANAGE.

## [0.08.001], 2026-07-11

### Fixed
- Reference integrity (ADR-0017 §4): the 5 link-less citations now carry a link or an explicit marker.
  Maerz et al. 1996 -> doi 10.1201/9780203747919-15; Kirillov et al. 2023 (Segment Anything) -> arXiv url;
  Rosin & Rammler 1933 -> CiNii record. Cunningham 1983 (conference proceedings) and Serra 1982 (book) are
  genuinely pre-DOI with no open landing page and are now explicitly marked as such (never a fabricated link).

### Added
- Per-panel error boundary (viz/PanelBoundary.tsx, mirroring RotorVitals) so a crash in one muckpile view (e.g. a
  real image whose recovered PSD is empty) cannot blank the App.

## [0.08.000], 2026-07-07

### Added, the Faena Synthetic|Real source selector + a real post-blast photo lane
- First-level `Synthetic | Real sample` source selector at the top of the App sidebar (RotorVitals pattern).
  Real mode swaps the case list for a real-datum picker, disables the simulation knobs (scale slider), keeps
  the delineation-method toggle, and shows a persistent source badge (`Synthetic (generator truth)` vs
  `Real photo, RELATIVE (no sieve truth)`).
- Real lane ships 5 curated real post-blast rock photos (Yaghoobi 2018, Mendeley Data doi:10.17632/z78ghz96bn.1,
  CC BY 4.0, Gole-Gohar iron ore mine) under `data/derived/real/` with a `real-cases.json` contract
  `{image, scale{scale_known:false}, attribution, label:"RELATIVE"}`. A thin `realScene` adapter decodes the
  photo on a canvas and feeds the EXISTING pipeline unchanged.
- HARD honesty: no open dataset pairs a muckpile photo with a sieve-measured PSD, so the real lane reports
  RELATIVE agreement (delineation vs a delineation-free granulometry on the same photo), never accuracy. The red
  scale ball diameter is undocumented, so scale is unset and sizes are in pixels. In-panel CC BY attribution.

### Added, grew the method ladder with genuine CV methods (no padding)
- Otsu 1979 adaptive thresholding (real-photo foreground), red scale-ball colour segmentation, connected-components
  labeling (an under-segmenting contrast to watershed), and morphological granulometry (opening-by-size pattern
  spectrum, Matheron/Serra, a delineation-free PSD). Deep-segmentation SOTA (U-Net, SAM; Zhao et al. 2024) cited
  as an offline reference in Benchmark/Methodology.

### Changed / Removed, de-padded the App (removed the 4 forbidden meta-tabs)
- Deleted the `learned` / `contract` / `byo` / `raw` tabs from the App. `learned` metrics live in Benchmark;
  `contract`/`byo` fold into Implementation; `raw` dropped. The App is now 5 genuine domain views (Muckpile,
  PSD, Histogram, Rosin-Rammler, and the truth-comparison tab, renamed `vs reference` in Real mode).
- Methodology grows to 7 subtabs (Generation, Delineation, Real lane, Granulometry, PSD, Rosin-Rammler, Deep seg).
- Version resynced across all surfaces to 0.08.000 (VERSION, package.json 0.8.0, main.tsx footer, fqlab, pyproject).

## [0.07.001], 2026-07-04

### Changed
- Content standards (ADR-0067): removed every em-dash from tracked content (replaced with commas, or
  "n/a" in table cells). No behaviour change. Added `scripts/check_content_standards.py` + wired it
  into the CI `guards` job so the repo cannot regress on em-dashes or emojis.

## [0.07.000], 2026-07-04

### Fixed, disjoint tune/test seed banks for the recut hyperparameters (#12, deep-review critical)
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

## [0.06.000], 2026-06-21

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

## [0.03.000], 2026-06-21

### Added
- The full FragmentIQ Python core: the two data contracts (ingestion + artifact), the 7 cases-by-category, the
  numpy-light staged pipeline, the two-language bake (Node runs the SAME TS engine), the live/precompute gate.

## [0.01.000], 2026-06-21

### Added
- Initial instantiation from the CAOS product-repo template (ADR-0057): the `fqlab` package, identity (CNAME,
  vite base, titles), the `examplelab → fqlab` rename across imports + `.yml`/`.sh`/`.ps1`, the CV science core
  (`frontend/src/frag/`: muckpile generator + watershed delineation + PSD + Rosin–Rammler).
