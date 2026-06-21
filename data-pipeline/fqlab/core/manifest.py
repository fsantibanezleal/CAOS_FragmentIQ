"""CONTRACT 2 — artifact (pipeline -> web). The manifest is the authoritative, versioned record of a baked case: its
category, seed, engine+version, the shared learned-model ONNX, the compact per-case trace pointer + byte size, the
lane/gate verdict, the CONTRACT-1 flags, and the case metrics. The web loads ONLY manifests + traces + the shared
artifacts; frontend/src/lib/contract.types.ts mirrors this schema so a drift fails the build. The committed
case-results.json (baked by the SAME TS engine the browser runs) IS the real output of the offline lane; the learned
edge CNN is honest — measured against the classical-edge watershed, never a fabricated win."""
from __future__ import annotations

from typing import Any

from .. import __version__
from .trace import TRACE_SCHEMA

MANIFEST_SCHEMA = "fragmentiq.manifest/v2"
INDEX_SCHEMA = "fragmentiq.index/v1"

ENGINE_NOTE = ("procedural synthetic muckpile generator (rock fragments sized by Rosin–Rammler) + watershed-class "
               "delineation (foreground threshold → distance transform → DT-maxima markers → descending-DT flood) + a "
               "Rosin–Rammler PSD fit. The same TS engine runs live in the browser and in the offline bake. The "
               "fragment-edge CNN (torch->ONNX) runs live via onnxruntime-web; a classical-gradient edge is the baseline.")
HONESTY = ("The muckpile images are SYNTHETIC (procedural fragments), stated openly; MONO/KNOWN are closed-form "
           "controls. Image-based delineation is BIASED (here the watershed over-segments large blocks, biasing the "
           "recovered PSD finer than truth) — a real, measured effect; the learned models reduce — not eliminate — it, "
           "measured against the classical-edge watershed and the generator's true PSD. No fabricated win.")


def shared_artifacts() -> dict:
    return {
        "models": [
            {"id": "frag-edge", "file": "frag-edge.onnx", "opset": 17, "kind": "fragment-boundary CNN"},
            {"id": "fines", "file": "fines.onnx", "opset": 17, "kind": "fines-bias correction regressor"},
        ],
        "learned_metrics": "fq-learned.json",
        "case_results": "case-results.json",
    }


def build_case_manifest(*, case: Any, seed: int, artifact_rel: str, trace_bytes: int,
                        gate: dict, flags: list[dict], metrics: dict) -> dict:
    return {
        "schema": MANIFEST_SCHEMA,
        "case_id": case.id,
        "name": case.name,
        "category": case.category,
        "real_or_synthetic": case.real_or_synthetic,
        "expected_band": case.expected_band,
        "validation_anchor": case.validation_anchor,
        "engine": {"package": "fqlab", "version": __version__, "model": ENGINE_NOTE},
        "seed": seed,
        "shared": shared_artifacts(),
        "artifact": {"path": artifact_rel, "format": "json", "trace_schema": TRACE_SCHEMA, "bytes": trace_bytes},
        "lane": gate["lane"],
        "gate": gate,
        "flags": flags,
        "metrics": metrics,
        "honesty": HONESTY,
    }


def build_index(entries: list[dict]) -> dict:
    return {
        "schema": INDEX_SCHEMA,
        "engine_version": __version__,
        "n_cases": len(entries),
        "cases": sorted(entries, key=lambda e: e["case_id"]),
    }
