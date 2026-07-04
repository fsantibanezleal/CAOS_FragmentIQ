# Framework, the CV pipeline

The CV science. FragmentIQ goes from a muckpile image to a particle-size distribution in five steps, all
browser-runnable ([`frontend/src/frag/`](../../frontend/src/frag/)).

## 1. Synthetic generation (`scene.ts` + `rng.ts`)

Rock fragments are rough convex polygons whose **sizes follow a Rosin–Rammler distribution** (`rrSample`, seeded
mulberry32), placed by non-overlap **tiling** (rejection sampling, they touch but barely overlap, like a real
muckpile) on a dark background so the inter-fragment shadow gaps are visible. Each fragment is radially shaded (lit
centre, dark rim) with optional raking-light/shadow. The generator returns the RGBA image, the ground-truth fragments,
**and a per-pixel ground-truth fragment-id map** (`scene.labels`), the authority the recovery is scored against and
the supervision for the frag-edge CNN.

## 2. Foreground (`watershed.ts :: classicalForeground`)

Grayscale → threshold (fragments are brighter than the dark gaps) → a 1-px erosion so touching fragments separate at
their rim. This is the WipFrag/Split-style classical foreground ([Maerz 1996](#refs)).

## 3. Watershed delineation (`watershed.ts :: distanceTransform → delineate`)

A two-pass chamfer **distance transform** turns each fragment into a peak whose height ≈ its radius. DT-maxima become
markers with **non-maximum suppression** (suppression radius ≈ 0.85·DT) so each fragment gets exactly one marker (this
is what fixed the original 5× over-segmentation). A descending-DT neighbour-voting **flood** labels every foreground
pixel, leaving ridges at the boundaries, the marker-controlled watershed ([Vincent & Soille 1991](#refs)). Each
labelled region's area → an equivalent circle diameter `d = 2·√(area/π)·(mm/px)`.

## 4. PSD + Rosin–Rammler (`rosinrammler.ts`)

The fragment diameters become a **mass-weighted** cumulative passing curve: `% passing(x) = 100·Σ[dᵢ≤x] dᵢ³ / Σ dᵢ³`
(coarse blocks dominate the mass, hence dᵢ³). `summarise` extracts P10/P50/P80 and the top size. `fitRR` fits
**Rosin–Rammler** `P(x)=1−exp[−(x/xc)ⁿ]` by linearised least squares (`ln(−ln(1−P)) = n·ln x − n·ln xc`) →
characteristic size `xc`, uniformity `n`, and r² ([Rosin & Rammler 1933](#refs), [Cunningham 1983](#refs)); the Swebrec
function ([Ouchterlony 2005](#refs)) is the documented fines extension.

## 5. Score vs truth (`analyze.ts`)

`analyzeClassical` delineates with the classical foreground; `analyzeWithForeground` accepts the CNN-refined foreground.
Both compare the recovered PSD against the generator's ground-truth PSD, the headline accuracy is the relative P50
error. Image-based delineation has a **known over-segmentation bias** ([Sanchidrián 2009](#refs)); FragmentIQ states it
rather than hiding it.

<a id="refs"></a>
**References:** Rosin & Rammler 1933 · Cunningham 1983 (Kuz-Ram) · Ouchterlony 2005 (Swebrec) · Vincent & Soille 1991
(watershed) · Maerz 1996 (WipFrag) · Sanchidrián 2009 (image-analysis accuracy). Full list in
`frontend/src/data/citations.ts` + the in-app Methodology page.
