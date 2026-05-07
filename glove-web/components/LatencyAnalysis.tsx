"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GlovePacket, BleStatus } from "@/lib/types";
import { gloveBle } from "@/lib/ble";
import SvgChart, { ChartSeries } from "./SvgChart";

// ── Constants ─────────────────────────────────────────────────────────────────

const TARGET_INTERVAL_MS = 20; // ESP32 delay(20) → 50 Hz target
const ON_TIME_TOLERANCE_MS = 5; // ±5 ms counts as "on time"

// ── Types ─────────────────────────────────────────────────────────────────────

interface InterArrivalPoint {
  seq:             number;
  esp_ts_ms:       number;
  arrival_ms:      number; // ms since recording started
  interarrival_ms: number; // -1 for first packet
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mean(vs: number[]) { return vs.reduce((a, b) => a + b, 0) / vs.length; }
function stdDev(vs: number[], m: number) {
  if (vs.length < 2) return 0;
  return Math.sqrt(vs.reduce((a, b) => a + (b - m) ** 2, 0) / vs.length);
}

function toCSV(points: InterArrivalPoint[]): string {
  const rows = points.map(
    (p) =>
      `${p.seq},${p.arrival_ms},${p.esp_ts_ms},${p.interarrival_ms < 0 ? "" : p.interarrival_ms.toFixed(2)}`,
  );
  return [
    "# Ghost Glove BLE Inter-Arrival Time Log",
    "# arrival_ms       = ms since recording started (browser clock)",
    "# esp_timestamp_ms = ms since BLE connect (ESP32 clock)",
    "# interarrival_ms  = time between consecutive packet arrivals (blank for first packet)",
    `# target: ${TARGET_INTERVAL_MS} ms (${(1000 / TARGET_INTERVAL_MS).toFixed(0)} Hz)`,
    "seq,arrival_ms,esp_timestamp_ms,interarrival_ms",
    ...rows,
  ].join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LatencyAnalysis() {
  const [bleStatus,   setBleStatus]   = useState<BleStatus>("disconnected");
  const [error,       setError]       = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [points,      setPoints]      = useState<InterArrivalPoint[]>([]);

  const isRecordingRef   = useRef(false);
  const seqRef           = useRef(0);
  const pointsRef        = useRef<InterArrivalPoint[]>([]);
  const displayTimer     = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastArrivalRef   = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);

  const onPacket = useCallback((p: GlovePacket) => {
    if (!isRecordingRef.current) return;
    const now = Date.now();
    const arrival_ms = now - recordingStartRef.current;

    if (lastArrivalRef.current !== null) {
      pointsRef.current.push({
        seq:             seqRef.current++,
        esp_ts_ms:       p.timestamp,
        arrival_ms,
        interarrival_ms: now - lastArrivalRef.current,
      });
    } else {
      // Include first packet with interarrival_ms = -1 so arrival timestamps are complete
      pointsRef.current.push({
        seq:             seqRef.current++,
        esp_ts_ms:       p.timestamp,
        arrival_ms,
        interarrival_ms: -1,
      });
    }
    lastArrivalRef.current = now;
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    displayTimer.current = setInterval(() => {
      setPoints([...pointsRef.current]);
    }, 200);
    return () => { if (displayTimer.current) clearInterval(displayTimer.current); };
  }, [isRecording]);

  useEffect(() => {
    return () => { if (displayTimer.current) clearInterval(displayTimer.current); };
  }, []);

  const handleConnect = useCallback(async () => {
    setError(null);
    setBleStatus("connecting");
    try {
      await gloveBle.connect(onPacket, () => {
        setBleStatus("disconnected");
        setIsRecording(false);
        isRecordingRef.current = false;
      });
      setBleStatus("connected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setBleStatus("error");
    }
  }, [onPacket]);

  const handleDisconnect = useCallback(() => {
    gloveBle.disconnect();
    setBleStatus("disconnected");
    setIsRecording(false);
    isRecordingRef.current = false;
  }, []);

  const startRecording = useCallback(() => {
    pointsRef.current      = [];
    seqRef.current         = 0;
    lastArrivalRef.current = null;
    recordingStartRef.current = Date.now();
    setPoints([]);
    setIsRecording(true);
    isRecordingRef.current = true;
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    isRecordingRef.current = false;
    setPoints([...pointsRef.current]);
  }, []);

  // Stats — exclude first-packet sentinel (-1)
  const iaValues  = points.filter((p) => p.interarrival_ms >= 0).map((p) => p.interarrival_ms);
  const hasData   = iaValues.length > 0;
  const m         = hasData ? mean(iaValues)            : 0;
  const mn        = hasData ? Math.min(...iaValues)      : 0;
  const mx        = hasData ? Math.max(...iaValues)      : 0;
  const sd        = hasData ? stdDev(iaValues, m)        : 0;
  const effectHz  = m > 0 ? 1000 / m                    : 0;
  const onTimePct = hasData
    ? (iaValues.filter((v) => Math.abs(v - TARGET_INTERVAL_MS) <= ON_TIME_TOLERANCE_MS).length / iaValues.length) * 100
    : 0;

  const chartPoints = points.filter((p) => p.interarrival_ms >= 0);
  const chartSeries: ChartSeries[] = [
    { label: "Inter-arrival (ms)", colour: "#39FF6A", values: chartPoints.map((p) => p.interarrival_ms) },
    { label: "Target (20 ms)",     colour: "#8A9E8D", values: chartPoints.map(() => TARGET_INTERVAL_MS) },
  ];

  const STAT_CARDS = [
    { label: "Mean interval", value: m.toFixed(2),         unit: "ms" },
    { label: "Effective Hz",  value: effectHz.toFixed(1),  unit: "Hz" },
    { label: "Jitter σ",      value: sd.toFixed(2),        unit: "ms" },
    { label: "On-time",       value: onTimePct.toFixed(1), unit: `% (±${ON_TIME_TOLERANCE_MS}ms)` },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto pb-16">

      {/* Header */}
      <div>
        <h1 className="font-mono text-xl font-bold text-white">BLE_TIMING</h1>
        <p className="font-grotesk text-xs text-neutral mt-1">
          Validates the 50 Hz BLE delivery rate by measuring packet inter-arrival time at the browser.
          No clock synchronisation required.
        </p>
      </div>

      {/* BLE Connection */}
      <div className="bg-secondary border border-white/5 rounded-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            bleStatus === "connected"  ? "bg-primary" :
            bleStatus === "connecting" ? "bg-primary animate-pulse" :
            bleStatus === "error"      ? "bg-warning" : "bg-neutral"
          }`} />
          <span className="font-mono text-xs text-white">
            {bleStatus === "connected" ? (gloveBle.deviceName ?? "GhostGlove") : bleStatus}
          </span>
        </div>
        <button
          onClick={bleStatus === "connected" ? handleDisconnect : handleConnect}
          disabled={bleStatus === "connecting"}
          className="font-mono text-xs px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
        >
          {bleStatus === "connected" ? "Disconnect" : "Connect Glove"}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-sm border border-warning/40 bg-warning/10 font-grotesk text-sm text-warning">
          {error}
        </div>
      )}

      {/* Method */}
      <div className="bg-secondary border border-white/5 rounded-sm p-4 space-y-1">
        <p className="font-grotesk text-xs text-neutral uppercase tracking-widest">Method</p>
        <p className="font-mono text-xs text-white/70 leading-relaxed">
          inter_arrival_ms = arrival[n] − arrival[n−1]
        </p>
        <p className="font-grotesk text-xs text-neutral">
          The ESP32 fires at <span className="text-white">delay(20)</span> → target 20 ms / 50 Hz.
          Inter-arrival time at the browser directly measures BLE delivery consistency without
          needing synchronised clocks. Low jitter σ and mean ≈ 20 ms = healthy link.
        </p>
      </div>

      {/* Recording Control */}
      {bleStatus === "connected" && (
        <div className="bg-secondary border border-white/5 rounded-sm p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-white">
              {isRecording
                ? <span className="text-primary animate-pulse">● Recording — {points.length} intervals</span>
                : points.length > 0
                  ? `${points.length} intervals captured`
                  : "Ready to record"}
            </p>
            <p className="font-grotesk text-xs text-neutral mt-0.5">
              {isRecording ? "Keep glove active — press Stop when done" : "Press Start Recording to begin"}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {!isRecording && points.length > 0 && (
              <button
                onClick={() => downloadCSV(toCSV(points), "ble_interarrival.csv")}
                className="font-mono text-xs px-3 py-1.5 rounded-sm border border-white/20 text-neutral hover:text-white transition-colors"
              >
                Export CSV
              </button>
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`font-mono text-xs px-4 py-1.5 rounded-sm font-bold transition-colors ${
                isRecording
                  ? "bg-warning text-white hover:bg-warning/90"
                  : "bg-primary text-background hover:bg-primary/90"
              }`}
            >
              {isRecording ? "Stop" : "Start Recording"}
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      {points.length > 2 && (
        <div className="bg-secondary border border-white/5 rounded-sm p-4">
          <SvgChart
            xValues={chartPoints.map((p) => p.seq)}
            series={chartSeries}
            xLabel="Packet sequence"
            yLabel="ms"
            xTickFormat={(v) => v.toFixed(0)}
            title="Inter-arrival time per packet"
          />
        </div>
      )}

      {/* Stats */}
      {!isRecording && hasData && (
        <div className="bg-secondary border border-white/5 rounded-sm p-4 space-y-4">
          <p className="font-grotesk text-xs text-neutral uppercase tracking-widest">
            Statistics — {points.length} intervals ({(points.length + 1)} packets)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STAT_CARDS.map(({ label, value, unit }) => (
              <div key={label} className="bg-background rounded-sm p-3 border border-white/5">
                <p className="font-grotesk text-xs text-neutral uppercase tracking-widest">{label}</p>
                <p className="font-mono text-2xl font-bold text-white mt-1">{value}</p>
                <p className="font-mono text-xs text-neutral">{unit}</p>
              </div>
            ))}
          </div>
          {/* Min / max row */}
          <div className="flex gap-6 pt-1 border-t border-white/5">
            <span className="font-mono text-xs text-neutral">
              min <span className="text-white">{mn.toFixed(2)} ms</span>
            </span>
            <span className="font-mono text-xs text-neutral">
              max <span className="text-white">{mx.toFixed(2)} ms</span>
            </span>
            <span className="font-mono text-xs text-neutral">
              target <span className="text-primary">{TARGET_INTERVAL_MS} ms</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
