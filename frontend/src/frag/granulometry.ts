// Morphological granulometry, a DELINEATION-FREE particle-size estimate (Matheron 1975; Serra 1982).
//
// Instead of splitting the pile into fragments and measuring each (watershed / connected components), a
// granulometry probes the binary foreground with morphological openings of increasing structuring-element
// radius r. An opening by radius r removes every structure thinner than ~2r, so the area lost between
// successive radii is the "pattern spectrum": the amount of material at that size. The cumulative area removed
// up to radius r is the fraction of the pile FINER than size 2r, a size distribution obtained WITHOUT any
// per-fragment segmentation. It is weighted by AREA (2-D), not by mass, so it is a different, independent view
// of the size mix, useful as a RELATIVE cross-check against the delineation-based PSD on real photos where no
// sieve ground truth exists.
//
// Dependency-free (no DOM). Square (Chebyshev) structuring element, separable per axis for speed.

import { type PSDPoint } from './types.ts';

function countFg(fg: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < fg.length; i++) if (fg[i]) n++;
  return n;
}

/** One separable morphological pass with a square SE of Chebyshev radius r. dilate=true grows, false erodes. */
function morphPass(src: Uint8Array, w: number, h: number, r: number, dilate: boolean): Uint8Array {
  const hit = dilate ? 1 : 0;
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= w) { if (!dilate) { v = 0; break; } continue; }
        if (src[y * w + xx] === hit) { v = dilate ? 1 : 0; break; }
      }
      tmp[y * w + x] = v;
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) { if (!dilate) { v = 0; break; } continue; }
        if (tmp[yy * w + x] === hit) { v = dilate ? 1 : 0; break; }
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

/** Opened area = erosion by r followed by dilation by r (a morphological opening), pixel count. */
function openedArea(fg: Uint8Array, w: number, h: number, r: number): number {
  if (r <= 0) return countFg(fg);
  return countFg(morphPass(morphPass(fg, w, h, r, false), w, h, r, true));
}

export interface Granulometry {
  /** cumulative %-passing-by-area vs size (mm or px, per mmPerPx). Monotone, in [0,1]. */
  psd: PSDPoint[];
  /** pattern spectrum: area fraction removed in each opening step (density by size). */
  spectrum: Array<{ sizeMm: number; density: number }>;
}

/** Compute a granulometric size distribution from a binary foreground. `radii` is the schedule of SE radii to
 * probe (in px); sizes reported as equivalent diameter 2*r*mmPerPx. Cost ~ sum(radii) * w * h, so keep the
 * schedule short (~10 radii); call it lazily (memoised), never per animation frame. */
export function granulometry(
  fg: Uint8Array, w: number, h: number, mmPerPx = 1,
  radii: number[] = [1, 2, 3, 4, 6, 8, 10, 13, 16, 20],
): Granulometry {
  const total = countFg(fg) || 1;
  const rs = [0, ...radii];
  const areas = rs.map((r) => openedArea(fg, w, h, r));
  const psd: PSDPoint[] = [];
  const spectrum: Array<{ sizeMm: number; density: number }> = [];
  for (let k = 1; k < rs.length; k++) {
    const removedCum = (total - areas[k]) / total; // fraction finer than ~2*r_k
    const removedStep = (areas[k - 1] - areas[k]) / total; // density at this size band
    const sizeMm = 2 * rs[k] * mmPerPx;
    psd.push({ sizeMm, passing: Math.max(0, Math.min(1, removedCum)) });
    spectrum.push({ sizeMm, density: Math.max(0, removedStep) });
  }
  return { psd, spectrum };
}
