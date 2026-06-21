"""fqlab — FragmentIQ's offline+light engine (ADR-0057). Muckpile fragmentation: instance segmentation of rock
fragments → a particle-size distribution + a Rosin–Rammler fit. The CV core (the synthetic muckpile generator + the
watershed delineation + the PSD fit) is the TypeScript engine in frontend/src/frag/ (it runs in the browser AND in the
offline Node bake — no Python re-port); this package is the two data contracts, the staged pipeline, the lane gate, the
manifest/trace, and the cases-by-category registry. The default pipeline is numpy-light (it reshapes the committed
case-results.json into replay traces); `--retrain` regenerates the learned models (torch -> ONNX) — see fqlab/science/.
"""

__version__ = "0.06.000"  # display X.XX.XXX; PEP 440 form in pyproject.toml (0.6.0)
