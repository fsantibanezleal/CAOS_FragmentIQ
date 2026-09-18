// Decompose the size shortfall of the classical pipeline into the part present before delineation and the part the
// delineation adds, with the same engine the App and the bake run (frontend/src/frag). Writes decomposition.json
// next to this script.
//
//   node manuscripts/fragmentation/data/decompose.mjs            (Node >= 23.6; older Node: node --import tsx ...)
//
// Three size distributions per scene, all reduced to P50/P80 by the same mass-weighted passing curve (summarise):
//   nominal   : the generator's sampled diameter 2r, the ground truth every reported error is measured against
//   labels    : the equivalent-circle diameter of each fragment's visible pixels in the ground-truth label map, i.e. a
//               perfect delineation of what the image shows (fragments are irregular polygons whose vertices lie at
//               0.78 to 1.12 of the nominal radius, and neighbours overlap part of each fragment)
//   classical : the threshold + marker-controlled watershed pipeline (reproduces case-results.json)
// Scenes: the seven cases, and the eight held-out test muckpiles on which the CNN-refined foreground is scored
// (data-pipeline/pipeline/science/gen_train.mjs: four regimes x seeds 307 and 311, even lighting).
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, caseSpec } from '../../../frontend/src/frag/cases.ts';
import { analyzeClassical, makeScene, summarise } from '../../../frontend/src/frag/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const r1 = (x) => Math.round(x * 10) / 10;
const r5 = (x) => Math.round(x * 1e5) / 1e5;
const eqDiam = (areaPx) => 2 * Math.sqrt(areaPx / Math.PI);

function decompose(spec) {
  const scene = makeScene(spec);
  const mm = scene.spec.mmPerPx;
  const nominal = summarise(scene.truth.map((f) => f.equivDiamPx * mm));
  const counts = new Map();
  for (const l of scene.labels) if (l > 0) counts.set(l, (counts.get(l) ?? 0) + 1);
  const labels = summarise([...counts.values()].map((n) => eqDiam(n) * mm));
  const a = analyzeClassical(scene);
  const out = { id: spec.id, nTrue: scene.truth.length, nFound: a.nFound };
  for (const q of ['p50', 'p80']) {
    out[q] = { nominal: r1(nominal[q]), labels: r1(labels[q]), classical: r1(a.recovered[q]),
      shortfallBeforeDelineation: r5(1 - labels[q] / nominal[q]),
      shortfallAddedByDelineation: r5(1 - a.recovered[q] / labels[q]),
      shortfallTotal: r5(1 - a.recovered[q] / nominal[q]) };
  }
  out.p50ErrLabels = r5(Math.abs(labels.p50 - nominal.p50) / nominal.p50);
  out.p50ErrClassical = r5(a.p50Err);
  return out;
}

const cases = CASES.map((c) => decompose(caseSpec(c)));

// the held-out test bank of eval_frag.mjs, specified exactly as gen_train.mjs writes it
const REGIMES = [
  { regime: 'coarse', xcMm: 320, nIndex: 1.4, mmPerPx: 6.0 },
  { regime: 'medium', xcMm: 180, nIndex: 1.6, mmPerPx: 3.5 },
  { regime: 'fine', xcMm: 90, nIndex: 1.9, mmPerPx: 1.8 },
  { regime: 'known', xcMm: 160, nIndex: 1.7, mmPerPx: 3.1 },
];
const test = [];
let eid = 0;
for (const base of REGIMES) {
  for (const seed of [307, 311]) {
    test.push(decompose({ id: `ev${eid++}`, pxWidth: 560, pxHeight: 420, mmPerPx: base.mmPerPx, nFragments: 240,
      xcMm: base.xcMm, nIndex: base.nIndex, regime: base.regime, lighting: 'even', seed }));
  }
}
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const range = (xs) => [r5(Math.min(...xs)), r5(Math.max(...xs))];
const median = (xs) => { const s = [...xs].sort((x, y) => x - y); const m = s.length >> 1; return r5(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2); };

const summary = {};
for (const q of ['p50', 'p80']) {
  for (const k of ['shortfallBeforeDelineation', 'shortfallAddedByDelineation', 'shortfallTotal']) {
    const xs = cases.map((c) => c[q][k]);
    summary[`${q}.${k}`] = { range: range(xs), median: median(xs) };
  }
}
const result = {
  schema: 'fragmentiq.decomposition/v1',
  cases,
  casesSummary: summary,
  testBank: { scenes: test, meanP50ErrClassical: r5(mean(test.map((t) => t.p50ErrClassical))),
    meanP50ErrLabels: r5(mean(test.map((t) => t.p50ErrLabels))) },
};
writeFileSync(resolve(HERE, 'decomposition.json'), JSON.stringify(result, null, 2) + '\n');
for (const c of cases) {
  console.log(`${c.id.padEnd(9)} P50 ${c.p50.nominal}/${c.p50.labels}/${c.p50.classical} before ${(100 * c.p50.shortfallBeforeDelineation).toFixed(1)}% ` +
    `added ${(100 * c.p50.shortfallAddedByDelineation).toFixed(1)}% | P80 ${c.p80.nominal}/${c.p80.labels}/${c.p80.classical} ` +
    `before ${(100 * c.p80.shortfallBeforeDelineation).toFixed(1)}% added ${(100 * c.p80.shortfallAddedByDelineation).toFixed(1)}%`);
}
console.log(JSON.stringify(summary));
console.log(`test bank (n=${test.length}): mean P50 error classical ${(100 * result.testBank.meanP50ErrClassical).toFixed(1)}%, ` +
  `perfect delineation ${(100 * result.testBank.meanP50ErrLabels).toFixed(1)}%`);
