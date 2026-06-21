import { useEffect, useState } from 'react';
import { Callout, useShellLang } from '@fasl-work/caos-app-shell';
import { loadCaseResults, loadLearned, type LearnedFile } from '../lib/artifacts.ts';
import type { CaseResultsFile } from '../lib/contract.types.ts';

export default function Benchmark() {
  const es = useShellLang() === 'es';
  const [data, setData] = useState<CaseResultsFile | null>(null);
  const [learned, setLearned] = useState<LearnedFile | null>(null);
  useEffect(() => { loadCaseResults().then(setData).catch(() => setData(null)); }, []);
  useEffect(() => { loadLearned().then(setLearned).catch(() => setLearned(null)); }, []);

  return (
    <article className="page-body prose">
      <h1>Benchmark</h1>
      <p className="lede">{es
        ? 'Comparaciones cruzadas — las que NO dependen de un solo caso van aquí (no en la App). Todas salen del horneado del engine TS.'
        : 'Cross-case comparisons — the ones that do NOT depend on a single case live here (not in the App). All come from the TS-engine bake.'}</p>

      {!data ? <p className="pf-note">{es ? 'cargando…' : 'loading…'}</p> : (
        <>
          <h2>{es ? 'PSD recuperada vs verdad, por caso' : 'Recovered PSD vs truth, by case'}</h2>
          <table className="cmp-table">
            <thead><tr><th>{es ? 'caso' : 'case'}</th><th>{es ? 'categoría' : 'category'}</th><th>P50 {es ? 'recup.' : 'rec.'}</th><th>P50 {es ? 'verdad' : 'truth'}</th><th>{es ? 'error' : 'error'}</th><th>r²</th></tr></thead>
            <tbody>
              {Object.entries(data.cases).map(([id, c]) => (
                <tr key={id}>
                  <td><b>{id}</b></td><td>{c.category.split(' (')[0]}</td>
                  <td>{c.baseline.p50.toFixed(0)} mm</td><td>{c.truth.p50.toFixed(0)} mm</td>
                  <td>{(c.baseline.p50Err! * 100).toFixed(0)}%</td><td>{c.baseline.rr.r2.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>{es ? 'Régimen de tamaño (coarse > medium > fine)' : 'Size regime (coarse > medium > fine)'}</h2>
          <p className="pf-mono">
            R-COARSE P50 {data.cases['R-COARSE'].baseline.p50.toFixed(0)} mm &gt;
            R-MEDIUM {data.cases['R-MEDIUM'].baseline.p50.toFixed(0)} mm &gt;
            R-FINE {data.cases['R-FINE'].baseline.p50.toFixed(0)} mm
          </p>
        </>
      )}

      <h2>{es ? 'CNN vs watershed clásico' : 'CNN vs classical watershed'}</h2>
      {learned ? (
        <table className="cmp-table">
          <thead><tr><th>{es ? 'modelo' : 'model'}</th><th>{es ? 'error P50 (held-out)' : 'P50 error (held-out)'}</th><th>{es ? 'aprendido' : 'learned'}</th><th>{es ? 'baseline' : 'baseline'}</th></tr></thead>
          <tbody>
            <tr><td>frag-edge CNN</td><td>{es ? 'vs verdad' : 'vs truth'}</td><td><b>{(learned.fragEdge.p50_err_cnn * 100).toFixed(1)}%</b></td><td>{(learned.fragEdge.p50_err_classical * 100).toFixed(1)}%</td></tr>
            <tr><td>{es ? 'regresor de sesgo' : 'bias regressor'}</td><td>{es ? 'vs verdad' : 'vs truth'}</td><td><b>{(learned.fines.p50_err_corrected * 100).toFixed(1)}%</b></td><td>{(learned.fines.p50_err_raw * 100).toFixed(1)}%</td></tr>
          </tbody>
        </table>
      ) : (
        <Callout variant="honest" title={es ? 'Modelos no entrenados todavía' : 'Models not trained yet'}>
          {es
            ? 'El benchmark CNN-vs-clásico (error de P50 held-out) aparece aquí una vez entrenados los modelos (commit posterior). La PSD verdadera del generador es siempre la autoridad.'
            : 'The CNN-vs-classical benchmark (held-out P50 error) appears here once the models are trained (a later commit). The generator’s true PSD is always the authority.'}
        </Callout>
      )}
    </article>
  );
}
