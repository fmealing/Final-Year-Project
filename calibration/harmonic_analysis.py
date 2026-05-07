"""
Ghost Glove — Harmonic Analysis
Produces two plots saved to calibration/plots/:
  1. flex_filtered_timeseries.png  — raw vs 5 Hz low-pass filtered signal (all 4 fingers)
  2. flex_frequency_spectrum.png   — Welch PSD frequency spectrum (all 4 fingers)

Uses the first run of the flat-hand recording as the representative signal.

Usage:
    python calibration/harmonic_analysis.py
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.interpolate import interp1d
from scipy.signal import welch, butter, filtfilt

# ── Config ────────────────────────────────────────────────────────────────────
CSV_PATH       = os.path.join(os.path.dirname(__file__), "csv", "1_flex_hand_flat_on_table.csv")
TARGET_FS      = 100.0   # Hz — resample target
FILTER_CUTOFF  = 5.0     # Hz — low-pass cutoff
FILTER_ORDER   = 2       # 2nd-order Butterworth
WELCH_NPERSEG  = 128
PLOTS_DIR      = os.path.join(os.path.dirname(__file__), "plots")

SENSORS = ["flex_ring", "flex_middle", "flex_index", "flex_thumb"]
COLOURS = {
    "flex_ring":   "#39FF6A",
    "flex_middle": "#60A5FA",
    "flex_index":  "#FBBF24",
    "flex_thumb":  "#F472B6",
}
LABELS = {
    "flex_ring":   "Ring",
    "flex_middle": "Middle",
    "flex_index":  "Index",
    "flex_thumb":  "Thumb",
}

plt.rcParams.update({
    "figure.facecolor":  "#111310",
    "axes.facecolor":    "#1F2E22",
    "axes.edgecolor":    "#2a3a2d",
    "axes.labelcolor":   "#8A9E8D",
    "xtick.color":       "#8A9E8D",
    "ytick.color":       "#8A9E8D",
    "text.color":        "#F0F7F1",
    "grid.color":        "#2a3a2d",
    "grid.linestyle":    "--",
    "grid.linewidth":    0.5,
    "font.family":       "monospace",
    "axes.spines.top":   False,
    "axes.spines.right": False,
    "figure.dpi":        150,
})

os.makedirs(PLOTS_DIR, exist_ok=True)


def load_and_resample(path: str, fs: float) -> pd.DataFrame:
    df = pd.read_csv(path, comment="#")
    df.columns = df.columns.str.strip()
    t = df["t_s"].values.astype(float)
    t_new = np.arange(t[0], t[-1], 1.0 / fs)
    out = {"t_s": t_new}
    for col in SENSORS:
        if col in df.columns:
            f = interp1d(t, df[col].values.astype(float), kind="linear", fill_value="extrapolate")
            out[col] = f(t_new)
    return pd.DataFrame(out)


def lowpass(signal: np.ndarray, fs: float) -> np.ndarray:
    nyq = fs / 2.0
    b, a = butter(FILTER_ORDER, FILTER_CUTOFF / nyq, btype="low")
    return filtfilt(b, a, signal)


# ── Load data ─────────────────────────────────────────────────────────────────
df = load_and_resample(CSV_PATH, TARGET_FS)
t = df["t_s"].values

# ── Plot 1: Time domain — raw vs filtered ─────────────────────────────────────
fig, axes = plt.subplots(2, 2, figsize=(13, 8), sharex=True)
fig.suptitle(
    f"Flex Sensor Signal — Raw vs {FILTER_CUTOFF} Hz Low-Pass Filter",
    fontsize=13, color="#F0F7F1", y=1.01,
)

for ax, sensor in zip(axes.flat, SENSORS):
    raw  = df[sensor].values
    filt = lowpass(raw, TARGET_FS)
    c    = COLOURS[sensor]

    ax.plot(t, raw,  color=c,        linewidth=0.7, alpha=0.45, label="Raw")
    ax.plot(t, filt, color="#F0F7F1", linewidth=1.4, alpha=0.95, label=f"Filtered ({FILTER_CUTOFF} Hz LP)")

    ax.set_title(LABELS[sensor], fontsize=11, color="#F0F7F1", pad=6)
    ax.set_ylabel("ADC counts", fontsize=9)
    ax.grid(True)
    ax.legend(fontsize=8, framealpha=0.25, loc="upper right")

for ax in axes[1]:
    ax.set_xlabel("Time (s)", fontsize=9)

plt.tight_layout()
out1 = os.path.join(PLOTS_DIR, "flex_filtered_timeseries.png")
fig.savefig(out1, bbox_inches="tight", facecolor=fig.get_facecolor())
fig.savefig(out1.replace(".png", ".pdf"), bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print(f"Saved: {out1}")

# ── Plot 2: Frequency spectrum (Welch PSD) ────────────────────────────────────
fig, ax = plt.subplots(figsize=(11, 5))
fig.suptitle("Flex Sensor Frequency Spectrum (Welch PSD)", fontsize=13, color="#F0F7F1")

for sensor in SENSORS:
    raw = df[sensor].values - df[sensor].mean()
    freqs, psd = welch(raw, fs=TARGET_FS, nperseg=WELCH_NPERSEG, scaling="density")
    ax.semilogy(freqs, psd + 1e-9, color=COLOURS[sensor], linewidth=1.6, label=LABELS[sensor])

ax.axvline(FILTER_CUTOFF, color="#FF4444", linewidth=1.4, linestyle="--",
           label=f"{FILTER_CUTOFF} Hz cutoff")
ax.set_xlabel("Frequency (Hz)", fontsize=10)
ax.set_ylabel("PSD (ADC²/Hz)", fontsize=10)
ax.set_xlim(0, TARGET_FS / 2)
ax.grid(True)
ax.legend(fontsize=9, framealpha=0.3)

plt.tight_layout()
out2 = os.path.join(PLOTS_DIR, "flex_frequency_spectrum.png")
fig.savefig(out2, bbox_inches="tight", facecolor=fig.get_facecolor())
fig.savefig(out2.replace(".png", ".pdf"), bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print(f"Saved: {out2}")
