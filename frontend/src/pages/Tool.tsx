import { useEffect, useMemo, useState } from 'react';
import { Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import { CASES, caseSpec, type FragCase } from '../frag/cases.ts';
import { delineate, delineateClassical, makeScene, summarise } from '../frag/index.ts';
import { cnnForeground } from '../lib/ort.ts';
import { loadLearned, loadManifest, type LearnedFile } from '../lib/artifacts.ts';
import type { CaseManifest } from '../lib/contract.types.ts';
import { SceneView } from '../viz/SceneView.tsx';
import { PSDChart } from '../viz/PSDChart.tsx';
import { SizeHist } from '../viz/SizeHist.tsx';

const CATS = ['size regime (the blast result)', 'imaging (lighting)', 'oracle control (closed-form check)'];

function sizeHistBins(sizesMm: number[], nb = 12) {
  if (!sizesMm.length) return [];
  const lo = Math.log(Math.min(...sizesMm));
  const hi = Math.log(Math.max(...sizesMm) * 1.001);
  const bins = new Array(nb).fill(0);
  for (const d of sizesMm) bins[Math.min(nb - 1, Math.floor(((Math.log(d) - lo) / (hi - lo)) * nb))]++;
  return bins.map((count, b) => ({ sizeMm: Math.round(Math.exp(lo + ((hi - lo) * (b + 0.5)) / nb)), count }));
}

export default function Tool() {
  const lang = useShellLang();
  const es = lang === 'es';
  const [caseId, setCaseId] = useState('R-MEDIUM');
  const [scaleMul, setScaleMul] = useState(1);
  const [useCnn, setUseCnn] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const [manifest, setManifest] = useState<CaseManifest | null>(null);
  const [learned, setLearned] = useState<LearnedFile | null>(null);
  const [cnnFg, setCnnFg] = useState<Uint8Array | null>(null);
  const [cnnPending, setCnnPending] = useState(true);

  const theCase = useMemo<FragCase>(() => CASES.find((c) => c.id === caseId) ?? CASES[0], [caseId]);
  const scene = useMemo(() => makeScene(caseSpec(theCase)), [theCase]);
  const delinClassical = useMemo(() => delineateClassical(scene), [scene]);

  useEffect(() => {
    let cancel = false;
    setCnnPending(true);
    cnnForeground(scene).then((fg) => { if (cancel) return; setCnnFg(fg); setCnnPending(fg === null); });
    return () => { cancel = true; };
  }, [scene]);
  useEffect(() => { loadManifest(caseId).then(setManifest).catch(() => setManifest(null)); }, [caseId]);
  useEffect(() => { loadLearned().then(setLearned).catch(() => setLearned(null)); }, []);

  const cnnReady = useCnn && cnnFg != null;
  const delin = useMemo(() => (cnnReady ? delineate(cnnFg!, scene.width, scene.height) : delinClassical),
    [cnnReady, cnnFg, scene, delinClassical]);

  const mmpx = theCase.mmPerPx * scaleMul;
  const recovered = useMemo(() => summarise(delin.fragments.map((f) => f.equivDiamPx * mmpx)), [delin, mmpx]);
  const truth = useMemo(() => summarise(scene.truth.map((f) => f.equivDiamPx * mmpx)), [scene, mmpx]);
  const bins = useMemo(() => sizeHistBins(delin.fragments.map((f) => f.equivDiamPx * mmpx)), [delin, mmpx]);
  const p50Err = truth.p50 > 0 ? Math.abs(recovered.p50 - truth.p50) / truth.p50 : 0;

  const Kpi = ({ label, value }: { label: string; value: string }) => (
    <div className="pf-kpi"><div className="pf-kpi-v">{value}</div><div className="pf-kpi-l">{label}</div></div>
  );
  const mm = (v: number) => `${v.toFixed(0)} mm`;

  const tabs = [
    {
      id: 'pile', label: es ? 'Muckpile' : 'Muckpile',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-th">
            <div className="pf-plot-t">{es ? 'Muckpile + segmentación de fragmentos en vivo (pasa el cursor)' : 'Muckpile + live fragment segmentation (hover)'}</div>
            <button className={`chip ${overlay ? 'on' : ''}`} onClick={() => setOverlay((v) => !v)}>overlay</button>
          </div>
          <SceneView scene={scene} delin={delin} mmPerPx={mmpx} showOverlay={overlay} lang={lang} />
          <div className="pf-kpis">
            <Kpi label="P50" value={mm(recovered.p50)} />
            <Kpi label="P80" value={mm(recovered.p80)} />
            <Kpi label={es ? 'tamaño máx' : 'top size'} value={mm(recovered.topSize)} />
            <Kpi label={es ? 'fragmentos' : 'fragments'} value={`${delin.fragments.length}`} />
            <Kpi label={es ? 'clasificador' : 'method'} value={cnnReady ? 'CNN' : (es ? 'watershed' : 'watershed')} />
          </div>
        </div>
      ),
    },
    {
      id: 'psd', label: es ? 'Curva PSD' : 'PSD curve',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{es ? 'Distribución de tamaño, % pasante vs tamaño (log), recuperada vs verdad + ajuste Rosin–Rammler' : 'Particle-size distribution, % passing vs size (log), recovered vs truth + the Rosin–Rammler fit'}</div>
          <PSDChart recovered={recovered.psd} truth={truth.psd} rr={recovered.rr} lang={lang} />
          <div className="pf-kpis">
            <Kpi label="P10" value={mm(recovered.p10)} />
            <Kpi label="P50" value={mm(recovered.p50)} />
            <Kpi label="P80" value={mm(recovered.p80)} />
            <Kpi label={es ? 'err P50 vs verdad' : 'P50 err vs truth'} value={`${(p50Err * 100).toFixed(0)}%`} />
          </div>
        </div>
      ),
    },
    {
      id: 'hist', label: es ? 'Histograma' : 'Histogram',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{es ? 'Histograma de tamaños de los fragmentos delineados' : 'Size histogram of the delineated fragments'}</div>
          <SizeHist bins={bins} lang={lang} />
        </div>
      ),
    },
    {
      id: 'rr', label: 'Rosin–Rammler',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{es ? 'El ajuste Rosin–Rammler P(x) = 1 − exp(−(x/xc)ⁿ)' : 'The Rosin–Rammler fit P(x) = 1 − exp(−(x/xc)ⁿ)'}</div>
          <div className="pf-kpis">
            <Kpi label={es ? 'xc (tamaño caract.)' : 'xc (characteristic)'} value={mm(recovered.rr.xcMm)} />
            <Kpi label={es ? 'n (uniformidad)' : 'n (uniformity)'} value={recovered.rr.nIndex.toFixed(2)} />
            <Kpi label="r²" value={recovered.rr.r2.toFixed(3)} />
          </div>
          <p className="pf-note">{es
            ? 'xc es el tamaño al 63.2 % pasante; n alto = distribución uniforme, n bajo = amplia. El n de la verdad es ' + truth.rr.nIndex.toFixed(2) + '.'
            : 'xc is the 63.2 %-passing size; high n = uniform, low n = wide. The truth n is ' + truth.rr.nIndex.toFixed(2) + '.'}</p>
        </div>
      ),
    },
    {
      id: 'truth', label: es ? 'vs verdad' : 'vs truth',
      content: (
        <div className="pf-vizstack">
          <table className="cmp-table">
            <thead><tr><th></th><th>P10</th><th>P50</th><th>P80</th><th>{es ? 'tamaño máx' : 'top'}</th><th>n</th></tr></thead>
            <tbody>
              <tr><td><b>{es ? 'recuperada' : 'recovered'}</b></td><td>{mm(recovered.p10)}</td><td>{mm(recovered.p50)}</td><td>{mm(recovered.p80)}</td><td>{mm(recovered.topSize)}</td><td>{recovered.rr.nIndex.toFixed(2)}</td></tr>
              <tr><td><b>{es ? 'verdad' : 'truth'}</b></td><td>{mm(truth.p10)}</td><td>{mm(truth.p50)}</td><td>{mm(truth.p80)}</td><td>{mm(truth.topSize)}</td><td>{truth.rr.nIndex.toFixed(2)}</td></tr>
            </tbody>
          </table>
          <p className="pf-note">{es
            ? `Sesgo de delineación: el P50 recuperado difiere del verdadero en ${(p50Err * 100).toFixed(0)}%. La delineación por imagen es sesgada (aquí sobre-segmenta los bloques grandes); la verdad del generador es la autoridad. Convención: la verdad usa el diámetro nominal del generador (2r) y la recuperada usa diámetros área-equivalentes de las regiones delineadas, así que parte del sesgo reportado es esa convención de unidades, no error de segmentación.`
            : `Delineation bias: the recovered P50 differs from truth by ${(p50Err * 100).toFixed(0)}%. Image delineation is biased (here it over-segments the large blocks); the generator truth is the authority. Convention: truth uses the generator's nominal diameter (2r) while recovered sizes are area-equivalent diameters of the delineated regions, so part of the reported bias is that units convention, not segmentation error.`}</p>
        </div>
      ),
    },
    {
      id: 'learned', label: es ? 'Modelos aprendidos' : 'Learned models',
      content: (
        <div className="pf-vizstack">
          {learned ? (
            <>
              <table className="cmp-table">
                <thead><tr><th>{es ? 'modelo' : 'model'}</th><th>{es ? 'métrica' : 'metric'}</th><th>{es ? 'aprendido' : 'learned'}</th><th>{es ? 'baseline clásico' : 'classical baseline'}</th></tr></thead>
                <tbody>
                  <tr><td>frag-edge CNN</td><td>{es ? `error P50 (test n=${learned.fragEdge.nEval}, tune n=${learned.fragEdge.nTune ?? 8})` : `P50 error (test n=${learned.fragEdge.nEval}, tune n=${learned.fragEdge.nTune ?? 8})`}</td><td><b>{(learned.fragEdge.p50_err_cnn * 100).toFixed(1)}%</b></td><td>{(learned.fragEdge.p50_err_classical * 100).toFixed(1)}%</td></tr>
                  <tr><td>{es ? 'regresor de sesgo' : 'bias regressor'}</td><td>{es ? `error P50 (n=${learned.fines.nEval})` : `P50 error (n=${learned.fines.nEval})`}</td><td><b>{(learned.fines.p50_err_corrected * 100).toFixed(1)}%</b></td><td>{(learned.fines.p50_err_raw * 100).toFixed(1)}%</td></tr>
                </tbody>
              </table>
              <p className="pf-note">{es
                ? 'El regresor de sesgo NO corre en el browser: es una corrección escalar del P50, entrenada y evaluada offline (fq-learned.json), held-out por semilla pero dentro de la misma grilla de regímenes del generador (interpolación, no transferencia).'
                : 'The bias regressor does NOT run in the browser: it is a scalar P50 correction, trained and evaluated offline (fq-learned.json), held-out by seed but within the same generator regime grid (interpolation, not transfer).'}</p>
              <p className="pf-note">{cnnPending
                ? (es ? 'El ONNX del CNN aún no está cargado en esta sesión, usa el toggle "CNN".' : 'The CNN ONNX is not loaded in this session yet, flip the "CNN" toggle.')
                : (es ? 'CNN cargado, el toggle "CNN" re-delinea en vivo (onnxruntime-web).' : 'CNN loaded, the "CNN" toggle re-delineates live (onnxruntime-web).')}</p>
              <p className="pf-cap">{learned.honesty}</p>
            </>
          ) : (
            <div className="pf-pending">
              <strong>{es ? 'Modelos aprendidos: artefacto no cargado' : 'Learned models: artifact not loaded'}</strong>
              <p>{es ? 'fq-learned.json no cargó en esta sesión. Los modelos vienen entrenados en el repo (frag-edge.onnx + fines.onnx); la app usa el watershed clásico EN VIVO mientras tanto. Para re-entrenar: `python -m fqlab.pipeline all --retrain`.' : 'fq-learned.json did not load in this session. The models ship trained in the repo (frag-edge.onnx + fines.onnx); the app uses the classical watershed LIVE meanwhile. To retrain: `python -m fqlab.pipeline all --retrain`.'}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'contract', label: es ? 'Contrato · gate' : 'Contract · gate',
      content: (
        <div className="pf-vizstack">
          {manifest ? (
            <>
              <div className="pf-kpis">
                <Kpi label="lane" value={manifest.lane} />
                <Kpi label="runtimes" value={manifest.gate.runtimes.join(', ')} />
                <Kpi label={es ? 'bytes traza' : 'trace bytes'} value={`${manifest.gate.trace_bytes}`} />
              </div>
              {manifest.flags.length > 0 && <p className="pf-note">⚑ {JSON.stringify(manifest.flags)}</p>}
              <p className="pf-note">{manifest.honesty}</p>
            </>
          ) : <p className="pf-note">{es ? 'cargando manifiesto…' : 'loading manifest…'}</p>}
        </div>
      ),
    },
    {
      id: 'byo', label: es ? 'Datos propios (contrato)' : 'Your data (contract)',
      content: (
        <div className="pf-vizstack">
          <p className="pf-note">{es
            ? 'Este build NO tiene carga de fotos: la App corre solo sobre los casos sintéticos. CONTRATO 1 (data-pipeline/fqlab/io/contract.py, muestra en data/examples/scenes.csv) ya valida del lado Python un descriptor {scene_id, px dims, mm_per_px, scale_known}: rechaza dimensiones o escala no-positivas; marca una escala faltante (la PSD quedaría en píxeles), resolución gruesa y aspecto inusual. La ingesta de fotos en la web es trabajo futuro.'
            : 'This build has NO photo upload: the App runs on the synthetic cases only. CONTRACT 1 (data-pipeline/fqlab/io/contract.py, sample in data/examples/scenes.csv) already validates a descriptor {scene_id, px dims, mm_per_px, scale_known} Python-side: it rejects non-positive dimensions or scale; it flags a missing scale (the PSD would be in pixels), coarse resolution and unusual aspect. In-web photo ingestion is future work.'}</p>
          <p className="pf-cap">{es ? 'Convertir píxeles → mm requiere un objeto de escala conocido (regla, pelota).' : 'Converting pixels → mm requires a known scale object (ruler, ball).'}</p>
        </div>
      ),
    },
    {
      id: 'raw', label: es ? 'Traza' : 'Trace',
      content: (
        <pre className="codeblock" style={{ maxHeight: 360 }}>{JSON.stringify({
          case: theCase.id, regime: theCase.regime, lighting: theCase.lighting, mmPerPx: mmpx,
          recovered: { p10: recovered.p10, p50: recovered.p50, p80: recovered.p80, topSize: recovered.topSize, rr: recovered.rr },
          nFound: delin.fragments.length, p50ErrVsTruth: p50Err,
        }, null, 2)}</pre>
      ),
    },
  ];

  return (
    <div className="page-body pf-layout">
      <aside className="pf-side">
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
        <div className="pf-card">
          <div className="pf-card-t">{es ? 'Controles (en vivo)' : 'Controls (live)'}</div>
          <label className="pf-ctl">{es ? 'escala (unidades)' : 'scale (units)'}: {(theCase.mmPerPx * scaleMul).toFixed(2)} mm/px
            <input className="range" type="range" min={0.5} max={2} step={0.05} value={scaleMul} onChange={(e) => setScaleMul(+e.target.value)} />
          </label>
          <div className="pf-cap pf-muted">{es ? 'Reescala mm/px de la recuperada Y la verdad (solo unidades), no simula error de calibración.' : 'Rescales mm/px for both recovered AND truth (display units only), it does not simulate a calibration error.'}</div>
          <div className="pf-catlabel">{es ? 'delineación' : 'delineation'}</div>
          <div className="pf-chips">
            <button className={`chip ${!useCnn ? 'on' : ''}`} onClick={() => setUseCnn(false)}>watershed</button>
            <button className={`chip ${useCnn ? 'on' : ''}`} onClick={() => setUseCnn(true)} title={cnnPending ? 'CNN pending' : 'CNN'}>CNN{useCnn && cnnPending ? ' ⏳' : ''}</button>
          </div>
          {useCnn && cnnPending && <div className="pf-cap pf-muted">{es ? 'CNN pendiente, usando watershed' : 'CNN pending, using watershed'}</div>}
        </div>
      </aside>
      <main className="pf-main">
        <Tabs tabs={tabs} ariaLabel={es ? 'vistas del muckpile' : 'muckpile views'} />
      </main>
    </div>
  );
}
