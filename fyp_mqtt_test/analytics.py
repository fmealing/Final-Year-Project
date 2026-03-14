import statistics
from datetime import datetime


def histogram(values, bins=20):
    lo, hi = min(values), max(values)
    if lo == hi:
        return [{"bin_start": lo, "bin_end": hi, "count": len(values)}]
    width = (hi - lo) / bins
    counts = [0] * bins
    for v in values:
        idx = min(int((v - lo) / width), bins - 1)
        counts[idx] += 1
    return [
        {
            "bin_start": round(lo + i * width, 4),
            "bin_end": round(lo + (i + 1) * width, 4),
            "count": counts[i],
        }
        for i in range(bins)
    ]


def summary_stats(values):
    return {
        "mean": round(statistics.mean(values), 4),
        "std": round(statistics.stdev(values) if len(values) > 1 else 0, 4),
        "min": round(min(values), 4),
        "max": round(max(values), 4),
    }


def compute_analytics(rows):
    if not rows:
        return None

    # --- Latency ---
    latencies = []
    for r in rows:
        try:
            received_ts = datetime.fromisoformat(r["received_utc"]).timestamp()
            latencies.append((received_ts - r["ts_ms"] / 1000.0) * 1000)
        except Exception:
            pass

    # --- Throughput & jitter ---
    ts_list = [r["ts_ms"] for r in rows]
    intervals = [ts_list[i + 1] - ts_list[i] for i in range(len(ts_list) - 1)]
    valid_intervals = [x for x in intervals if 0 < x < 10_000]  # drop gaps > 10 s

    # --- Flex per-finger ---
    flex_stats = {}
    for i in range(1, 5):
        key = f"flex{i}"
        vals = [r[key] for r in rows if r[key] is not None]
        if vals:
            flex_stats[key] = {**summary_stats(vals), "histogram": histogram(vals)}

    # --- IMU acceleration magnitude ---
    magnitudes = [
        (r["ax"] ** 2 + r["ay"] ** 2 + r["az"] ** 2) ** 0.5
        for r in rows
        if r["ax"] is not None
    ]

    sorted_lat = sorted(latencies)
    return {
        "sample_count": len(rows),
        "latency": {
            **summary_stats(latencies),
            "p50_ms": round(sorted_lat[len(sorted_lat) // 2], 4),
            "p95_ms": round(sorted_lat[int(len(sorted_lat) * 0.95)], 4),
            "histogram": histogram(latencies, bins=30),
        } if latencies else None,
        "throughput": {
            "mean_hz": round(1000 / statistics.mean(valid_intervals), 4) if valid_intervals else None,
            "jitter_ms": round(statistics.stdev(valid_intervals), 4) if len(valid_intervals) > 1 else 0,
        },
        "flex": flex_stats,
        "imu": {
            "accel_magnitude": {**summary_stats(magnitudes), "histogram": histogram(magnitudes)},
        } if magnitudes else None,
    }
