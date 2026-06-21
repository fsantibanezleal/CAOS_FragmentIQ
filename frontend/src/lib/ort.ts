// Live in-browser inference of the fragment-edge CNN (onnxruntime-web), used to produce a sharper FOREGROUND map for
// the watershed (cnnForeground below). GRACEFUL: until the model is trained (science/train_frag.py → frag-edge.onnx)
// the file is absent; the loader resolves to null and the App falls back to the classical delineation + shows the
// honest "pending training" state. WASM EP, single-threaded; the npm package + CDN wasmPaths are pinned to 1.27.
import * as ort from 'onnxruntime-web';
import { grayscale, type Scene } from '../frag/index.ts';

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

export const cnnAvailable = async () => (await get('frag-edge.onnx')) != null;

/**
 * Build a CNN-refined foreground for the watershed: slide the edge CNN over the image, predict P(boundary) per patch
 * centre, then foreground = (gray > threshold) AND NOT(boundary). Returns null if the model isn't trained.
 */
export async function cnnForeground(scene: Scene, threshold = 58): Promise<Uint8Array | null> {
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
  const out = await s.run({ x: new ort.Tensor('float32', flat, [n, 1, PATCH, PATCH]) });
  const p = out.p.data as Float32Array;

  // splat the boundary probability onto a full-res map (nearest grid point)
  const edge = new Float32Array(w * h);
  for (let k = 0; k < n; k++) {
    const cx = cxs[k];
    const cy = cys[k];
    for (let dy = -stride; dy <= stride; dy++) for (let dx = -stride; dx <= stride; dx++) {
      const xx = cx + dx;
      const yy = cy + dy;
      if (xx >= 0 && xx < w && yy >= 0 && yy < h) edge[yy * w + xx] = Math.max(edge[yy * w + xx], p[k]);
    }
  }
  const fg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) fg[i] = gray[i] > threshold && edge[i] < 0.5 ? 1 : 0;
  return fg;
}
