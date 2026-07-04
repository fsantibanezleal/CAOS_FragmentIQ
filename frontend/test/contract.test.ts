// CONTRACT 2 (frontend side), the baked case-results.json must conform to the TS mirror and carry the invariants the
// App relies on. Run with: node --import tsx --test test/contract.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { CaseResultsFile } from '../src/lib/contract.types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const data: CaseResultsFile = JSON.parse(
  readFileSync(resolve(HERE, '../../data/derived/case-results.json'), 'utf-8'),
);

test('case-results.json has the expected schema + all 7 cases', () => {
  assert.equal(data.schema, 'fragmentiq.case-results/v1');
  assert.equal(data.nCases, 7);
  for (const id of ['R-COARSE', 'R-MEDIUM', 'R-FINE', 'I-EVEN', 'I-SHADOW', 'C-MONO', 'C-KNOWN']) {
    assert.ok(data.cases[id], `missing case ${id}`);
  }
});

test('every recovered PSD is ordered (P10 ≤ P50 ≤ P80) and roughly Rosin–Rammler', () => {
  for (const [id, c] of Object.entries(data.cases)) {
    const b = c.baseline;
    assert.ok(b.p10 <= b.p50 && b.p50 <= b.p80, `${id}: P10 ≤ P50 ≤ P80`);
    assert.ok(b.rr.r2 > 0.85, `${id}: recovered RR r² ${b.rr.r2}`);
  }
});

test('the MONO oracle recovers P50 within 50 % of 120 mm', () => {
  const b = data.cases['C-MONO'].baseline;
  assert.ok(Math.abs(b.p50 - 120) / 120 < 0.5, `mono P50 ${b.p50}`);
});

test('the size regimes are ordered coarse > medium > fine by recovered P50', () => {
  const p = (id: string) => data.cases[id].baseline.p50;
  assert.ok(p('R-COARSE') > p('R-MEDIUM'), 'coarse > medium');
  assert.ok(p('R-MEDIUM') > p('R-FINE'), 'medium > fine');
});
