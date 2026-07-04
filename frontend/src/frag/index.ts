// FragmentIQ engine, the live client-side core (also run from Node by the offline bake/train via tsx).
//
//   makeScene         , seeded synthetic muckpile generator (RGBA + ground-truth fragments)
//   delineateClassical, watershed-class fragment delineation (the classical baseline)
//   summarise         , fragment sizes → PSD + Rosin–Rammler fit (P10/P50/P80, xc, n)
//   analyzeClassical  , delineate + recovered PSD vs the generator's truth PSD
//
// Dependency-free (no DOM, no npm runtime deps) so the same engine runs in the browser and in the offline Node bake.

export * from './types.ts';
export { mulberry32 } from './rng.ts';
export { rrSample, psdFromSizes, sizeAtPassing, fitRR, summarise } from './rosinrammler.ts';
export { makeScene } from './scene.ts';
export {
  grayscale,
  classicalForeground,
  morphClose,
  distanceTransform,
  delineate,
  delineateClassical,
  type Delineation,
} from './watershed.ts';
export { analyzeClassical, analyzeWithForeground, type Analysis } from './analyze.ts';
