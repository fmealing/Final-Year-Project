"use client";

interface Props {
  finger: string;
  value: number; // raw float from ADC
  min?: number;
  max?: number;
}

export default function FlexBar({ finger, value, min = 0, max = 10000 }: Props) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline">
        <span className="font-grotesk text-xs text-neutral uppercase tracking-widest">
          {finger}
        </span>
        <span className="font-mono text-xs text-white tabular-nums">
          {value.toFixed(0)}
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
