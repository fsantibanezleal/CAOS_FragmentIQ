"""Stage 5, evaluate (the TEST stage, heavy lane): the held-out metrics of the two learned models against their
baselines, the frag-edge CNN's P50 error (and boundary F1) vs the classical-edge watershed, and the fines regressor's
P50 error (corrected vs raw), both scored against the generator's TRUE PSD. Metrics land in fq-learned.json; invoked
by `pipeline.retrain`."""
