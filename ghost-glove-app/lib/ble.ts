// ─── BLE Manager ─────────────────────────────────────────────────────────────────
// Wraps react-native-ble-plx for Ghost Glove ESP32-C3 connectivity.
//
// NOTE: BLE requires a development build — it will NOT work in Expo Go.
// In Expo Go, GhostGloveBLE is replaced with a no-op stub so the UI still
// renders. Use `npx expo run:ios` or `npx expo run:android` for real BLE.

import { Buffer } from "buffer";
import type { BLEPacket, BLEConnectionState } from "./types";

export const BLE_CONFIG = {
  DEVICE_NAME: "GhostGlove",
  SERVICE_UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
  CHARACTERISTIC_UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
} as const;

// ─── Packet Parsing ───────────────────────────────────────────────────────────────
const PACKET_SIZE = 48;

export function parsePacket(base64: string): BLEPacket | null {
  try {
    const raw = Buffer.from(base64, "base64");
    if (raw.length < PACKET_SIZE) return null;

    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    let offset = 0;

    const read32f = () => { const v = view.getFloat32(offset, true); offset += 4; return v; };
    const read32u = () => { const v = view.getUint32(offset, true); offset += 4; return v; };

    return {
      accel_x: read32f(), accel_y: read32f(), accel_z: read32f(),
      gyro_x:  read32f(), gyro_y:  read32f(), gyro_z:  read32f(),
      flex_1:  read32f(), flex_2:  read32f(), flex_3:  read32f(), flex_4: read32f(),
      rep_count: read32u(),
      timestamp: read32u(),
    };
  } catch {
    return null;
  }
}

// ─── BLE Service ─────────────────────────────────────────────────────────────────
export type PacketCallback = (packet: BLEPacket) => void;
export type StateCallback  = (state: BLEConnectionState) => void;

// Check whether the BLE native module is available without instantiating it.
// react-native-ble-plx's NativeModule is null in Expo Go — instantiating
// BleManager there throws NativeEventEmitter errors. We check the underlying
// NativeModule directly so we never trigger that path at load time.
function isBLEAvailable(): boolean {
  try {
    const { NativeModules } = require("react-native");
    return NativeModules?.BleClientManager != null;
  } catch {
    return false;
  }
}

const BLE_AVAILABLE = isBLEAvailable();

export class GhostGloveBLE {
  private manager: any = null;
  private device: any   = null;
  private onPacket: PacketCallback;
  private onState: StateCallback;

  constructor(onPacket: PacketCallback, onState: StateCallback) {
    this.onPacket = onPacket;
    this.onState  = onState;

    if (BLE_AVAILABLE) {
      const { BleManager } = require("react-native-ble-plx");
      this.manager = new BleManager();
    } else {
      console.warn("[BLE] Native module unavailable — running in stub mode (Expo Go). Use a dev build for real BLE.");
    }
  }

  async connect(): Promise<void> {
    if (!this.manager) {
      this.onState("error");
      return;
    }
    this.onState("scanning");

    return new Promise((resolve, reject) => {
      this.manager.startDeviceScan(null, null, async (error: any, device: any) => {
        if (error) { this.onState("error"); reject(error); return; }

        if (device?.name === BLE_CONFIG.DEVICE_NAME) {
          this.manager.stopDeviceScan();
          this.onState("connecting");
          try {
            const connected = await device.connect();
            this.device = connected;
            await connected.discoverAllServicesAndCharacteristics();
            this.onState("connected");
            this.subscribe();
            resolve();
          } catch (e) {
            this.onState("error");
            reject(e);
          }
        }
      });
    });
  }

  private subscribe(): void {
    if (!this.device) return;
    this.device.monitorCharacteristicForService(
      BLE_CONFIG.SERVICE_UUID,
      BLE_CONFIG.CHARACTERISTIC_UUID,
      (error: any, characteristic: any) => {
        if (error) { this.onState("disconnected"); this.reconnect(); return; }
        if (characteristic?.value) {
          const packet = parsePacket(characteristic.value);
          if (packet) this.onPacket(packet);
        }
      }
    );
  }

  private async reconnect(): Promise<void> {
    await new Promise((r) => setTimeout(r, 2000));
    this.connect().catch(() => {});
  }

  async disconnect(): Promise<void> {
    await this.device?.cancelConnection();
    this.device = null;
    this.onState("disconnected");
  }

  destroy(): void {
    this.manager?.destroy();
  }
}
