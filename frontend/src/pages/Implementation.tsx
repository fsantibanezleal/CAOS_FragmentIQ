import { Callout, Tabs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Implementation() {
  const es = useShellLang() === 'es';
  return (
    <article className="page-body prose">
      <h1>{es ? 'Implementación' : 'Implementation'}</h1>
      <p className="lede">{es
        ? 'FragmentIQ está instanciado sobre el arquetipo de repo-producto CAOS (ADR-0057): dos contratos de datos, un pipeline por etapas, el gate de lane, y un frontend SPA que ejecuta la CV en vivo.'
        : 'FragmentIQ is instantiated on the CAOS product-repo archetype (ADR-0057): two data contracts, a staged pipeline, the lane gate, and a frontend SPA that runs the CV live.'}</p>

      <Tabs ariaLabel={es ? 'implementación' : 'implementation'} tabs={[
        {
          id: 'lanes', label: 'Lanes',
          content: (
            <div className="pf-doc-sec">
              <ul className="pf-list">
                <li><b>{es ? 'Live (cliente)' : 'Live (client)'}</b>, {es ? 'el generador + el foreground (fijo o Otsu adaptativo) + watershed / componentes conexas / granulometría en TypeScript (frontend/src/frag/) + el CNN de bordes vía onnxruntime-web; re-delinea al cambiar la fuente, el dato, la escala o el método. La vía real decodifica la foto en canvas y ejecuta la misma cadena.' : 'the generator + the foreground (fixed or adaptive Otsu) + watershed / connected components / granulometry in TypeScript (frontend/src/frag/) + the edge CNN via onnxruntime-web; re-delineates as the source, the datum, the scale or the method change. The real lane decodes the photo on a canvas and runs the same chain.'}</li>
                <li><b>{es ? 'Offline (precompute)' : 'Offline (precompute)'}</b>, {es ? 'un precálculo Node ejecuta el mismo motor TS sobre los casos → data/derived/case-results.json; torch entrena el frag-edge CNN + el regresor de sesgo → ONNX.' : 'a Node bake runs the same TS engine over the cases → data/derived/case-results.json; torch trains the frag-edge CNN + the bias regressor → ONNX.'}</li>
                <li><b>{es ? 'Replay (liviano)' : 'Replay (light)'}</b>, {es ? 'el pipeline Python numpy-only reformatea el precálculo en trazas + manifiestos (Contrato 2). Sin torch ni Node → CI/verificación rápida.' : 'the numpy-only Python pipeline reshapes the bake into traces + manifests (Contract 2). No torch/Node → fast CI/verify.'}</li>
              </ul>
              <Callout variant="note" title={es ? 'El gate decide el lane' : 'The gate decides the lane'}>
                {es ? 'Live si es client-side, runtimes ⊆ {ts-cv, onnxruntime-web} y la delineación + la traza caben en presupuesto.' : 'Live if client-side, runtimes ⊆ {ts-cv, onnxruntime-web} and the delineation + trace fit budget.'}
              </Callout>
            </div>
          ),
        },
        {
          id: 'contracts', label: es ? 'Dos contratos' : 'Two contracts',
          content: (
            <div className="pf-doc-sec">
              <p><b>{es ? 'Contrato 1 (ingesta)' : 'Contract 1 (ingestion)'}</b>, {es ? 'io/contract.py valida el descriptor de una escena/foto {scene_id, dims px, mm_per_px, scale_known}: rechaza dimensiones o escala no-positivas; marca una escala faltante (la PSD quedaría en píxeles), resolución gruesa y aspecto inusual. La App ahora trae la vía "Muestra real" con fotos reales empacadas (Yaghoobi 2018, CC BY 4.0): la escala queda sin fijar porque el diámetro de la bola es desconocido, así que las corre en píxeles. La carga arbitraria de fotos del usuario sigue siendo trabajo Python/futuro; convertir píxeles a mm exige un objeto de escala de diámetro conocido.' : 'io/contract.py validates a scene/photo descriptor {scene_id, px dims, mm_per_px, scale_known}: it rejects non-positive dimensions or scale; it flags a missing scale (the PSD would be in pixels), coarse resolution and unusual aspect. The App now ships a "Real sample" lane with bundled real photos (Yaghoobi 2018, CC BY 4.0): scale is left unset because the ball diameter is unknown, so they run in pixels. Arbitrary user photo upload is still Python-side / future; converting pixels to mm needs a scale object of known diameter.'}</p>
              <p><b>{es ? 'Contrato 2 (artefacto)' : 'Contract 2 (artifact)'}</b>, {es ? 'core/{trace,manifest}.py (fragmentiq.trace/v1 + manifest/v2). El frontend tiene un espejo TS (lib/contract.types.ts), una deriva rompe el build con tsc.' : 'core/{trace,manifest}.py (fragmentiq.trace/v1 + manifest/v2). The frontend has a TS mirror (lib/contract.types.ts), a drift breaks the build via tsc.'}</p>
            </div>
          ),
        },
        {
          id: 'learned', label: es ? 'Modelos aprendidos' : 'Learned models',
          content: (
            <Callout variant="honest" title={es ? 'Dos modelos honestos' : 'Two honest models'}>
              {es
                ? '(1) frag-edge: un CNN de bordes por parche que mejora el mapa de bordes que alimenta el watershed (vs el gradiente clásico), medido por el error de P50 vs el clásico y la verdad. (2) regresor de sesgo: una corrección escalar del P50 recuperado hacia la verdad (no modela la cola de finos). Ambos entrenan offline (torch → ONNX) y este build los trae entrenados: frag-edge se ejecuta en vivo (onnxruntime-web, el toggle "CNN"); el regresor no se ejecuta en el navegador, sus métricas offline se muestran desde fq-learned.json. La verdad del generador es la autoridad. Los números frag-edge-vs-clásico están en re-evaluación (issue #12).'
                : '(1) frag-edge: a per-patch boundary CNN that improves the edge map fed to the watershed (vs the classical gradient), measured by the P50 error vs the classical and the truth. (2) bias regressor: a scalar correction of the recovered P50 toward truth (it does not model the fines tail). Both train offline (torch → ONNX) and this build ships them trained: frag-edge runs live (onnxruntime-web, the "CNN" toggle); the regressor does not run in the browser, its offline metrics are displayed from fq-learned.json. The generator truth is the authority. The frag-edge-vs-classical numbers are under re-evaluation (issue #12).'}
            </Callout>
          ),
        },
        {
          id: 'verify', label: es ? 'Verificado en ejecución' : 'Verified running',
          content: (
            <div className="pf-doc-sec">
              <pre className="codeblock">{`# light .venv-pipeline (numpy only)
ruff check data-pipeline tests          # clean
pytest                                  # 9 passed
python -m fqlab.pipeline all            # 7 synthetic cases -> traces + manifests
python scripts/check_artifacts.py       # CONTRACT 2 OK
# byte-identical re-run -> deterministic
cd frontend && npm test                 # frag 4 + contract 4 + real-methods 6 = 14 passed
npm run build                           # tsc + vite green`}</pre>
            </div>
          ),
        },
      ]} />
    </article>
  );
}
