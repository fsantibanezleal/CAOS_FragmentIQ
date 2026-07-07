// Connected-components labeling, the simplest classical delineation: label each 4-connected blob of foreground
// as one fragment. Unlike the marker-controlled watershed it does NOT split touching fragments, so on a dense
// muckpile it UNDER-segments (merges neighbours that touch across the inter-fragment seam). That contrast is
// instructive: watershed vs connected-components brackets the segmentation choice, and on a real photo (no
// sieve truth) their disagreement is an honest, RELATIVE measure of delineation uncertainty.
//
// Returns the same Delineation shape as the watershed so the App can feed either into the PSD summary.

import { type Fragment } from './types.ts';
import { type Delineation } from './watershed.ts';

export function connectedComponents(fg: Uint8Array, w: number, h: number): Delineation {
  const labels = new Int32Array(w * h);
  const stack: number[] = [];
  let next = 1;
  for (let start = 0; start < w * h; start++) {
    if (!fg[start] || labels[start]) continue;
    const lab = next++;
    labels[start] = lab;
    stack.length = 0;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w;
      const y = (p / w) | 0;
      if (x > 0 && fg[p - 1] && !labels[p - 1]) { labels[p - 1] = lab; stack.push(p - 1); }
      if (x < w - 1 && fg[p + 1] && !labels[p + 1]) { labels[p + 1] = lab; stack.push(p + 1); }
      if (y > 0 && fg[p - w] && !labels[p - w]) { labels[p - w] = lab; stack.push(p - w); }
      if (y < h - 1 && fg[p + w] && !labels[p + w]) { labels[p + w] = lab; stack.push(p + w); }
    }
  }
  const area = new Map<number, number>();
  const sx = new Map<number, number>();
  const sy = new Map<number, number>();
  for (let i = 0; i < w * h; i++) {
    const l = labels[i];
    if (l <= 0) continue;
    area.set(l, (area.get(l) ?? 0) + 1);
    sx.set(l, (sx.get(l) ?? 0) + (i % w));
    sy.set(l, (sy.get(l) ?? 0) + ((i / w) | 0));
  }
  const fragments: Fragment[] = [];
  for (const [l, a] of area) {
    if (a < 6) continue; // drop specks
    fragments.push({ cx: sx.get(l)! / a, cy: sy.get(l)! / a, areaPx: a, equivDiamPx: 2 * Math.sqrt(a / Math.PI) });
  }
  return { labels, fragments, nMarkers: next - 1 };
}
