"""Guard for the disjoint tune/test seed banks (#12).

The recut hyperparameters (foreground threshold, seam probability) used to be tuned on the same
eval scenes the downstream number was reported on. The fix: SELECT them on a disjoint TUNE bank and
REPORT on the disjoint TEST bank. This test proves the three seed banks (train / tune / test) are
mutually disjoint and that the metrics artifact records the tune/test protocol.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "data-pipeline" / "fqlab" / "science" / "gen_train.mjs"


def _seed_bank(label: str) -> set[int]:
    """Pull the seed array following a marker comment/loop from gen_train.mjs."""
    src = GEN.read_text(encoding="utf-8")
    # train seeds, test seeds, tune seeds each appear as `for (const seed of [ ... ])`
    banks = re.findall(r"for \(const seed of \[([\d,\s]+)\]\)", src)
    nums = [set(int(x) for x in re.findall(r"\d+", b)) for b in banks]
    return nums


def test_three_seed_banks_are_disjoint():
    banks = _seed_bank("")
    assert len(banks) >= 3, "expected train / test / tune seed banks in gen_train.mjs"
    train, test, tune = banks[0], banks[1], banks[2]
    assert train and test and tune
    assert train.isdisjoint(test), "train and test seeds overlap"
    assert train.isdisjoint(tune), "train and tune seeds overlap"
    assert test.isdisjoint(tune), "test and tune seeds overlap (the leakage this fix removes)"


def test_metrics_record_tune_test_protocol():
    art = ROOT / "data" / "derived" / "fq-learned.json"
    if not art.exists():
        import pytest
        pytest.skip("artifact not baked in this environment")
    fe = json.loads(art.read_text(encoding="utf-8"))["fragEdge"]
    assert fe.get("nTune", 0) >= 4, "the tune bank must be recorded"
    assert fe.get("nEval", 0) >= 4
    recut = fe.get("recut", {})
    assert "disjoint tune" in recut.get("selectedOn", ""), "recut selection must be on the tune bank"
    assert 0 < recut.get("fgThreshold", 0) < 256
    assert 0 < recut.get("seamProb", 0) <= 1
