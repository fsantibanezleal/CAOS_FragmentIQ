"""The learned-model contracts. FragmentIQ's CV core (the muckpile generator + watershed delineation + the PSD fit) is
the TypeScript engine in frontend/src/frag/ — it is NOT re-implemented in Python. This package only declares the
patch/feature contracts of the two learned models so the offline trainer (science/train_frag.py) and the in-browser
inference agree byte-for-byte. See model/learned.py."""
