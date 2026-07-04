// Live in-browser inference of the fragment-edge CNN (onnxruntime-web), used to produce a sharper FOREGROUND map for
// the watershed (cnnForeground below). GRACEFUL: if frag-edge.onnx is absent (e.g. a fresh clone before the artifacts
// are copied) the loader resolves to null and the App falls back to the classical delineation and says so. Note:
// only frag-edge.onnx is loaded here — fines.onnx is evaluated offline (its numbers ship in fq-learned.json).
// WASM EP, single-threaded; the npm package + CDN wasmPaths are pinned to 1.27.
import * as ort from 'onnxruntime-web';
import { grayscale, morphClose, type Scene } from '../frag/index.ts';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';
ort.env.wasm.numThreads = 1;

const PATCH = 16;
const base = () => import.meta.env.BASE_URL || '/';
const sessions: Record<string, Promise<ort.InferenceSession | null>> = {};

function get(file: string): Promise<ort.InferenceSession | null> {
  return (sessions[file] ??= (async () => {
    try {
      const head = await fetch(`${base()}${file}`, { method: 'HEAD' });
      if (!head.ok) return null;
      return await ort.InferenceSession.create(`${base()}${file}`, { executionProviders: ['wasm'] });
    } catch {
      return null;
    }
  })());
}

// An onnxruntime-web session is NOT re-entrant: a second session.run() while one is in flight throws
// "Session already started". The App re-runs inference on every control change (and React StrictMode double-mounts
// the effect in dev), so serialise all runs per session through a promise chain.
const runChain: Record<string, Promise<unknown>> = {};
async function runSerial(
  file: string, session: ort.InferenceSession, feeds: Record<string, ort.Tensor>,
): Promise<ort.InferenceSession.OnnxValueMapType> {
  const prev = runChain[file] ?? Promise.resolve();
  let release!: () => void;
  const mine = new Promise<void>((r) => { release = r; });
  runChain[file] = mine;
  try {
    await prev.catch(() => {});
    return await session.run(feeds);
  } finally {
    release();
  }
}

export const cnnAvailable = async () => (await get('frag-edge.onnx')) != null;

/**
 * Build a CNN-refined foreground for the watershed. The classical over-segmentation comes from dark intra-fragment
 * grain seeding false splits; subtracting predicted boundaries only erodes fragments and makes it worse. So instead:
 * (1) close the classical foreground to fill that grain (fewer false splits → larger, truer fragments), then
 * (2) re-cut ONLY the TRUE inter-fragment seams the CNN predicts (high P(boundary)), so touching fragments are not
 * merged. Net: less over-segmentation without false merges. Returns null if the model isn't trained.
 */
// default foreground threshold = 61, SELECTED on the disjoint tune scene bank (eval_frag.mjs grid
// search), not eyeballed on the eval set (#12). The live App uses the same value the benchmark
// reports on, so what you see is what was measured.
export async function cnnForeground(scene: Scene, threshold = 61): Promise<Uint8Array | null> {
  const s = await get('frag-edge.onnx');
  if (!s) return null;
  const { width: w, height: h } = scene;
  const gray = grayscale(scene.rgba, w, h);
  const half = PATCH >> 1;
  const stride = 4;

  // gather patch centres on a stride grid
  const cxs: number[] = [];
  const cys: number[] = [];
  for (let y = half; y < h - half; y += stride) for (let x = half; x < w - half; x += stride) { cxs.push(x); cys.push(y); }
  const n = cxs.length;
  const flat = new Float32Array(n * PATCH * PATCH);
  for (let k = 0; k < n; k++) {
    const cx = cxs[k];
    const cy = cys[k];
    for (let dy = 0; dy < PATCH; dy++) for (let dx = 0; dx < PATCH; dx++) {
      flat[k * PATCH * PATCH + dy * PATCH + dx] = gray[(cy - half + dy) * w + (cx - half + dx)] / 255;
    }
  }
  const out = await runSerial('frag-edge.onnx', s, { x: new ort.Tensor('float32', flat, [n, 1, PATCH, PATCH]) });
  const p = out.p.data as Float32Array;

  // splat the boundary probability onto a thin full-res map (the true seams are 1-2 px wide)
  const edge = new Float32Array(w * h);
  for (let k = 0; k < n; k++) {
    const cx = cxs[k];
    const cy = cys[k];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = cx + dx;
      const yy = cy + dy;
      if (xx >= 0 && xx < w && yy >= 0 && yy < h) edge[yy * w + xx] = Math.max(edge[yy * w + xx], p[k]);
    }
  }
  // classical foreground → close (fill grain) → re-cut the CNN's true seams
  const fg0 = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) fg0[i] = gray[i] > threshold ? 1 : 0;
  const closed = morphClose(fg0, w, h, 3);
  const fg = new Uint8Array(w * h);
  // re-cut ONLY the seams the CNN is confident about (P>0.7), so the grain-fill is preserved everywhere else
  for (let i = 0; i < w * h; i++) fg[i] = closed[i] && edge[i] < 0.7 ? 1 : 0;
  return fg;
}
