import { Callout, Cite, Equation, InlineMath, ReferenceList, Tabs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Methodology() {
  const es = useShellLang() === 'es';
  return (
    <article className="pf-doc">
      <h1>{es ? 'Metodología' : 'Methodology'}</h1>
      <p className="pf-lead">{es
        ? 'Generación sintética → delineación watershed → medición de tamaños → curva PSD → ajuste Rosin–Rammler. La delineación EMERGE del flujo de cuencas sobre la transformada de distancia.'
        : 'Synthetic generation → watershed delineation → size measurement → PSD curve → Rosin–Rammler fit. The delineation EMERGES from the watershed flood over the distance transform.'}</p>

      <Tabs ariaLabel={es ? 'metodología' : 'methodology'} tabs={[
        {
          id: 'gen', label: es ? 'Generación' : 'Generation',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'Los tamaños de fragmento se muestrean de una Rosin–Rammler (CDF inversa) y se dibujan como polígonos convexos rugosos, empacados sin solape (un muckpile real), con gaps oscuros entre fragmentos (los bordes) + sombreado. El generador entrega la imagen RGBA y los fragmentos ground-truth, lo que permite puntuar la PSD recuperada.'
                : 'Fragment sizes are sampled from a Rosin–Rammler (inverse CDF) and drawn as rough convex polygons, packed without overlap (a real muckpile), with dark inter-fragment gaps (the edges) + shading. The generator yields the RGBA image AND the ground-truth fragments, which lets us score the recovered PSD.'}</p>
            </div>
          ),
        },
        {
          id: 'seg', label: es ? 'Delineación' : 'Delineation',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'La delineación es un watershed de marcadores (' : 'The delineation is a marker-controlled watershed ('}<Cite id="vincent1991" paren />{es ? '): umbral del foreground (fragmentos vs gaps) → transformada de distancia → los máximos de la DT son los marcadores (con SUPRESIÓN DE NO-MÁXIMOS: un marcador por fragmento) → flujo descendente por DT que deja crestas en los bordes. Sin la supresión, la DD ruidosa sobre-segmenta.'
                : '): threshold the foreground (fragments vs gaps) → distance transform → the DT maxima are the markers (with NON-MAXIMUM SUPPRESSION: one marker per fragment) → a descending-DT flood leaving ridges at the boundaries. Without NMS the noisy DT over-segments.'}</p>
              <Callout variant="note" title={es ? 'El borde aprendido' : 'The learned edge'}>
                {es ? 'Un CNN de bordes (frag-edge) reemplaza el mapa de bordes clásico (gradiente) por uno aprendido + cierra-gaps, que alimenta el MISMO watershed → menos fusiones/sobre-segmentación. Se mide por el error de P50 vs el watershed clásico y la PSD verdadera.'
                : 'A boundary CNN (frag-edge) replaces the classical (gradient) edge map with a learned, gap-completing one that feeds the SAME watershed → fewer merges/over-segmentation. Measured by the P50 error vs the classical watershed and the true PSD.'}
              </Callout>
            </div>
          ),
        },
        {
          id: 'psd', label: es ? 'PSD' : 'PSD',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'El diámetro equivalente de cada región (' : 'Each region’s equivalent diameter ('}<InlineMath tex="d = \sqrt{4A/\pi}\cdot \text{mm/px}" />{es ? ') alimenta la curva de % pasante POR MASA (∝ d³, la convención). El slider de escala mm/px reconvierte píxeles → mm.' : ') feeds the %-passing curve by MASS (∝ d³, the convention). The mm/px scale slider re-converts pixels → mm.'}</p>
            </div>
          ),
        },
        {
          id: 'rr', label: 'Rosin–Rammler',
          content: (
            <div className="pf-doc-sec">
              <Equation tex="P(x) = 1 - \exp\!\left[-\left(\tfrac{x}{x_c}\right)^{n}\right]" caption={es ? 'P = fracción de masa pasante; xc = tamaño característico (63.2 %); n = índice de uniformidad' : 'P = mass fraction passing; xc = characteristic size (63.2 %); n = uniformity index'} />
              <p>{es ? 'Se ajusta por mínimos cuadrados linealizando: ' : 'Fit by least squares after linearising: '}<InlineMath tex="\ln(-\ln(1-P)) = n\ln x - n\ln x_c" />{es ? '. P10/P50/P80 se leen de la curva.' : '. P10/P50/P80 are read off the curve.'} <Cite id="rosin1933" paren />, <Cite id="cunningham1983" paren />.</p>
              <Callout variant="honest" title={es ? 'El sesgo de imagen' : 'The image bias'}>
                {es ? 'Toda medición por imagen es sesgada (delineación 2-D, oclusión, sobre/sub-segmentación). Lo medimos contra la PSD verdadera del generador y lo reportamos ' : 'Every image measurement is biased (2-D delineation, occlusion, over/under-segmentation). We measure it against the generator’s true PSD and report it '}<Cite id="sanchidrian2009" paren />.
              </Callout>
            </div>
          ),
        },
      ]} />

      <ReferenceList heading={es ? 'Referencias' : 'References'} />
    </article>
  );
}
