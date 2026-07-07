import { useEffect, useMemo, useState } from 'react';
import { Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import { CASES, caseSpec, type FragCase } from '../frag/cases.ts';
import {
  adaptiveForeground, classicalForeground, connectedComponents, delineate, delineateClassical,
  fitRR, granulometry, grayscale, makeScene, otsuThreshold, redScaleMask, sizeAtPassing, summarise,
  type Delineation,
} from '../frag/index.ts';
import { cnnForeground } from '../lib/ort.ts';
import { loadRealCases, base } from '../lib/artifacts.ts';
import { loadRealScene, type RealCasesFile, type RealDatum } from '../frag/realScene.ts';
import type { Scene } from '../frag/types.ts';
import { SceneView } from '../viz/SceneView.tsx';
import { PSDChart } from '../viz/PSDChart.tsx';
import { SizeHist } from '../viz/SizeHist.tsx';

const CATS = ['size regime (the blast result)', 'imaging (lighting)', 'oracle control (closed-form check)'];
type Source = 'synthetic' | 'real';
type Method = 'watershed' | 'cnn' | 'cc';

function sizeHistBins(sizes: number[], nb = 12) {
  if (!sizes.length) return [];
  const lo = Math.log(Math.min(...sizes));
  const hi = Math.log(Math.max(...sizes) * 1.001);
  const bins = new Array(nb).fill(0);
  for (const d of sizes) bins[Math.min(nb - 1, Math.floor(((Math.log(d) - lo) / (hi - lo)) * nb))]++;
  return bins.map((count, b) => ({ sizeMm: Math.round(Math.exp(lo + ((hi - lo) * (b + 0.5)) / nb)), count }));
}

export default function Tool() {
  const lang = useShellLang();
  const es = lang === 'es';

  const [source, setSource] = useState<Source>('synthetic');
  const [caseId, setCaseId] = useState('R-MEDIUM');
  const [realId, setRealId] = useState('FR-01');
  const [method, setMethod] = useState<Method>('watershed');
  const [scaleMul, setScaleMul] = useState(1);
  const [overlay, setOverlay] = useState(true);

  const [realCases, setRealCases] = useState<RealCasesFile | null>(null);
  const [realScene, setRealScene] = useState<Scene | null>(null);
  const [realErr, setRealErr] = useState(false);
  const [cnnFg, setCnnFg] = useState<Uint8Array | null>(null);
  const [cnnPending, setCnnPending] = useState(false);

  const isReal = source === 'real';

  // synthetic scene (always computed; picked only when source==='synthetic')
  const theCase = useMemo<FragCase>(() => CASES.find((c) => c.id === caseId) ?? CASES[0], [caseId]);
  const synScene = useMemo(() => makeScene(caseSpec(theCase)), [theCase]);

  useEffect(() => { loadRealCases().then(setRealCases).catch(() => setRealCases(null)); }, []);

  const realDatum = useMemo<RealDatum | null>(
    () => realCases?.cases.find((c) => c.id === realId) ?? realCases?.cases[0] ?? null, [realCases, realId]);

  // load the real photo into a Scene when in real mode
  useEffect(() => {
    if (!isReal || !realDatum) { return; }
    let cancel = false;
    setRealScene(null);
    setRealErr(false);
    loadRealScene(realDatum, base())
      .then((s) => { if (!cancel) setRealScene(s); })
      .catch(() => { if (!cancel) setRealErr(true); });
    return () => { cancel = true; };
  }, [isReal, realDatum]);

  const scene = isReal ? realScene : synScene;

  // red scale-ball mask (real only): excluded from the rock foreground, gives a px scale readout only
  const scaleMask = useMemo(
    () => (isReal && scene ? redScaleMask(scene.rgba, scene.width, scene.height) : null), [isReal, scene]);

  // Otsu threshold seeds the CNN recut on real photos (its default 61 is tuned to the synthetic dark background)
  const cnnThr = useMemo(
    () => (isReal && scene ? otsuThreshold(grayscale(scene.rgba, scene.width, scene.height)) : 61), [isReal, scene]);

  // run the frag-edge CNN ONLY when the CNN method is selected (one inference per scene, never a loop)
  useEffect(() => {
    if (!scene || method !== 'cnn') { setCnnFg(null); setCnnPending(false); return; }
    let cancel = false;
    setCnnPending(true);
    cnnForeground(scene, cnnThr).then((fg) => { if (cancel) return; setCnnFg(fg); setCnnPending(fg === null); });
    return () => { cancel = true; };
  }, [scene, method, cnnThr]);

  const cnnReady = method === 'cnn' && cnnFg != null;

  // the live delineation for the selected source + method
  const delin = useMemo<Delineation | null>(() => {
    if (!scene) return null;
    const fg = isReal ? adaptiveForeground(scene, scaleMask?.mask) : classicalForeground(scene);
    if (cnnReady) return delineate(cnnFg!, scene.width, scene.height);
    if (method === 'cc') return connectedComponents(fg, scene.width, scene.height);
    return isReal ? delineate(fg, scene.width, scene.height) : delineateClassical(scene);
  }, [scene, isReal, method, cnnReady, cnnFg, scaleMask]);

  // pixel-relative for a real photo (scale unset); mm for synthetic (calibrated by the case + the display slider)
  const mmpx = isReal ? 1 : theCase.mmPerPx * scaleMul;
  const unit: 'mm' | 'px' = isReal ? 'px' : 'mm';

  const recovered = useMemo(
    () => summarise((delin?.fragments ?? []).map((f) => f.equivDiamPx * mmpx)), [delin, mmpx]);
  const bins = useMemo(
    () => sizeHistBins((delin?.fragments ?? []).map((f) => f.equivDiamPx * mmpx)), [delin, mmpx]);

  // synthetic: generator ground truth. real: NONE (no sieve PSD exists).
  const truth = useMemo(
    () => (!isReal && scene ? summarise(scene.truth.map((f) => f.equivDiamPx * mmpx)) : null), [isReal, scene, mmpx]);
  const p50Err = truth && truth.p50 > 0 ? Math.abs(recovered.p50 - truth.p50) / truth.p50 : 0;

  // real: a DELINEATION-FREE reference (morphological granulometry) as a RELATIVE cross-check, never a truth
  const reference = useMemo(() => {
    if (!isReal || !scene) return null;
    const fg = adaptiveForeground(scene, scaleMask?.mask);
    const g = granulometry(fg, scene.width, scene.height, mmpx);
    return { psd: g.psd, p10: sizeAtPassing(g.psd, 0.1), p50: sizeAtPassing(g.psd, 0.5), p80: sizeAtPassing(g.psd, 0.8), rr: fitRR(g.psd) };
  }, [isReal, scene, scaleMask, mmpx]);

  const Kpi = ({ label, value }: { label: string; value: string }) => (
    <div className="pf-kpi"><div className="pf-kpi-v">{value}</div><div className="pf-kpi-l">{label}</div></div>
  );
  const sz = (v: number) => `${v.toFixed(0)} ${unit}`;
  const methodName = cnnReady ? 'CNN' : method === 'cc' ? (es ? 'componentes' : 'components') : 'watershed';
  const refName = es ? 'granulometria (ref)' : 'granulometry (ref)';

  const attribution = realCases?.dataset;
  const caveat = realCases?.caveat;

  const loading = isReal && !scene && !realErr;

  const tabs = [
    {
      id: 'pile', label: 'Muckpile',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-th">
            <div className="pf-plot-t">{isReal
              ? (es ? 'Foto real + segmentacion de fragmentos en vivo (pasa el cursor)' : 'Real photo + live fragment segmentation (hover)')
              : (es ? 'Muckpile + segmentacion de fragmentos en vivo (pasa el cursor)' : 'Muckpile + live fragment segmentation (hover)')}</div>
            <button className={`chip ${overlay ? 'on' : ''}`} onClick={() => setOverlay((v) => !v)}>overlay</button>
          </div>
          {scene && delin
            ? <SceneView scene={scene} delin={delin} mmPerPx={mmpx} showOverlay={overlay} lang={lang} unit={unit} />
            : <div className="pf-pending">{realErr ? (es ? 'no se pudo cargar la foto' : 'could not load the photo') : (es ? 'cargando foto real...' : 'loading real photo...')}</div>}
          <div className="pf-kpis">
            <Kpi label="P50" value={sz(recovered.p50)} />
            <Kpi label="P80" value={sz(recovered.p80)} />
            <Kpi label={es ? 'tamano max' : 'top size'} value={sz(recovered.topSize)} />
            <Kpi label={es ? 'fragmentos' : 'fragments'} value={`${delin?.fragments.length ?? 0}`} />
            <Kpi label={es ? 'metodo' : 'method'} value={methodName} />
          </div>
          {isReal && (
            <p className="pf-cap">{es
              ? `Foto real, estimacion RELATIVA (sin verdad de harneo). ${scaleMask?.ballPx ? `Bola de escala detectada ~${scaleMask.ballPx}px (diametro fisico no documentado, escala sin fijar).` : ''}`
              : `Real photo, RELATIVE estimate (no sieve truth). ${scaleMask?.ballPx ? `Scale ball detected ~${scaleMask.ballPx}px (physical diameter undocumented, scale unset).` : ''}`}</p>
          )}
        </div>
      ),
    },
    {
      id: 'psd', label: es ? 'Curva PSD' : 'PSD curve',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{isReal
            ? (es ? 'PSD recuperada + ajuste Rosin-Rammler, con la referencia sin-delineacion (granulometria) superpuesta' : 'Recovered PSD + Rosin-Rammler fit, with the delineation-free reference (granulometry) overlaid')
            : (es ? 'Distribucion de tamano, % pasante vs tamano (log), recuperada vs verdad + ajuste Rosin-Rammler' : 'Particle-size distribution, % passing vs size (log), recovered vs truth + the Rosin-Rammler fit')}</div>
          <PSDChart recovered={recovered.psd} truth={(isReal ? reference?.psd : truth?.psd)} rr={recovered.rr} lang={lang}
            sizeUnit={unit} refLabel={isReal ? refName : undefined} />
          <div className="pf-kpis">
            <Kpi label="P10" value={sz(recovered.p10)} />
            <Kpi label="P50" value={sz(recovered.p50)} />
            <Kpi label="P80" value={sz(recovered.p80)} />
            {!isReal && <Kpi label={es ? 'err P50 vs verdad' : 'P50 err vs truth'} value={`${(p50Err * 100).toFixed(0)}%`} />}
          </div>
          {isReal && <p className="pf-cap">{es
            ? 'La referencia es una granulometria morfologica (apertura por tamano, sin delineacion), ponderada por area. No es verdad, es una segunda estimacion basada en imagen para acotar la incertidumbre (RELATIVA).'
            : 'The reference is a morphological granulometry (opening-by-size, no delineation), area-weighted. It is not truth, it is a second image-based estimate to bracket the uncertainty (RELATIVE).'}</p>}
        </div>
      ),
    },
    {
      id: 'hist', label: es ? 'Histograma' : 'Histogram',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{es ? `Histograma de tamanos (${unit}) de los fragmentos delineados` : `Size histogram (${unit}) of the delineated fragments`}</div>
          <SizeHist bins={bins} lang={lang} />
          {isReal && <p className="pf-cap">{es ? 'Tamanos en pixeles (escala sin fijar).' : 'Sizes in pixels (scale unset).'}</p>}
        </div>
      ),
    },
    {
      id: 'rr', label: 'Rosin-Rammler',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{es ? 'El ajuste Rosin-Rammler P(x) = 1 - exp(-(x/xc)^n)' : 'The Rosin-Rammler fit P(x) = 1 - exp(-(x/xc)^n)'}</div>
          <div className="pf-kpis">
            <Kpi label={es ? `xc (${unit})` : `xc (${unit})`} value={`${recovered.rr.xcMm.toFixed(0)} ${unit}`} />
            <Kpi label={es ? 'n (uniformidad)' : 'n (uniformity)'} value={recovered.rr.nIndex.toFixed(2)} />
            <Kpi label="r2" value={recovered.rr.r2.toFixed(3)} />
          </div>
          <p className="pf-note">{isReal
            ? (es
              ? 'xc es el tamano al 63.2% pasante; n alto = uniforme, n bajo = amplio. La referencia sin-delineacion (granulometria) da n = ' + (reference?.rr.nIndex.toFixed(2) ?? 'n/a') + ' (RELATIVA, no verdad).'
              : 'xc is the 63.2% passing size; high n = uniform, low n = wide. The delineation-free reference (granulometry) gives n = ' + (reference?.rr.nIndex.toFixed(2) ?? 'n/a') + ' (RELATIVE, not truth).')
            : (es
              ? 'xc es el tamano al 63.2% pasante; n alto = distribucion uniforme, n bajo = amplia. El n de la verdad es ' + (truth?.rr.nIndex.toFixed(2) ?? 'n/a') + '.'
              : 'xc is the 63.2% passing size; high n = uniform, low n = wide. The truth n is ' + (truth?.rr.nIndex.toFixed(2) ?? 'n/a') + '.')}</p>
        </div>
      ),
    },
    {
      id: 'cmp', label: isReal ? (es ? 'vs referencia' : 'vs reference') : (es ? 'vs verdad' : 'vs truth'),
      content: (
        <div className="pf-vizstack">
          {isReal ? (
            <>
              <table className="cmp-table">
                <thead><tr><th></th><th>P10</th><th>P50</th><th>P80</th><th>n</th></tr></thead>
                <tbody>
                  <tr><td><b>{methodName}</b></td><td>{sz(recovered.p10)}</td><td>{sz(recovered.p50)}</td><td>{sz(recovered.p80)}</td><td>{recovered.rr.nIndex.toFixed(2)}</td></tr>
                  <tr><td><b>{refName}</b></td><td>{sz(reference?.p10 ?? 0)}</td><td>{sz(reference?.p50 ?? 0)}</td><td>{sz(reference?.p80 ?? 0)}</td><td>{reference?.rr.nIndex.toFixed(2) ?? 'n/a'}</td></tr>
                </tbody>
              </table>
              <p className="pf-note">{es
                ? 'Acuerdo RELATIVO entre dos metodos basados en imagen sobre la MISMA foto real: la delineacion seleccionada vs una granulometria sin-delineacion. Ambos son estimaciones sesgadas; NO existe una PSD de verdad medida por harneo para fotos de muckpile, asi que su diferencia mide incertidumbre de metodo, no exactitud.'
                : 'RELATIVE agreement between two image-based methods on the SAME real photo: the selected delineation vs a delineation-free granulometry. Both are biased estimates; NO sieve-measured PSD ground truth exists for muckpile photos, so their difference measures method uncertainty, not accuracy.'}</p>
              {attribution && <p className="pf-cap">{es ? 'Fuente' : 'Source'}: {attribution.title}, {attribution.author} ({attribution.license}), doi:{attribution.doi}.</p>}
            </>
          ) : (
            <>
              <table className="cmp-table">
                <thead><tr><th></th><th>P10</th><th>P50</th><th>P80</th><th>{es ? 'tamano max' : 'top'}</th><th>n</th></tr></thead>
                <tbody>
                  <tr><td><b>{es ? 'recuperada' : 'recovered'}</b></td><td>{sz(recovered.p10)}</td><td>{sz(recovered.p50)}</td><td>{sz(recovered.p80)}</td><td>{sz(recovered.topSize)}</td><td>{recovered.rr.nIndex.toFixed(2)}</td></tr>
                  <tr><td><b>{es ? 'verdad' : 'truth'}</b></td><td>{sz(truth?.p10 ?? 0)}</td><td>{sz(truth?.p50 ?? 0)}</td><td>{sz(truth?.p80 ?? 0)}</td><td>{sz(truth?.topSize ?? 0)}</td><td>{truth?.rr.nIndex.toFixed(2) ?? 'n/a'}</td></tr>
                </tbody>
              </table>
              <p className="pf-note">{es
                ? `Sesgo de delineacion: el P50 recuperado difiere del verdadero en ${(p50Err * 100).toFixed(0)}%. La delineacion por imagen es sesgada; la verdad del generador es la autoridad. Convencion: la verdad usa el diametro nominal (2r) y la recuperada usa diametros area-equivalentes, parte del sesgo es esa convencion de unidades, no error de segmentacion.`
                : `Delineation bias: the recovered P50 differs from truth by ${(p50Err * 100).toFixed(0)}%. Image delineation is biased; the generator truth is the authority. Convention: truth uses the nominal diameter (2r) while recovered sizes are area-equivalent diameters, so part of the reported bias is that units convention, not segmentation error.`}</p>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-body pf-layout">
      <aside className="pf-side">
        <div className="pf-card">
          <div className="pf-card-t">{es ? 'Fuente' : 'Source'}</div>
          <div className="pf-chips">
            <button className={`chip ${!isReal ? 'on' : ''}`} onClick={() => setSource('synthetic')}>{es ? 'Sintetica' : 'Synthetic'}</button>
            <button className={`chip ${isReal ? 'on' : ''}`} onClick={() => setSource('real')}>{es ? 'Muestra real' : 'Real sample'}</button>
          </div>
          <div className="pf-cap pf-muted">{isReal
            ? (es ? 'Foto real post-tronadura; los controles de simulacion se desactivan, solo eliges el dato.' : 'Real post-blast photo; the simulation knobs are disabled, you only pick the datum.')
            : (es ? 'Muckpile sintetico con verdad del generador; los controles simulan el resultado.' : 'Synthetic muckpile with generator truth; the knobs simulate the result.')}</div>
        </div>

        {!isReal ? (
          <div className="pf-card">
            <div className="pf-card-t">{es ? 'Caso' : 'Case'}</div>
            {CATS.map((cat) => (
              <div key={cat} className="pf-catgroup">
                <div className="pf-catlabel">{cat.split(' (')[0]}</div>
                <div className="pf-chips">
                  {CASES.filter((c) => c.category === cat).map((c) => (
                    <button key={c.id} className={`chip ${caseId === c.id ? 'on' : ''}`} title={c.name} onClick={() => setCaseId(c.id)}>{c.id}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="pf-cap">{theCase.name}</div>
            <div className="pf-cap pf-muted">{theCase.expectedBand}</div>
          </div>
        ) : (
          <div className="pf-card">
            <div className="pf-card-t">{es ? 'Dato real' : 'Real datum'}</div>
            <div className="pf-chips">
              {realCases?.cases.map((c) => (
                <button key={c.id} className={`chip ${realId === c.id ? 'on' : ''}`} title={c.rockType[es ? 'es' : 'en']} onClick={() => setRealId(c.id)}>{c.id}</button>
              ))}
            </div>
            {realDatum && <div className="pf-cap">{realDatum.rockType[es ? 'es' : 'en']}</div>}
            {realDatum && <div className="pf-cap pf-muted">{realDatum.note[es ? 'es' : 'en']}</div>}
            {attribution && <div className="pf-cap pf-muted">{attribution.title}, {attribution.author}. {attribution.license}. doi:{attribution.doi}</div>}
          </div>
        )}

        <div className="pf-card">
          <div className="pf-card-t">{es ? 'Controles (en vivo)' : 'Controls (live)'}</div>
          {!isReal ? (
            <>
              <label className="pf-ctl">{es ? 'escala (unidades)' : 'scale (units)'}: {(theCase.mmPerPx * scaleMul).toFixed(2)} mm/px
                <input className="range" type="range" min={0.5} max={2} step={0.05} value={scaleMul} onChange={(e) => setScaleMul(+e.target.value)} />
              </label>
              <div className="pf-cap pf-muted">{es ? 'Reescala mm/px de la recuperada Y la verdad (solo unidades), no simula error de calibracion.' : 'Rescales mm/px for both recovered AND truth (display units only), it does not simulate a calibration error.'}</div>
            </>
          ) : (
            <div className="pf-cap pf-muted">{es ? 'Escala sin fijar: la bola roja es un marcador de escala de diametro fisico no documentado, asi que los tamanos van en pixeles.' : 'Scale unset: the red ball is a scale marker of undocumented physical diameter, so sizes are in pixels.'}</div>
          )}
          <div className="pf-catlabel">{es ? 'delineacion' : 'delineation'}</div>
          <div className="pf-chips">
            <button className={`chip ${method === 'watershed' ? 'on' : ''}`} onClick={() => setMethod('watershed')}>watershed</button>
            <button className={`chip ${method === 'cnn' ? 'on' : ''}`} onClick={() => setMethod('cnn')} title={cnnPending ? 'CNN pending' : 'CNN'}>CNN{method === 'cnn' && cnnPending ? ' (...)' : ''}</button>
            <button className={`chip ${method === 'cc' ? 'on' : ''}`} onClick={() => setMethod('cc')} title="connected components">{es ? 'componentes' : 'components'}</button>
          </div>
          {method === 'cnn' && cnnPending && <div className="pf-cap pf-muted">{es ? 'CNN pendiente, usando watershed' : 'CNN pending, using watershed'}</div>}
          {isReal && method === 'cnn' && <div className="pf-cap pf-muted">{es ? 'El CNN de bordes se entreno en escenas sinteticas: sobre foto real corre fuera de distribucion (indicativo).' : 'The edge CNN was trained on synthetic scenes: on a real photo it runs out of distribution (indicative).'}</div>}
        </div>
      </aside>
      <main className="pf-main">
        <div className={`pf-srcbadge ${isReal ? 'real' : 'syn'}`}>
          {isReal
            ? (es ? 'Foto real, RELATIVA (sin verdad de harneo)' : 'Real photo, RELATIVE (no sieve truth)')
            : (es ? 'Sintetica (verdad del generador)' : 'Synthetic (generator truth)')}
        </div>
        {isReal && caveat && <p className="pf-cap pf-muted" style={{ marginTop: 4 }}>{caveat[es ? 'es' : 'en']}</p>}
        {loading
          ? <div className="pf-pending">{es ? 'cargando foto real...' : 'loading real photo...'}</div>
          : <Tabs tabs={tabs} ariaLabel={es ? 'vistas del muckpile' : 'muckpile views'} />}
      </main>
    </div>
  );
}
