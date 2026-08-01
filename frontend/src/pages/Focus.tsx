// ADR-0070 scenario focus view: one selected muckpile, full page, nothing competing with the image.
//
// ADDITIVE. The App (Tool.tsx) keeps every tab and all its explanation; this route is a second way to look
// at the SAME pile through the SAME delineation. It renders OUTSIDE <AppShell> on purpose: the shell header
// and footer are exactly the chrome a focus view exists to escape.
//
// The stage is the IMAGE WITH ITS DELINEATION OVERLAY, because fragmentation analysis is judged by eye
// before it is judged by a curve: the question is whether those outlines are the fragments a blast engineer
// would have drawn. A PSD curve cannot answer that, and a wrong delineation produces a perfectly smooth
// curve. The overlay toggles off so the judgement can actually be made.

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShellLang } from '@fasl-work/caos-app-shell';
import { CASES, caseSpec, type FragCase } from '../frag/cases.ts';
import { classicalForeground, connectedComponents, delineateClassical, summarise } from '../frag/index.ts';
import { makeScene } from '../frag/index.ts';
import { SceneView } from '../viz/SceneView.tsx';

/** What the recovered size distribution MEANS against the generator's ground truth.
 *
 *  This is the SYNTHETIC lane, where a true size distribution exists because the scene was generated. The
 *  error below is therefore a real measure of delineation quality, not a self-assessment. On the App's real
 *  lane no sieve PSD exists and no such error can be quoted; that distinction is stated in the rail. */
function fitState(p50Err: number, es: boolean): { label: string; text: string } {
  if (p50Err < 0.1) {
    return {
      label: es ? 'Delineacion fiel' : 'Faithful delineation',
      text: es
        ? `El P50 recuperado cae a ${(p50Err * 100).toFixed(0)}% de la verdad del generador: los contornos siguen los fragmentos reales, no el ruido de la imagen.`
        : `The recovered P50 lands within ${(p50Err * 100).toFixed(0)}% of the generator's truth: the outlines are following real fragments rather than image noise.`,
    };
  }
  if (p50Err < 0.25) {
    return {
      label: es ? 'Sesgo moderado' : 'Moderate bias',
      text: es
        ? `El P50 se desvia ${(p50Err * 100).toFixed(0)}% de la verdad. Normalmente es fusion de finos o division de bloques grandes: mira los contornos, no la curva.`
        : `The recovered P50 is off by ${(p50Err * 100).toFixed(0)}%. That is usually fines merging or large blocks splitting: look at the outlines, not the curve.`,
    };
  }
  return {
    label: es ? 'Delineacion no fiable' : 'Unreliable delineation',
    text: es
      ? `El P50 se desvia ${(p50Err * 100).toFixed(0)}% de la verdad del generador. La curva PSD seguira viendose suave y creible: una delineacion equivocada produce una curva perfectamente lisa, y por eso la imagen es el juez.`
      : `The recovered P50 is off by ${(p50Err * 100).toFixed(0)}% from the generator's truth. The PSD curve will still look smooth and plausible: a wrong delineation produces a perfectly smooth curve, which is exactly why the image is the judge.`,
  };
}

export default function Focus() {
  const { caseId } = useParams();
  const es = useShellLang() === 'es';
  const theCase = useMemo<FragCase>(() => CASES.find((c) => c.id === caseId) ?? CASES[0], [caseId]);

  const [overlay, setOverlay] = useState(true);
  const [scaleMul, setScaleMul] = useState(1);
  const [method, setMethod] = useState<'watershed' | 'cc'>('watershed');

  const scene = useMemo(() => makeScene(caseSpec(theCase)), [theCase]);
  // The SAME delineation the App runs on its synthetic lane.
  const delin = useMemo(() => {
    if (!scene) return null;
    if (method === 'cc') {
      return connectedComponents(classicalForeground(scene), scene.width, scene.height);
    }
    return delineateClassical(scene);
  }, [scene, method]);

  const mmpx = theCase.mmPerPx * scaleMul;
  const recovered = useMemo(
    () => summarise((delin?.fragments ?? []).map((f) => f.equivDiamPx * mmpx)), [delin, mmpx]);
  const truth = useMemo(
    () => (scene ? summarise(scene.truth.map((f) => f.equivDiamPx * mmpx)) : null), [scene, mmpx]);
  const p50Err = truth && truth.p50 > 0 ? Math.abs(recovered.p50 - truth.p50) / truth.p50 : 0;

  const st = fitState(p50Err, es);

  const hud = [
    { v: `${recovered.p50.toFixed(0)} mm`, l: 'P50', tone: 'accent' },
    { v: `${recovered.p80.toFixed(0)} mm`, l: 'P80' },
    { v: `${(p50Err * 100).toFixed(0)}%`, l: es ? 'error P50' : 'P50 error', tone: 'blue' },
    { v: `${truth ? truth.p50.toFixed(0) : '-'} mm`, l: es ? 'P50 verdad' : 'true P50' },
    { v: `${recovered.nFragments}`, l: es ? 'fragmentos' : 'fragments' },
    { v: recovered.rr.nIndex.toFixed(2), l: 'RR n' },
  ];

  return (
    <div className="fqf">
      <div className="fqf-stage">
        {delin
          ? <SceneView scene={scene} delin={delin} mmPerPx={mmpx} showOverlay={overlay}
                       height={0} lang={es ? 'es' : 'en'} unit="mm" />
          : <div className="fqf-empty">{es ? 'Delineando…' : 'Delineating…'}</div>}

        <div className="fqf-badge">
          <div className="fqf-badge-t">{st.label}</div>
          <div className="fqf-badge-d">{st.text}</div>
        </div>

        <div className="fqf-hud">
          {hud.map((h) => (
            <div className="fqf-hud-item" key={h.l}>
              <div className={`fqf-hud-v${h.tone ? ' ' + h.tone : ''}`}>{h.v}</div>
              <div className="fqf-hud-l">{h.l}</div>
            </div>
          ))}
        </div>

        <Link className="fqf-exit" to="/">{es ? 'Volver a la app' : 'Back to the app'}</Link>
      </div>

      <aside className="fqf-rail">
        <div className="fqf-title">{theCase.name ?? theCase.id}</div>
        <div className="fqf-sub">{theCase.id} · synthetic</div>

        <div className="fqf-seg">
          <button className={overlay ? 'on' : ''} onClick={() => setOverlay(true)}>{es ? 'Con contornos' : 'With outlines'}</button>
          <button className={!overlay ? 'on' : ''} onClick={() => setOverlay(false)}>{es ? 'Imagen sola' : 'Image only'}</button>
        </div>

        <div className="fqf-seg">
          <button className={method === 'watershed' ? 'on' : ''} onClick={() => setMethod('watershed')}>Watershed</button>
          <button className={method === 'cc' ? 'on' : ''} onClick={() => setMethod('cc')}>{es ? 'Componentes' : 'Components'}</button>
        </div>

        <label className="fqf-ctl">
          <span className="fqf-ctl-l">{es ? 'Escala' : 'Scale'}<b>{(theCase.mmPerPx * scaleMul).toFixed(2)} mm/px</b></span>
          <input type="range" min={0.5} max={2} step={0.05} value={scaleMul} onChange={(e) => setScaleMul(+e.target.value)} />
        </label>

        <div className="fqf-note">
          {es
            ? 'Este es el carril SINTETICO, donde existe una distribucion verdadera porque la escena fue generada, asi que el error del P50 mide de verdad la calidad de la delineacion. En el carril real de la App no existe PSD de harneo y ningun error de ese tipo puede citarse. Compara "Con contornos" e "Imagen sola": una delineacion equivocada igual produce una curva PSD perfectamente suave, por eso la imagen es el juez.'
            : 'This is the SYNTHETIC lane, where a true distribution exists because the scene was generated, so the P50 error genuinely measures delineation quality. On the App\\u2019s real lane no sieve PSD exists and no such error can be quoted. Toggle "With outlines" against "Image only": a wrong delineation still produces a perfectly smooth PSD curve, which is why the image is the judge.'}
        </div>

        <div className="fqf-cases">
          {CASES.slice(0, 12).map((c) => (
            <Link key={c.id} to={`/focus/${c.id}`} className={c.id === theCase.id ? 'on' : ''}>{c.id}</Link>
          ))}
        </div>
      </aside>
    </div>
  );
}
