/**
 * Web Bluetooth manager for the Ghost Glove ESP32-C3.
 *
 * UUIDs — swap these for the real values once the firmware exposes them.
 * The packet layout (48 bytes, little-endian) matches main.cpp:
 *   6× float32  → accel x/y/z (m/s²), gyro x/y/z (deg/s)
 *   4× float32  → flex 1–4 (raw 16-bit ADC counts, 0–65535)
 *   1× uint32   → rep_count
 *   1× uint32   → timestamp (ms since session start)
 */

import type { GlovePacket } from "./types";

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

const PACKET_BYTES = 48;

function parsePacket(buffer: ArrayBuffer): GlovePacket {
  const view = new DataView(buffer);
  const f = (offset: number) => view.getFloat32(offset, true);
  const u = (offset: number) => view.getUint32(offset, true);

  return {
    accel_x: f(0),
    accel_y: f(4),
    accel_z: f(8),
    gyro_x: f(12),
    gyro_y: f(16),
    gyro_z: f(20),
    flex_1: f(24),
    flex_2: f(28),
    flex_3: f(32),
    flex_4: f(36),
    rep_count: u(40),
    timestamp: u(44),
  };
}

type PacketCallback = (packet: GlovePacket) => void;
type DisconnectCallback = () => void;

export class GloveBle {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect(
    onPacket: PacketCallback,
    onDisconnect: DisconnectCallback
  ): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error(
        "Web Bluetooth is not supported in this browser. Use Chrome or Edge."
      );
    }

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });

    this.device.addEventListener("gattserverdisconnected", onDisconnect);

    const server = await this.device.gatt!.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    this.characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    this.characteristic.addEventListener(
      "characteristicvaluechanged",
      (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (target.value && target.value.byteLength >= PACKET_BYTES) {
          onPacket(parsePacket(target.value.buffer as ArrayBuffer));
        }
      }
    );

    await this.characteristic.startNotifications();
  }

  disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }

  get deviceName(): string | null {
    return this.device?.name ?? null;
  }
}

export const gloveBle = new GloveBle();
