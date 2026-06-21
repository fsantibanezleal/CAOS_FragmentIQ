# Framework — the visualisation stack

FragmentIQ uses one renderer per data type (per the CAOS interactive-visualisation rubric), all interactive and
theme-aware where appropriate.

| Renderer | Where | What it draws |
|---|---|---|
| **canvas** (`viz/SceneView.tsx`) | the App's Muckpile tab | the muckpile image + the live segmentation overlay: each delineated fragment tinted by label, ridges drawn white, the CNN-vs-watershed difference visible; hover reads the fragment size (mm) and equivalent diameter. |
| **µPlot** (`viz/PSDChart.tsx`) | the PSD curve tab | the recovered + ground-truth cumulative passing curves + the Rosin–Rammler fit, log-x; hover reads `(size, % passing)`; P10/P50/P80 marked. |
| **µPlot** (`viz/SizeHist.tsx`) | the histogram tab | a log-spaced size-class histogram of the recovered fragments. |
| **`@fasl-work/caos-app-shell`** | the whole app | the shared header/nav/theme/language chrome + the doc-kit (Tabs, Callout, Equation/KaTeX, Figure, Cite) + the ⓘ **Architecture modal** (ADR-0058). This is what makes every Faena app a visual sibling. |

The fragment tints are label-keyed (theme-independent) so the segmentation reads the same in light and dark; the chrome,
the chart axes and the PSD/RR curves follow the theme tokens. Every panel **reacts to the case selector** + the live
delineation (the mm/px scale slider, the foreground threshold, the watershed↔CNN toggle); aggregate/cross-case views
(the recovered-vs-truth table, the size-regime ordering, CNN-vs-classical) live in **Benchmark/Experiments**, never in
the App (per the design rule).
