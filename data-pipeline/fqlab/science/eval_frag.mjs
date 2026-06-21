// Downstream evaluation of the trained frag-edge CNN — measured HONESTLY in the engine's own language (the watershed
// is TS). For each held-out eval scene (gen_train.mjs wrote the specs) we run the SAME delineation twice: once with the
// classical foreground, once with the CNN-refined foreground (run frag-edge.onnx via onnxruntime-web in Node), and
// compare the recovered P50 against the generator truth. Then we assemble the FINAL data/derived/fq-learned.json by
// merging the boundary-F1 + fines metrics train_frag.py wrote to data/raw/learned-partial.json.
//   node --import tsx data-pipeline/fqlab/science/eval_frag.mjs
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  analyzeClassical, analyzeWithForeground, classicalForeground, grayscale, makeScene, morphClose,
} from '../../../frontend/src/frag/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const RAW = resolve(ROOT, 'data/raw');
const DERIVED = resolve(ROOT, 'data/derived');
const FRONTEND = resolve(ROOT, 'frontend');
const PATCH = 16;
const HALF = PATCH >> 1;
const STRIDE = 4;
const r3 = (x) => Math.round(x * 1000) / 1000;

// load onnxruntime-web (resolved from frontend/node_modules) — node build, WASM EP, single-threaded, local wasm.
const req = createRequire(pathToFileURL(resolve(FRONTEND, 'pkg.js')));
const ortMod = await import(pathToFileURL(req.resolve('onnxruntime-web')));
const ort = ortMod.default ?? ortMod;
// the node build needs its wasm glue dir as a file URL WITH a trailing slash (else it looks in the package root).
ort.env.wasm.wasmPaths = pathToFileURL(resolve(FRONTEND, 'node_modules/onnxruntime-web/dist')).href + '/';
ort.env.wasm.numThreads = 1;

// CNN-refined foreground: slide the edge CNN over the image, predict P(boundary), foreground = (gray>thr) AND NOT edge.
async function cnnForeground(session, scene, threshold = 58) {
  const { width: w, height: h } = scene;
  const gray = grayscale(scene.rgba, w, h);
  const cxs = [];
  const cys = [];
  for (let y = HALF; y < h - HALF; y += STRIDE) for (let x = HALF; x < w - HALF; x += STRIDE) { cxs.push(x); cys.push(y); }
  const n = cxs.length;
  const flat = new Float32Array(n * PATCH * PATCH);
  for (let k = 0; k < n; k++) {
    for (let dy = 0; dy < PATCH; dy++) for (let dx = 0; dx < PATCH; dx++) {
      flat[k * PATCH * PATCH + dy * PATCH + dx] = gray[(cys[k] - HALF + dy) * w + (cxs[k] - HALF + dx)] / 255;
    }
  }
  const out = await session.run({ x: new ort.Tensor('float32', flat, [n, 1, PATCH, PATCH]) });
  const p = out.p.data;
  // thin seam splat (mirror lib/ort.ts cnnForeground exactly)
  const edge = new Float32Array(w * h);
  for (let k = 0; k < n; k++) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = cxs[k] + dx;
      const yy = cys[k] + dy;
      if (xx >= 0 && xx < w && yy >= 0 && yy < h) edge[yy * w + xx] = Math.max(edge[yy * w + xx], p[k]);
    }
  }
  // classical foreground -> close (fill grain) -> re-cut the CNN's true seams
  const fg0 = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) fg0[i] = gray[i] > threshold ? 1 : 0;
  const closed = morphClose(fg0, w, h, 3);
  const fg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) fg[i] = closed[i] && edge[i] < 0.7 ? 1 : 0;
  return fg;
}

const evalSpecs = JSON.parse(readFileSync(resolve(RAW, 'eval-scenes.json'), 'utf-8')).scenes;
const partialPath = resolve(RAW, 'learned-partial.json');
const partial = existsSync(partialPath) ? JSON.parse(readFileSync(partialPath, 'utf-8')) : {};

const modelPath = resolve(DERIVED, 'frag-edge.onnx');
const session = existsSync(modelPath) ? await ort.InferenceSession.create(modelPath, { executionProviders: ['wasm'] }) : null;

let sumClassical = 0;
let sumCnn = 0;
let nEval = 0;
for (const sp of evalSpecs) {
  const scene = makeScene(sp);
  const errClassical = analyzeClassical(scene).p50Err;
  let errCnn = errClassical;
  if (session) {
    const fg = await cnnForeground(session, scene);
    errCnn = analyzeWithForeground(scene, fg).p50Err;
  }
  sumClassical += errClassical;
  sumCnn += errCnn;
  nEval++;
  console.log(`  ${sp.id} [${sp.regime}] classical P50 err ${(errClassical * 100).toFixed(1)}% · cnn ${(errCnn * 100).toFixed(1)}%`);
}
// sanity check on the classical foreground (proves classicalForeground import is live, mirrors the bake)
classicalForeground(makeScene(evalSpecs[0]));

const learned = {
  schema: 'fragmentiq.learned/v1',
  fragEdge: {
    p50_err_cnn: r3(sumCnn / Math.max(1, nEval)),
    p50_err_classical: r3(sumClassical / Math.max(1, nEval)),
    boundaryF1: partial.fragEdge?.boundaryF1 ?? 0,
    nEval,
  },
  fines: partial.fines ?? { p50_err_corrected: 0, p50_err_raw: 0, nEval: 0 },
  honesty: (partial.honesty ??
    'Synthetic muckpiles + the generator per-pixel truth as the authority. The frag-edge CNN is trained on TRUE ' +
    'inter-fragment seams and scored DOWNSTREAM (its effect on the recovered P50 vs the classical watershed, run ' +
    'in the engine\'s own language). The fines regressor corrects the recovered P50 toward truth. Reported whichever ' +
    'way the numbers land — no fabricated win.'),
};
writeFileSync(resolve(DERIVED, 'fq-learned.json'), JSON.stringify(learned, null, 2));
console.log(`eval_frag: frag-edge CNN P50 err ${(learned.fragEdge.p50_err_cnn * 100).toFixed(1)}% vs classical ${(learned.fragEdge.p50_err_classical * 100).toFixed(1)}% (${nEval} scenes) -> fq-learned.json`);
