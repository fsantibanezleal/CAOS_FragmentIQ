// FragmentIQ engine, shared types for the muckpile fragmentation pipeline.
//
// A scene is a synthetic muckpile photo: rock fragments (convex polygons) whose sizes follow a known Rosin–Rammler
// distribution, drawn with dark inter-fragment gaps (the boundaries delineation keys on). The generator returns the
// RGBA image AND the ground-truth fragments, so the recovered PSD can be scored against truth.

export type SizeRegime = 'coarse' | 'medium' | 'fine' | 'mono' | 'known';
export type Lighting = 'even' | 'shadow';

export interface SceneSpec {
  id: string;
  pxWidth: number;
  pxHeight: number;
  mmPerPx: number;
  nFragments: number;
  /** target Rosin–Rammler characteristic size (mm) + uniformity index. */
  xcMm: number;
  nIndex: number;
  regime: SizeRegime;
  lighting: Lighting;
  seed: number;
}

export interface Fragment {
  cx: number;
  cy: number;
  /** area in px². */
  areaPx: number;
  /** equivalent circle diameter in px. */
  equivDiamPx: number;
}

export interface Scene {
  spec: SceneSpec;
  width: number;
  height: number;
  /** RGBA row-major, length width*height*4 (alpha 255). */
  rgba: Uint8ClampedArray;
  /** ground-truth fragments. */
  truth: Fragment[];
  /** per-pixel ground-truth fragment id (1-based; 0 = inter-fragment gap/background). The generator KNOWS the
   * truth, so it exposes it, used offline to supervise the frag-edge boundary CNN + to score delineation. */
  labels: Int32Array;
}

/** A cumulative passing point: % (0..1) of mass finer than `sizeMm`. */
export interface PSDPoint {
  sizeMm: number;
  passing: number;
}

/** Rosin–Rammler fit P(x) = 1 − exp(−(x/xc)^n). */
export interface RRFit {
  xcMm: number;
  nIndex: number;
  r2: number;
}

export interface PSDSummary {
  psd: PSDPoint[];
  rr: RRFit;
  /** sizes (mm) at 10/50/80 % passing. */
  p10: number;
  p50: number;
  p80: number;
  topSize: number;
  nFragments: number;
}
