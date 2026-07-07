import { Callout, Cite, Equation, InlineMath, ReferenceList, Tabs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Methodology() {
  const es = useShellLang() === 'es';
  return (
    <article className="page-body prose">
      <h1>{es ? 'Metodología' : 'Methodology'}</h1>
      <p className="lede">{es
        ? 'Dos fuentes, un mismo motor de medición. Sintética: generación Rosin-Rammler con verdad del generador. Real: fotos post-tronadura reales sin verdad de harneo (estimación RELATIVA). Ambas alimentan la misma cadena: foreground (umbral fijo o Otsu adaptativo) a delineación (watershed / CNN / componentes conexas) o granulometría sin-delineación, a curva PSD y ajuste Rosin-Rammler.'
        : 'Two sources, one measurement engine. Synthetic: Rosin-Rammler generation with generator truth. Real: genuine post-blast photos with no sieve truth (a RELATIVE estimate). Both feed the same chain: foreground (fixed threshold or adaptive Otsu), then delineation (watershed / CNN / connected components) or a delineation-free granulometry, then the PSD curve and the Rosin-Rammler fit.'}</p>

      <Tabs ariaLabel={es ? 'metodología' : 'methodology'} tabs={[
        {
          id: 'gen', label: es ? 'Generación' : 'Generation',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'Los tamaños de fragmento se muestrean de una Rosin-Rammler (CDF inversa) y se dibujan como polígonos convexos rugosos, empacados sin solape (un muckpile real), con gaps oscuros entre fragmentos (los bordes) + sombreado. El generador entrega la imagen RGBA y los fragmentos ground-truth, lo que permite puntuar la PSD recuperada.'
                : 'Fragment sizes are sampled from a Rosin-Rammler (inverse CDF) and drawn as rough convex polygons, packed without overlap (a real muckpile), with dark inter-fragment gaps (the edges) + shading. The generator yields the RGBA image AND the ground-truth fragments, which lets us score the recovered PSD.'}</p>
            </div>
          ),
        },
        {
          id: 'seg', label: es ? 'Delineación' : 'Delineation',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'La delineación por defecto es un watershed de marcadores (' : 'The default delineation is a marker-controlled watershed ('}<Cite id="vincent1991" paren />{es ? '): umbral del foreground (fragmentos vs gaps) a transformada de distancia a los máximos de la DT son los marcadores (con SUPRESIÓN DE NO-MÁXIMOS: un marcador por fragmento) a flujo descendente por DT que deja crestas en los bordes. Sin la supresión, la DT ruidosa sobre-segmenta.'
                : '): threshold the foreground (fragments vs gaps), then a distance transform; the DT maxima are the markers (with NON-MAXIMUM SUPPRESSION: one marker per fragment); a descending-DT flood leaves ridges at the boundaries. Without NMS the noisy DT over-segments.'}</p>
              <p>{es ? 'La App ofrece tres delineadores en vivo para acotar la elección: watershed, el CNN de bordes, y componentes conexas (etiqueta cada blob conexo como un fragmento: NO separa fragmentos que se tocan, sub-segmenta en pilas densas). Su desacuerdo es una medida honesta de la incertidumbre del método.'
                : 'The App offers three live delineators to bracket the choice: watershed, the boundary CNN, and connected components (labels each connected blob as one fragment: it does NOT split touching fragments, so it under-segments in dense piles). Their disagreement is an honest measure of method uncertainty.'}</p>
              <Callout variant="note" title={es ? 'El borde aprendido' : 'The learned edge'}>
                {es ? 'Un CNN de bordes (frag-edge) reemplaza el mapa de bordes clásico por uno aprendido + cierra-gaps, que alimenta el MISMO watershed a menos fusiones/sobre-segmentación. Se mide por el error de P50 vs el watershed clásico y la PSD verdadera (ver Benchmark).'
                : 'A boundary CNN (frag-edge) replaces the classical edge map with a learned, gap-completing one that feeds the SAME watershed, for fewer merges/over-segmentation. Measured by the P50 error vs the classical watershed and the true PSD (see Benchmark).'}
              </Callout>
            </div>
          ),
        },
        {
          id: 'real', label: es ? 'Vía real' : 'Real lane',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'La fuente "Muestra real" corre exactamente la misma cadena sobre fotos reales post-tronadura (' : 'The "Real sample" source runs the exact same chain on genuine post-blast photos ('}<Cite id="yaghoobi2018" paren />{es ? '), CC BY 4.0. Como una foto no tiene fondo controlado, el foreground usa un umbral ADAPTATIVO de Otsu (' : '), CC BY 4.0. Because a photo has no controlled background, the foreground uses an ADAPTIVE Otsu threshold ('}<Cite id="otsu1979" paren />{es ? ') en vez del umbral fijo, elegido de la propia imagen por máxima varianza entre clases. La bola roja de escala se detecta por color y se EXCLUYE del foreground (no es roca).'
                : ') instead of the fixed threshold, chosen from the image itself by maximum between-class variance. The red scale ball is detected by colour and EXCLUDED from the foreground (it is not rock).'}</p>
              <Callout variant="honest" title={es ? 'RELATIVA, no exactitud' : 'RELATIVE, not accuracy'}>
                {es ? 'NO existe ningún dataset abierto que pareee una foto de muckpile con una PSD medida por harneo. Por eso toda cifra en la vía real es una estimación RELATIVA basada en imagen, no una exactitud contra la verdad. Además el diámetro físico de la bola de escala no está documentado, así que la escala queda sin fijar y los tamaños se reportan en píxeles.'
                  : 'NO open dataset pairs a muckpile photo with a sieve-measured PSD. So every figure in the real lane is a RELATIVE, image-based estimate, not an accuracy against truth. The scale ball physical diameter is also undocumented, so scale is left unset and sizes are reported in pixels.'} <Cite id="sanchidrian2009" paren />
              </Callout>
            </div>
          ),
        },
        {
          id: 'gran', label: es ? 'Granulometría' : 'Granulometry',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'La granulometría morfológica estima la distribución de tamaños SIN delinear (' : 'Morphological granulometry estimates the size distribution WITHOUT delineating ('}<Cite id="serra1982" paren />{es ? '): se abre el foreground con un elemento estructurante de radio r creciente; una apertura de radio r borra toda estructura más delgada que ~2r, así que el área perdida entre radios sucesivos (el espectro de patrón) es la cantidad de material a ese tamaño. El área acumulada removida hasta r es la fracción más fina que 2r.'
                : '): the foreground is opened with a structuring element of increasing radius r; an opening by radius r removes every structure thinner than ~2r, so the area lost between successive radii (the pattern spectrum) is the amount of material at that size. The cumulative area removed up to r is the fraction finer than 2r.'}</p>
              <p>{es ? 'En la vía real esta curva (ponderada por ÁREA) es la REFERENCIA sin-delineación contra la que se compara la PSD delineada: dos métodos independientes basados en imagen, su diferencia acota la incertidumbre.'
                : 'In the real lane this curve (AREA-weighted) is the delineation-free REFERENCE that the delineation PSD is compared against: two independent image-based methods, their difference brackets the uncertainty.'}</p>
            </div>
          ),
        },
        {
          id: 'psd', label: es ? 'PSD' : 'PSD',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'El diámetro equivalente de cada región (' : 'Each region equivalent diameter ('}<InlineMath tex="d = \sqrt{4A/\pi}\cdot \text{mm/px}" />{es ? ') alimenta la curva de % pasante POR MASA (proporcional a d^3, la convención). En sintética el slider de escala reconvierte píxeles a mm; en real la escala queda sin fijar y la curva va en píxeles.' : ') feeds the %-passing curve by MASS (proportional to d^3, the convention). In synthetic the scale slider re-converts pixels to mm; in real the scale is unset and the curve is in pixels.'}</p>
            </div>
          ),
        },
        {
          id: 'rr', label: 'Rosin-Rammler',
          content: (
            <div className="pf-doc-sec">
              <Equation tex="P(x) = 1 - \exp\!\left[-\left(\tfrac{x}{x_c}\right)^{n}\right]" caption={es ? 'P = fracción de masa pasante; xc = tamaño característico (63.2 %); n = índice de uniformidad' : 'P = mass fraction passing; xc = characteristic size (63.2 %); n = uniformity index'} />
              <p>{es ? 'Se ajusta por mínimos cuadrados linealizando: ' : 'Fit by least squares after linearising: '}<InlineMath tex="\ln(-\ln(1-P)) = n\ln x - n\ln x_c" />{es ? '. P10/P50/P80 se leen de la curva.' : '. P10/P50/P80 are read off the curve.'} <Cite id="rosin1933" paren />, <Cite id="cunningham1983" paren />.</p>
              <Callout variant="honest" title={es ? 'El sesgo de imagen' : 'The image bias'}>
                {es ? 'Toda medición por imagen es sesgada (delineación 2-D, oclusión, sobre/sub-segmentación). En sintética lo medimos contra la PSD verdadera del generador; en real solo podemos reportar acuerdo RELATIVO entre métodos.' : 'Every image measurement is biased (2-D delineation, occlusion, over/under-segmentation). In synthetic we measure it against the generator true PSD; in real we can only report RELATIVE agreement between methods.'} <Cite id="sanchidrian2009" paren />
              </Callout>
            </div>
          ),
        },
        {
          id: 'sota', label: es ? 'Seg. profunda (SOTA)' : 'Deep seg (SOTA)',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'El estado del arte en delineación de fragmentos usa segmentación profunda: U-Net (' : 'The state of the art in fragment delineation uses deep segmentation: U-Net ('}<Cite id="ronneberger2015" paren />{es ? ') y, más recientemente, el Segment Anything Model (' : ') and, more recently, the Segment Anything Model ('}<Cite id="kirillov2023" paren />{es ? '), aplicado a roca tronada por ' : '), applied to blasted rock by '}<Cite id="zhao2024" paren />{es
                ? '. Es una REFERENCIA citada: entrenar o evaluar SAM está fuera del presupuesto en-navegador de este build (correría offline en el pipeline). Nuestro CNN de bordes vive dentro del presupuesto live y es honesto sobre su alcance sintético.'
                : '. It is a cited REFERENCE: training or evaluating SAM is outside this build in-browser budget (it would run offline in the pipeline). Our boundary CNN lives inside the live budget and is honest about its synthetic scope.'}</p>
            </div>
          ),
        },
      ]} />

      <ReferenceList heading={es ? 'Referencias' : 'References'} />
    </article>
  );
}
