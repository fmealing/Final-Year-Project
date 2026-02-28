"use client";

import { TelemetryRow } from "@/lib/types";

interface MetricProps {
  label: string;
  value: number | null;
  unit: string;
}

function Metric({ label, value, unit }: MetricProps) {
  return (
    <div className="flex flex-col gap-2">
      <p
        className="text-[10px] tracking-[0.18em] uppercase"
        style={{ color: "var(--muted)", fontFamily: "var(--font-barlow)" }}
      >
        {label}
      </p>
      <p
        className="text-xl leading-none tabular-nums"
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 400,
          color: value === null ? "var(--subtle)" : "var(--text)",
        }}
      >
        {value !== null ? (value >= 0 ? "+" : "") + value.toFixed(3) : "——"}
      </p>
      <p
        className="text-[10px]"
        style={{ color: "var(--subtle)", fontFamily: "var(--font-mono)" }}
      >
        {unit}
      </p>
    </div>
  );
}

interface ImuCardProps {
  data: TelemetryRow | null;
}

export default function ImuCard({ data }: ImuCardProps) {
  const d = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        className="rounded-sm p-5"
        style={{ background: "var(--card)", border: "1px solid var(--rim)" }}
      >
        <p
          className="text-[10px] tracking-[0.2em] uppercase mb-5"
          style={{ color: "var(--lime)", fontFamily: "var(--font-barlow)" }}
        >
          Acceleration
        </p>
        <div className="grid grid-cols-3 gap-4">
          <Metric label="X" value={d ? d.ax : null} unit="g" />
          <Metric label="Y" value={d ? d.ay : null} unit="g" />
          <Metric label="Z" value={d ? d.az : null} unit="g" />
        </div>
      </div>

      <div
        className="rounded-sm p-5"
        style={{ background: "var(--card)", border: "1px solid var(--rim)" }}
      >
        <p
          className="text-[10px] tracking-[0.2em] uppercase mb-5"
          style={{ color: "var(--lime)", fontFamily: "var(--font-barlow)" }}
        >
          Gyroscope
        </p>
        <div className="grid grid-cols-3 gap-4">
          <Metric label="X" value={d ? d.gx : null} unit="rad/s" />
          <Metric label="Y" value={d ? d.gy : null} unit="rad/s" />
          <Metric label="Z" value={d ? d.gz : null} unit="rad/s" />
        </div>
      </div>
    </div>
  );
}
