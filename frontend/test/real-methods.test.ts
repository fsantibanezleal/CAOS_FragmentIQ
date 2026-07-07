// Correctness of the real-lane CV methods added for the Synthetic|Real source selector: Otsu thresholding,
// the adaptive foreground, connected-components labeling and morphological granulometry. Run with:
//   node --import tsx --test test/real-methods.test.ts

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adaptiveForeground, connectedComponents, granulometry, makeScene, otsuThreshold, redScaleMask,
  type SceneSpec,
} from '../src/frag/index.ts';

const spec = (over: Partial<SceneSpec>): SceneSpec => ({
  id: 's', pxWidth: 560, pxHeight: 420, mmPerPx: 3.2, nFragments: 220, xcMm: 180, nIndex: 1.6,
  regime: 'medium', lighting: 'even', seed: 7, ...over,
});

test('otsuThreshold splits a clean bimodal histogram between the two modes', () => {
  const g = new Float32Array(2000);
  for (let i = 0; i < 1000; i++) g[i] = 40;       // dark mode
  for (let i = 1000; i < 2000; i++) g[i] = 200;   // bright mode
  const t = otsuThreshold(g);
  // foreground is `gray > t`, so the correct split sits at the dark-mode edge (40) up to just below the bright mode
  assert.ok(t >= 40 && t < 200, `threshold ${t} should separate the two modes`);
});

test('adaptiveForeground marks a plausible fraction of a synthetic muckpile as foreground', () => {
  const scene = makeScene(spec({ seed: 3 }));
  const fg = adaptiveForeground(scene);
  let on = 0;
  for (let i = 0; i < fg.length; i++) on += fg[i];
  const frac = on / fg.length;
  assert.ok(frac > 0.2 && frac < 0.95, `foreground fraction ${frac.toFixed(2)} should be a sane middle band`);
});

test('connectedComponents recovers ordered, non-empty fragments on a synthetic scene', () => {
  const scene = makeScene(spec({ seed: 5 }));
  const fg = adaptiveForeground(scene);
  const d = connectedComponents(fg, scene.width, scene.height);
  assert.ok(d.fragments.length > 3, `should find blobs (got ${d.fragments.length})`);
  for (const f of d.fragments) assert.ok(f.equivDiamPx > 0 && f.areaPx >= 6, 'each fragment has a positive size');
});

test('granulometry produces a monotone %-passing curve in [0,1]', () => {
  const scene = makeScene(spec({ seed: 9 }));
  const fg = adaptiveForeground(scene);
  const g = granulometry(fg, scene.width, scene.height, 1, [1, 3, 6, 10, 16]);
  assert.ok(g.psd.length === 5, 'one point per radius');
  let prev = -1;
  for (const p of g.psd) {
    assert.ok(p.passing >= 0 && p.passing <= 1, `passing ${p.passing} in [0,1]`);
    assert.ok(p.passing >= prev - 1e-9, 'passing is non-decreasing with size');
    prev = p.passing;
  }
});

test('redScaleMask flags a synthesised red disk and estimates a positive diameter', () => {
  const w = 60;
  const h = 60;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = 90; rgba[i * 4 + 1] = 90; rgba[i * 4 + 2] = 90; rgba[i * 4 + 3] = 255; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if ((x - 30) ** 2 + (y - 30) ** 2 < 100) { const i = y * w + x; rgba[i * 4] = 230; rgba[i * 4 + 1] = 20; rgba[i * 4 + 2] = 20; }
  }
  const { redPx, ballPx } = redScaleMask(rgba, w, h);
  assert.ok(redPx > 200, `should flag the red disk (got ${redPx} px)`);
  assert.ok(ballPx > 0, 'estimates a positive ball diameter');
});
