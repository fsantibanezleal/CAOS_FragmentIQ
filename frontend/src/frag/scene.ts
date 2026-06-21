// The synthetic muckpile generator — places rock fragments (rough convex polygons) whose sizes follow a Rosin–Rammler
// distribution, on a dark background so the inter-fragment gaps (the boundaries delineation keys on) are visible. The
// same generator produces the App's scenes, the training data, and the ground-truth fragments. Deterministic by seed.

import { mulberry32 } from './rng.ts';
import { rrSample } from './rosinrammler.ts';
import { type Fragment, type Scene, type SceneSpec } from './types.ts';

type Poly = Array<[number, number]>;

function roughPolygon(cx: number, cy: number, r: number, nv: number, rnd: () => number): Poly {
  const p: Poly = [];
  const phase = rnd() * Math.PI * 2;
  for (let i = 0; i < nv; i++) {
    const ang = phase + (i / nv) * Math.PI * 2;
    const rr = r * (0.78 + rnd() * 0.34);
    p.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
  }
  return p;
}

function polyArea(p: Poly): number {
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]);
  return Math.abs(a) / 2;
}

function fillPoly(rgba: Uint8ClampedArray, w: number, h: number, p: Poly, col: (x: number, y: number) => [number, number, number]): void {
  let ymin = Infinity;
  let ymax = -Infinity;
  for (const [, y] of p) { ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
  ymin = Math.max(0, Math.floor(ymin));
  ymax = Math.min(h - 1, Math.ceil(ymax));
  for (let y = ymin; y <= ymax; y++) {
    const xs: number[] = [];
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i];
      const [xj, yj] = p[j];
      if ((yi <= y && yj > y) || (yj <= y && yi > y)) xs.push(xi + ((y - yi) / (yj - yi)) * (xj - xi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.max(0, Math.ceil(xs[k]));
      const x1 = Math.min(w - 1, Math.floor(xs[k + 1]));
      for (let x = x0; x <= x1; x++) {
        const [r, g, b] = col(x, y);
        const idx = (y * w + x) * 4;
        rgba[idx] = r;
        rgba[idx + 1] = g;
        rgba[idx + 2] = b;
      }
    }
  }
}

function strokePoly(rgba: Uint8ClampedArray, w: number, h: number, p: Poly, dark: number): void {
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    let [x0, y0] = p[j];
    const [x1, y1] = p[i];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (let g = 0; g < 4000; g++) {
      const xi = Math.round(x0);
      const yi = Math.round(y0);
      if (xi >= 0 && xi < w && yi >= 0 && yi < h) {
        const idx = (yi * w + xi) * 4;
        rgba[idx] = dark;
        rgba[idx + 1] = dark;
        rgba[idx + 2] = dark;
      }
      if (Math.abs(x0 - x1) < 0.6 && Math.abs(y0 - y1) < 0.6) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
}

export function makeScene(spec: SceneSpec): Scene {
  const { pxWidth: w, pxHeight: h, mmPerPx, nFragments, xcMm, nIndex, regime, lighting, seed } = spec;
  const rgba = new Uint8ClampedArray(w * h * 4);
  // dark background = the inter-fragment shadow gaps
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = 28; rgba[i * 4 + 1] = 29; rgba[i * 4 + 2] = 32; rgba[i * 4 + 3] = 255; }
  const rnd = mulberry32(seed);

  // sample fragment radii (px), largest first so big blocks anchor + small ones fill
  const radii: number[] = [];
  for (let i = 0; i < nFragments; i++) {
    const sizeMm = regime === 'mono' ? xcMm : rrSample(rnd(), xcMm, nIndex);
    radii.push((sizeMm / mmPerPx) / 2);
  }
  radii.sort((a, b) => b - a);

  const truth: Fragment[] = [];
  const lightK = (x: number) => (lighting === 'shadow' ? 0.6 + 0.55 * (x / w) : 1);
  // tile the muckpile surface: place fragments (largest first) with rejection sampling so they TOUCH but barely
  // overlap (a real muckpile, not a random pile) — so the delineated area tracks the true fragment size.
  const px: number[] = [];
  const py: number[] = [];
  const pr: number[] = [];
  for (const r of radii) {
    if (r < 1.5) continue;
    let cx = 0;
    let cy = 0;
    let bestGap = -Infinity;
    for (let t = 0; t < 36; t++) {
      const tx = r + rnd() * (w - 2 * r);
      const ty = r + rnd() * (h - 2 * r);
      let minGap = Infinity;
      for (let k = 0; k < px.length; k++) {
        const dist = Math.hypot(tx - px[k], ty - py[k]) - (r + pr[k]);
        if (dist < minGap) minGap = dist;
      }
      if (minGap > bestGap) { bestGap = minGap; cx = tx; cy = ty; }
      if (minGap > -0.18 * r) break; // accept once it barely overlaps its neighbours
    }
    if (bestGap < -0.6 * r) continue; // too crowded — drop it (keeps the pile non-overlapping)
    px.push(cx);
    py.push(cy);
    pr.push(r);
    const base = 95 + rnd() * 70; // per-fragment rock grey
    const poly = roughPolygon(cx, cy, r, 8 + (rnd() * 4) | 0, rnd);
    fillPoly(rgba, w, h, poly, (x, y) => {
      // radial shading (lit centre, darker rim) + a little grain + the lighting gradient
      const d = Math.hypot(x - cx, y - cy) / r;
      const shade = base * (1.12 - 0.4 * d) * lightK(x) + (rnd() < 0.5 ? 6 : -6);
      const v = Math.max(0, Math.min(255, shade));
      return [v, v * 0.97, v * 0.92];
    });
    strokePoly(rgba, w, h, poly, 22); // the dark fragment boundary
    truth.push({ cx, cy, areaPx: polyArea(poly), equivDiamPx: 2 * r });
  }
  return { spec, width: w, height: h, rgba, truth };
}
