"use client";

import useSWR from "swr";
import { TelemetryRow } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import FlexCard from "@/components/FlexCard";
import ImuCard from "@/components/ImuCard";
import FlexChart from "@/components/FlexChart";
import ImuChart from "@/components/ImuChart";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span
        className="block w-1 h-4 rounded-sm shrink-0"
        style={{ background: "var(--lime)" }}
      />
      <p
        className="text-xs font-700 tracking-[0.2em] uppercase"
        style={{ color: "var(--muted)", fontFamily: "var(--font-barlow)" }}
      >
        {children}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const {
    data: latest,
    error: latestError,
    isLoading: latestLoading,
  } = useSWR<TelemetryRow>("/api/latest", fetcher, { refreshInterval: 500 });

  const { data: history } = useSWR<TelemetryRow[]>("/api/history", fetcher, {
    refreshInterval: 2000,
  });

  const isLive =
    !latestLoading && !latestError && !!latest && !("error" in latest);
  const liveData: TelemetryRow | null =
    isLive && latest && !("error" in latest) ? latest : null;
  const historyData: TelemetryRow[] =
    history && !("error" in history) ? history : [];

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      {/* Top lime accent stripe */}
      <div className="h-0.5 w-full" style={{ background: "var(--lime)" }} />

      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--rim)",
          background: "var(--card)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* Brand mark */}
          <div className="flex items-center gap-4">
            {/* Logo glyph */}
            <div
              className="w-9 h-9 flex items-center justify-center rounded-sm text-[#080808] text-sm font-800"
              style={{
                background: "var(--lime)",
                fontFamily: "var(--font-barlow)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              F
            </div>

            <div>
              <h1
                className="text-2xl leading-none"
                style={{
                  fontFamily: "var(--font-barlow)",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: "var(--text)",
                }}
              >
                Final Year Project
              </h1>
              <p
                className="text-xs mt-0.5"
                style={{
                  color: "var(--muted)",
                  letterSpacing: "0.15em",
                  fontFamily: "var(--font-barlow)",
                }}
              >
                SMART GLOVE SYSTEM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {liveData && (
              <span
                className="hidden sm:block text-xs"
                style={{
                  color: "var(--subtle)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {liveData.device_id} · #{liveData.id}
              </span>
            )}
            <StatusBadge isLive={isLive} />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Live section */}
        <section>
          <SectionLabel>Live Readings</SectionLabel>
          <div className="space-y-4">
            <FlexCard data={liveData} />
            <ImuCard data={liveData} />
          </div>
        </section>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--rim)" }} />

        {/* History section */}
        <section>
          <SectionLabel>
            Session History
            {historyData.length > 0 && ` · ${historyData.length} samples`}
          </SectionLabel>

          {historyData.length === 0 ? (
            <div
              className="rounded-lg p-10 text-center"
              style={{
                background: "var(--card)",
                border: "1px solid var(--rim)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                No session data yet.
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--subtle)" }}>
                Start the MQTT pipeline to begin collecting.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <FlexChart data={historyData} />
              <ImuChart data={historyData} />
            </div>
          )}
        </section>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--rim)" }} />

        {/* Coming soon */}
        <section>
          <SectionLabel>In Development</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                label: "Rep Counter",
                value: "—",
                hint: "Automatic repetition detection",
              },
              {
                label: "Weight Load",
                value: "— kg",
                hint: "Estimated barbell weight from IMU",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg p-6 flex flex-col gap-3 select-none"
                style={{
                  background: "var(--card)",
                  border: "1px dashed var(--rim-bright)",
                  opacity: 0.45,
                }}
              >
                <p
                  className="text-xs tracking-[0.18em] uppercase"
                  style={{
                    color: "var(--muted)",
                    fontFamily: "var(--font-barlow)",
                  }}
                >
                  {item.label}
                </p>
                <p
                  className="text-4xl"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--subtle)",
                    fontWeight: 400,
                  }}
                >
                  {item.value}
                </p>
                <p className="text-xs" style={{ color: "var(--subtle)" }}>
                  {item.hint}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer
          className="text-center pb-6"
          style={{
            color: "var(--subtle)",
            fontFamily: "var(--font-barlow)",
            fontSize: "11px",
            letterSpacing: "0.1em",
          }}
        >
          FORM SMART GLOVE SYSTEM · MEng MECHATRONIC ENGINEERING · UNIVERSITY OF
          BIRMINGHAM
        </footer>
      </main>
    </div>
  );
}
