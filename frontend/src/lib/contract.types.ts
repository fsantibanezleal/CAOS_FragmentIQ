// Contract 2 mirror (frontend side). Must stay in lock-step with the Python schemas in
// data-pipeline/fqlab/core/{trace.py, manifest.py}. A drift here makes `tsc` fail -> the contract is enforced at
// build time (the web cannot ship reading a shape the pipeline does not produce).

// ---------- per-case replay trace (fragmentiq.trace/v1) ----------

export interface RRFitRec { xcMm: number; nIndex: number; r2: number; }
export interface PSDPointRec { sizeMm: number; passing: number; }

export interface PSDSummaryRec {
  p10: number;
  p50: number;
  p80: number;
  topSize: number;
  nFragments: number;
  rr: RRFitRec;
  psd: PSDPointRec[];
  /** present on the recovered (baseline) summary only. */
  p50Err?: number;
}

export interface SceneSpecRec {
  pxWidth: number;
  pxHeight: number;
  mmPerPx: number;
  nFragments: number;
  xcMm: number;
  nIndex: number;
  regime: string;
  lighting: string;
  seed: number;
}

export interface LearnedMetrics {
  status: 'trained' | 'pending-training';
  fragEdge: { p50_err_cnn: number; p50_err_classical: number; boundaryF1: number; nEval: number; nTune?: number; recut?: { fgThreshold: number; seamProb: number; tuneErr: number | null; selectedOn: string } } | null;
  fines: { p50_err_corrected: number; p50_err_raw: number; nEval: number } | null;
}

export interface CaseTrace {
  schema: string; // "fragmentiq.trace/v1"
  case_id: string;
  name: string;
  category: string;
  real_or_synthetic: string;
  expected_band: string;
  spec: SceneSpecRec;
  truth: PSDSummaryRec;
  baseline: PSDSummaryRec;
  size_hist: Array<{ sizeMm: number; count: number }>;
  learned: LearnedMetrics;
}

// ---------- manifest (fragmentiq.manifest/v2) + index ----------

export interface ArtifactRef { path: string; format: string; trace_schema: string; bytes: number; }

export interface GateVerdict {
  lane: string;
  client_side: boolean;
  runtimes: string[];
  trace_bytes: number;
  run_ms_budget: number;
  trace_bytes_budget: number;
  reasons: string[];
}

export interface SharedArtifacts {
  models: Array<{ id: string; file: string; opset: number; kind: string }>;
  learned_metrics: string;
  case_results: string;
}

export interface CaseManifest {
  schema: string; // "fragmentiq.manifest/v2"
  case_id: string;
  name: string;
  category: string;
  real_or_synthetic: string;
  expected_band: string;
  validation_anchor: string;
  engine: { package: string; version: string; model: string };
  seed: number;
  shared: SharedArtifacts;
  artifact: ArtifactRef;
  lane: 'live' | 'precompute';
  gate: GateVerdict;
  flags: Array<Record<string, unknown>>;
  metrics: Record<string, number>;
  honesty: string;
}

export interface CaseIndexEntry { case_id: string; category: string; manifest_path: string; }

export interface CaseIndex {
  schema: string; // "fragmentiq.index/v1"
  engine_version: string;
  n_cases: number;
  cases: CaseIndexEntry[];
}

// ---------- the baked case-results.json (fragmentiq.case-results/v1) consumed by the bake + the App ----------

export interface CaseResult {
  name: string;
  category: string;
  regime: string;
  lighting: string;
  seed: number;
  realOrSynthetic: string;
  expectedBand: string;
  validationAnchor: string;
  spec: SceneSpecRec;
  truth: PSDSummaryRec;
  baseline: PSDSummaryRec;
  sizeHist: Array<{ sizeMm: number; count: number }>;
  nFound: number;
  nTrue: number;
}

export interface CaseResultsFile {
  schema: string; // "fragmentiq.case-results/v1"
  nCases: number;
  cases: Record<string, CaseResult>;
}
