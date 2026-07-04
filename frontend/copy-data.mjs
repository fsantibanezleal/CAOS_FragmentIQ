// Prebuild: overlay the committed CONTRACT-2 artifacts (../data/derived) into the SPA's public/ so the static site
// loads them. Canonical copies live in ../data/derived, public/ is a build-time overlay (git-ignored). FragmentIQ's
// live lane is the TypeScript CV engine (frontend/src/frag/) + onnxruntime-web; there is no Pyodide lane to inline.
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PUB = join(HERE, 'public');
const derived = join(ROOT, 'data', 'derived');

if (!existsSync(derived)) {
  console.warn('[copy-data] no data/derived, run `npm run bake` (or `python -m fqlab.pipeline all`) first');
} else {
  mkdirSync(join(PUB, 'data'), { recursive: true });
  cpSync(derived, join(PUB, 'data'), { recursive: true });
  for (const f of ['case-results.json', 'fq-learned.json', 'frag-edge.onnx', 'fines.onnx']) {
    const src = join(derived, f);
    if (existsSync(src)) copyFileSync(src, join(PUB, f));
  }
  console.log('[copy-data] data/derived -> public/data (+ root-level case-results / onnx)');
}
