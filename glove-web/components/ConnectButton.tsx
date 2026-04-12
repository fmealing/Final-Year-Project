"use client";

import type { BleStatus } from "@/lib/types";

interface Props {
  status: BleStatus;
  deviceName: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

const statusLabel: Record<BleStatus, string> = {
  disconnected: "Connect Glove",
  connecting: "Connecting…",
  connected: "Disconnect",
  error: "Retry",
};

const statusDot: Record<BleStatus, string> = {
  disconnected: "bg-neutral",
  connecting: "bg-primary animate-pulse",
  connected: "bg-primary",
  error: "bg-warning",
};

export default function ConnectButton({
  status,
  deviceName,
  onConnect,
  onDisconnect,
}: Props) {
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${statusDot[status]}`} />
        <button
          onClick={isConnected ? onDisconnect : onConnect}
          disabled={isConnecting}
          className="
            px-5 py-2 rounded-sm border border-primary text-primary
            font-grotesk font-semibold text-sm tracking-wide
            transition-all duration-150
            hover:bg-primary hover:text-background
            disabled:opacity-40 disabled:cursor-not-allowed
            active:scale-95
          "
        >
          {statusLabel[status]}
        </button>
      </div>
    </div>
  );
}
