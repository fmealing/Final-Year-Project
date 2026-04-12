"use client";

import { useState, useCallback } from "react";
import type { GlovePacket, BleStatus } from "@/lib/types";
import { gloveBle } from "@/lib/ble";
import { FLEX_RANGES } from "@/lib/flexCalibration";
import ConnectButton from "./ConnectButton";
import MetricCard from "./MetricCard";
import FlexBar from "./FlexBar";
import Image from "next/image";

const EMPTY: GlovePacket = {
  accel_x: 0,
  accel_y: 0,
  accel_z: 0,
  gyro_x: 0,
  gyro_y: 0,
  gyro_z: 0,
  flex_1: 0,
  flex_2: 0,
  flex_3: 0,
  flex_4: 0,
  rep_count: 0,
  timestamp: 0,
};

export default function Dashboard() {
  const [status, setStatus] = useState<BleStatus>("disconnected");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [packet, setPacket] = useState<GlovePacket>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      await gloveBle.connect(
        (p) => setPacket(p),
        () => {
          setStatus("disconnected");
          setDeviceName(null);
          setPacket(EMPTY);
        },
      );
      setStatus("connected");
      setDeviceName(gloveBle.deviceName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
      setStatus("error");
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    gloveBle.disconnect();
    setStatus("disconnected");
    setDeviceName(null);
    setPacket(EMPTY);
  }, []);

  const dim = status !== "connected";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Image
            src="/images/icon.png"
            alt="Ghost Glove"
            width={36}
            height={36}
          />
          <div>
            <h1 className="font-mono font-bold text-xl tracking-tight text-white">
              GHOST<span className="text-primary">_</span>GLOVE
            </h1>
            <p className="font-grotesk text-xs text-neutral mt-0.5">
              Live BLE Dashboard
            </p>
          </div>
        </div>
        <ConnectButton
          status={status}
          deviceName={deviceName}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-sm border border-warning/40 bg-warning/10 font-grotesk text-sm text-warning">
          {error}
        </div>
      )}

      {/* Disconnected hint */}
      {status === "disconnected" && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="font-mono text-6xl text-white/5 select-none">◈</div>
            <p className="font-grotesk text-neutral text-sm">
              Connect your glove to start streaming data
            </p>
          </div>
        </div>
      )}

      {/* Live data grid */}
      {status === "connected" && (
        <main className="p-6 grid gap-6 pb-12">
          {/* Reps — hero metric */}
          <div className="bg-secondary border border-primary/20 rounded-sm p-6 flex flex-col gap-1">
            <span className="font-grotesk text-xs text-neutral uppercase tracking-widest">
              Rep Count
            </span>
            <span className="font-mono text-7xl font-bold text-primary tabular-nums leading-none">
              {packet.rep_count}
            </span>
          </div>

          {/* Flex sensors */}
          <section>
            <h2 className="font-grotesk text-xs text-neutral uppercase tracking-widest mb-3">
              Flex Sensors
            </h2>
            <div className="bg-secondary border border-white/5 rounded-sm p-4 space-y-4">
              <FlexBar finger="Ring"   value={packet.flex_1} {...FLEX_RANGES.ring} />
              <FlexBar finger="Middle" value={packet.flex_2} {...FLEX_RANGES.middle} />
              <FlexBar finger="Index"  value={packet.flex_3} {...FLEX_RANGES.index} />
              <FlexBar finger="Thumb"  value={packet.flex_4} {...FLEX_RANGES.thumb} />
            </div>
          </section>

          {/* IMU — accelerometer */}
          <section>
            <h2 className="font-grotesk text-xs text-neutral uppercase tracking-widest mb-3">
              Accelerometer (m/s²)
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="X"
                value={packet.accel_x.toFixed(2)}
                unit="m/s²"
                dim={dim}
              />
              <MetricCard
                label="Y"
                value={packet.accel_y.toFixed(2)}
                unit="m/s²"
                dim={dim}
              />
              <MetricCard
                label="Z"
                value={packet.accel_z.toFixed(2)}
                unit="m/s²"
                dim={dim}
              />
            </div>
          </section>

          {/* IMU — gyroscope */}
          <section>
            <h2 className="font-grotesk text-xs text-neutral uppercase tracking-widest mb-3">
              Gyroscope (rad/s)
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="X"
                value={packet.gyro_x.toFixed(3)}
                unit="rad/s"
                dim={dim}
              />
              <MetricCard
                label="Y"
                value={packet.gyro_y.toFixed(3)}
                unit="rad/s"
                dim={dim}
              />
              <MetricCard
                label="Z"
                value={packet.gyro_z.toFixed(3)}
                unit="rad/s"
                dim={dim}
              />
            </div>
          </section>

          {/* Session timestamp */}
          <div className="font-mono text-xs text-neutral text-right">
            T+{(packet.timestamp / 1000).toFixed(1)}s
          </div>
        </main>
      )}
    </div>
  );
}
