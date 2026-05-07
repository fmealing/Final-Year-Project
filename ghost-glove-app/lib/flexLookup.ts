import type { FingerPosition, FlexReading } from "./types";

// ─── Calibration Thresholds ─────────────────────────────────────────────────────
// All values are raw ADC / mapped voltage readings from the ESP32.
// These MUST be tuned during calibration — the structure is intentionally
// configurable so thresholds can be updated without touching lookup logic.
//
// Each finger can have independent thresholds (fingers flex differently).
// Thresholds are upper bounds: value <= threshold maps to that position.
// Values above the highest threshold → CLOSED.

export interface FingerThresholds {
  extended: number; // fully open / flat
  partial: number;  // partial bend
  bent: number;     // noticeably bent
  // anything above `bent` threshold → CLOSED
}

export const FLEX_THRESHOLDS: Record<
  "thumb" | "index" | "middle" | "ring",
  FingerThresholds
> = {
  // TODO: replace with calibrated values after a calibration pass
  thumb:  { extended: 1100, partial: 1400, bent: 1700 },
  index:  { extended: 1100, partial: 1400, bent: 1700 },
  middle: { extended: 1100, partial: 1400, bent: 1700 },
  ring:   { extended: 1100, partial: 1400, bent: 1700 },
};

// ─── Lookup Function ─────────────────────────────────────────────────────────────
export function mapFlexToPosition(
  raw: number,
  thresholds: FingerThresholds
): FingerPosition {
  if (raw <= thresholds.extended) return "EXTENDED";
  if (raw <= thresholds.partial)  return "PARTIAL";
  if (raw <= thresholds.bent)     return "BENT";
  return "CLOSED";
}

// ─── Convenience: map all 4 sensors at once ──────────────────────────────────────
export function mapAllFlex(
  flex1: number,
  flex2: number,
  flex3: number,
  flex4: number
): { thumb: FlexReading; index: FlexReading; middle: FlexReading; ring: FlexReading } {
  return {
    thumb:  { raw: flex1, position: mapFlexToPosition(flex1, FLEX_THRESHOLDS.thumb) },
    index:  { raw: flex2, position: mapFlexToPosition(flex2, FLEX_THRESHOLDS.index) },
    middle: { raw: flex3, position: mapFlexToPosition(flex3, FLEX_THRESHOLDS.middle) },
    ring:   { raw: flex4, position: mapFlexToPosition(flex4, FLEX_THRESHOLDS.ring) },
  };
}

// ─── Position → display label ────────────────────────────────────────────────────
export const POSITION_LABELS: Record<FingerPosition, string> = {
  EXTENDED: "Extended",
  PARTIAL:  "Partial",
  BENT:     "Bent",
  CLOSED:   "Closed",
};

// ─── Position → accent colour ────────────────────────────────────────────────────
export const POSITION_COLOURS: Record<FingerPosition, string> = {
  EXTENDED: "#39FF6A",  // primary green
  PARTIAL:  "#F0F7F1",  // white
  BENT:     "#8A9E8D",  // neutral
  CLOSED:   "#FF4444",  // warning red
};
