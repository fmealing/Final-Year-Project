"use client";

export interface ChartSeries {
  label: string;
  colour: string;
  values: number[];
}

interface Props {
  xValues: number[];
  series: ChartSeries[];
  xLabel?: string;
  yLabel?: string;
  xTickFormat?: (v: number) => string;
  title?: string;
  className?: string;
}

const P  = { t: 20, r: 16, b: 36, l: 60 };
const VW = 800;
const VH = 260;
const IW = VW - P.l - P.r;
const IH = VH - P.t - P.b;

const N_Y_GRID  = 5;
const N_X_TICKS = 6;

function fmtY(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(1);
}

export default function SvgChart({
  xValues,
  series,
  xLabel,
  yLabel,
  xTickFormat,
  title,
  className = "",
}: Props) {
  const allY = series.flatMap((s) => s.values);

  if (xValues.length === 0 || allY.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 ${className}`}>
        <span className="font-mono text-xs text-neutral">No data yet</span>
      </div>
    );
  }

  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const rawYMin = Math.min(...allY);
  const rawYMax = Math.max(...allY);
  const yPad = (rawYMax - rawYMin) * 0.08 || 1;
  const yMin = rawYMin - yPad;
  const yMax = rawYMax + yPad;
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin;

  const toX = (x: number) => P.l + ((x - xMin) / xRange) * IW;
  const toY = (y: number) => P.t + IH - ((y - yMin) / yRange) * IH;

  const gridYs = Array.from({ length: N_Y_GRID }, (_, i) =>
    yMin + (yRange / (N_Y_GRID - 1)) * i,
  );

  const xTickIdxs = Array.from({ length: N_X_TICKS }, (_, i) =>
    Math.round((i / (N_X_TICKS - 1)) * (xValues.length - 1)),
  ).filter((v, i, arr) => arr.indexOf(v) === i);

  const defaultFmt = (v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(2));
  const fmtX = xTickFormat ?? defaultFmt;

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <p className="font-grotesk text-xs text-neutral uppercase tracking-widest mb-2">
          {title}
        </p>
      )}

      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ height: 200 }}>
        {/* Horizontal grid lines + Y labels */}
        {gridYs.map((yv, i) => (
          <g key={i}>
            <line
              x1={P.l} y1={toY(yv)}
              x2={VW - P.r} y2={toY(yv)}
              stroke="#1F2E22" strokeWidth="1"
            />
            <text
              x={P.l - 6} y={toY(yv) + 4}
              textAnchor="end" fontSize={10} fill="#8A9E8D" fontFamily="monospace"
            >
              {fmtY(yv)}
            </text>
          </g>
        ))}

        {/* Y axis label */}
        {yLabel && (
          <text
            x={10} y={P.t + IH / 2}
            textAnchor="middle" fontSize={10} fill="#8A9E8D" fontFamily="sans-serif"
            transform={`rotate(-90, 10, ${P.t + IH / 2})`}
          >
            {yLabel}
          </text>
        )}

        {/* Axis lines */}
        <line x1={P.l} y1={P.t}      x2={P.l}      y2={P.t + IH} stroke="#1F2E22" strokeWidth="1" />
        <line x1={P.l} y1={P.t + IH} x2={VW - P.r} y2={P.t + IH} stroke="#1F2E22" strokeWidth="1" />

        {/* Series polylines */}
        {series.map((s) => {
          if (s.values.length < 2) return null;
          const pts = s.values
            .map((y, i) => `${toX(xValues[i])},${toY(y)}`)
            .join(" ");
          return (
            <polyline
              key={s.label}
              points={pts}
              fill="none"
              stroke={s.colour}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          );
        })}

        {/* X axis ticks + labels */}
        {xTickIdxs.map((idx) => {
          const xv = xValues[idx];
          return (
            <g key={idx}>
              <line
                x1={toX(xv)} y1={P.t + IH}
                x2={toX(xv)} y2={P.t + IH + 4}
                stroke="#1F2E22" strokeWidth="1"
              />
              <text
                x={toX(xv)} y={P.t + IH + 16}
                textAnchor="middle" fontSize={10} fill="#8A9E8D" fontFamily="monospace"
              >
                {fmtX(xv)}
              </text>
            </g>
          );
        })}

        {/* X axis label */}
        {xLabel && (
          <text
            x={P.l + IW / 2} y={VH - 1}
            textAnchor="middle" fontSize={10} fill="#8A9E8D" fontFamily="sans-serif"
          >
            {xLabel}
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-1 flex-wrap">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div
              className="w-4 rounded-full"
              style={{ height: 2, backgroundColor: s.colour }}
            />
            <span className="font-grotesk text-xs text-neutral">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
