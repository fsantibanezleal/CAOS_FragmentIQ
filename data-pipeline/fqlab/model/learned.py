"""Feature contracts for the two learned models (the SINGLE SOURCE OF TRUTH shared by the offline trainer
science/train_frag.py and the in-browser inference). Both are honest, value-adding ML measured against a CLASSICAL
baseline / the generator truth — NOT bolted-on. Both train OFFLINE (torch → ONNX); frag-edge runs LIVE
(onnxruntime-web), the fines regressor is evaluated offline only (its numbers ship in fq-learned.json — it is not
loaded in the browser).

1. frag-edge — a per-PATCH fragment-BOUNDARY CNN. Input: a PATCH×PATCH grayscale patch → output: P(boundary). The
   learned boundary map (sharper, gap-completing) feeds the SAME watershed as the classical gradient edge, reducing the
   merging/over-segmentation that biases the recovered PSD. Benchmarked by the resulting P50 error vs the classical
   edge (and the generator truth).

2. fines — a fines-bias CORRECTION regressor. Input: a few PSD-shape features of the raw (image-derived) recovered PSD
   (P50, P80/P50, the count, the fine-fraction) → output: a scalar multiplicative correction applied to the recovered
   P50 (it does NOT model the fines tail). Image delineation is biased (over-segmentation / 2-D area underestimation);
   this nudges the recovered P50 toward the generator truth. Benchmarked by the P50 error (raw vs corrected vs truth).
   It REDUCES — not eliminates — the bias; the generator PSD is the authority.
"""
from __future__ import annotations

PATCH = 16                                  # matches frontend src/frag (edge patch)
FRAG_EDGE_INPUT_SHAPE = (1, 1, PATCH, PATCH)  # grayscale
FRAG_EDGE_INPUT_NAME = "x"
FRAG_EDGE_OUTPUT_NAME = "p"                  # P(boundary)

FINES_FEATURES = ("p50_mm", "p80_over_p50", "log_count", "fine_fraction")
FINES_INPUT = len(FINES_FEATURES)
FINES_INPUT_NAME = "x"
FINES_OUTPUT_NAME = "k"                      # scalar multiplicative P50 correction factor
