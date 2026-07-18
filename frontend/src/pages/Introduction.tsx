import { Callout, Cite, Tabs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Introduction() {
  const es = useShellLang() === 'es';
  return (
    <article className="page-body prose">
      <h1>{es ? 'Introducción' : 'Introduction'}</h1>
      <p className="lede">{es
        ? 'FragmentIQ mide la fragmentación de un muckpile a partir de una imagen (sintética en este build): segmenta los fragmentos de roca, mide cada tamaño, y arma la distribución de tamaño de partícula (PSD) con un ajuste Rosin–Rammler, P10/P50/P80. Es la herramienta que cierra el lazo entre la voladura y la planta.'
        : 'FragmentIQ measures muckpile fragmentation from an image (synthetic in this build): it segments the rock fragments, measures each size, and builds the particle-size distribution (PSD) with a Rosin–Rammler fit, P10/P50/P80. It is the tool that closes the loop between the blast and the plant.'}</p>

      <Callout variant="strong" title={es ? 'Toda la CV corre EN VIVO en tu browser' : 'All the CV runs LIVE in your browser'}>
        {es
          ? 'El generador de muckpile, la delineación watershed y el ajuste PSD corren en TypeScript en el browser; el CNN de bordes corre vía onnxruntime-web. Seleccionar un caso y la PSD se recalcula al instante; el slider de escala (mm/px) reescala las unidades. (Este build no tiene carga de fotos.)'
          : 'The muckpile generator, the watershed delineation and the PSD fit run in TypeScript in the browser; the edge CNN runs via onnxruntime-web. Pick a case and the PSD re-computes instantly; the scale slider (mm/px) rescales the units. (This build has no photo upload.)'}
      </Callout>

      <Tabs ariaLabel={es ? 'introducción' : 'introduction'} tabs={[
        {
          id: 'what', label: es ? 'Qué es' : 'What it is',
          content: (
            <div className="pf-doc-sec">
              <p>{es
                ? 'Tras una voladura, la distribución de tamaños del muckpile gobierna el carguío, el chancado y el throughput del molino. Las herramientas de imagen (WipFrag, Split-Desktop) DELINEAN los fragmentos en la foto, miden cada tamaño y arman la curva de % pasante. FragmentIQ hace eso: delinea con watershed, ajusta Rosin–Rammler '
                : 'After a blast, the muckpile size distribution governs loading, crushing and mill throughput. Image tools (WipFrag, Split-Desktop) DELINEATE the fragments in the photo, measure each size and build the cumulative passing curve. FragmentIQ does that: it delineates with watershed, fits Rosin–Rammler '}
                <Cite id="maerz1996" paren />, <Cite id="rosin1933" paren />.</p>
              <p>{es
                ? 'Incluye 3 regímenes de tamaño (gruesa/media/fina), escenarios de iluminación, y controles oráculo (mono-disperso y RR conocida) verificables a mano.'
                : 'It ships 3 size regimes (coarse/medium/fine), lighting scenarios, and hand-verifiable oracle controls (mono-disperse and a known RR).'}</p>
            </div>
          ),
        },
        {
          id: 'why', label: es ? 'Por qué importa' : 'Why it matters',
          content: (
            <div className="pf-doc-sec">
              <p>{es
                ? 'El P80 del muckpile entra directo a los modelos de throughput del chancado/molino; medirlo barato y rápido cierra el lazo mina-planta. El ajuste Rosin–Rammler (la base de Kuz-Ram '
                : 'The muckpile P80 feeds the crusher/mill throughput models directly; measuring it cheaply and fast closes the mine-plant loop. The Rosin–Rammler fit (the basis of Kuz-Ram '}
                <Cite id="cunningham1983" paren />{es ? ') resume la curva en xc y n; el Swebrec ' : ') summarises the curve as xc and n; the Swebrec function '}<Cite id="ouchterlony2005" paren />{es ? ' la extiende a finos.' : ' extends it to the fines.'}</p>
            </div>
          ),
        },
        {
          id: 'honesty', label: es ? 'Honestidad' : 'Honesty',
          content: (
            <Callout variant="honest" title={es ? 'Qué es real y qué es sintético' : 'What is real and what is synthetic'}>
              {es
                ? 'Las imágenes de muckpile son SINTÉTICAS (fragmentos procedurales dimensionados por Rosin–Rammler), no hay fotos reales. La delineación y la PSD son reales: se puntúan contra el ground-truth del generador. Los controles MONO/KNOWN tienen respuesta cerrada. La delineación por imagen es SESGADA (aquí el watershed sobre-segmenta los bloques grandes); los modelos aprendidos apuntan a reducir, no eliminar, ese sesgo, medidos contra el watershed clásico y la PSD verdadera. Los números frag-edge-vs-clásico están en re-evaluación (issue #12: los umbrales del re-corte se ajustaron sobre las mismas escenas de eval).'
                : 'The muckpile images are SYNTHETIC (procedural fragments sized by Rosin–Rammler), there are no real photos. The delineation + PSD are real: scored against the generator ground truth. The MONO/KNOWN controls are closed-form. Image delineation is BIASED (here the watershed over-segments the large blocks); the learned models aim to reduce, not eliminate, that bias, measured against the classical watershed and the true PSD. The frag-edge-vs-classical numbers are under re-evaluation (issue #12: the recut thresholds were tuned on the same eval scenes).'}
            </Callout>
          ),
        },
      ]} />
    </article>
  );
}
