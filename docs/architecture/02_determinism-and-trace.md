# Determinism + the trace

**A run is a pure function of `(params, seed)`.** The TS engine uses a seeded `mulberry32`; the Python side uses
`core/rng.py` — never a global/implicit RNG. Same inputs ⇒ byte-identical artifact (asserted in
`tests/test_pipeline_smoke.py` and proven by re-running `python -m fqlab.pipeline all`). This is what makes the
committed artifact a trustworthy source-of-truth the SPA merely replays (ADR-0052 / ADR-0054).

**The trace** (`core/trace.py`, schema `fragmentiq.trace/v1`) is the compact, decimated replay artifact — not the raw
pixel labels. Per case it carries the scene spec, the ground-truth PSD, the classical recovered PSD + P10/P50/P80, the
Rosin–Rammler fit, the size histogram, and the learned-model metrics (`status: trained | pending-training`). The
recovered/truth passing curves are decimated so the committed JSON stays small. Its shape is mirrored by
`frontend/src/lib/contract.types.ts` (CONTRACT 2) so a drift fails `tsc`. The gate's raw wall-clock is used for the
live/replay decision but **never stored** (it would dirty git on re-run).
