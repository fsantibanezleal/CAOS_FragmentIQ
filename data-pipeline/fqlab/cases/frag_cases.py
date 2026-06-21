"""FragmentIQ cases spanning CATEGORIES (the muckpile-fragmentation problem-type taxonomy). The App shows ONE selected
case; Experiments/Benchmark show cross-case summaries by category. The cases mirror the SPA's src/frag/cases.ts. All
muckpiles are SYNTHETIC; MONO (mono-disperse) and KNOWN (a known Rosin–Rammler) are the closed-form ORACLE controls."""
from __future__ import annotations

from dataclasses import dataclass

CAT_REGIME = "size regime (the blast result)"
CAT_IMAGING = "imaging (lighting)"
CAT_ORACLE = "oracle control (closed-form check)"


@dataclass(frozen=True)
class Case:
    id: str                       # matches src/frag/cases.ts
    name: str
    category: str
    regime: str
    lighting: str
    n_fragments: int
    xc_mm: float
    n_index: float
    mm_per_px: float
    seed: int
    expected_band: str
    validation_anchor: str
    real_or_synthetic: str = "synthetic"


_W, _H = 560, 420


CASES: list[Case] = [
    Case("R-COARSE", "Coarse blast (large fragments)", CAT_REGIME, "coarse", "even", 200, 320, 1.4, 6.0, 11,
         expected_band="few large blocks; high P80; the watershed should track the coarse tail",
         validation_anchor="recovered P10 ≤ P50 ≤ P80; RR fit r² > 0.85"),
    Case("R-MEDIUM", "Medium fragmentation", CAT_REGIME, "medium", "even", 220, 180, 1.6, 3.5, 12,
         expected_band="a balanced PSD; the reference case", validation_anchor="recovered P50 within ~half of the truth P50"),
    Case("R-FINE", "Fine fragmentation (well-blasted)", CAT_REGIME, "fine", "even", 260, 90, 1.9, 1.8, 13,
         expected_band="many small fragments; the delineation bias bites hardest here (over-segmentation of the few blocks)",
         validation_anchor="recovered P10 ≤ P50 ≤ P80; the recovered PSD tracks the truth within the delineation bias"),
    Case("I-EVEN", "Even lighting", CAT_IMAGING, "medium", "even", 220, 180, 1.6, 3.5, 21,
         expected_band="flat illumination → the reference delineation", validation_anchor="reference accuracy band"),
    Case("I-SHADOW", "Raking light / shadows", CAT_IMAGING, "medium", "shadow", 220, 180, 1.6, 3.5, 21,
         expected_band="a shadow gradient shifts the recovered PSD vs even lighting (a robustness difference)",
         validation_anchor="the recovered PSD differs from I-EVEN (lighting sensitivity)"),
    Case("C-MONO", "Oracle — mono-disperse", CAT_ORACLE, "mono", "even", 200, 120, 8.0, 2.4, 31,
         expected_band="all fragments one size → the PSD is a step; recovered P50 ≈ 120 mm",
         validation_anchor="closed-form: |recovered P50 − 120| / 120 < 0.5", real_or_synthetic="analytic control"),
    Case("C-KNOWN", "Oracle — known Rosin–Rammler", CAT_ORACLE, "known", "even", 230, 160, 1.7, 3.1, 33,
         expected_band="a known target RR(xc=160, n=1.7) → the recovered PSD must be ordered + RR-shaped",
         validation_anchor="recovered RR fit r² > 0.85; P10 ≤ P50 ≤ P80", real_or_synthetic="analytic control"),
]


def descriptor_row(c: Case) -> dict:
    """The CONTRACT-1 scene-descriptor row for a case (used by the pipeline's contract check)."""
    return {
        "scene_id": c.id, "px_width": _W, "px_height": _H, "mm_per_px": c.mm_per_px,
        "scale_known": True, "regime": c.regime, "lighting": c.lighting,
    }
