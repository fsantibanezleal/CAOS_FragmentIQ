"""HEAVY lane (local-only), train FragmentIQ's two learned models and export them to ONNX. Run inside the
.venv-precompute (torch) AFTER gen_train.mjs has written data/raw/{frag-edge-train,fines-train}.json:

    python data-pipeline/fqlab/science/train_frag.py

1. frag-edge, a per-PATCH fragment-BOUNDARY CNN (16x16 grayscale -> P(boundary)). Trained on TRUE inter-fragment
   seams from the generator's per-pixel label map. Its boundary-F1 on a held-out split is reported here; its
   DOWNSTREAM effect (the recovered-P50 improvement vs the classical watershed) is measured by eval_frag.mjs (the
   watershed is TypeScript, so the honest end-to-end comparison runs in the engine's own language).
2. fines, a fines-bias correction regressor (4 PSD-shape features -> multiplicative P50 correction toward truth).
   Reports the held-out P50 error raw vs corrected.

Outputs: data/derived/{frag-edge.onnx, fines.onnx} + data/raw/learned-partial.json (eval_frag.mjs assembles the
final data/derived/fq-learned.json). Deterministic (seeded).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from torch import nn

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data" / "raw"
DERIVED = ROOT / "data" / "derived"
DERIVED.mkdir(parents=True, exist_ok=True)
torch.manual_seed(0)
rng = np.random.default_rng(0)
PATCH = 16


# ----------------------------------------------------------------------------------------------------------------
# frag-edge boundary CNN
# ----------------------------------------------------------------------------------------------------------------
class FragEdgeCNN(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),   # 16 -> 8
            nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),  # 8 -> 4
        )
        self.head = nn.Sequential(nn.Flatten(), nn.Linear(32 * 4 * 4, 48), nn.ReLU(), nn.Linear(48, 1))

    def forward(self, x):  # logits
        return self.head(self.features(x))


class EdgeSigmoid(nn.Module):
    """Export wrapper: raw [N,1,P,P] patch -> P(boundary) [N,1] (the App feeds patches, gets probabilities)."""

    def __init__(self, cnn: FragEdgeCNN) -> None:
        super().__init__()
        self.cnn = cnn

    def forward(self, x):
        return torch.sigmoid(self.cnn(x))


def train_edge() -> dict:
    d = json.loads((RAW / "frag-edge-train.json").read_text())
    X = np.asarray(d["x"], dtype=np.float32).reshape(-1, 1, PATCH, PATCH)
    y = np.asarray(d["y"], dtype=np.float32).reshape(-1, 1)
    n = len(y)
    idx = rng.permutation(n)
    cut = int(n * 0.8)
    tr, te = idx[:cut], idx[cut:]

    net = FragEdgeCNN()
    opt = torch.optim.Adam(net.parameters(), lr=1e-3)
    lossf = nn.BCEWithLogitsLoss()
    Xt, yt = torch.from_numpy(X[tr]), torch.from_numpy(y[tr])
    bs = 128
    for _ in range(16):  # epochs
        perm = torch.randperm(len(tr))
        for b in range(0, len(tr), bs):
            sel = perm[b:b + bs]
            opt.zero_grad()
            loss = lossf(net(Xt[sel]), yt[sel])
            loss.backward()
            opt.step()
    net.eval()
    with torch.no_grad():
        prob = torch.sigmoid(net(torch.from_numpy(X[te]))).numpy().ravel()
    pred = (prob >= 0.5).astype(np.int64)
    truth = y[te].ravel().astype(np.int64)
    tp = int(((pred == 1) & (truth == 1)).sum())
    fp = int(((pred == 1) & (truth == 0)).sum())
    fn = int(((pred == 0) & (truth == 1)).sum())
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return {"model": EdgeSigmoid(net),
            "metrics": {"boundaryF1": round(f1, 4), "precision": round(prec, 4), "recall": round(rec, 4),
                        "nEval": int(n - cut)}}


# ----------------------------------------------------------------------------------------------------------------
# fines-bias correction regressor
# ----------------------------------------------------------------------------------------------------------------
class FinesRegressor(nn.Module):
    def __init__(self, n_in: int) -> None:
        super().__init__()
        self.net = nn.Sequential(nn.Linear(n_in, 16), nn.ReLU(), nn.Linear(16, 1), nn.Softplus())

    def forward(self, x):  # k > 0 (multiplicative correction)
        return self.net(x)


def train_fines() -> dict:
    d = json.loads((RAW / "fines-train.json").read_text())
    X = np.asarray(d["x"], dtype=np.float32)
    k = np.asarray(d["k"], dtype=np.float32).reshape(-1, 1)
    n = len(k)
    # standardise the features (store stats so the App could mirror; here baked into the comparison)
    mu = X.mean(0, keepdims=True)
    sd = X.std(0, keepdims=True) + 1e-6
    Xs = (X - mu) / sd
    idx = rng.permutation(n)
    cut = max(1, int(n * 0.7))
    tr, te = idx[:cut], idx[cut:] if n - cut > 0 else idx[:cut]

    net = FinesRegressor(X.shape[1])
    opt = torch.optim.Adam(net.parameters(), lr=5e-3)
    Xt, kt = torch.from_numpy(Xs[tr]), torch.from_numpy(k[tr])
    for _ in range(400):
        opt.zero_grad()
        loss = nn.functional.mse_loss(net(Xt), kt)
        loss.backward()
        opt.step()
    net.eval()
    with torch.no_grad():
        kpred = net(torch.from_numpy(Xs[te])).numpy().ravel()
    # P50 error: raw rawP50 already implies k_truth = truthP50/rawP50; corrected uses k_pred.
    # err_raw = |rawP50 - truthP50| / truthP50 = |1 - k_truth| / k_truth ; corrected = |k_pred - k_truth| / k_truth
    k_truth = k[te].ravel()
    err_raw = float(np.mean(np.abs(1.0 - k_truth) / np.maximum(1e-6, k_truth)))
    err_corr = float(np.mean(np.abs(kpred - k_truth) / np.maximum(1e-6, k_truth)))
    # export wrapper folds the standardisation in, so the model takes RAW features
    mu_t = torch.from_numpy(mu)
    sd_t = torch.from_numpy(sd)

    class FinesExport(nn.Module):
        def __init__(self, core: FinesRegressor) -> None:
            super().__init__()
            self.core = core
            self.register_buffer("mu", mu_t)
            self.register_buffer("sd", sd_t)

        def forward(self, x):
            return self.core((x - self.mu) / self.sd)

    return {"model": FinesExport(net),
            "metrics": {"p50_err_raw": round(err_raw, 4), "p50_err_corrected": round(err_corr, 4),
                        "nEval": int(len(te))},
            "n_in": X.shape[1]}


def export_onnx(model: nn.Module, dummy: torch.Tensor, in_name: str, out_name: str, path: Path) -> None:
    model.eval()
    torch.onnx.export(model, dummy, str(path), input_names=[in_name], output_names=[out_name],
                      dynamic_axes={in_name: {0: "batch"}, out_name: {0: "batch"}}, opset_version=17)


def main() -> None:
    edge = train_edge()
    fines = train_fines()
    export_onnx(edge["model"], torch.zeros(1, 1, PATCH, PATCH), "x", "p", DERIVED / "frag-edge.onnx")
    export_onnx(fines["model"], torch.zeros(1, fines["n_in"]), "x", "k", DERIVED / "fines.onnx")
    partial = {
        "fragEdge": edge["metrics"],
        "fines": fines["metrics"],
        "honesty": ("Synthetic muckpiles + the generator per-pixel truth as the authority. frag-edge is trained on "
                    "TRUE inter-fragment seams; its boundary-F1 is held-out, and its DOWNSTREAM P50 effect vs the "
                    "classical watershed is measured by eval_frag.mjs (the watershed is TypeScript). The fines "
                    "regressor corrects the recovered P50 toward truth. Reported whichever way the numbers land."),
    }
    (RAW / "learned-partial.json").write_text(json.dumps(partial, indent=2))
    print("frag-edge boundary-F1:", edge["metrics"]["boundaryF1"],
          "(P=", edge["metrics"]["precision"], "R=", edge["metrics"]["recall"], ")")
    print("fines P50 err raw->corrected:", fines["metrics"]["p50_err_raw"], "->", fines["metrics"]["p50_err_corrected"])
    print(f"wrote frag-edge.onnx + fines.onnx + learned-partial.json -> {DERIVED} / {RAW}")


if __name__ == "__main__":
    main()
