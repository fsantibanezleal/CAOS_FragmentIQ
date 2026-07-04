# FragmentIQ, documentation

The navigable wiki for FragmentIQ: muckpile **fragmentation PSD** from a drill-&-blast image (watershed delineation →
particle-size distribution → Rosin–Rammler fit + P10/P50/P80), with the whole CV pipeline running live in the browser.
Instantiated on the CAOS product-repo archetype (ADR-0057).

- **[Architecture](architecture.md)**, the archetype, the lanes, the gate, the two data contracts, determinism,
  deploy.
- **[Frameworks](frameworks.md)**, the CV pipeline (generator + watershed + PSD), the viz stack, the learned models
  (torch → ONNX).
- **[Cases](cases.md)**, the 7 cases by category + their validation anchors.
- **[Guides](guides.md)**, run the precompute/retrain lane, bring your own muckpile.

## One-paragraph orientation

The CV engine is the **TypeScript code** in [`frontend/src/frag/`](../frontend/src/frag/): a seeded synthetic muckpile
generator (rock fragments sized by Rosin–Rammler on dark inter-fragment gaps, with the per-pixel ground-truth), a
distance-transform + marker-NMS **watershed** delineation, the mass-weighted **PSD**, and the **Rosin–Rammler** fit. It
runs *live in the browser* (the App re-delineates as you change the case / mm-px scale / classifier) **and** in the
offline Node bake (no Python re-port). The Python package [`fqlab`](../data-pipeline/fqlab/) is the two data contracts +
the staged pipeline + the lane gate; its default lane is numpy-light (it reshapes the committed bake into replay
traces), and a `--retrain` lane re-bakes the cases and trains the **frag-edge CNN** + the **fines-bias regressor**
(torch → ONNX). `frag-edge.onnx` runs live via onnxruntime-web; `fines.onnx` is trained + evaluated offline only , 
its numbers ship in the baked `fq-learned.json` (it is not loaded in the browser).
