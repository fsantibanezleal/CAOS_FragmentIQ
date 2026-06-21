"""Pipeline smoke + determinism: a case regenerates deterministically (same seed -> identical trace), run_all writes
the flat index covering every category."""
import json

from fqlab import pipeline, registry


def test_case_deterministic_same_seed():
    a = pipeline.precompute("R-FINE", seed=7)
    b = pipeline.precompute("R-FINE", seed=7)
    assert a["artifact"]["bytes"] == b["artifact"]["bytes"]
    trace = json.loads((pipeline.DERIVED / a["artifact"]["path"]).read_text(encoding="utf-8"))
    assert trace["category"].startswith("size regime")
    assert len(trace["baseline"]["psd"]) >= 5   # the recovered PSD curve is present


def test_run_all_writes_index():
    entries = pipeline.run_all(seed=42)
    assert len(entries) == len(registry.list_cases()) == 7
    idx = json.loads((pipeline.MANIFESTS / "index.json").read_text(encoding="utf-8"))
    assert idx["n_cases"] == len(entries)
    assert idx["schema"].startswith("fragmentiq.index/")
    cats = {e["category"] for e in idx["cases"]}
    assert cats == set(registry.list_categories())
