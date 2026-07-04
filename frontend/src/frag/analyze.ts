// Tie the pipeline together: delineate a scene → recovered fragment sizes → PSD + Rosin–Rammler, alongside the
// generator's ground-truth PSD (the authority the recovery is scored against).

import { summarise } from './rosinrammler.ts';
import { type PSDSummary, type Scene } from './types.ts';
import { delineate, delineateClassical, type Delineation } from './watershed.ts';

export interface Analysis {
  delin: Delineation;
  recovered: PSDSummary;
  truth: PSDSummary;
  nFound: number;
  nTrue: number;
  /** relative P50 error (recovered vs truth), the headline accuracy. */
  p50Err: number;
}

function build(scene: Scene, delin: Delineation): Analysis {
  const mm = scene.spec.mmPerPx;
  const recovered = summarise(delin.fragments.map((f) => f.equivDiamPx * mm));
  const truth = summarise(scene.truth.map((f) => f.equivDiamPx * mm));
  const p50Err = truth.p50 > 0 ? Math.abs(recovered.p50 - truth.p50) / truth.p50 : 0;
  return { delin, recovered, truth, nFound: delin.fragments.length, nTrue: scene.truth.length, p50Err };
}

export function analyzeClassical(scene: Scene): Analysis {
  return build(scene, delineateClassical(scene));
}

/** Analyse with a provided foreground map (e.g. the CNN's). */
export function analyzeWithForeground(scene: Scene, fg: Uint8Array): Analysis {
  return build(scene, delineate(fg, scene.width, scene.height));
}
