// Watershed-class fragment delineation — the WipFrag/Split-style classical method. From a foreground mask (fragment
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

/** Markers = DT local maxima (≥ all 8 neighbours, above a min radius), grouped (CCL) so a flat top is one marker. */
function findMarkers(d: Float32Array, w: number, h: number, minDist: number): Int32Array {
  const seed = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (d[i] < minDist) continue;
      let isMax = true;
      for (let dy = -1; dy <= 1 && isMax; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (d[i + dy * w + dx] > d[i]) { isMax = false; break; }
      }
      if (isMax) seed[i] = 1;
    }
  }
  // CCL the seed mask → one label per marker cluster
  const labels = new Int32Array(w * h).fill(0);
  let next = 1;
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!seed[i] || labels[i]) continue;
    const lab = next++;
    stack.push(i);
    labels[i] = lab;
    while (stack.length) {
      const p = stack.pop()!;
      const px = p % w;
      const py = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const q = ny * w + nx;
        if (seed[q] && !labels[q]) { labels[q] = lab; stack.push(q); }
      }
    }
  }
  return labels;
}

export interface Delineation {
  labels: Int32Array;  // per pixel: fragment label (0 = boundary/background)
  fragments: Fragment[];
  nMarkers: number;
}

/** Marker-controlled watershed by a descending-DT neighbour-voting flood. */
export function delineate(fg: Uint8Array, w: number, h: number, mmPerPx: number, minDist = 3): Delineation {
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
  return delineate(fg, scene.width, scene.height, scene.spec.mmPerPx);
}
