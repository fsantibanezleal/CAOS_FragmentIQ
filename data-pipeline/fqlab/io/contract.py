"""CONTRACT 1 — ingestion (raw muckpile image → pipeline). The *bring-your-own-muckpile* gate.

Two entry points, one policy:

* ``validate_records`` — validates SCENE-DESCRIPTOR rows (one per muckpile: geometry + scale + regime). This is what
  the pipeline runs over the case set; it proves the gate and carries flags into the manifest.
* ``validate_image`` — validates a real dropped muckpile/conveyor PHOTO's metadata (dimensions + the scale reference).

A record is ACCEPTED iff it passes; ill-formed records are REJECTED with a reason (never silently coerced);
plausible-but-extreme records are FLAGGED (accepted; the flag travels into the manifest). Documented in data/README.md.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from .schema import LIGHTINGS, SIZE_REGIMES, SceneDescriptor

REQUIRED_COLUMNS: tuple[str, ...] = ("scene_id", "px_width", "px_height", "mm_per_px")
PX_RANGE = (64, 8000)
MMPX_RANGE = (0.05, 50.0)          # mm per pixel
MMPX_FLAG_HI = 20.0                # very coarse → the smallest fragments are sub-pixel → FLAG
ASPECT_FLAG = (0.3, 4.0)           # width:height outside this band → FLAG (unusual crop)


@dataclass
class ContractReport:
    accepted: list
    rejected: list[dict[str, Any]]
    flagged: list[dict[str, Any]]

    @property
    def ok(self) -> bool:
        return len(self.accepted) > 0

    def summary(self) -> str:
        return f"{len(self.accepted)} accepted, {len(self.rejected)} rejected, {len(self.flagged)} flagged"


def _truthy(v: Any) -> bool:
    return str(v).strip().lower() in ("1", "true", "yes", "y", "t")


def validate_records(raw_rows: list[dict[str, Any]]) -> ContractReport:
    """Apply CONTRACT 1 to raw scene-descriptor rows (e.g. from a CSV). Pure; deterministic; no I/O."""
    accepted: list[SceneDescriptor] = []
    rejected: list[dict[str, Any]] = []
    flagged: list[dict[str, Any]] = []

    for i, row in enumerate(raw_rows):
        sid = str(row.get("scene_id", f"row{i}"))
        missing = [c for c in REQUIRED_COLUMNS if c not in row or row[c] in (None, "")]
        if missing:
            rejected.append({"row": i, "scene_id": sid, "reason": f"missing/empty columns: {missing}"})
            continue
        try:
            pw = int(float(row["px_width"]))
            ph = int(float(row["px_height"]))
            mmpx = float(row["mm_per_px"])
        except (TypeError, ValueError):
            rejected.append({"row": i, "scene_id": sid, "reason": "non-numeric px_width/px_height/mm_per_px"})
            continue
        regime = str(row.get("regime", "medium"))
        lighting = str(row.get("lighting", "even"))
        scale_known = _truthy(row.get("scale_known", True))

        bad: list[str] = []
        if not (PX_RANGE[0] <= pw <= PX_RANGE[1]):
            bad.append(f"px_width={pw} out of {PX_RANGE}")
        if not (PX_RANGE[0] <= ph <= PX_RANGE[1]):
            bad.append(f"px_height={ph} out of {PX_RANGE}")
        if mmpx <= 0 or not (MMPX_RANGE[0] <= mmpx <= MMPX_RANGE[1]):
            bad.append(f"mm_per_px={mmpx:g} out of {MMPX_RANGE} (must be > 0)")
        if math.isnan(mmpx) or math.isinf(mmpx):
            bad.append("NaN/Inf mm_per_px")
        if regime not in SIZE_REGIMES:
            bad.append(f"regime={regime!r} not in {sorted(SIZE_REGIMES)}")
        if lighting not in LIGHTINGS:
            bad.append(f"lighting={lighting!r} not in {sorted(LIGHTINGS)}")
        if bad:
            rejected.append({"row": i, "scene_id": sid, "reason": "; ".join(bad)})
            continue

        rec_flags: list[str] = []
        if not scale_known:
            rec_flags.append("scale reference missing — the PSD will be in PIXELS, not mm (add a scale bar/object)")
        if mmpx > MMPX_FLAG_HI:
            rec_flags.append(f"coarse scale {mmpx:g} mm/px (> {MMPX_FLAG_HI}) — sub-pixel fines are unrecoverable")
        aspect = pw / ph if ph > 0 else math.inf
        if not (ASPECT_FLAG[0] <= aspect <= ASPECT_FLAG[1]):
            rec_flags.append(f"aspect {aspect:.2f} outside [{ASPECT_FLAG[0]},{ASPECT_FLAG[1]}] — unusual crop")
        if rec_flags:
            flagged.append({"scene_id": sid, "flags": rec_flags})
        accepted.append(SceneDescriptor(scene_id=sid, px_width=pw, px_height=ph, mm_per_px=mmpx,
                                        scale_known=scale_known, regime=regime, lighting=lighting,
                                        flags=tuple(rec_flags)))
    return ContractReport(accepted=accepted, rejected=rejected, flagged=flagged)


def validate_image(meta: dict[str, Any]) -> ContractReport:
    """Apply CONTRACT 1 to a real dropped muckpile PHOTO's metadata: {width, height, mm_per_px, scale_known}."""
    row = {
        "scene_id": str(meta.get("scene_id", "dropped")),
        "px_width": meta.get("width", 0),
        "px_height": meta.get("height", 0),
        "mm_per_px": meta.get("mm_per_px", 1.0),
        "scale_known": meta.get("scale_known", True),
        "regime": meta.get("regime", "medium"),
        "lighting": meta.get("lighting", "even"),
    }
    return validate_records([row])
