"""
Ghost Glove — Calibration Data Analysis
Produces all plots and statistics tables for the FYP report.

Usage:
    pip install pandas numpy matplotlib scipy
    python analysis.py
"""

import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from scipy import stats
from scipy.stats import gaussian_kde
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.model_selection import StratifiedKFold, cross_val_score
from statsmodels.multivariate.manova import MANOVA

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# ── Config ────────────────────────────────────────────────────────────────────

# Ordered flat→fist (least→most bent) for calibration curves
POSITIONS = {
    "Flat":   ("csv/1_flex_hand_flat_on_table.csv", "csv/2_flex_hand_flat_on_table.csv"),
    "50 mm":  ("csv/1_flex_50_mm_tube.csv",          "csv/2_flex_50_mm_tube.csv"),
    "40 mm":  ("csv/1_flex_40_mm_tube.csv",          "csv/2_flex_40_mm_tube.csv"),
    "30 mm":  ("csv/1_flex_30_mm_tube.csv",          "csv/2_flex_30_mm_tube.csv"),
    "20 mm":  ("csv/1_flex_20_mm_tube.csv",          "csv/2_flex_20_mm_tube.csv"),
    "Fist":   ("csv/1_flex_fist.csv",                "csv/2_flex_fist.csv"),
}
BLE_FILE = "latency/ble_interarrival.csv"

FINGERS = ["ring", "middle", "index", "thumb"]
FINGER_COLOURS = {
    "ring":   "#39FF6A",
    "middle": "#60A5FA",
    "index":  "#FBBF24",
    "thumb":  "#F472B6",
}

TARGET_INTERVAL_MS   = 20.0
ON_TIME_TOLERANCE_MS = 5.0

PLOTS_DIR = "plots"
os.makedirs(PLOTS_DIR, exist_ok=True)

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

# ── Load & pool flex data ──────────────────────────────────────────────────────

# flex_pool[position] = single DataFrame with all samples from both runs
flex_pool: dict[str, pd.DataFrame] = {}
for label, (p1, p2) in POSITIONS.items():
    dfs = []
    for path in (p1, p2):
        df = pd.read_csv(path, comment="#")
        df.columns = df.columns.str.strip()
        # normalise column names (some files use flex_ring, others flex_1 etc.)
        rename = {}
        for i, f in enumerate(FINGERS, 1):
            if f"flex_{i}" in df.columns:
                rename[f"flex_{i}"] = f"flex_{f}"
        df.rename(columns=rename, inplace=True)
        dfs.append(df)
    flex_pool[label] = pd.concat(dfs, ignore_index=True)

pos_labels  = list(POSITIONS.keys())
n_positions = len(pos_labels)

# ── 1. Calibration Curves — mean ± std per finger across positions ─────────────

fig, axes = plt.subplots(2, 2, figsize=(13, 9), sharey=False)
fig.suptitle("Flex Sensor Calibration Curves  (mean ± 1 SD, both runs pooled)",
             fontsize=13, color="#F0F7F1", y=1.01)

x = np.arange(n_positions)

for ax, finger in zip(axes.flat, FINGERS):
    col = f"flex_{finger}"
    means = [flex_pool[pos][col].mean() for pos in pos_labels]
    stds  = [flex_pool[pos][col].std()  for pos in pos_labels]
    colour = FINGER_COLOURS[finger]

    means_arr = np.array(means)
    ss_tot = np.sum((means_arr - means_arr.mean()) ** 2)

    # Linear R²
    p1 = np.polyfit(x, means_arr, 1)
    r2_lin = 1 - np.sum((means_arr - np.polyval(p1, x)) ** 2) / ss_tot

    # Quadratic R²
    p2 = np.polyfit(x, means_arr, 2)
    r2_quad = 1 - np.sum((means_arr - np.polyval(p2, x)) ** 2) / ss_tot

    ax.fill_between(x,
                    means_arr - np.array(stds),
                    means_arr + np.array(stds),
                    color=colour, alpha=0.18)
    ax.plot(x, means_arr, color=colour, linewidth=2.2, marker="o", markersize=6,
            markerfacecolor="#111310", markeredgewidth=2, markeredgecolor=colour)

    ax.set_title(finger.capitalize(), fontsize=11, color="#F0F7F1", pad=6)
    ax.set_xticks(x)
    ax.set_xticklabels(pos_labels, fontsize=8)
    ax.set_xlabel("Hand position  (flat → fist)", fontsize=9)
    ax.set_ylabel("ADC counts", fontsize=9)
    ax.grid(True)

    ax.text(0.97, 0.05,
            f"R²(linear)  = {r2_lin:.3f}\nR²(poly-2) = {r2_quad:.3f}",
            transform=ax.transAxes, ha="right", va="bottom",
            fontsize=8, color="#8A9E8D",
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#111310", alpha=0.7))

plt.tight_layout()
plt.savefig(f"{PLOTS_DIR}/flex_calibration_curves.png", bbox_inches="tight")
plt.savefig(f"{PLOTS_DIR}/flex_calibration_curves.pdf", bbox_inches="tight")
print("Saved: flex_calibration_curves")
plt.close()

print("\n═══ NONLINEARITY R² (calibration curves) ═══")
print(f"{'Finger':<10} {'R²(linear)':>12} {'R²(poly-2)':>12}")
print("─" * 36)
for finger in FINGERS:
    col = f"flex_{finger}"
    means_arr = np.array([flex_pool[pos][col].mean() for pos in pos_labels])
    ss_tot = np.sum((means_arr - means_arr.mean()) ** 2)
    r2_lin  = 1 - np.sum((means_arr - np.polyval(np.polyfit(x, means_arr, 1), x)) ** 2) / ss_tot
    r2_quad = 1 - np.sum((means_arr - np.polyval(np.polyfit(x, means_arr, 2), x)) ** 2) / ss_tot
    print(f"{finger.capitalize():<10} {r2_lin:>12.4f} {r2_quad:>12.4f}")

# ── 2. Violin plots — per finger, one violin per position ─────────────────────

fig, axes = plt.subplots(2, 2, figsize=(12, 10), sharey=False)
fig.suptitle("Flex Sensor Distribution by Position  (both runs pooled)",
             fontsize=13, color="#F0F7F1")

for ax, finger in zip(axes.flat, FINGERS):
    col    = f"flex_{finger}"
    colour = FINGER_COLOURS[finger]
    data   = [flex_pool[pos][col].values for pos in pos_labels]

    parts = ax.violinplot(data, positions=range(n_positions), widths=0.7,
                          showmedians=True, showextrema=False)
    for body in parts["bodies"]:
        body.set_facecolor(colour)
        body.set_edgecolor(colour)
        body.set_alpha(0.55)
    parts["cmedians"].set_color("#F0F7F1")
    parts["cmedians"].set_linewidth(1.8)

    ax.set_title(finger.capitalize(), fontsize=10, color="#F0F7F1")
    ax.set_xticks(range(n_positions))
    ax.set_xticklabels([p.replace(" ", "\n") for p in pos_labels], fontsize=7)
    ax.set_ylabel("ADC counts")
    ax.grid(True, axis="y")

plt.tight_layout()
plt.savefig(f"{PLOTS_DIR}/flex_violin.png", bbox_inches="tight")
plt.savefig(f"{PLOTS_DIR}/flex_violin.pdf", bbox_inches="tight")
print("Saved: flex_violin")
plt.close()

# ── 3. Flex statistics table ───────────────────────────────────────────────────

print("\n═══ FLEX SENSOR STATISTICS (both runs pooled) ═══")
rows = []
for pos in pos_labels:
    df = flex_pool[pos]
    for finger in FINGERS:
        col = f"flex_{finger}"
        s = df[col]
        rows.append({
            "Position": pos,
            "Finger":   finger.capitalize(),
            "N":        len(s),
            "Mean":     round(s.mean(), 1),
            "Std Dev":  round(s.std(),  1),
            "Min":      int(s.min()),
            "Max":      int(s.max()),
            "Range":    int(s.max() - s.min()),
            "Median":   round(s.median(), 1),
        })

flex_stats = pd.DataFrame(rows)
pd.set_option("display.max_columns", None)
pd.set_option("display.width", 160)
print(flex_stats.to_string(index=False))
flex_stats.to_csv(f"{PLOTS_DIR}/flex_statistics.csv", index=False)
print(f"\nSaved: {PLOTS_DIR}/flex_statistics.csv")

# ── 4. Load BLE inter-arrival data ────────────────────────────────────────────

ble = pd.read_csv(BLE_FILE, comment="#")
ble.columns = ble.columns.str.strip()
ia = ble["interarrival_ms"].dropna().astype(float)
ia = ia[ia > 0]

# ── 5. BLE inter-arrival time series ──────────────────────────────────────────

fig, ax = plt.subplots(figsize=(10, 5))

ax.fill_between(ia.index, TARGET_INTERVAL_MS - ON_TIME_TOLERANCE_MS,
                TARGET_INTERVAL_MS + ON_TIME_TOLERANCE_MS,
                color="#39FF6A", alpha=0.12)
ax.plot(ia.index, ia.values, color="#39FF6A", linewidth=1.2, alpha=0.85,
        label="Inter-arrival (ms)")
ax.axhline(TARGET_INTERVAL_MS, color="#8A9E8D", linewidth=1.8,
           linestyle="--", label=f"Target ({TARGET_INTERVAL_MS} ms)")
ax.axhline(ia.mean(), color="#FBBF24", linewidth=1.8,
           linestyle="-.", label=f"Mean ({ia.mean():.1f} ms)")

ax.set_xlabel("Packet sequence", fontsize=16)
ax.set_ylabel("Inter-arrival time (ms)", fontsize=16)
ax.set_title("BLE Packet Inter-Arrival Time", fontsize=18, color="#F0F7F1", pad=10)
ax.tick_params(labelsize=14)
ax.legend(fontsize=14, framealpha=0.35)
ax.grid(True)
ax.set_ylim(bottom=0)

plt.tight_layout()
plt.savefig(f"{PLOTS_DIR}/ble_interarrival_timeseries.png", bbox_inches="tight")
plt.savefig(f"{PLOTS_DIR}/ble_interarrival_timeseries.pdf", bbox_inches="tight")
print("\nSaved: ble_interarrival_timeseries")
plt.close()

# ── 6. BLE histogram + KDE ────────────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(10, 5))

n, bins, patches = ax.hist(ia.values, bins=25, color="#39FF6A", alpha=0.55,
                           edgecolor="#39FF6A", linewidth=0.6, density=True,
                           label="Histogram (density)")

kde_x = np.linspace(ia.min(), ia.max(), 400)
kde   = gaussian_kde(ia.values, bw_method="scott")
ax.plot(kde_x, kde(kde_x), color="#F0F7F1", linewidth=2.5, label="KDE")

ax.axvline(TARGET_INTERVAL_MS, color="#8A9E8D", linewidth=2.0,
           linestyle="--", label=f"Target ({TARGET_INTERVAL_MS} ms)")
ax.axvline(ia.mean(), color="#FBBF24", linewidth=2.0,
           linestyle="-.", label=f"Mean ({ia.mean():.1f} ms)")

ax.set_xlabel("Inter-arrival time (ms)", fontsize=16)
ax.set_ylabel("Density", fontsize=16)
ax.set_title("BLE Inter-Arrival Time Distribution", fontsize=18, color="#F0F7F1", pad=10)
ax.tick_params(labelsize=14)
ax.legend(fontsize=14, framealpha=0.35)
ax.grid(True, axis="y")

plt.tight_layout()
plt.savefig(f"{PLOTS_DIR}/ble_histogram.png", bbox_inches="tight")
plt.savefig(f"{PLOTS_DIR}/ble_histogram.pdf", bbox_inches="tight")
print("Saved: ble_histogram")
plt.close()

# ── 7. BLE statistics table ───────────────────────────────────────────────────

on_time    = ia[(ia >= TARGET_INTERVAL_MS - ON_TIME_TOLERANCE_MS) &
                (ia <= TARGET_INTERVAL_MS + ON_TIME_TOLERANCE_MS)]
p5, p25, p75, p95 = np.percentile(ia, [5, 25, 75, 95])
_, p_normal = stats.shapiro(ia.sample(min(len(ia), 5000), random_state=42))

ble_summary = pd.DataFrame({
    "Metric": [
        "Total packets recorded",
        "Valid inter-arrival intervals",
        "Mean inter-arrival (ms)",
        "Median (ms)",
        "Std Dev / Jitter (ms)",
        "Variance (ms²)",
        "Min (ms)",
        "Max (ms)",
        "P5 (ms)",
        "P25 (ms)",
        "P75 (ms)",
        "P95 (ms)",
        "IQR (ms)",
        "Effective frequency (Hz)",
        f"On-time within ±{ON_TIME_TOLERANCE_MS} ms of {TARGET_INTERVAL_MS} ms",
        "Shapiro-Wilk p (normality test)",
    ],
    "Value": [
        len(ble),
        len(ia),
        f"{ia.mean():.3f}",
        f"{ia.median():.3f}",
        f"{ia.std():.3f}",
        f"{ia.var():.3f}",
        f"{ia.min():.3f}",
        f"{ia.max():.3f}",
        f"{p5:.3f}",
        f"{p25:.3f}",
        f"{p75:.3f}",
        f"{p95:.3f}",
        f"{p75 - p25:.3f}",
        f"{1000.0 / ia.mean():.3f}",
        f"{len(on_time) / len(ia) * 100:.1f}%",
        f"{p_normal:.4f}",
    ],
})

print("\n═══ BLE INTER-ARRIVAL STATISTICS ═══")
print(ble_summary.to_string(index=False))
ble_summary.to_csv(f"{PLOTS_DIR}/ble_statistics.csv", index=False)
print(f"\nSaved: {PLOTS_DIR}/ble_statistics.csv")

# ── 8. Position distinguishability — MANOVA + LDA ────────────────────────────

FLEX_COLS = ["flex_ring", "flex_middle", "flex_index", "flex_thumb"]
POS_COLOURS = {
    "Flat":  "#39FF6A",
    "50 mm": "#60A5FA",
    "40 mm": "#FBBF24",
    "30 mm": "#F472B6",
    "20 mm": "#C084FC",
    "Fist":  "#FF4444",
}

frames = []
for pos in pos_labels:
    df = flex_pool[pos][FLEX_COLS].copy()
    df["position"] = pos
    frames.append(df)
combined = pd.concat(frames, ignore_index=True)

X = combined[FLEX_COLS].values
y = combined["position"].values

# MANOVA
formula = " + ".join(FLEX_COLS) + " ~ position"
mv = MANOVA.from_formula(formula, data=combined).mv_test()
stat_df = mv.results["position"]["stat"]
wilks = stat_df.loc["Wilks' lambda"]

print("\n═══ MANOVA — POSITION DISTINGUISHABILITY ═══")
print(f"Wilks' λ = {wilks['Value']:.6f}   "
      f"F({wilks['Num DF']:.0f}, {wilks['Den DF']:.0f}) = {wilks['F Value']:.2f}   "
      f"p = {wilks['Pr > F']:.2e}")

# LDA cross-validation accuracy
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(LinearDiscriminantAnalysis(), X, y, cv=cv, scoring="accuracy")
print(f"LDA 5-fold CV accuracy:  {scores.mean()*100:.1f}% ± {scores.std()*100:.1f}%")

# LDA scatter plot
lda = LinearDiscriminantAnalysis()
X_lda = lda.fit_transform(X, y)

fig, ax = plt.subplots(figsize=(9, 7))
for pos in pos_labels:
    mask = y == pos
    ax.scatter(X_lda[mask, 0], X_lda[mask, 1],
               color=POS_COLOURS[pos], alpha=0.40, s=18, linewidths=0, label=pos)
    cx, cy = X_lda[mask, 0].mean(), X_lda[mask, 1].mean()
    ax.scatter(cx, cy, color=POS_COLOURS[pos], s=130, marker="D",
               edgecolors="#F0F7F1", linewidths=1.2, zorder=5)

ax.set_xlabel("LD 1", fontsize=13)
ax.set_ylabel("LD 2", fontsize=13)
ax.set_title("LDA — Hand Position Clusters (4 flex sensors)",
             fontsize=14, color="#F0F7F1", pad=10)
ax.legend(title="Position", fontsize=10, title_fontsize=10, framealpha=0.4)
ax.grid(True)
ax.text(0.02, 0.97,
        f"5-fold CV: {scores.mean()*100:.1f}% accurate\n"
        f"Wilks' λ = {wilks['Value']:.4f},  p = {wilks['Pr > F']:.2e}",
        transform=ax.transAxes, ha="left", va="top",
        fontsize=9, color="#8A9E8D",
        bbox=dict(boxstyle="round,pad=0.35", facecolor="#111310", alpha=0.8))

plt.tight_layout()
plt.savefig(f"{PLOTS_DIR}/lda_position_clusters.png", bbox_inches="tight")
plt.savefig(f"{PLOTS_DIR}/lda_position_clusters.pdf", bbox_inches="tight")
print("Saved: lda_position_clusters")
plt.close()

print(f"\nAll outputs written to ./{PLOTS_DIR}/")
