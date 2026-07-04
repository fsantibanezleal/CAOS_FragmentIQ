# Frameworks

The research-chosen methods + libraries FragmentIQ actually uses (each one is used by the code, not aspirational).

- [01, the CV pipeline](frameworks/01_pipeline.md), the synthetic generator, the watershed delineation, the
  mass-weighted PSD and the Rosin–Rammler fit.
- [02, the visualisation stack](frameworks/02_viz.md), the muckpile canvas + overlay, the µPlot PSD + histogram, and
  the shared `@fasl-work/caos-app-shell` (+ the ⓘ Architecture modal).
- [03, the learned models](frameworks/03_torch-onnx.md), the frag-edge boundary CNN + the fines-bias regressor,
  torch → ONNX → onnxruntime-web.
