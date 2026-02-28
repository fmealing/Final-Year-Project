"use client";

interface StatusBadgeProps {
  isLive: boolean;
}

export default function StatusBadge({ isLive }: StatusBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs tracking-[0.15em] uppercase rounded-sm"
      style={{
        fontFamily: "var(--font-barlow)",
        fontWeight: 600,
        background: isLive ? "rgba(201, 241, 53, 0.1)" : "rgba(255,255,255,0.04)",
        color: isLive ? "var(--lime)" : "var(--muted)",
        border: `1px solid ${isLive ? "rgba(201, 241, 53, 0.3)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLive ? "animate-pulse" : ""}`}
        style={{ background: isLive ? "var(--lime)" : "var(--subtle)" }}
      />
      {isLive ? "Live" : "Offline"}
    </span>
  );
}
