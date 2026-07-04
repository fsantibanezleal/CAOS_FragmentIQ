// The Rosin–Rammler particle-size model, the standard fragmentation distribution. Sampling (inverse CDF), the
// cumulative passing curve from a set of fragment sizes, the percentile sizes, and a least-squares fit.
//
//   P(x) = 1 − exp(−(x/xc)^n)      xc = characteristic size (63.2 % passing), n = uniformity index
//
// (Rosin & Rammler 1933; the basis of Kuz-Ram, Cunningham 1983.)

import { type PSDPoint, type PSDSummary, type RRFit } from './types.ts';

/** Inverse CDF: draw a size from RR(xc, n) given a uniform u ∈ (0,1). */
export function rrSample(u: number, xcMm: number, nIndex: number): number {
  const uu = Math.min(0.999999, Math.max(1e-6, u));
  return xcMm * Math.pow(-Math.log(1 - uu), 1 / nIndex);
}

/** Build the cumulative %-passing curve (by MASS ∝ diameter³, the convention) from fragment sizes (mm). */
export function psdFromSizes(sizesMm: number[], nBins = 40): PSDPoint[] {
  if (sizesMm.length === 0) return [];
  const sorted = [...sizesMm].sort((a, b) => a - b);
  const mass = sorted.map((d) => d ** 3);
  const total = mass.reduce((a, b) => a + b, 0) || 1;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  // log-spaced size axis
  const lo = Math.log(Math.max(1e-6, min * 0.8));
  const hi = Math.log(max * 1.05);
  const pts: PSDPoint[] = [];
  for (let b = 0; b <= nBins; b++) {
    const size = Math.exp(lo + ((hi - lo) * b) / nBins);
    let m = 0;
    for (let i = 0; i < sorted.length; i++) if (sorted[i] <= size) m += mass[i];
    pts.push({ sizeMm: size, passing: m / total });
  }
  return pts;
}

/** The size (mm) at a given passing fraction (linear interp on the curve). */
export function sizeAtPassing(psd: PSDPoint[], frac: number): number {
  if (psd.length === 0) return 0;
  for (let i = 1; i < psd.length; i++) {
    if (psd[i].passing >= frac) {
      const a = psd[i - 1];
      const b = psd[i];
      const t = (frac - a.passing) / Math.max(1e-9, b.passing - a.passing);
      return a.sizeMm + (b.sizeMm - a.sizeMm) * t;
    }
  }
  return psd[psd.length - 1].sizeMm;
}

/** Least-squares fit of RR to a passing curve: ln(−ln(1−P)) = n·ln(x) − n·ln(xc) is linear in ln(x). */
export function fitRR(psd: PSDPoint[]): RRFit {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of psd) {
    if (p.passing > 0.02 && p.passing < 0.98 && p.sizeMm > 0) {
      xs.push(Math.log(p.sizeMm));
      ys.push(Math.log(-Math.log(1 - p.passing)));
    }
  }
  if (xs.length < 2) return { xcMm: 0, nIndex: 0, r2: 0 };
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const slope = sxy / (sxx || 1e-9); // = n (uniformity)
  const intercept = my - slope * mx; // = −n·ln(xc)
  const xc = Math.exp(-intercept / (slope || 1e-9));
  // R²
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yhat = slope * xs[i] + intercept;
    ssRes += (ys[i] - yhat) ** 2;
    ssTot += (ys[i] - my) ** 2;
  }
  return { xcMm: xc, nIndex: slope, r2: ssTot > 0 ? 1 - ssRes / ssTot : 0 };
}

/** Full summary from a list of fragment equivalent diameters (mm). */
export function summarise(sizesMm: number[]): PSDSummary {
  const psd = psdFromSizes(sizesMm);
  return {
    psd,
    rr: fitRR(psd),
    p10: sizeAtPassing(psd, 0.1),
    p50: sizeAtPassing(psd, 0.5),
    p80: sizeAtPassing(psd, 0.8),
    topSize: sizesMm.length ? Math.max(...sizesMm) : 0,
    nFragments: sizesMm.length,
  };
}
