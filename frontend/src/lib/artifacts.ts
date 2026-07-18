// Load the committed Contract-2 artifacts (overlaid into public/ by copy-data.mjs). The App runs the CV engine live
// (src/frag) for full reactivity; these baked outputs are the replay fallback + the cross-case data Benchmark/
// Experiments summarise. Paths are relative to the Vite base.
import type { CaseIndex, CaseManifest, CaseResultsFile, CaseTrace } from './contract.types.ts';
import type { RealCasesFile } from '../frag/realScene.ts';

export const base = () => import.meta.env.BASE_URL || '/';

async function getJSON<T>(rel: string): Promise<T> {
  const r = await fetch(`${base()}${rel}`);
  if (!r.ok) throw new Error(`fetch ${rel} -> ${r.status}`);
  return (await r.json()) as T;
}

export interface LearnedFile {
  schema: string;
  fragEdge: { p50_err_cnn: number; p50_err_classical: number; boundaryF1: number; nEval: number; nTune?: number; recut?: { fgThreshold: number; seamProb: number; tuneErr: number | null; selectedOn: string } };
  fines: { p50_err_corrected: number; p50_err_raw: number; nEval: number };
  honesty: string;
}

export const loadCaseResults = () => getJSON<CaseResultsFile>('case-results.json');
export const loadLearned = () => getJSON<LearnedFile>('fq-learned.json');
export const loadIndex = () => getJSON<CaseIndex>('data/manifests/index.json');
export const loadManifest = (caseId: string) => getJSON<CaseManifest>(`data/manifests/${caseId}.json`);
export const loadTrace = (caseId: string) => getJSON<CaseTrace>(`data/${caseId}/trace.json`);
export const loadRealCases = () => getJSON<RealCasesFile>('data/real/real-cases.json');
