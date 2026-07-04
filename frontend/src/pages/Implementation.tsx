import { Callout, Tabs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Implementation() {
  const es = useShellLang() === 'es';
  return (
    <article className="page-body prose">
      <h1>{es ? 'Implementación' : 'Implementation'}</h1>
      <p className="lede">{es
        ? 'FragmentIQ está instanciado sobre el arquetipo de repo-producto CAOS (ADR-0057): dos contratos de datos, un pipeline por etapas, el gate de lane, y un frontend SPA que corre la CV en vivo.'
        : 'FragmentIQ is instantiated on the CAOS product-repo archetype (ADR-0057): two data contracts, a staged pipeline, the lane gate, and a frontend SPA that runs the CV live.'}</p>

      <Tabs ariaLabel={es ? 'implementación' : 'implementation'} tabs={[
        {
          id: 'lanes', label: 'Lanes',
          content: (
            <div className="pf-doc-sec">
              <ul className="pf-list">
                <li><b>{es ? 'Live (cliente)' : 'Live (client)'}</b>, {es ? 'el generador + el watershed en TypeScript (frontend/src/frag/) + el CNN de bordes vía onnxruntime-web; re-delinea al cambiar el caso, la escala o el toggle.' : 'the generator + watershed in TypeScript (frontend/src/frag/) + the edge CNN via onnxruntime-web; re-delineates as the case, the scale or the toggle change.'}</li>
                <li><b>{es ? 'Offline (precompute)' : 'Offline (precompute)'}</b>, {es ? 'un horneado Node corre el MISMO engine TS sobre los casos → data/derived/case-results.json; torch entrena el frag-edge CNN + el regresor de sesgo → ONNX.' : 'a Node bake runs the SAME TS engine over the cases → data/derived/case-results.json; torch trains the frag-edge CNN + the bias regressor → ONNX.'}</li>
                <li><b>{es ? 'Replay (liviano)' : 'Replay (light)'}</b>, {es ? 'el pipeline Python numpy-only reformatea el horneado en trazas + manifiestos (CONTRATO 2). Sin torch ni Node → CI/verificación rápida.' : 'the numpy-only Python pipeline reshapes the bake into traces + manifests (CONTRACT 2). No torch/Node → fast CI/verify.'}</li>
              </ul>
              <Callout variant="note" title={es ? 'El gate decide el lane' : 'The gate decides the lane'}>
                {es ? 'LIVE si es client-side, runtimes ⊆ {ts-cv, onnxruntime-web} y la delineación + la traza caben en presupuesto.' : 'LIVE if client-side, runtimes ⊆ {ts-cv, onnxruntime-web} and the delineation + trace fit budget.'}
              </Callout>
            </div>
          ),
        },
        {
          id: 'contracts', label: es ? 'Dos contratos' : 'Two contracts',
          content: (
            <div className="pf-doc-sec">
              <p><b>{es ? 'Contrato 1 (ingesta)' : 'Contract 1 (ingestion)'}</b>, {es ? 'io/contract.py valida descriptores de escena y la metadata de una foto: rechaza dimensiones/escala no-positivas; marca una escala faltante, resolución gruesa y aspecto inusual. Es la puerta Python para datos externos, la web aún no tiene carga de fotos.' : 'io/contract.py validates scene descriptors and a photo’s metadata: rejects non-positive dimensions/scale; flags a missing scale, coarse resolution and unusual aspect. The Python-side gate for external data, the web app has no photo upload yet.'}</p>
              <p><b>{es ? 'Contrato 2 (artefacto)' : 'Contract 2 (artifact)'}</b>, {es ? 'core/{trace,manifest}.py (fragmentiq.trace/v1 + manifest/v2). El frontend tiene un espejo TS (lib/contract.types.ts), una deriva rompe el build con tsc.' : 'core/{trace,manifest}.py (fragmentiq.trace/v1 + manifest/v2). The frontend has a TS mirror (lib/contract.types.ts), a drift breaks the build via tsc.'}</p>
            </div>
          ),
        },
        {
          id: 'learned', label: es ? 'Modelos aprendidos' : 'Learned models',
          content: (
            <Callout variant="honest" title={es ? 'Dos modelos honestos' : 'Two honest models'}>
              {es
                ? '(1) frag-edge: un CNN de bordes por parche que mejora el mapa de bordes que alimenta el watershed (vs el gradiente clásico), medido por el error de P50 vs el clásico y la verdad. (2) regresor de sesgo: una corrección escalar del P50 recuperado hacia la verdad (no modela la cola de finos). Ambos entrenan offline (torch → ONNX) y este build los trae ENTRENADOS: frag-edge corre en vivo (onnxruntime-web, el toggle "CNN"); el regresor NO corre en el browser, sus métricas offline se muestran desde fq-learned.json. La verdad del generador es la autoridad. Los números frag-edge-vs-clásico están en re-evaluación (issue #12).'
                : '(1) frag-edge: a per-patch boundary CNN that improves the edge map fed to the watershed (vs the classical gradient), measured by the P50 error vs the classical and the truth. (2) bias regressor: a scalar correction of the recovered P50 toward truth (it does not model the fines tail). Both train offline (torch → ONNX) and this build ships them TRAINED: frag-edge runs live (onnxruntime-web, the "CNN" toggle); the regressor does NOT run in the browser, its offline metrics are displayed from fq-learned.json. The generator truth is the authority. The frag-edge-vs-classical numbers are under re-evaluation (issue #12).'}
            </Callout>
          ),
        },
        {
          id: 'verify', label: es ? 'Verificado corriendo' : 'Verified running',
          content: (
            <div className="pf-doc-sec">
              <pre className="codeblock">{`# light .venv-pipeline (numpy only)
ruff check data-pipeline tests          # clean
pytest                                  # 9 passed
python -m fqlab.pipeline all            # 7 cases → traces + manifests
python scripts/check_artifacts.py       # CONTRACT 2 OK
# byte-identical re-run → deterministic
cd frontend && npm test                 # frag 4 + contract 4 = 8 passed
npm run build                           # tsc + vite green`}</pre>
            </div>
          ),
        },
      ]} />
    </article>
  );
}
