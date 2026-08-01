"""The compact per-case TRACE = the web-replay artifact. Part of CONTRACT 2: its shape is mirrored by
frontend/src/lib/contract.types.ts, so a drift fails the web build. Each trace is built deterministically from the
committed CV outputs (case-results.json, produced by the SAME TS engine the browser runs) + the learned-model metrics
(fq-learned.json, when present). It carries the scene SPEC so the browser can re-delineate LIVE, the ground-truth +
recovered PSD curves, the Rosin–Rammler fit + P10/P50/P80, and the model metrics. It references the shared ONNX."""
from __future__ import annotations

from typing import Any


TRACE_SCHEMA = "fragmentiq.trace/v1"


def _learned_block(learned: dict | None) -> dict:
    if not learned:
        return {"status": "pending-training", "fragEdge": None, "fines": None}
    return {
        "status": "trained",
        "fragEdge": learned.get("fragEdge"),   # {p50_err_cnn, p50_err_classical, boundaryF1, nEval}
        "fines": learned.get("fines"),         # {p50_err_corrected, p50_err_raw, nEval}
    }


def build_trace(case: Any, *, case_result: dict, learned: dict | None) -> dict:
    return {
        "schema": TRACE_SCHEMA,
        "case_id": case.id,
        "name": case.name,
        "category": case.category,
        "real_or_synthetic": case.real_or_synthetic,
        "expected_band": case.expected_band,
        "spec": case_result.get("spec"),                 # {pxWidth, pxHeight, mmPerPx, nFragments, xcMm, nIndex, regime, lighting, seed}
        "truth": case_result.get("truth"),               # {psd, rr, p10, p50, p80, topSize, nFragments}
        "baseline": case_result.get("baseline"),         # the classical (watershed) recovered PSD summary + p50Err
        "size_hist": case_result.get("sizeHist"),        # the recovered size-class histogram (for the bar view)
        "learned": _learned_block(learned),
    }
