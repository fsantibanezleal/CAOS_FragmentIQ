"""LIVE-lane note (dormant). Unlike the SIR template, FragmentIQ's live lane is NOT Pyodide-Python — the CV pipeline
runs in the browser as the TypeScript engine in frontend/src/frag/ (the same code the offline bake runs via tsx), and
the fragment-edge CNN runs via onnxruntime-web. There is therefore no Python live entrypoint; the offline pipeline
below (fqlab.pipeline) only reshapes the committed engine outputs into replay traces."""
from __future__ import annotations

LIVE_LANE = "typescript"  # frontend/src/frag/ + onnxruntime-web — not Pyodide
