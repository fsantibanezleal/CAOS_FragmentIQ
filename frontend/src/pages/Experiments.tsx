import { useEffect, useState } from 'react';
import { Callout, useShellLang } from '@fasl-work/caos-app-shell';
import { loadCaseResults } from '../lib/artifacts.ts';
import type { CaseResultsFile } from '../lib/contract.types.ts';

export default function Experiments() {
  const es = useShellLang() === 'es';
  const [data, setData] = useState<CaseResultsFile | null>(null);
  useEffect(() => { loadCaseResults().then(setData).catch(() => setData(null)); }, []);

  return (
    <article className="page-body prose">
      <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
      <p className="lede">{es
        ? 'Cada caso es un experimento con un ancla de validación: una propiedad que el resultado DEBE cumplir. Todas se chequean en el horneado (frontend/test/contract.test.ts).'
        : 'Each case is an experiment with a validation anchor: a property the result MUST satisfy. They are all checked in the bake (frontend/test/contract.test.ts).'}</p>

      {!data ? <p className="pf-note">{es ? 'cargando casos…' : 'loading cases…'}</p> : (
        <div className="pf-exp-grid">
          {Object.entries(data.cases).map(([id, c]) => (
            <div key={id} className="pf-card">
              <div className="pf-exp-h"><b>{id}</b> <span>{c.name}</span></div>
              <div className="pf-cap pf-muted">{c.category.split(' (')[0]}</div>
              <div className="pf-kpis">
                <div className="pf-kpi"><div className="pf-kpi-v">{c.baseline.p50.toFixed(0)}</div><div className="pf-kpi-l">P50 mm</div></div>
                <div className="pf-kpi"><div className="pf-kpi-v">{(c.baseline.p50Err! * 100).toFixed(0)}%</div><div className="pf-kpi-l">{es ? 'err vs verdad' : 'err vs truth'}</div></div>
                <div className="pf-kpi"><div className="pf-kpi-v">{c.nFound}</div><div className="pf-kpi-l">{es ? 'fragmentos' : 'fragments'}</div></div>
              </div>
              <div className="pf-anchor">⚓ {c.validationAnchor}</div>
              <div className="pf-cap">{c.expectedBand}</div>
            </div>
          ))}
        </div>
      )}

      <Callout variant="strong" title={es ? 'Los oráculos' : 'The oracles'}>
        {es
          ? 'C-MONO es un muckpile mono-disperso (todos los fragmentos ~120 mm) → la PSD es un escalón y el P50 recuperado ≈ 120 mm (±50 %). C-KNOWN usa una Rosin–Rammler conocida (xc=160, n=1.7) → la PSD recuperada debe quedar ordenada + bien ajustada (r²>0.85). Son las anclas de exactitud del pipeline.'
          : 'C-MONO is a mono-disperse muckpile (all fragments ~120 mm) → the PSD is a step and the recovered P50 ≈ 120 mm (±50 %). C-KNOWN uses a known Rosin–Rammler (xc=160, n=1.7) → the recovered PSD must be ordered + well-fit (r²>0.85). These are the pipeline’s exactness anchors.'}
      </Callout>
    </article>
  );
}
