// In-app Architecture / "How it works" modal config (ADR-0058) for FragmentIQ.
// Passed to <AppShell config={{ ...config, architecture }}>. The ⓘ header button
// (provided by @fasl-work/caos-app-shell >= 0.1.2) opens the modal. Each tab pairs
// one hand-authored THEMED SVG (frontend/public/svg/tech/, shell CSS-var tokens →
// repaints with the active theme, fetched + inlined) with a bilingual ES/EN body.
import type { ArchitectureConfig } from '@fasl-work/caos-app-shell';

export const architecture: ArchitectureConfig = {
  tabs: [
    {
      id: 'app',
      en: 'The app',
      es: 'La app',
      svg: 'svg/tech/01-the-app.svg',
      body_en:
        'FragmentIQ is a drill & blast product: it answers "how well did the blast fragment the rock?" from a ' +
        'muckpile image. Oversize jams the crusher and slows the mill; excess fines waste explosive. The cheap, ' +
        'fast answer is the particle-size distribution (PSD), and from it P10/P50/P80.\n\n' +
        'It is a real system, not a demo. The delineation + PSD engine (frontend/src/frag/) recomputes live in ' +
        'the browser on every case / scale / model change. A seeded synthetic generator produces the ' +
        'muckpile image AND the ground-truth fragments, so the recovered PSD is scored against truth. A ' +
        'frag-edge CNN (ONNX, client-side) sits next to the classical watershed baseline; a PSD-bias regressor ' +
        'is trained and evaluated offline (its numbers ship as a baked artifact, it does not run in the ' +
        'browser). Contract 1 validates external muckpile descriptors Python-side; the web app itself ships the ' +
        'built-in synthetic cases (no photo upload yet).',
      body_es:
        'FragmentIQ es un producto de tronadura: responde "¿qué tan bien fragmentó la tronadura la roca?" desde ' +
        'una imagen de muckpile. El sobretamaño atasca el chancador y frena el molino; el exceso de finos ' +
        'desperdicia explosivo. La respuesta barata y rápida es la distribución de tamaño de partícula (PSD), y ' +
        'de ella el P10/P50/P80.\n\n' +
        'Es un sistema real, no un demo. El motor de delineación + PSD (frontend/src/frag/) recalcula en vivo en ' +
        'el navegador con cada cambio de caso / escala / modelo. Un generador sintético con semilla produce la ' +
        'imagen de muckpile Y los fragmentos verdaderos, de modo que la PSD recuperada se mide contra la verdad. ' +
        'Un CNN frag-edge (ONNX, en el cliente) acompaña al baseline clásico de watershed; un regresor de sesgo ' +
        'de PSD se entrena y evalúa offline (sus números viajan en un artefacto precalculado, no corre en el ' +
        'navegador). El Contrato 1 valida descriptores de muckpile externos del lado Python; la web en sí trae ' +
        'los casos sintéticos incluidos (aún sin carga de fotos).',
    },
    {
      id: 'lanes',
      en: 'Lanes, web / offline / compute',
      es: 'Carriles, web / offline / cómputo',
      svg: 'svg/tech/02-lanes.svg',
      body_en:
        'Three lanes, and the split is the point. WEB (live, in the browser): the TypeScript delineation engine ' +
        '(frontend/src/frag/) re-runs on every control and onnxruntime-web runs frag-edge.onnx, no server ' +
        '(fines.onnx is evaluated offline; its numbers ship in the baked fq-learned.json and are displayed, not ' +
        'run). offline / COMPUTE (your machine, isolated .venv): the Python pipeline bakes the canonical case ' +
        'artifacts and the heavy lane (--retrain, .venv-precompute, torch) trains the CNN + regressor and exports ' +
        'them to ONNX. REPLAY: the small, committed artifacts in data/derived are overlaid into the SPA by ' +
        'copy-data.mjs and loaded live; the typed mirror (contract.types.ts) fails the build if the web and the ' +
        'pipeline shapes ever diverge.',
      body_es:
        'Tres carriles, y la división es lo central. WEB (en vivo, en el navegador): el motor de delineación en ' +
        'TypeScript (frontend/src/frag/) re-corre con cada control y onnxruntime-web ejecuta frag-edge.onnx, ' +
        'sin servidor (fines.onnx se evalúa offline; sus números viajan en el fq-learned.json precalculado y se ' +
        'muestran, no se ejecutan). offline / CÓMPUTO (tu máquina, .venv aislado): el pipeline Python hornea los ' +
        'artefactos canónicos por caso y el carril pesado (--retrain, .venv-precompute, torch) entrena el CNN + ' +
        'regresor y los exporta a ONNX. REPLAY: los artefactos pequeños y versionados en data/derived se ' +
        'superponen al SPA con copy-data.mjs y se cargan en vivo; el espejo tipado (contract.types.ts) rompe el ' +
        'build si la web y el pipeline divergen.',
    },
    {
      id: 'web-flow',
      en: 'Web-app flow',
      es: 'Flujo de la web',
      svg: 'svg/tech/03-web-flow.svg',
      body_en:
        'The App page recomputes live: inputs (the case selector, the mm/px scale slider and the watershed ⇄ ' +
        'CNN toggle) feed the TypeScript engine and the ' +
        'onnxruntime-web inference, which feed the interactive viz, the segmentation overlay, the PSD curve ' +
        '(uPlot) and the size histogram, each reading values back on hover. The six sibling pages (App · ' +
        'Introduction · Methodology · Implementation · Experiments · Benchmark) are identical across every CAOS ' +
        'product. The build is gated by the contract-type mirror, the artifacts are overlaid by copy-data, vite ' +
        'builds the static output, and GitHub Pages serves it at fragmentiq.fasl-work.com.',
      body_es:
        'La página App recalcula en vivo: las entradas (el selector de casos, el slider ' +
        'de escala mm/px y el toggle watershed ⇄ CNN) alimentan el motor TypeScript y la ' +
        'inferencia onnxruntime-web, que alimentan la visualización interactiva, el overlay de segmentación, la ' +
        'curva PSD (uPlot) y el histograma de tamaños, cada uno devolviendo valores al pasar el cursor. Las seis ' +
        'páginas hermanas (App · Introducción · Metodología · Implementación · Experimentos · Benchmark) son ' +
        'idénticas en todos los productos CAOS. El build lo controla el espejo de tipos del contrato, los ' +
        'artefactos los superpone copy-data, vite construye el estático y GitHub Pages lo sirve en ' +
        'fragmentiq.fasl-work.com.',
    },
    {
      id: 'science',
      en: 'The science',
      es: 'La ciencia',
      svg: 'svg/tech/04-the-science.svg',
      body_en:
        'The algorithm, step by step: ① grayscale + foreground threshold separates rock from the dark gaps ' +
        '(classicalForeground); ② a two-pass chamfer distance transform turns each fragment into a peak whose ' +
        'height ≈ its radius (distanceTransform); ③ DT-maxima become markers with non-maximum suppression so each ' +
        'fragment gets exactly one (delineate, suppression radius ≈ 0.85·DT); ④ a descending-DT flood labels every ' +
        'pixel → per-fragment area aᵢ; ⑤ each area becomes a circle-equivalent diameter dᵢ = 2·√(aᵢ/π)·(mm/px), ' +
        'and the PSD is mass-weighted (% passing ∝ dᵢ³) then fitted to Rosin–Rammler P(x)=1−exp[−(x/xc)ⁿ] by ' +
        'linearised least squares (psdFromSizes, fitRR, summarise) → P10/P50/P80, xc, n.\n\n' +
        'The classical watershed is always on and honest about its bias: it over-segments touching coarse blocks, ' +
        'so P50 reads small. The learned lane refines it, a frag-edge CNN predicts boundaries to cut false ' +
        'splits (run client-side as ONNX next to the baseline), and a PSD-bias regressor applies a scalar ' +
        'correction to the recovered P50 (trained and evaluated offline, it does not run in the browser). The ' +
        'frag-edge numbers are under re-evaluation (issue #12: the recut thresholds were tuned on the eval ' +
        'scenes); nothing is a black box.',
      body_es:
        'El algoritmo, paso a paso: ① grayscale + umbral de foreground separa la roca de los huecos oscuros ' +
        '(classicalForeground); ② una transformada de distancia chamfer de dos pasadas convierte cada fragmento ' +
        'en un pico cuya altura ≈ su radio (distanceTransform); ③ los máximos de la DT se vuelven marcadores con ' +
        'supresión no-máxima para que cada fragmento tenga exactamente uno (delineate, radio de supresión ≈ ' +
        '0.85·DT); ④ una inundación en DT descendente etiqueta cada píxel → área por fragmento aᵢ; ⑤ cada área se ' +
        'vuelve un diámetro de círculo equivalente dᵢ = 2·√(aᵢ/π)·(mm/px), y la PSD se pondera por masa ' +
        '(% pasante ∝ dᵢ³) y se ajusta a Rosin–Rammler P(x)=1−exp[−(x/xc)ⁿ] por mínimos cuadrados linealizados ' +
        '(psdFromSizes, fitRR, summarise) → P10/P50/P80, xc, n.\n\n' +
        'El watershed clásico está siempre activo y es honesto sobre su sesgo: sobre-segmenta los bloques gruesos ' +
        'que se tocan, así que el P50 lee pequeño. El carril aprendido lo refina, un CNN frag-edge predice ' +
        'bordes para cortar divisiones falsas (corre en el cliente como ONNX junto al baseline), y un regresor de ' +
        'sesgo de PSD aplica una corrección escalar al P50 recuperado (entrenado y evaluado offline, no corre en ' +
        'el navegador). Los números frag-edge están en re-evaluación (issue #12: los umbrales del re-corte se ' +
        'ajustaron sobre las escenas de eval); nada es caja negra.',
    },
    {
      id: 'design',
      en: 'Data contracts / design',
      es: 'Contratos de datos / diseño',
      svg: 'svg/tech/05-data-contracts.svg',
      body_en:
        'Two validated data contracts bracket the pipeline. Contract 1 (ingestion) defines a valid muckpile case ' +
        ',  the image/scene plus the mm/px scale, size regime and lighting, with range/NaN guards, so external ' +
        'muckpile data can be validated Python-side (the web app itself has no upload yet). Contract 2 ' +
        '(artifact) defines the output the web reads ' +
        '(per-case recovered vs truth PSD, P10/P50/P80, the Rosin–Rammler fit, the model index), mirrored exactly ' +
        'by contract.types.ts. Between them the staged, deterministic pipeline runs the lane gate (numpy-light by ' +
        'default, --retrain for the heavy CNN/regressor lane) and writes a provenance manifest, so every result ' +
        'is reproducible and the web can never silently drift.',
      body_es:
        'Dos contratos de datos validados encierran el pipeline. El Contrato 1 (ingesta) define un caso de ' +
        'muckpile válido, la imagen/escena más la escala mm/px, el régimen de tamaño y la iluminación, con ' +
        'guardas de rango/NaN, para validar datos de muckpile externos del lado Python (la web en sí aún no ' +
        'tiene carga de datos). El Contrato 2 ' +
        '(artefacto) define la salida que lee la web (PSD recuperada vs verdadera por caso, P10/P50/P80, el ajuste ' +
        'Rosin–Rammler, el índice de modelos), espejada exactamente por contract.types.ts. Entre ambos, el ' +
        'pipeline por etapas y determinista corre el lane gate (numpy-light por defecto, --retrain para el carril ' +
        'pesado del CNN/regresor) y escribe un manifest de procedencia, de modo que cada resultado es reproducible ' +
        'y la web nunca diverge en silencio.',
    },
  ],
};
