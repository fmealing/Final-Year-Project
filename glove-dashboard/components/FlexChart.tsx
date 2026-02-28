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

const LINE_DEFS = [
  { key: "flex1", label: "Index",  color: "#c9f135" },
  { key: "flex2", label: "Middle", color: "#4ade80" },
  { key: "flex3", label: "Ring",   color: "#60a5fa" },
  { key: "flex4", label: "Pinky",  color: "#f472b6" },
];

interface FlexChartProps {
  data: TelemetryRow[];
}

function formatTime(tsMs: number) {
  const d = new Date(tsMs);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export default function FlexChart({ data }: FlexChartProps) {
  const chartData = data.map((row) => ({
    time: formatTime(row.ts_ms),
    flex1: row.flex1,
    flex2: row.flex2,
    flex3: row.flex3,
    flex4: row.flex4,
  }));

  return (
    <div
      className="rounded-sm p-5"
      style={{ background: "var(--card)", border: "1px solid var(--rim)" }}
    >
      <p
        className="text-[10px] tracking-[0.2em] uppercase mb-6"
        style={{ color: "var(--lime)", fontFamily: "var(--font-barlow)" }}
      >
        Flex Sensor History
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[800, 2100]}
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "#161616",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "#fff",
            }}
            labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}
          />
          <Legend
            wrapperStyle={{
              fontSize: 11,
              paddingTop: 16,
              fontFamily: "var(--font-barlow)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          />
          {LINE_DEFS.map((l) => (
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
