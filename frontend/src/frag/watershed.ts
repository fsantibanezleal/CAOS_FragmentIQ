// Watershed-class fragment delineation, the WipFrag/Split-style classical method. From a foreground mask (fragment
// interiors = 1, inter-fragment gaps = 0) it computes a distance transform, finds one marker per fragment (the DT
// local maxima), and floods labels downhill in descending-DT order, leaving ridges at fragment boundaries. Each
// labelled region's area → an equivalent diameter → feeds the PSD. The learned model improves the FOREGROUND map fed
// in (commit 4b); the algorithm is the same.

import { type Fragment, type Scene } from './types.ts';

export function grayscale(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  return g;
}

/** Classical foreground: fragments are brighter than the dark gaps; threshold + a 1-px erosion to open thin gaps. */
export function classicalForeground(scene: Scene, threshold = 58): Uint8Array {
  const { width: w, height: h } = scene;
  const g = grayscale(scene.rgba, w, h);
  const fg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) fg[i] = g[i] > threshold ? 1 : 0;
  // erode once (4-neighbour) so touching fragments separate at their dark rim
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      out[i] = fg[i] && (x === 0 || fg[i - 1]) && (x === w - 1 || fg[i + 1]) && (y === 0 || fg[i - w]) && (y === h - 1 || fg[i + w]) ? 1 : 0;
    }
  }
  return out;
}

/** Binary morphological close (dilate then erode) with a square structuring element of Chebyshev radius `r`. Fills
 * small intra-fragment holes (dark grain / shadow speckle that would otherwise seed false watershed splits) WITHOUT
 * bridging the wide inter-fragment gaps. Separable per axis for speed. The frag-edge CNN uses this to reduce the
 * classical over-segmentation while re-cutting the true seams it predicts (see lib/ort.ts cnnForeground). */
export function morphClose(fg: Uint8Array, w: number, h: number, r = 2): Uint8Array {
  const dil = _morph(fg, w, h, r, true);
  return _morph(dil, w, h, r, false);
}

function _morph(src: Uint8Array, w: number, h: number, r: number, dilate: boolean): Uint8Array {
  const hit = dilate ? 1 : 0; // dilate: any neighbour set → set; erode: any neighbour unset → unset
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = dilate ? 0 : 1;
    for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx;
      if (xx < 0 || xx >= w) { if (!dilate) { v = 0; break; } continue; }
      if (src[y * w + xx] === hit) { v = dilate ? 1 : 0; break; }
    }
    tmp[y * w + x] = v;
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = dilate ? 0 : 1;
    for (let dy = -r; dy <= r; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= h) { if (!dilate) { v = 0; break; } continue; }
      if (tmp[yy * w + x] === hit) { v = dilate ? 1 : 0; break; }
    }
    out[y * w + x] = v;
  }
  return out;
}

/** Two-pass chamfer distance transform of a binary foreground (distance to the nearest 0). */
export function distanceTransform(fg: Uint8Array, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h);
  const INF = 1e9;
  for (let i = 0; i < w * h; i++) d[i] = fg[i] ? INF : 0;
  const a = 1;
  const b = Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!fg[i]) continue;
      if (x > 0) d[i] = Math.min(d[i], d[i - 1] + a);
      if (y > 0) d[i] = Math.min(d[i], d[i - w] + a);
      if (x > 0 && y > 0) d[i] = Math.min(d[i], d[i - w - 1] + b);
      if (x < w - 1 && y > 0) d[i] = Math.min(d[i], d[i - w + 1] + b);
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!fg[i]) continue;
      if (x < w - 1) d[i] = Math.min(d[i], d[i + 1] + a);
      if (y < h - 1) d[i] = Math.min(d[i], d[i + w] + a);
      if (x < w - 1 && y < h - 1) d[i] = Math.min(d[i], d[i + w + 1] + b);
      if (x > 0 && y < h - 1) d[i] = Math.min(d[i], d[i + w - 1] + b);
    }
  }
  return d;
}

/** Markers = DT local maxima, then NON-MAXIMUM SUPPRESSION: accept the highest-DT maxima first and suppress any other
 * maximum within ~its DT (the fragment radius), so each fragment gets ONE marker. Without NMS the noisy DT yields many
 * spurious maxima per fragment → severe over-segmentation. Returns a label image (one unique label per accepted marker). */
function findMarkers(d: Float32Array, w: number, h: number, minDist: number): Int32Array {
  // 1) candidate local maxima (3×3)
  const cand: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (d[i] < minDist) continue;
      let isMax = true;
      for (let dy = -1; dy <= 1 && isMax; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (d[i + dy * w + dx] > d[i]) { isMax = false; break; }
      }
      if (isMax) cand.push(i);
    }
  }
  // 2) NMS: sort by DT desc, greedily accept if no accepted marker is within ~0.85·DT of this candidate
  cand.sort((a, b) => d[b] - d[a]);
  const labels = new Int32Array(w * h).fill(0);
  const accX: number[] = [];
  const accY: number[] = [];
  const accR: number[] = [];
  let next = 1;
  for (const i of cand) {
    const px = i % w;
    const py = (i / w) | 0;
    const supR = Math.max(minDist, 0.85 * d[i]); // suppression radius = the marker's distance-to-boundary
    let suppressed = false;
    for (let k = 0; k < accX.length; k++) {
      const r = Math.max(supR, accR[k]);
      if ((px - accX[k]) ** 2 + (py - accY[k]) ** 2 < r * r) { suppressed = true; break; }
    }
    if (suppressed) continue;
    labels[i] = next++;
    accX.push(px);
    accY.push(py);
    accR.push(supR);
  }
  return labels;
}

export interface Delineation {
  labels: Int32Array;  // per pixel: fragment label (0 = boundary/background)
  fragments: Fragment[];
  nMarkers: number;
}

/** Marker-controlled watershed by a descending-DT neighbour-voting flood. */
export function delineate(fg: Uint8Array, w: number, h: number, minDist = 3): Delineation {
  const d = distanceTransform(fg, w, h);
  const labels = findMarkers(d, w, h, minDist);
  const nMarkers = labels.reduce((m, v) => Math.max(m, v), 0);

  // all foreground pixels in descending DT order
  const order: number[] = [];
  for (let i = 0; i < w * h; i++) if (fg[i]) order.push(i);
  order.sort((p, q) => d[q] - d[p]);

  for (const i of order) {
    if (labels[i]) continue;
    const px = i % w;
    const py = (i / w) | 0;
    let lab = 0;
    let conflict = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = px + dx;
      const ny = py + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const nl = labels[ny * w + nx];
      if (nl > 0) {
        if (lab === 0) lab = nl;
        else if (lab !== nl) conflict = true;
      }
    }
    labels[i] = conflict ? -1 : lab; // -1 = ridge/boundary
  }

  // collect regions → fragments
  const area = new Map<number, number>();
  const sx = new Map<number, number>();
  const sy = new Map<number, number>();
  for (let i = 0; i < w * h; i++) {
    const l = labels[i];
    if (l <= 0) continue;
    area.set(l, (area.get(l) ?? 0) + 1);
    sx.set(l, (sx.get(l) ?? 0) + (i % w));
    sy.set(l, (sy.get(l) ?? 0) + ((i / w) | 0));
  }
  const fragments: Fragment[] = [];
  for (const [l, a] of area) {
    if (a < 6) continue; // drop specks
    fragments.push({ cx: sx.get(l)! / a, cy: sy.get(l)! / a, areaPx: a, equivDiamPx: 2 * Math.sqrt(a / Math.PI) });
  }
  return { labels, fragments, nMarkers };
}

/** Convenience: delineate a scene with the classical foreground. */
export function delineateClassical(scene: Scene): Delineation {
  const fg = classicalForeground(scene);
  return delineate(fg, scene.width, scene.height);
}
