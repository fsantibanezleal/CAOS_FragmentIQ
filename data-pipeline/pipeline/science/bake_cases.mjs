// Bake the per-case muckpile delineation through the SAME TypeScript CV engine the browser runs, and write
// data/derived/case-results.json, the committed, deterministic per-case outputs the LIGHT Python pipeline reshapes
// into per-case replay traces + manifests (CONTRACT 2). No Python re-port of the CV engine. The CLASSICAL watershed is
// baked here (it needs no training); the CNN-edge results are added by --retrain once trained. Run after the SPA lives
// under frontend/:  node --import tsx data-pipeline/fqlab/science/bake_cases.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, caseSpec } from '../../../frontend/src/frag/cases.ts';
import { analyzeClassical, makeScene } from '../../../frontend/src/frag/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DERIVED = resolve(HERE, '../../../data/derived');
mkdirSync(DERIVED, { recursive: true });

const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

function summary(s) {
  return {
    p10: r1(s.p10), p50: r1(s.p50), p80: r1(s.p80), topSize: r1(s.topSize), nFragments: s.nFragments,
    rr: { xcMm: r1(s.rr.xcMm), nIndex: r3(s.rr.nIndex), r2: r3(s.rr.r2) },
    // decimate the passing curve to ~24 points
    psd: s.psd.filter((_, i) => i % 2 === 0).map((p) => ({ sizeMm: r1(p.sizeMm), passing: r3(p.passing) })),
  };
}

// a log-spaced size-class histogram of the recovered fragments (for the bar view)
function sizeHist(scene, fragments) {
  const sizes = fragments.map((f) => f.equivDiamPx * scene.spec.mmPerPx).filter((d) => d > 0);
  if (!sizes.length) return [];
  const lo = Math.log(Math.min(...sizes));
  const hi = Math.log(Math.max(...sizes) * 1.001);
  const nb = 12;
  const bins = new Array(nb).fill(0);
  for (const d of sizes) bins[Math.min(nb - 1, Math.floor(((Math.log(d) - lo) / (hi - lo)) * nb))]++;
  return bins.map((count, b) => ({ sizeMm: r1(Math.exp(lo + ((hi - lo) * (b + 0.5)) / nb)), count }));
}

const cases = {};
for (const c of CASES) {
  const spec = caseSpec(c);
  const scene = makeScene(spec);
  const a = analyzeClassical(scene);
  cases[c.id] = {
    name: c.name,
    category: c.category,
    regime: c.regime,
    lighting: c.lighting,
    seed: c.seed,
    realOrSynthetic: c.realOrSynthetic,
    expectedBand: c.expectedBand,
    validationAnchor: c.validationAnchor,
    spec: { pxWidth: spec.pxWidth, pxHeight: spec.pxHeight, mmPerPx: spec.mmPerPx, nFragments: spec.nFragments,
      xcMm: spec.xcMm, nIndex: spec.nIndex, regime: spec.regime, lighting: spec.lighting, seed: spec.seed },
    truth: summary(a.truth),
    baseline: { ...summary(a.recovered), p50Err: r3(a.p50Err) },
    sizeHist: sizeHist(scene, a.delin.fragments),
    nFound: a.nFound,
    nTrue: a.nTrue,
  };
}

const out = { schema: 'fragmentiq.case-results/v1', nCases: CASES.length, cases };
writeFileSync(resolve(DERIVED, 'case-results.json'), JSON.stringify(out), 'utf-8');
console.log(`baked ${CASES.length} cases -> ${resolve(DERIVED, 'case-results.json')}`);
