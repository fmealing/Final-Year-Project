"use client";

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  dim?: boolean;
}

export default function MetricCard({ label, value, unit, dim = false }: Props) {
  return (
    <div className="bg-secondary border border-white/5 rounded-sm p-4 flex flex-col gap-1">
      <span className="font-grotesk text-xs text-neutral uppercase tracking-widest">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className={`font-mono text-xl font-bold tabular-nums ${
            dim ? "text-neutral" : "text-white"
          }`}
        >
          {value}
        </span>
      </div>
      {unit && <span className="font-mono text-xs text-neutral">{unit}</span>}
    </div>
  );
}
