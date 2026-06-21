"""CONTRACT 1 (ingestion) tests: good scene descriptors validate; ill-formed ones are rejected with a reason; a
missing scale / coarse resolution is flagged; the committed example passes."""
from pathlib import Path

from fqlab.io.contract import validate_image, validate_records
from fqlab.io.formats import read_csv_rows


def _row(**over):
    base = {"scene_id": "s", "px_width": 560, "px_height": 420, "mm_per_px": 3.5, "scale_known": True,
            "regime": "medium", "lighting": "even"}
    base.update(over)
    return base


def test_good_descriptor_accepted():
    rep = validate_records([_row()])
    assert rep.ok and len(rep.accepted) == 1 and not rep.rejected
    assert rep.accepted[0].regime == "medium"


def test_bad_descriptors_rejected_not_coerced():
    rows = [
        _row(mm_per_px=0),                  # non-positive scale
        _row(mm_per_px=-1),                 # negative
        _row(px_width="lots"),              # non-numeric
        _row(regime="rubble"),              # bad regime
        _row(px_height=10),                 # too small
        {"scene_id": "m", "px_width": 560},  # missing columns
    ]
    rep = validate_records(rows)
    assert len(rep.accepted) == 0 and len(rep.rejected) == len(rows)
    assert all("reason" in r for r in rep.rejected)


def test_missing_scale_and_coarse_flagged():
    rep = validate_records([_row(scale_known=False)])
    assert rep.ok and rep.flagged and "scale" in " ".join(rep.flagged[0]["flags"])
    rep2 = validate_records([_row(mm_per_px=30)])
    assert rep2.ok and rep2.flagged and "coarse" in " ".join(rep2.flagged[0]["flags"])


def test_validate_image_gate():
    good = validate_image({"width": 560, "height": 420, "mm_per_px": 3.5, "scale_known": True})
    assert good.ok
    bad = validate_image({"width": 560, "height": 420, "mm_per_px": 0, "scale_known": True})
    assert not bad.ok and bad.rejected


def test_committed_example_passes_contract():
    csv = Path(__file__).resolve().parents[1] / "data" / "examples" / "scenes.csv"
    rep = validate_records(read_csv_rows(csv))
    assert rep.ok and not rep.rejected, f"scenes.csv should pass Contract 1: {rep.summary()}"
