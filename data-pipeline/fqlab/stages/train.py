"""Stage 3, train (OFFLINE, heavy lane): fit the two learned models, a fragment-boundary CNN (frag-edge) and a
fines-bias correction regressor (fines), and export them to ONNX. Deterministic (seeded). Delegates to
`fqlab/science/train_frag.py` (torch); writes frag-edge.onnx, fines.onnx and the metrics fq-learned.json to data/derived/."""
