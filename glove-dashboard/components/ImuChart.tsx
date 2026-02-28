"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TelemetryRow } from "@/lib/types";

const ACCEL_LINES = [
  { key: "ax", label: "X", color: "#c9f135" },
  { key: "ay", label: "Y", color: "#4ade80" },
  { key: "az", label: "Z", color: "#60a5fa" },
];

const GYRO_LINES = [
  { key: "gx", label: "X", color: "#fb923c" },
  { key: "gy", label: "Y", color: "#f472b6" },
  { key: "gz", label: "Z", color: "#a78bfa" },
];

interface ImuChartProps {
  data: TelemetryRow[];
}

function formatTime(tsMs: number) {
  const d = new Date(tsMs);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

const axisProps = {
  tick: { fontSize: 10, fill: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)" } as React.SVGProps<SVGTextElement>,
  axisLine: { stroke: "rgba(255,255,255,0.06)" },
  tickLine: false as const,
};

const tooltipStyle = {
  contentStyle: {
    background: "#161616",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    color: "#fff",
  },
  labelStyle: { color: "rgba(255,255,255,0.5)", marginBottom: 4 },
};

const legendStyle = {
  wrapperStyle: {
    fontSize: 11,
    paddingTop: 16,
    fontFamily: "var(--font-barlow)",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
  },
};

function SubChart({
  title,
  chartData,
  lines,
  yDomain,
  unit,
}: {
  title: string;
  chartData: Record<string, unknown>[];
  lines: { key: string; label: string; color: string }[];
  yDomain: [number, number];
  unit: string;
}) {
  return (
    <div
      className="rounded-sm p-5"
      style={{ background: "var(--card)", border: "1px solid var(--rim)" }}
    >
      <div className="flex items-baseline gap-2 mb-6">
        <p
          className="text-[10px] tracking-[0.2em] uppercase"
          style={{ color: "var(--lime)", fontFamily: "var(--font-barlow)" }}
        >
          {title}
        </p>
        <p
          className="text-[10px]"
          style={{ color: "var(--subtle)", fontFamily: "var(--font-mono)" }}
        >
          {unit}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="time" {...axisProps} interval="preserveStartEnd" />
          <YAxis domain={yDomain} {...axisProps} width={48} />
          <Tooltip {...tooltipStyle} />
          <Legend {...legendStyle} />
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label}
              stroke={l.color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ImuChart({ data }: ImuChartProps) {
  const chartData = data.map((row) => ({
    time: formatTime(row.ts_ms),
    ax: row.ax,
    ay: row.ay,
    az: row.az,
    gx: row.gx,
    gy: row.gy,
    gz: row.gz,
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <SubChart
        title="Acceleration"
        chartData={chartData}
        lines={ACCEL_LINES}
        yDomain={[-1.5, 1.5]}
        unit="g"
      />
      <SubChart
        title="Gyroscope"
        chartData={chartData}
        lines={GYRO_LINES}
        yDomain={[-2.5, 2.5]}
        unit="rad/s"
      />
    </div>
  );
}
