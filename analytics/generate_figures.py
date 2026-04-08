import json
import os
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = "https://glove-trainer-api.onrender.com"
OUT_DIR  = Path(__file__).parent / "figures"
OUT_DIR.mkdir(exist_ok=True)

# Shared style
plt.rcParams.update({
    "font.family":      "monospace",
    "axes.spines.top":  False,
    "axes.spines.right":False,
    "axes.grid":        True,
    "grid.alpha":       0.3,
    "grid.linestyle":   "--",
    "figure.dpi":       150,
    "savefig.dpi":      300,
    "savefig.bbox":     "tight",
})

ACCENT = "#2563eb"
GREY   = "#64748b"

# ---------------------------------------------------------------------------
# Fetch data
# ---------------------------------------------------------------------------
def fetch(path: str):
    url = BASE_URL + path
    print(f"  GET {url}")
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.json()


print("Fetching data …")
analytics = fetch("/analytics")
history   = fetch("/last_n?n=200")   # up to 200 rows, newest-first

print(f"  analytics: {analytics['sample_count']} samples")
print(f"  history:   {len(history)} rows")

# ---------------------------------------------------------------------------
# Helper: draw histogram from bin list
# ---------------------------------------------------------------------------
def draw_histogram(ax, bins, color=ACCENT, alpha=0.85):
    lefts  = [b["bin_start"] for b in bins]
    rights = [b["bin_end"]   for b in bins]
    counts = [b["count"]     for b in bins]
    widths = [r - l for l, r in zip(lefts, rights)]
    ax.bar(lefts, counts, width=widths, align="edge",
           color=color, alpha=alpha, edgecolor="white", linewidth=0.5)


# ---------------------------------------------------------------------------
# Figure 1 — IMU Acceleration Magnitude Distribution
# ---------------------------------------------------------------------------
print("Generating figure 1: IMU accel magnitude …")

imu   = analytics["imu"]["accel_magnitude"]
bins  = imu["histogram"]
mean  = imu["mean"]
std   = imu["std"]

fig, ax = plt.subplots(figsize=(7, 4))
draw_histogram(ax, bins)

ax.axvline(mean, color="crimson", linewidth=1.5, linestyle="--", label=f"Mean = {mean:.2f} m/s²")
ax.axvspan(mean - std, mean + std, color="crimson", alpha=0.08, label=f"±1 SD ({std:.2f} m/s²)")

# gravity reference
ax.axvline(9.81, color="#059669", linewidth=1.2, linestyle=":", label="g = 9.81 m/s²")

ax.set_xlabel("Acceleration magnitude  (m/s²)", fontsize=11)
ax.set_ylabel("Sample count", fontsize=11)
ax.set_title("IMU Acceleration Magnitude Distribution\n(n = {})".format(analytics["sample_count"]), fontsize=13, fontweight="bold")
ax.legend(fontsize=9)

out = OUT_DIR / "fig1_imu_accel_magnitude.png"
fig.savefig(out)
plt.close(fig)
print(f"  saved → {out}")


# ---------------------------------------------------------------------------
# Figure 2 — Time-series: IMU axes (ax, ay, az) over last N samples
# ---------------------------------------------------------------------------
print("Generating figure 2: IMU time series …")

# history is newest-first → reverse
rows = list(reversed(history))
# filter rows with valid IMU
rows = [r for r in rows if r.get("ax") is not None]

if rows:
    # Use index as x-axis (relative sample number)
    xs = list(range(len(rows)))
    ax_vals = [r["ax"] for r in rows]
    ay_vals = [r["ay"] for r in rows]
    az_vals = [r["az"] for r in rows]

    fig, ax = plt.subplots(figsize=(9, 4))
    ax.plot(xs, ax_vals, linewidth=1.0, color="#2563eb", alpha=0.85, label="aX")
    ax.plot(xs, ay_vals, linewidth=1.0, color="#dc2626", alpha=0.85, label="aY")
    ax.plot(xs, az_vals, linewidth=1.0, color="#16a34a", alpha=0.85, label="aZ")
    ax.axhline(0, color="black", linewidth=0.5, linestyle=":")

    ax.set_xlabel("Sample index", fontsize=11)
    ax.set_ylabel("Acceleration  (m/s²)", fontsize=11)
    ax.set_title(f"IMU Accelerometer Axes — Last {len(rows)} Samples", fontsize=13, fontweight="bold")
    ax.legend(fontsize=9)

    out = OUT_DIR / "fig2_imu_timeseries.png"
    fig.savefig(out)
    plt.close(fig)
    print(f"  saved → {out}")
else:
    print("  skipped (no IMU rows)")


# ---------------------------------------------------------------------------
# Figure 3 — Time-series: Gyroscope axes (gx, gy, gz)
# ---------------------------------------------------------------------------
print("Generating figure 3: Gyroscope time series …")

rows_gyro = [r for r in rows if r.get("gx") is not None]
if rows_gyro:
    xs = list(range(len(rows_gyro)))
    gx_vals = [r["gx"] for r in rows_gyro]
    gy_vals = [r["gy"] for r in rows_gyro]
    gz_vals = [r["gz"] for r in rows_gyro]

    fig, ax = plt.subplots(figsize=(9, 4))
    ax.plot(xs, gx_vals, linewidth=1.0, color="#2563eb", alpha=0.85, label="gX")
    ax.plot(xs, gy_vals, linewidth=1.0, color="#dc2626", alpha=0.85, label="gY")
    ax.plot(xs, gz_vals, linewidth=1.0, color="#16a34a", alpha=0.85, label="gZ")
    ax.axhline(0, color="black", linewidth=0.5, linestyle=":")

    ax.set_xlabel("Sample index", fontsize=11)
    ax.set_ylabel("Angular velocity  (rad/s)", fontsize=11)
    ax.set_title(f"Gyroscope Axes — Last {len(rows_gyro)} Samples", fontsize=13, fontweight="bold")
    ax.legend(fontsize=9)

    out = OUT_DIR / "fig3_gyro_timeseries.png"
    fig.savefig(out)
    plt.close(fig)
    print(f"  saved → {out}")
else:
    print("  skipped (no gyro rows)")


# ---------------------------------------------------------------------------
# Figure 4 — Accel magnitude over time (motion envelope)
# ---------------------------------------------------------------------------
print("Generating figure 4: Accel magnitude time series …")

if rows:
    mags = [(r["ax"]**2 + r["ay"]**2 + r["az"]**2)**0.5 for r in rows]
    xs   = list(range(len(mags)))

    fig, ax = plt.subplots(figsize=(9, 4))
    ax.plot(xs, mags, linewidth=1.0, color=ACCENT, alpha=0.7)
    ax.fill_between(xs, mags, alpha=0.15, color=ACCENT)
    ax.axhline(9.81, color="#059669", linewidth=1.2, linestyle=":", label="g = 9.81 m/s²")

    ax.set_xlabel("Sample index", fontsize=11)
    ax.set_ylabel("|a|  (m/s²)", fontsize=11)
    ax.set_title(f"Acceleration Magnitude Over Time — Last {len(rows)} Samples", fontsize=13, fontweight="bold")
    ax.legend(fontsize=9)

    out = OUT_DIR / "fig4_accel_magnitude_timeseries.png"
    fig.savefig(out)
    plt.close(fig)
    print(f"  saved → {out}")


# ---------------------------------------------------------------------------
# Figure 5 — System throughput & jitter summary (bar chart)
# ---------------------------------------------------------------------------
print("Generating figure 5: Throughput summary …")

tp = analytics["throughput"]
mean_hz  = tp["mean_hz"]
jitter   = tp["jitter_ms"]

# Compute inter-sample intervals from history
if len(history) > 1:
    # ts_ms is device uptime; use consecutive diffs for jitter
    ts_list   = [r["ts_ms"] for r in reversed(history) if r.get("ts_ms")]
    intervals = [ts_list[i+1] - ts_list[i] for i in range(len(ts_list)-1)]
    valid     = [x for x in intervals if 0 < x < 10_000]
else:
    valid = []

fig, axes = plt.subplots(1, 2, figsize=(10, 4))

# Left: histogram of inter-sample intervals
if valid:
    axes[0].hist(valid, bins=20, color=ACCENT, alpha=0.85, edgecolor="white")
    axes[0].axvline(np.mean(valid), color="crimson", linewidth=1.5,
                    linestyle="--", label=f"Mean = {np.mean(valid):.0f} ms")
    axes[0].set_xlabel("Inter-sample interval  (ms)", fontsize=11)
    axes[0].set_ylabel("Count", fontsize=11)
    axes[0].set_title("Sampling Interval Distribution", fontsize=12, fontweight="bold")
    axes[0].legend(fontsize=9)
else:
    axes[0].text(0.5, 0.5, "Insufficient data", ha="center", va="center",
                 transform=axes[0].transAxes, fontsize=12, color=GREY)
    axes[0].set_title("Sampling Interval Distribution", fontsize=12, fontweight="bold")

# Right: key metrics as a simple table-style bar
metrics  = ["Mean Hz", "Jitter (ms)", "Samples"]
values   = [mean_hz,   jitter,        analytics["sample_count"]]
colors   = [ACCENT,    "#dc2626",     "#16a34a"]
bar_vals = [min(v / max(values), 1.0) * 100 for v in values]  # normalise for bar width

ax2 = axes[1]
bars = ax2.barh(metrics, bar_vals, color=colors, alpha=0.8, height=0.5)
for bar, val in zip(bars, values):
    ax2.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
             f"{val:g}", va="center", fontsize=11, fontweight="bold")
ax2.set_xlim(0, 115)
ax2.set_xlabel("(relative)", fontsize=9, color=GREY)
ax2.set_title("Key System Metrics", fontsize=12, fontweight="bold")
ax2.tick_params(left=False)
ax2.set_xticks([])

fig.suptitle("MQTT Pipeline — Throughput & Sampling Characteristics",
             fontsize=13, fontweight="bold", y=1.01)
fig.tight_layout()

out = OUT_DIR / "fig5_throughput_summary.png"
fig.savefig(out)
plt.close(fig)
print(f"  saved → {out}")