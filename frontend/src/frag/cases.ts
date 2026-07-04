// The canonical case set, shared by the offline bake (data-pipeline/fqlab/science/bake_cases.mjs) and the SPA. Cases
// are grouped by CATEGORY (size regime / imaging / oracle control). The App shows ONE selected case; Experiments/
// Benchmark show cross-case summaries. All muckpiles are SYNTHETIC; C-MONO and C-KNOWN are the closed-form ORACLES.

import { type SceneSpec } from './types.ts';

export interface FragCase {
  id: string;
  name: string;
  category: string;
  regime: SceneSpec['regime'];
  lighting: SceneSpec['lighting'];
  nFragments: number;
  xcMm: number;
  nIndex: number;
  mmPerPx: number;
  seed: number;
  expectedBand: string;
  validationAnchor: string;
  realOrSynthetic: string;
}

export const CAT_REGIME = 'size regime (the blast result)';
export const CAT_IMAGING = 'imaging (lighting)';
export const CAT_ORACLE = 'oracle control (closed-form check)';

const W = 560;
const H = 420;
// mm/px is tuned per case so the characteristic fragment is ~24 px radius → ~90 fragments pack the surface (a clean
// PSD). nFragments is a generous upper bound; the non-overlap packing fills the image and drops the rest.

export const CASES: FragCase[] = [
  { id: 'R-COARSE', name: 'Coarse blast (large fragments)', category: CAT_REGIME, regime: 'coarse', lighting: 'even',
    nFragments: 200, xcMm: 320, nIndex: 1.4, mmPerPx: 6.0, seed: 11, realOrSynthetic: 'synthetic',
    expectedBand: 'few large blocks; high P80; the watershed should track the coarse tail',
    validationAnchor: 'recovered P10 ≤ P50 ≤ P80; RR fit r² > 0.85' },
  { id: 'R-MEDIUM', name: 'Medium fragmentation', category: CAT_REGIME, regime: 'medium', lighting: 'even',
    nFragments: 220, xcMm: 180, nIndex: 1.6, mmPerPx: 3.5, seed: 12, realOrSynthetic: 'synthetic',
    expectedBand: 'a balanced PSD; the reference case', validationAnchor: 'recovered P50 within ~half of the truth P50' },
  { id: 'R-FINE', name: 'Fine fragmentation (well-blasted)', category: CAT_REGIME, regime: 'fine', lighting: 'even',
    nFragments: 260, xcMm: 90, nIndex: 1.9, mmPerPx: 1.8, seed: 13, realOrSynthetic: 'synthetic',
    expectedBand: 'many small fragments; the delineation bias bites hardest here (over-segmentation of the few blocks)',
    validationAnchor: 'recovered P10 ≤ P50 ≤ P80; the recovered PSD tracks the truth within the delineation bias' },
  { id: 'I-EVEN', name: 'Even lighting', category: CAT_IMAGING, regime: 'medium', lighting: 'even',
    nFragments: 220, xcMm: 180, nIndex: 1.6, mmPerPx: 3.5, seed: 21, realOrSynthetic: 'synthetic',
    expectedBand: 'flat illumination → the reference delineation', validationAnchor: 'reference accuracy band' },
  { id: 'I-SHADOW', name: 'Raking light / shadows', category: CAT_IMAGING, regime: 'medium', lighting: 'shadow',
    nFragments: 220, xcMm: 180, nIndex: 1.6, mmPerPx: 3.5, seed: 21, realOrSynthetic: 'synthetic',
    expectedBand: 'a shadow gradient shifts the recovered PSD vs even lighting (a robustness difference)',
    validationAnchor: 'the recovered PSD differs from I-EVEN (lighting sensitivity)' },
  { id: 'C-MONO', name: 'Oracle, mono-disperse', category: CAT_ORACLE, regime: 'mono', lighting: 'even',
    nFragments: 200, xcMm: 120, nIndex: 8.0, mmPerPx: 2.4, seed: 31, realOrSynthetic: 'analytic control',
    expectedBand: 'all fragments one size → the PSD is a step; recovered P50 ≈ 120 mm',
    validationAnchor: 'closed-form: |recovered P50 − 120| / 120 < 0.5' },
  { id: 'C-KNOWN', name: 'Oracle, known Rosin–Rammler', category: CAT_ORACLE, regime: 'known', lighting: 'even',
    nFragments: 230, xcMm: 160, nIndex: 1.7, mmPerPx: 3.1, seed: 33, realOrSynthetic: 'analytic control',
    expectedBand: 'a known target RR(xc=160, n=1.7) → the recovered PSD must be ordered + RR-shaped',
    validationAnchor: 'recovered RR fit r² > 0.85; P10 ≤ P50 ≤ P80' },
];

export function caseSpec(c: FragCase): SceneSpec {
  return {
    id: c.id, pxWidth: W, pxHeight: H, mmPerPx: c.mmPerPx, nFragments: c.nFragments,
    xcMm: c.xcMm, nIndex: c.nIndex, regime: c.regime, lighting: c.lighting, seed: c.seed,
  };
}
