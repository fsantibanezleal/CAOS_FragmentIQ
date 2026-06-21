"""Stage 2 — feature_extraction (heavy lane): assemble the learned-model training data — fragment-boundary patches +
labels (from the generator's ground-truth edges) for frag-edge, and the raw-vs-truth PSD-feature pairs for the fines
regressor (`fqlab/science/gen_train.mjs`). The patch/feature contracts are the SOURCE OF TRUTH in fqlab/model/learned.py."""
