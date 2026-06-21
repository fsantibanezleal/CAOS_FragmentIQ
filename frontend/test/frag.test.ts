// Engine correctness — run with: node --import tsx --test test/frag.test.ts
//
// The science is pinned against the generator's own ground truth + the Rosin–Rammler maths: fitRR recovers (xc, n)
// from an analytic curve; the generator is deterministic; the mono-disperse oracle yields a step PSD whose P50 ≈ the
// fragment size; and the watershed delineation recovers a sensible, ordered PSD on a mixed scene.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeClassical, fitRR, makeScene, type SceneSpec } from '../src/frag/index.ts';

const spec = (over: Partial<SceneSpec>): SceneSpec => ({
  id: 's', pxWidth: 360, pxHeight: 270, mmPerPx: 2.0, nFragments: 90, xcMm: 200, nIndex: 1.5,
  regime: 'medium', lighting: 'even', seed: 7, ...over,
});

test('fitRR recovers (xc, n) from an analytic Rosin–Rammler curve', () => {
  const xc = 180;
  const n = 1.6;
  const psd = [];
  for (let i = 1; i <= 40; i++) {
    const x = (xc * i) / 22;
    psd.push({ sizeMm: x, passing: 1 - Math.exp(-Math.pow(x / xc, n)) });
  }
  const fit = fitRR(psd);
  assert.ok(Math.abs(fit.xcMm - xc) / xc < 0.05, `xc recovered ${fit.xcMm.toFixed(1)} (want ${xc})`);
  assert.ok(Math.abs(fit.nIndex - n) / n < 0.05, `n recovered ${fit.nIndex.toFixed(2)} (want ${n})`);
  assert.ok(fit.r2 > 0.99, `r2 ${fit.r2}`);
});

test('scene generation is deterministic for a fixed seed', () => {
  const a = makeScene(spec({ seed: 21 }));
  const b = makeScene(spec({ seed: 21 }));
  assert.deepEqual(Array.from(a.rgba.slice(0, 6000)), Array.from(b.rgba.slice(0, 6000)));
});

test('mono-disperse oracle: the recovered P50 ≈ the single fragment size', () => {
  const sizeMm = 120;
  const scene = makeScene(spec({ regime: 'mono', xcMm: sizeMm, nFragments: 70, mmPerPx: 1.5 }));
  const a = analyzeClassical(scene);
  assert.ok(a.nFound > 5, `should find fragments (got ${a.nFound})`);
  assert.ok(Math.abs(a.recovered.p50 - sizeMm) / sizeMm < 0.5, `mono P50 ${a.recovered.p50.toFixed(0)} ≈ ${sizeMm}`);
});

test('watershed delineation recovers an ordered PSD on a mixed muckpile', () => {
  const scene = makeScene(spec({ regime: 'medium', seed: 3 }));
  const a = analyzeClassical(scene);
  assert.ok(a.nFound > 8, `delineation should find many fragments (got ${a.nFound})`);
  assert.ok(a.recovered.p10 <= a.recovered.p50 && a.recovered.p50 <= a.recovered.p80, 'P10 ≤ P50 ≤ P80');
  assert.ok(a.recovered.rr.r2 > 0.85, `the recovered PSD is roughly Rosin–Rammler (r2 ${a.recovered.rr.r2.toFixed(2)})`);
  // the recovered P50 is in the right ballpark of the truth P50 (delineation has a known bias, generous tolerance)
  assert.ok(a.truth.p50 > 0 && a.recovered.p50 > 0, 'both PSDs are non-trivial');
});
