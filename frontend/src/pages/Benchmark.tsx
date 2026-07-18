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
        ? 'Comparaciones cruzadas, las que no dependen de un solo caso van aquí (no en la App). Todas salen del precálculo del motor TS.'
        : 'Cross-case comparisons, the ones that do not depend on a single case live here (not in the App). All come from the TS-engine bake.'}</p>

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
          <p className="pf-note">{es
            ? 'Convención del error: la verdad usa el diámetro nominal del generador (2r) y la recuperada usa diámetros área-equivalentes de las regiones delineadas, parte del error reportado es esa convención de unidades, no error de segmentación.'
            : 'Error convention: truth uses the generator’s nominal diameter (2r) while recovered sizes are area-equivalent diameters of the delineated regions, part of the reported error is that units convention, not segmentation error.'}</p>

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
        <>
          <table className="cmp-table">
            <thead><tr><th>{es ? 'modelo' : 'model'}</th><th>{es ? 'error P50' : 'P50 error'}</th><th>{es ? 'aprendido' : 'learned'}</th><th>{es ? 'baseline' : 'baseline'}</th></tr></thead>
            <tbody>
              <tr><td>frag-edge CNN</td><td>{es ? `vs verdad (test n=${learned.fragEdge.nEval})` : `vs truth (test n=${learned.fragEdge.nEval})`}</td><td><b>{(learned.fragEdge.p50_err_cnn * 100).toFixed(1)}%</b></td><td>{(learned.fragEdge.p50_err_classical * 100).toFixed(1)}%</td></tr>
              <tr><td>{es ? 'regresor de sesgo' : 'bias regressor'}</td><td>{es ? `vs verdad (n=${learned.fines.nEval})` : `vs truth (n=${learned.fines.nEval})`}</td><td><b>{(learned.fines.p50_err_corrected * 100).toFixed(1)}%</b></td><td>{(learned.fines.p50_err_raw * 100).toFixed(1)}%</td></tr>
            </tbody>
          </table>
          <p className="pf-note">{es
            ? `Protocolo: tres bancos de semillas disjuntos (train / tune / test), de la misma grilla de regímenes del generador (interpolación, no transferencia; nada sobre roca real). Los umbrales del re-corte (foreground ${learned.fragEdge.recut?.fgThreshold ?? 61}, prob. de costura ${learned.fragEdge.recut?.seamProb ?? 0.7}) se seleccionan sobre n=${learned.fragEdge.nTune ?? 8} escenas de tune y se reportan sobre n=${learned.fragEdge.nEval} de test, así que el error de test es limpio para esos hiperparámetros (issue #12). El regresor de sesgo sobre n=${learned.fines.nEval} y no se ejecuta en el navegador (sus números vienen de fq-learned.json). n pequeño: los deltas son indicativos, no significativos.`
            : `Protocol: three disjoint seed banks (train / tune / test), from the same generator regime grid (interpolation, not transfer; nothing about real rock). The recut thresholds (foreground ${learned.fragEdge.recut?.fgThreshold ?? 61}, seam prob. ${learned.fragEdge.recut?.seamProb ?? 0.7}) are selected on n=${learned.fragEdge.nTune ?? 8} tune scenes and reported on n=${learned.fragEdge.nEval} test scenes, so the test error is clean for those hyperparameters (issue #12). The bias regressor is on n=${learned.fines.nEval} and does not run in the browser (its numbers come from fq-learned.json). Small n: the deltas are indicative, not significant.`}</p>
        </>
      ) : (
        <Callout variant="honest" title={es ? 'Artefacto de modelos no cargado' : 'Learned artifact not loaded'}>
          {es
            ? 'fq-learned.json no cargó en esta sesión (los modelos vienen entrenados en el repo). La PSD verdadera del generador es siempre la autoridad.'
            : 'fq-learned.json did not load in this session (the models ship trained in the repo). The generator’s true PSD is always the authority.'}
        </Callout>
      )}

      <h2>{es ? 'Vía real: acuerdo relativo (sin verdad de harneo)' : 'Real lane: relative agreement (no sieve truth)'}</h2>
      <p className="pf-note">{es
        ? 'La fuente "Muestra real" ejecuta la misma cadena sobre fotos reales post-tronadura (Yaghoobi 2018, Mendeley Data, CC BY 4.0, mina Gole-Gohar). No hay ningún dataset abierto que paree una foto de muckpile con una PSD medida por harneo, así que la vía real no reporta exactitud: solo compara dos estimaciones basadas en imagen sobre la misma foto (la delineación seleccionada vs una granulometría morfológica sin-delineación). Su diferencia es incertidumbre de método, no error contra la verdad. La escala queda sin fijar (diámetro de la bola roja no documentado), así que los tamaños van en píxeles.'
        : 'The "Real sample" source runs the same chain on genuine post-blast photos (Yaghoobi 2018, Mendeley Data, CC BY 4.0, Gole-Gohar mine). No open dataset pairs a muckpile photo with a sieve-measured PSD, so the real lane reports no accuracy: it only compares two image-based estimates on the same photo (the selected delineation vs a delineation-free morphological granulometry). Their difference is method uncertainty, not error against truth. Scale is left unset (red ball diameter undocumented), so sizes are in pixels.'}</p>

      <h2>{es ? 'Referencia de segmentación profunda (SOTA)' : 'Deep-segmentation reference (SOTA)'}</h2>
      <p className="pf-note">{es
        ? 'El estado del arte en delineación de fragmentos de roca tronada usa segmentación profunda: U-Net (Ronneberger et al. 2015) y el Segment Anything Model (Kirillov et al. 2023), aplicado a este dominio por Zhao et al. 2024 (Minerals 14(7):654), quienes reportan sobre 83 imágenes reales PA 94.5 %, IoU 94.4 %. Es una referencia citada, no se ejecuta en el presupuesto en-navegador de este build: se ejecuta offline. Nuestro CNN de bordes vive dentro del presupuesto live y no se presenta como SOTA.'
        : 'The state of the art in blasted-rock fragment delineation uses deep segmentation: U-Net (Ronneberger et al. 2015) and the Segment Anything Model (Kirillov et al. 2023), applied to this domain by Zhao et al. 2024 (Minerals 14(7):654), who report PA 94.5 %, IoU 94.4 % over 83 real images. It is a cited reference, it does not run in this build in-browser budget: it would run offline. Our boundary CNN lives inside the live budget and is not presented as SOTA.'}</p>
    </article>
  );
}
