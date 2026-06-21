# Cases + categories

Each case (`data-pipeline/fqlab/cases/frag_cases.py`, mirrored in `frontend/src/frag/cases.ts`) declares a **CATEGORY**,
its parameters, an **expected band** (what a domain reader should see), a **validation anchor** (a property the result
MUST satisfy — checked in `frontend/test/contract.test.ts`), and a real|synthetic flag. The **App shows ONE selected
case**; **Experiments/Benchmark show cross-case summaries** (never mixed into the App). All muckpiles are 560×420 px
with a per-case mm/px scale tuned so the characteristic fragment is ~24 px (≈90 fragments pack the surface → a clean PSD).

## The 7-case matrix

| id | category | muckpile | validation anchor |
|---|---|---|---|
| `R-COARSE` | size regime | coarse blast (large blocks), xc=320 mm | P10 ≤ P50 ≤ P80; RR fit r² > 0.85 (tracks the coarse tail) |
| `R-MEDIUM` | size regime | medium fragmentation, xc=180 mm | recovered P50 within ~half of the truth P50 (the reference case) |
| `R-FINE` | size regime | fine / well-blasted, xc=90 mm | P10 ≤ P50 ≤ P80; tracks the truth within the delineation bias (over-segmentation bites hardest here) |
| `I-EVEN` | imaging | medium geology, even lighting | the reference accuracy band |
| `I-SHADOW` | imaging | medium geology, raking light / shadow gradient | the recovered PSD differs from `I-EVEN` (a lighting-sensitivity difference) |
| `C-MONO` | oracle control | mono-disperse (all 120 mm) | **closed-form**: \|recovered P50 − 120\| / 120 < 0.5 |
| `C-KNOWN` | oracle control | known RR(xc=160, n=1.7) | **closed-form**: recovered RR fit r² > 0.85; P10 ≤ P50 ≤ P80 |

The size-regime cases vary the **blast result**; the imaging cases reuse the medium geology and vary the **lighting**
(so the robustness comparison isolates one axis); the controls are the **exactness anchors** (their answer is computable
by hand, so any regression in the delineation/PSD is caught immediately).
