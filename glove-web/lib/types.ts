/** Parsed data from a single 48-byte BLE packet off the ESP32-C3 */
export interface GlovePacket {
  accel_x: number;
  accel_y: number;
  accel_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  flex_1: number;
  flex_2: number;
  flex_3: number;
  flex_4: number;
  rep_count: number;
  timestamp: number; // ms since session start
}

export type BleStatus = "disconnected" | "connecting" | "connected" | "error";
