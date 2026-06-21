// Generate the learned-model training data by running the SAME TypeScript CV engine the browser runs — so the models
// train on EXACTLY the muckpiles the App shows, and are scored against the SAME classical baseline + the generator
// ground truth. Two datasets, written to data/raw/ (git-ignored, regenerable). Invoked by pipeline.retrain before
// train_frag.py. Run:  node --import tsx data-pipeline/fqlab/science/gen_train.mjs
//
// 1. frag-edge: 16×16 grayscale patches labelled boundary(1)/interior(0) from the TRUTH per-pixel fragment-id map
//    (scene.labels) — the boundary band = a foreground pixel whose neighbourhood spans >1 fragment id. The CNN learns
//    to find the inter-fragment seams from local texture (sharper / gap-completing than the raw threshold).
// 2. fines: per scene, the classical recovered PSD's shape features → the multiplicative P50 correction toward truth.
//
// Plus eval-scenes.json: held-out scene specs (disjoint seeds) for eval_frag.mjs to re-run classical-vs-CNN delineation.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeClassical, grayscale, makeScene } from '../../../frontend/src/frag/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = resolve(HERE, '../../../data/raw');
mkdirSync(RAW, { recursive: true });

const PATCH = 16;
const HALF = PATCH >> 1;
const r3 = (x) => Math.round(x * 1000) / 1000;

// training scene specs — disjoint seeds from the cases (cases use 11..33); a spread of regimes/lighting/scale.
const REGIMES = [
  { regime: 'coarse', xcMm: 320, nIndex: 1.4, mmPerPx: 6.0 },
  { regime: 'medium', xcMm: 180, nIndex: 1.6, mmPerPx: 3.5 },
  { regime: 'fine', xcMm: 90, nIndex: 1.9, mmPerPx: 1.8 },
  { regime: 'known', xcMm: 160, nIndex: 1.7, mmPerPx: 3.1 },
];
const LIGHTS = ['even', 'shadow'];
const W = 560;
const H = 420;

function spec(id, base, light, seed) {
  return { id, pxWidth: W, pxHeight: H, mmPerPx: base.mmPerPx, nFragments: 240,
    xcMm: base.xcMm, nIndex: base.nIndex, regime: base.regime, lighting: light, seed };
}

// truth boundary band: a foreground pixel (label>0) whose 4-neighbourhood spans >1 distinct fragment id.
function boundaryMap(labels, w, h) {
  const bnd = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const l = labels[i];
    if (l <= 0) continue;
    if (labels[i - 1] !== l || labels[i + 1] !== l || labels[i - w] !== l || labels[i + w] !== l) bnd[i] = 1;
  }
  return bnd;
}

function patchAt(gray, w, cx, cy) {
  const out = new Array(PATCH * PATCH);
  for (let dy = 0; dy < PATCH; dy++) for (let dx = 0; dx < PATCH; dx++) {
    out[dy * PATCH + dx] = r3(gray[(cy - HALF + dy) * w + (cx - HALF + dx)] / 255);
  }
  return out;
}

// has a boundary pixel within radius `rad` of (cx,cy)?
function nearBoundary(bnd, w, cx, cy, rad) {
  for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    if (bnd[(cy + dy) * w + (cx + dx)]) return true;
  }
  return false;
}

const X = []; // patch (flat 256)
const Y = []; // boundary label 0/1
const finesX = []; // [p50_mm, p80_over_p50, log_count, fine_fraction]
const finesK = []; // target multiplicative correction truthP50 / rawP50
const evalScenes = [];

let sid = 0;
for (const base of REGIMES) {
  for (const light of LIGHTS) {
    for (const seed of [101, 113, 127, 139, 151, 163, 179]) {
      const sp = spec(`tr${sid++}`, base, light, seed);
      const scene = makeScene(sp);
      const gray = grayscale(scene.rgba, scene.width, scene.height);
      const bnd = boundaryMap(scene.labels, scene.width, scene.height);
      // sample balanced patches: positives near a seam, negatives deep interior (skip the ambiguous mid-band)
      let pos = 0;
      let neg = 0;
      const cap = 240;
      for (let y = HALF; y < H - HALF && (pos < cap || neg < cap); y += 3) {
        for (let x = HALF; x < W - HALF && (pos < cap || neg < cap); x += 3) {
          const i = y * W + x;
          if (scene.labels[i] <= 0) continue; // only foreground (the gaps are trivially removed by the threshold)
          const isB = nearBoundary(bnd, W, x, y, 1);
          const deepInterior = !nearBoundary(bnd, W, x, y, 3);
          if (isB && pos < cap) { X.push(patchAt(gray, W, x, y)); Y.push(1); pos++; }
          else if (deepInterior && neg < cap) { X.push(patchAt(gray, W, x, y)); Y.push(0); neg++; }
        }
      }
      // fines row from the classical recovery
      const a = analyzeClassical(scene);
      const rp = a.recovered;
      const fineFrac = rp.psd.length ? rp.psd.find((p) => p.sizeMm >= rp.p50 * 0.5)?.passing ?? 0 : 0;
      finesX.push([r3(rp.p50), r3(rp.p80 / Math.max(1e-6, rp.p50)), r3(Math.log(Math.max(1, a.nFound))), r3(fineFrac)]);
      finesK.push(r3(a.truth.p50 / Math.max(1e-6, rp.p50)));
    }
  }
}

// held-out eval scenes (disjoint seeds again) for the downstream classical-vs-CNN P50 comparison
let eid = 0;
for (const base of REGIMES) {
  for (const seed of [307, 311]) {
    evalScenes.push(spec(`ev${eid++}`, base, 'even', seed));
  }
}

writeFileSync(resolve(RAW, 'frag-edge-train.json'), JSON.stringify({ x: X, y: Y, patch: PATCH }));
writeFileSync(resolve(RAW, 'fines-train.json'),
  JSON.stringify({ x: finesX, k: finesK, features: ['p50_mm', 'p80_over_p50', 'log_count', 'fine_fraction'] }));
writeFileSync(resolve(RAW, 'eval-scenes.json'), JSON.stringify({ scenes: evalScenes }));
console.log(`gen_train: ${Y.length} edge patches (${Y.filter((v) => v).length} boundary) · ${finesK.length} fines rows · ${evalScenes.length} eval scenes -> ${RAW}`);
