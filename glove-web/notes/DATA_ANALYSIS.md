# Ghost Glove — Data Analysis Guide

Two data-collection tools are built into the glove-web dashboard.
Access them via the **Calibration** and **Latency** tabs in the nav bar.

> **Requirements:** Chrome or Edge (Web Bluetooth). Glove firmware flashed and advertising as `GhostGlove`.

---

## Experiment 1 — Flex Sensor Characterisation (`/calibration`)

### Purpose

Determine the raw ADS1115 ADC count range for each finger across six known
hand positions. The resulting min/max values feed directly into
`lib/flexCalibration.ts` to calibrate the flex bars on the dashboard.

### Hand Positions

| Label              | Description                                  |
| ------------------ | -------------------------------------------- |
| Hand flat on table | Fingers fully extended, palm down            |
| 50 mm tube         | Hand curled around a 50 mm diameter cylinder |
| 40 mm tube         | Hand curled around a 40 mm diameter cylinder |
| 30 mm tube         | Hand curled around a 30 mm diameter cylinder |
| 20 mm tube         | Hand curled around a 20 mm diameter cylinder |
| Fist               | Hand fully closed                            |

### Procedure

1. Open the **Calibration** tab.
2. Click **Connect Glove** and select `GhostGlove` from the browser dialog.
3. Select a hand position using the position buttons.
4. Hold your hand in that position (keep it still).
5. Click **Start Capture** — a 3-second countdown plays, then 10 seconds of
   data are recorded automatically.
6. When the capture finishes, inspect the per-finger stats table (min, max,
   range, mean). The chart shows all four flex sensors over the capture window.
7. Click **Export CSV** to download the raw time-series for that position.
8. Repeat steps 3–7 for every position.
9. Once all positions are captured, click **Export All CSV** in the
   _All Captures — Summary_ table to download a single summary file.

### Repeatability Check

To test repeatability:

1. Remove the glove, put it back on, repeat the same position.
2. Compare the new capture's min/max against the first. A stable sensor will
   show <5% deviation in mean ADC value between wearings.

### CSV Format

**Per-position file** (`flex_<position>.csv`):

```
t_s,flex_ring,flex_middle,flex_index,flex_thumb
0.000,4102,7543,4012,6311
0.020,4098,7551,4008,6298
...
```

**Summary file** (`flex_calibration_summary.csv`):

```
position,ring_min,ring_max,ring_range,ring_mean,middle_min,...
Hand flat on table,3901,4203,302,4052.1,...
50 mm tube,...
```

### Updating Calibration

After completing all captures, open `lib/flexCalibration.ts` and update
`FLEX_RANGES` with the observed min (flattest position) and max (fist) per finger:

```ts
export const FLEX_RANGES = {
  ring:   { min: <flat_min>, max: <fist_max> },
  middle: { min: <flat_min>, max: <fist_max> },
  index:  { min: <flat_min>, max: <fist_max> },
  thumb:  { min: <flat_min>, max: <fist_max> },
} as const;
```

---

## Experiment 2 — BLE Latency Analysis (`/latency`)

### Purpose

Measure the end-to-end delay between the ESP32 transmitting a BLE NOTIFY
packet and the browser receiving it. Reports mean, min, max, and standard
deviation.

### Method

The ESP32 timestamps each packet as `millis() - sessionStart` (ms since BLE
connection). The browser records the GATT connection time (`connectedAt`).
For each arriving packet:

```
latency_ms = Date.now() - connectedAt - packet.timestamp
```

This isolates the BLE transmission + OS scheduling delay, independent of
wall-clock differences between the ESP32 and the host machine.

### Procedure

1. Open the **Latency** tab.
2. Click **Connect Glove**.
3. Click **Start Recording** — packets are captured continuously.
4. Move naturally for 30–60 seconds (or as long as required).
5. Click **Stop** — the chart and statistics table appear.
6. Click **Export CSV** to download the full latency log.

### Interpreting the Chart

- **Flat, low line** — consistent low latency. Expected: 10–50 ms range.
- **Occasional spikes** — BLE connection events or OS scheduling jitter.
- **Upward drift** — clock skew between ESP32 crystal and system clock
  accumulating over a long session. Acceptable for sessions under 5 minutes.

### CSV Format

`ble_latency.csv`:

```
seq,esp_timestamp_ms,latency_ms
0,20,18.00
1,40,17.50
2,60,19.20
...
```

| Column             | Description                             |
| ------------------ | --------------------------------------- |
| `seq`              | Packet sequence number (0-indexed)      |
| `esp_timestamp_ms` | `millis() - sessionStart` from firmware |
| `latency_ms`       | Computed transmission delay             |

### Notes

- Packets with `latency_ms < 0` or `> 2000` are automatically discarded
  (clock alignment artefacts at session start).
- Run the experiment with the glove in typical use conditions — laptop on desk,
  glove worn normally — to get representative figures.
- Repeat the experiment 3× and average the means for a more robust result.
