# Guide, bring your own data

The product is **applicable to NEW data**, not just the baked cases, that is what makes it a tool. The door is
**CONTRACT 1** (`data-pipeline/fqlab/io/contract.py`). Honest scope note: the **web app has no photo upload yet**;
bringing your own data today means running the Python pipeline over your scene descriptors.

1. Put your input in the documented standard format (see [`data/README.md`](../../data/README.md)): a scene-descriptor
   CSV with `scene_id,px_width,px_height,mm_per_px[,scale_known,regime,lighting]`, the committed sample is
   [`data/examples/scenes.csv`](../../data/examples/scenes.csv). Drop your file under `data/raw/` (git-ignored).
2. Run the pipeline over it. CONTRACT 1 (`validate_records`) checks each row: **rejected** with a reason if it
   violates the schema/ranges (missing/non-numeric columns, `px` outside `[64, 8000]`, `mm_per_px` outside
   `[0.05, 50]`, unknown `regime`/`lighting`), **flagged** if plausible-but-suspicious (`scale_known=false` → the PSD
   would be in PIXELS, not mm; `mm_per_px > 20` → sub-pixel fines unrecoverable; aspect outside `[0.3, 4]` → unusual
   crop), **accepted** otherwise. Nothing is silently coerced.
3. `validate_image` applies the same policy to a single photo's metadata `{width, height, mm_per_px, scale_known}` , 
   it is the Python-side gate a future in-web ingestion will use (it is **not wired into the SPA yet**).
4. The pipeline produces a compact artifact + manifest (CONTRACT 2) you can replay in the SPA, exactly like the
   built-in cases. The live lane is the TypeScript CV engine (`frontend/src/frag/`) + onnxruntime-web, there is no
   Pyodide lane in this product (see [the live lane](../architecture/04_live-lane.md)).

If your data legitimately doesn't fit, extend CONTRACT 1 (and its tests) **deliberately**, never loosen it just
to make bad data pass.
