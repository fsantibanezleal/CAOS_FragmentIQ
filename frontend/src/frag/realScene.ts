// Browser-only adapter that turns a real post-blast photo (a static asset) into the same Scene shape the
// synthetic generator produces, so the existing live pipeline (adaptive foreground -> watershed / CNN /
// connected-components -> summarise -> PSD + Rosin-Rammler) runs on it unchanged. The only differences from a
// synthetic Scene: there is no ground-truth (`truth: []`, `labels` all zero) because no sieve PSD exists for a
// muckpile photo, and mmPerPx is 1 (pixel-relative) because the red scale ball's physical diameter is
// undocumented. Everything a real datum produces is therefore a relative, image-based estimate.
//
// This module touches the DOM (Image + canvas) so it is imported directly by the App, not re-exported from the
// dependency-free engine index (which also runs under Node).

import { type Scene, type SceneSpec } from './types.ts';

export interface RealDatum {
  id: string;
  file: string; // relative to the Vite base, e.g. "data/real/FR-01.jpg"
  width: number;
  height: number;
  rockType: { en: string; es: string };
  note: { en: string; es: string };
  scale: { mm_per_px: number | null; scale_known: boolean; source: string; ball_px_est?: number };
  label: string; // always "RELATIVE"
}

export interface RealCasesFile {
  schema: string;
  dataset: {
    title: string; author: string; doi: string; url: string; license: string; origin: string; mirror?: string;
  };
  label: string;
  caveat: { en: string; es: string };
  cases: RealDatum[];
}

/** Load a real photo asset into a Scene (RGBA, no ground truth). Rejects if the image cannot be decoded. */
export async function loadRealScene(datum: RealDatum, baseUrl: string): Promise<Scene> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`failed to load ${datum.file}`));
    img.src = `${baseUrl}${datum.file}`;
  });
  const w = datum.width || img.naturalWidth;
  const h = datum.height || img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(img, 0, 0, w, h);
  const rgba = new Uint8ClampedArray(ctx.getImageData(0, 0, w, h).data);
  const spec: SceneSpec = {
    id: datum.id, pxWidth: w, pxHeight: h, mmPerPx: 1, nFragments: 0,
    xcMm: 0, nIndex: 0, regime: 'medium', lighting: 'even', seed: 0,
  };
  return { spec, width: w, height: h, rgba, truth: [], labels: new Int32Array(w * h) };
}
