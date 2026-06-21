"""Typed objects passed between pipeline stages — the inter-stage contract. Plain dataclasses (no heavy deps)."""
from __future__ import annotations

from dataclasses import dataclass

SIZE_REGIMES = ("coarse", "medium", "fine", "mono", "known")   # matches frontend src/frag/types.ts
LIGHTINGS = ("even", "shadow")


@dataclass(frozen=True)
class SceneDescriptor:
    """One validated muckpile-image descriptor (CONTRACT 1 output) — the image geometry + the physical scale.

    The per-PIXEL image of a real dropped muckpile photo is validated by the same module (io.contract.validate_image)
    against the image schema in data/README.md. For the synthetic cases the scene is regenerated from this descriptor
    + a seed by the TypeScript engine (frontend/src/frag/).
    """

    scene_id: str
    px_width: int
    px_height: int
    mm_per_px: float
    scale_known: bool          # is the physical scale (mm/px) known? else the PSD is in pixels, not mm
    regime: str = "medium"     # one of SIZE_REGIMES (synthetic cases)
    lighting: str = "even"     # one of LIGHTINGS
    flags: tuple[str, ...] = ()
