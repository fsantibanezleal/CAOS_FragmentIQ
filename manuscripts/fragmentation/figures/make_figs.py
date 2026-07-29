#!/usr/bin/env python3
"""Regenerate the figures for the FragmentIQ fragmentation report from the COMMITTED artifacts. Two figures:

  fig-bias.pdf       - the systematic bias of image-based fragmentation analysis. (a) Recovered vs true P50 and
                       P80 across the seven cases: the watershed recovers sizes below truth. (b) Fragments found
                       vs true fragment count: the watershed over-segments (more fragments than exist), which
                       biases the size distribution fine.
  fig-correction.pdf - the corrections: the P50 error of the raw watershed, after a fines/size calibration
                       correction, and with a classical vs a learned CNN edge delineation.

Run:  python make_figs.py     (from repo root)
Deps: matplotlib, numpy.
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"

INK = "#1a1a2e"
GRID = "#d8d8e0"

plt.rcParams.update({
    "font.family": "serif", "font.size": 9.4, "axes.edgecolor": INK,
    "axes.labelcolor": INK, "text.color": INK, "xtick.color": INK, "ytick.color": INK,
    "axes.linewidth": 0.8, "figure.dpi": 200,
})


def _load():
    return json.loads((DATA / "fq.json").read_text(encoding="utf-8"))


def fig_bias():
    d = _load()
    cases = d["cases"]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.0, 3.1))

    # (a) recovered vs true P50 and P80
    tp50 = [c["true_p50"] for c in cases]; rp50 = [c["rec_p50"] for c in cases]
    tp80 = [c["true_p80"] for c in cases]; rp80 = [c["rec_p80"] for c in cases]
    lim = max(max(tp80), max(rp80)) * 1.08
    a1.plot([0, lim], [0, lim], color="#888", linewidth=1.0, zorder=1, label="perfect recovery")
    a1.scatter(tp50, rp50, s=34, color="#1b6ca8", edgecolor=INK, linewidth=0.4, zorder=3, label="$P_{50}$")
    a1.scatter(tp80, rp80, s=34, color="#e07a3f", marker="s", edgecolor=INK, linewidth=0.4, zorder=3, label="$P_{80}$")
    a1.set_xlim(0, lim); a1.set_ylim(0, lim)
    a1.set_xlabel("true size (mm)"); a1.set_ylabel("recovered size (mm)")
    a1.set_title("(a) recovered sizes fall below truth", fontsize=8.4)
    a1.grid(True, color=GRID, linewidth=0.7)
    a1.set_axisbelow(True)
    a1.legend(fontsize=7.2, frameon=True, facecolor="white", edgecolor=GRID, loc="upper left")
    for s in ("top", "right"):
        a1.spines[s].set_visible(False)

    # (b) nFound vs nTrue (over-segmentation)
    nt = [c["nTrue"] for c in cases]; nf = [c["nFound"] for c in cases]
    lim2 = max(max(nt), max(nf)) * 1.08
    a2.plot([0, lim2], [0, lim2], color="#888", linewidth=1.0, zorder=1, label="1:1")
    a2.scatter(nt, nf, s=36, color="#b23a48", edgecolor=INK, linewidth=0.4, zorder=3)
    a2.set_xlim(0, lim2); a2.set_ylim(0, lim2)
    a2.set_xlabel("true fragment count"); a2.set_ylabel("fragments found")
    a2.set_title("(b) the watershed over-segments", fontsize=8.4)
    a2.grid(True, color=GRID, linewidth=0.7)
    a2.set_axisbelow(True)
    a2.legend(fontsize=7.2, frameon=True, facecolor="white", edgecolor=GRID, loc="upper left")
    for s in ("top", "right"):
        a2.spines[s].set_visible(False)

    fig.tight_layout()
    fig.savefig(HERE / "fig-bias.pdf", bbox_inches="tight")
    plt.close(fig)


def fig_correction():
    d = _load()
    fines = d["fines"]; edge = d["fragEdge"]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.0, 3.0))

    # (a) fines/size correction
    labels = ["raw\nwatershed", "size\ncorrected"]
    vals = [100 * fines["p50_err_raw"], 100 * fines["p50_err_corrected"]]
    bars = a1.bar(labels, vals, color=["#b23a48", "#3fa34d"], edgecolor=INK, linewidth=0.6, width=0.58, zorder=3)
    for b, v in zip(bars, vals):
        a1.text(b.get_x() + b.get_width() / 2, v + 0.5, f"{v:.1f}%", ha="center", va="bottom",
                fontsize=9.0, fontweight="bold")
    a1.set_ylabel("median $P_{50}$ error (%)")
    a1.set_ylim(0, max(vals) * 1.25)
    a1.set_title("(a) a size calibration removes\nmost of the bias", fontsize=8.4)
    a1.grid(axis="y", color=GRID, linewidth=0.7, zorder=0)
    a1.set_axisbelow(True)
    for s in ("top", "right"):
        a1.spines[s].set_visible(False)

    # (b) classical vs learned edge delineation
    labels = ["classical\nwatershed", "learned CNN\nedge"]
    vals = [100 * edge["p50_err_classical"], 100 * edge["p50_err_cnn"]]
    bars = a2.bar(labels, vals, color=["#e07a3f", "#1b6ca8"], edgecolor=INK, linewidth=0.6, width=0.58, zorder=3)
    for b, v in zip(bars, vals):
        a2.text(b.get_x() + b.get_width() / 2, v + 0.4, f"{v:.1f}%", ha="center", va="bottom",
                fontsize=9.0, fontweight="bold")
    a2.set_ylabel("median $P_{50}$ error (%)")
    a2.set_ylim(0, max(vals) * 1.28)
    a2.set_title(f"(b) learned edges help modestly\n(boundary F1 {edge['boundaryF1']:.3f})", fontsize=8.4)
    a2.grid(axis="y", color=GRID, linewidth=0.7, zorder=0)
    a2.set_axisbelow(True)
    for s in ("top", "right"):
        a2.spines[s].set_visible(False)

    fig.tight_layout()
    fig.savefig(HERE / "fig-correction.pdf", bbox_inches="tight")
    plt.close(fig)


def main():
    fig_bias()
    fig_correction()
    print("wrote fig-bias.pdf, fig-correction.pdf")


if __name__ == "__main__":
    main()
