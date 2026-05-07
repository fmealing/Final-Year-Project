// ─── BLE Packet ────────────────────────────────────────────────────────────────
// Matches the ESP32-C3 BLE characteristic payload exactly.
export interface BLEPacket {
  accel_x: number;   // m/s²
  accel_y: number;
  accel_z: number;
  gyro_x: number;    // deg/s
  gyro_y: number;
  gyro_z: number;
  flex_1: number;    // Thumb  (raw ADC or mapped voltage)
  flex_2: number;    // Index
  flex_3: number;    // Middle
  flex_4: number;    // Ring
  rep_count: number; // Cumulative rep count from ESP32
  timestamp: number; // ms since session start
}

// ─── Flex Finger Position ───────────────────────────────────────────────────────
export type FingerPosition = "EXTENDED" | "PARTIAL" | "BENT" | "CLOSED";

export interface FlexReading {
  raw: number;
  position: FingerPosition;
}

export interface FlexSnapshot {
  thumb: FlexReading;
  index: FlexReading;
  middle: FlexReading;
  ring: FlexReading;
}

// ─── Session ────────────────────────────────────────────────────────────────────
export interface Session {
  id: string;
  startedAt: string;  // ISO 8601
  endedAt: string;
  durationMs: number;
  repCount: number;
  packets: BLEPacket[];
}

// ─── Backend API ────────────────────────────────────────────────────────────────
export interface SessionSummary {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  repCount: number;
}

export interface PostSessionPayload {
  startedAt: string;
  endedAt: string;
  packets: BLEPacket[];
}

export interface PostSessionResponse {
  id: string;
}

// ─── BLE Connection State ───────────────────────────────────────────────────────
export type BLEConnectionState =
  | "disconnected"
  | "scanning"
  | "connecting"
  | "connected"
  | "error";
