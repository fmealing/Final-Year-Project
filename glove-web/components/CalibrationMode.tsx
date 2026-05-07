"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GlovePacket, BleStatus } from "@/lib/types";
import { gloveBle } from "@/lib/ble";
import SvgChart, { ChartSeries } from "./SvgChart";

// ── Constants ─────────────────────────────────────────────────────────────────

const POSITIONS = [
  "Hand flat on table",
  "50 mm tube",
  "40 mm tube",
  "30 mm tube",
  "20 mm tube",
  "Fist",
] as const;

type Position = (typeof POSITIONS)[number];

const CAPTURE_DURATION_MS = 30_000;

const FINGER_COLOURS = {
  ring:   "#39FF6A",
  middle: "#60A5FA",
  index:  "#FBBF24",
  thumb:  "#F472B6",
} as const;

type Finger = keyof typeof FINGER_COLOURS;
const FINGERS: Finger[] = ["ring", "middle", "index", "thumb"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface CapturePoint {
  t_s: number;
  flex_ring: number;
  flex_middle: number;
  flex_index: number;
  flex_thumb: number;
}

interface FingerStats {
  min: number;
  max: number;
  range: number;
  mean: number;
}

type CaptureStats = Record<Finger, FingerStats>;
type Phase = "idle" | "countdown" | "capturing" | "done";

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeStats(values: number[]): FingerStats {
  if (values.length === 0) return { min: 0, max: 0, range: 0, mean: 0 };
  const min  = Math.min(...values);
  const max  = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { min, max, range: max - min, mean };
}

function captureStats(points: CapturePoint[]): CaptureStats {
  return {
    ring:   computeStats(points.map((p) => p.flex_ring)),
    middle: computeStats(points.map((p) => p.flex_middle)),
    index:  computeStats(points.map((p) => p.flex_index)),
    thumb:  computeStats(points.map((p) => p.flex_thumb)),
  };
}

function toPositionCSV(position: string, points: CapturePoint[]): string {
  const rows = points.map(
    (p) =>
      `${p.t_s.toFixed(3)},${p.flex_ring.toFixed(0)},${p.flex_middle.toFixed(0)},${p.flex_index.toFixed(0)},${p.flex_thumb.toFixed(0)}`,
  );
  return [
    `# Ghost Glove Flex Calibration — ${position}`,
    "t_s,flex_ring,flex_middle,flex_index,flex_thumb",
    ...rows,
  ].join("\n");
}

function toSummaryCSV(all: Record<string, CapturePoint[]>): string {
  const header =
    "position," +
    FINGERS.flatMap((f) => [`${f}_min`, `${f}_max`, `${f}_range`, `${f}_mean`]).join(",");

  const rows = Object.entries(all).map(([pos, pts]) => {
    const s = captureStats(pts);
    return [
      pos,
      ...FINGERS.flatMap((f) => [
        s[f].min.toFixed(0),
        s[f].max.toFixed(0),
        s[f].range.toFixed(0),
        s[f].mean.toFixed(1),
      ]),
    ].join(",");
  });

  return ["# Ghost Glove Flex Calibration Summary", header, ...rows].join("\n");
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

function slugify(s: string) {
  return s.replace(/\s+/g, "_").toLowerCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CalibrationMode() {
  const [bleStatus,   setBleStatus]   = useState<BleStatus>("disconnected");
  const [error,       setError]       = useState<string | null>(null);
  const [position,    setPosition]    = useState<Position>(POSITIONS[0]);
  const [phase,       setPhase]       = useState<Phase>("idle");
  const [countdown,   setCountdown]   = useState(3);
  const [capture,     setCapture]     = useState<CapturePoint[]>([]);
  const [allCaptures, setAllCaptures] = useState<Record<string, CapturePoint[]>>({});

  // Mutable refs so packet handler never closes over stale state
  const phaseRef        = useRef<Phase>("idle");
  const captureRef      = useRef<CapturePoint[]>([]);
  const captureStartRef = useRef<number>(0);
  const countdownTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionRef     = useRef<Position>(POSITIONS[0]);

  useEffect(() => { phaseRef.current   = phase;    }, [phase]);
  useEffect(() => { positionRef.current = position; }, [position]);

  // Packet handler — stable reference, uses only refs
  const onPacket = useCallback((p: GlovePacket) => {
    if (phaseRef.current !== "capturing") return;
    captureRef.current.push({
      t_s:        (Date.now() - captureStartRef.current) / 1000,
      flex_ring:   p.flex_1,
      flex_middle: p.flex_2,
      flex_index:  p.flex_3,
      flex_thumb:  p.flex_4,
    });
  }, []);

  // Throttle chart re-renders to 5 Hz during capture
  useEffect(() => {
    if (phase !== "capturing") return;
    displayTimer.current = setInterval(() => {
      setCapture([...captureRef.current]);
    }, 200);
    return () => {
      if (displayTimer.current) clearInterval(displayTimer.current);
    };
  }, [phase]);

  const handleConnect = useCallback(async () => {
    setError(null);
    setBleStatus("connecting");
    try {
      await gloveBle.connect(onPacket, () => setBleStatus("disconnected"));
      setBleStatus("connected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setBleStatus("error");
    }
  }, [onPacket]);

  const handleDisconnect = useCallback(() => {
    gloveBle.disconnect();
    setBleStatus("disconnected");
  }, []);

  const startCapture = useCallback(() => {
    if (bleStatus !== "connected") return;

    // Clear any running timers
    if (countdownTimer.current) clearTimeout(countdownTimer.current);
    if (captureTimer.current)   clearTimeout(captureTimer.current);

    captureRef.current = [];
    setCapture([]);
    setPhase("countdown");

    // Countdown chain: 3 → 2 → 1 → 0 → start
    const tick = (n: number) => {
      setCountdown(n);
      if (n > 0) {
        countdownTimer.current = setTimeout(() => tick(n - 1), 1000);
      } else {
        captureStartRef.current = Date.now();
        setPhase("capturing");

        captureTimer.current = setTimeout(() => {
          if (displayTimer.current) clearInterval(displayTimer.current);
          const final = [...captureRef.current];
          setCapture(final);
          setPhase("done");
          setAllCaptures((prev) => ({ ...prev, [positionRef.current]: final }));
        }, CAPTURE_DURATION_MS);
      }
    };
    tick(3);
  }, [bleStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearTimeout(countdownTimer.current);
      if (captureTimer.current)   clearTimeout(captureTimer.current);
      if (displayTimer.current)   clearInterval(displayTimer.current);
    };
  }, []);

  // Chart data
  const chartXValues = capture.map((p) => p.t_s);
  const chartSeries: ChartSeries[] = FINGERS.map((f) => ({
    label:  f.charAt(0).toUpperCase() + f.slice(1),
    colour: FINGER_COLOURS[f],
    values: capture.map((p) => p[`flex_${f}` as keyof CapturePoint] as number),
  }));

  const currentStats = capture.length > 0 ? captureStats(capture) : null;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto pb-16">

      {/* Header */}
      <div>
        <h1 className="font-mono text-xl font-bold text-white">FLEX_CALIBRATION</h1>
        <p className="font-grotesk text-xs text-neutral mt-1">
          Capture 30 s of flex sensor data per hand position. Use the exported CSVs to
          determine per-finger ADC min/max ranges.
        </p>
      </div>

      {/* BLE Connection */}
      <div className="bg-secondary border border-white/5 rounded-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              bleStatus === "connected"  ? "bg-primary" :
              bleStatus === "connecting" ? "bg-primary animate-pulse" :
              bleStatus === "error"      ? "bg-warning" : "bg-neutral"
            }`}
          />
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

      {/* Position Selector */}
      <div className="bg-secondary border border-white/5 rounded-sm p-4 space-y-3">
        <p className="font-grotesk text-xs text-neutral uppercase tracking-widest">
          Hand Position
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={`font-mono text-xs px-3 py-2 rounded-sm border transition-colors text-left ${
                position === pos
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-white/10 text-neutral hover:text-white hover:border-white/20"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Capture Control */}
      <div className="bg-secondary border border-white/5 rounded-sm p-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-sm text-white">
            {phase === "idle"      && "Ready to capture"}
            {phase === "countdown" && <span className="text-primary">Starting in {countdown}…</span>}
            {phase === "capturing" && <span className="text-primary animate-pulse">● Recording — {capture.length} packets</span>}
            {phase === "done"      && <span className="text-primary">Done — {capture.length} packets captured</span>}
          </p>
          <p className="font-grotesk text-xs text-neutral mt-0.5 truncate">{position}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {phase === "done" && (
            <button
              onClick={() =>
                downloadCSV(
                  toPositionCSV(position, capture),
                  `flex_${slugify(position)}.csv`,
                )
              }
              className="font-mono text-xs px-3 py-1.5 rounded-sm border border-white/20 text-neutral hover:text-white transition-colors"
            >
              Export CSV
            </button>
          )}
          <button
            onClick={startCapture}
            disabled={bleStatus !== "connected" || phase === "countdown" || phase === "capturing"}
            className="font-mono text-xs px-4 py-1.5 rounded-sm bg-primary text-background font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {phase === "capturing" ? "Recording…" : "Start Capture"}
          </button>
        </div>
      </div>

      {/* Live Chart */}
      {capture.length > 1 && (
        <div className="bg-secondary border border-white/5 rounded-sm p-4">
          <SvgChart
            xValues={chartXValues}
            series={chartSeries}
            xLabel="Time (s)"
            yLabel="ADC"
            xTickFormat={(v) => `${v.toFixed(1)}s`}
            title="Flex sensor readings"
          />
        </div>
      )}

      {/* Per-finger stats for current capture */}
      {currentStats && phase === "done" && (
        <div className="bg-secondary border border-white/5 rounded-sm p-4 space-y-3">
          <p className="font-grotesk text-xs text-neutral uppercase tracking-widest">
            {position} — {capture.length} samples
          </p>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-neutral border-b border-white/5">
                <th className="text-left py-1.5 font-normal">Finger</th>
                <th className="text-right py-1.5 font-normal">Min</th>
                <th className="text-right py-1.5 font-normal">Max</th>
                <th className="text-right py-1.5 font-normal">Range</th>
                <th className="text-right py-1.5 font-normal">Mean</th>
              </tr>
            </thead>
            <tbody>
              {FINGERS.map((f) => {
                const s = currentStats[f];
                return (
                  <tr key={f} className="border-b border-white/5">
                    <td className="py-1.5 flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block shrink-0"
                        style={{ backgroundColor: FINGER_COLOURS[f] }}
                      />
                      <span className="capitalize text-white">{f}</span>
                    </td>
                    <td className="text-right text-neutral">{s.min.toFixed(0)}</td>
                    <td className="text-right text-neutral">{s.max.toFixed(0)}</td>
                    <td className="text-right text-primary font-bold">{s.range.toFixed(0)}</td>
                    <td className="text-right text-neutral">{s.mean.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* All-captures summary */}
      {Object.keys(allCaptures).length > 0 && (
        <div className="bg-secondary border border-white/5 rounded-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-grotesk text-xs text-neutral uppercase tracking-widest">
              All Captures — Summary
            </p>
            <button
              onClick={() =>
                downloadCSV(toSummaryCSV(allCaptures), "flex_calibration_summary.csv")
              }
              className="font-mono text-xs px-3 py-1 rounded-sm border border-white/20 text-neutral hover:text-white transition-colors"
            >
              Export All CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono min-w-[480px]">
              <thead>
                <tr className="text-neutral border-b border-white/5 text-[10px]">
                  <th className="text-left py-1.5 font-normal">Position</th>
                  {FINGERS.map((f) => (
                    <th key={f} className="text-right py-1.5 font-normal" colSpan={3}>
                      <span style={{ color: FINGER_COLOURS[f] }}>{f}</span>
                    </th>
                  ))}
                </tr>
                <tr className="text-neutral/50 border-b border-white/5 text-[10px]">
                  <th />
                  {FINGERS.map((f) => (
                    <>
                      <th key={`${f}_min`}   className="text-right font-normal">min</th>
                      <th key={`${f}_max`}   className="text-right font-normal">max</th>
                      <th key={`${f}_range`} className="text-right font-normal pr-3">rng</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(allCaptures).map(([pos, pts]) => {
                  const s = captureStats(pts);
                  return (
                    <tr key={pos} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-1.5 text-white">{pos}</td>
                      {FINGERS.map((f) => (
                        <>
                          <td key={`${pos}_${f}_min`}   className="text-right text-neutral">{s[f].min.toFixed(0)}</td>
                          <td key={`${pos}_${f}_max`}   className="text-right text-neutral">{s[f].max.toFixed(0)}</td>
                          <td key={`${pos}_${f}_range`} className="text-right text-primary pr-3">{s[f].range.toFixed(0)}</td>
                        </>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
