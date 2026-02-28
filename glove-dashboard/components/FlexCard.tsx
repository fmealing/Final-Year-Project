"use client";

import { TelemetryRow } from "@/lib/types";

const FLEX_MIN = 1000;
const FLEX_MAX = 2000;

function normalise(value: number) {
  return Math.min(100, Math.max(0, ((value - FLEX_MIN) / (FLEX_MAX - FLEX_MIN)) * 100));
}

const FINGER_LABELS = ["Index", "Middle", "Ring", "Pinky"];
const FLEX_KEYS: (keyof TelemetryRow)[] = ["flex1", "flex2", "flex3", "flex4"];

interface FlexCardProps {
  data: TelemetryRow | null;
}

export default function FlexCard({ data }: FlexCardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {FLEX_KEYS.map((key, i) => {
        const raw = data ? (data[key] as number) : null;
        const pct = raw !== null ? normalise(raw) : 0;

        return (
          <div
            key={key}
            className="flex flex-col gap-4 p-5 rounded-sm"
            style={{
              background: "var(--card)",
              border: "1px solid var(--rim)",
            }}
          >
            {/* Label row */}
            <div className="flex items-center justify-between">
              <p
                className="text-[10px] tracking-[0.2em] uppercase"
                style={{ color: "var(--muted)", fontFamily: "var(--font-barlow)" }}
              >
                {FINGER_LABELS[i]}
              </p>
              <p
                className="text-[10px]"
                style={{ color: "var(--subtle)", fontFamily: "var(--font-mono)" }}
              >
                F{i + 1}
              </p>
            </div>

            {/* Value */}
            <p
              className="text-3xl leading-none tabular-nums"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 400,
                color: raw !== null ? "var(--text)" : "var(--subtle)",
              }}
            >
              {raw !== null ? raw.toLocaleString() : "——"}
            </p>

            {/* Bar track */}
            <div
              className="w-full h-0.5 rounded-full overflow-hidden"
              style={{ background: "var(--card-2)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: "var(--lime)" }}
              />
            </div>

            {/* Percent */}
            <p
              className="text-[10px] tabular-nums"
              style={{ color: "var(--subtle)", fontFamily: "var(--font-mono)" }}
            >
              {pct.toFixed(0)}% bend
            </p>
          </div>
        );
      })}
    </div>
  );
}
