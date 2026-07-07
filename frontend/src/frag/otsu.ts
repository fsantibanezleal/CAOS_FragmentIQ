// Adaptive foreground + scale-object detection for REAL post-blast photos.
//
// The synthetic generator draws fragments on a FIXED dark background, so the classical foreground can use a
// fixed grey threshold. A real muckpile photo has arbitrary illumination, so its foreground threshold must be
// chosen from the image itself, done here with Otsu's method (Otsu 1979), the standard between-class-variance
// maximiser. A red scale ball (a known non-rock marker placed in the field for scale) is detected by colour
// and EXCLUDED from the foreground so it is not counted as a rock fragment; because its physical diameter is
// undocumented in the source dataset it only yields a pixel-size readout, never a mm calibration.
//
// Dependency-free (no DOM) so it runs both in the browser and in a Node bake, like the rest of frag/.

import { grayscale, morphClose } from './watershed.ts';
import { type Scene } from './types.ts';

/** Otsu 1979 global threshold: the grey level that maximises between-class variance of the 256-bin histogram. */
export function otsuThreshold(gray: Float32Array): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[Math.max(0, Math.min(255, gray[i] | 0))]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = -1;
  let thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = t; }
  }
  return thr;
}

export interface ScaleMask {
  /** 1 where a strongly-red scale ball is detected (excluded from the rock foreground). */
  mask: Uint8Array;
  /** estimated ball diameter in px (assuming two balls of equal size); 0 if none found. Informational only. */
  ballPx: number;
  /** total red pixels found. */
  redPx: number;
}

/** Colour-segment the red scale ball(s): a genuinely-red, non-grey blob. Used to exclude the marker from the
 * rock foreground and to read out a pixel scale (never a mm scale, the physical diameter is undocumented). */
export function redScaleMask(rgba: Uint8ClampedArray, w: number, h: number): ScaleMask {
  const mask = new Uint8Array(w * h);
  let redPx = 0;
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    if (r > 135 && g < 100 && b < 100 && r - g > 55 && r - b > 55) { mask[i] = 1; redPx++; }
  }
  const perBallArea = redPx > 0 ? redPx / 2 : 0; // the source photos place two equal balls
  const ballPx = perBallArea > 0 ? Math.round(2 * Math.sqrt(perBallArea / Math.PI)) : 0;
  return { mask, ballPx, redPx };
}

/** Adaptive foreground for a real photo: Otsu threshold (rock faces are brighter than shadowed crevices), then
 * a morphological close to fill grain/shadow speckle inside fragments, then a 1-px erosion to open the thin
 * inter-fragment seams the watershed keys on. The red scale ball is removed via `exclude`. */
export function adaptiveForeground(scene: Scene, exclude?: Uint8Array | null): Uint8Array {
  const { width: w, height: h } = scene;
  const g = grayscale(scene.rgba, w, h);
  const t = otsuThreshold(g);
  const fg0 = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) fg0[i] = g[i] > t && !(exclude && exclude[i]) ? 1 : 0;
  const closed = morphClose(fg0, w, h, 2); // fill intra-fragment grain so it is not seeded as false splits
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      out[i] = closed[i] && (x === 0 || closed[i - 1]) && (x === w - 1 || closed[i + 1]) && (y === 0 || closed[i - w]) && (y === h - 1 || closed[i + w]) ? 1 : 0;
    }
  }
  return out;
}
