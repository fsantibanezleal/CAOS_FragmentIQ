"""CONTRACT 2 (artifact) tests: a manifest points to a real trace with the recorded byte size, the lane verdict is
consistent with the gate, and the schema is the FragmentIQ one. Uses the committed case-results.json (no torch/node)."""
import json

from fqlab import pipeline


def test_manifest_matches_artifact_and_gate():
    m = pipeline.precompute("R-MEDIUM", seed=7)
    artifact = pipeline.DERIVED / m["artifact"]["path"]
    assert artifact.exists() and artifact.stat().st_size == m["artifact"]["bytes"]
    assert m["schema"].startswith("fragmentiq.manifest/")
    assert m["lane"] == m["gate"]["lane"] == "live", f"expected live, got {m['lane']} ({m['gate']['reasons']})"
    assert m["category"].startswith("size regime")


def test_oracle_case_trace_is_mono():
    m = pipeline.precompute("C-MONO", seed=7)
    trace = json.loads((pipeline.DERIVED / m["artifact"]["path"]).read_text(encoding="utf-8"))
    assert trace["spec"]["regime"] == "mono"
    # the mono-disperse oracle: the recovered P50 is within 50 % of the 120 mm fragment size.
    assert abs(trace["baseline"]["p50"] - 120) / 120 < 0.5
    assert trace["baseline"]["p10"] <= trace["baseline"]["p50"] <= trace["baseline"]["p80"]
