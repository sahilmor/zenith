'use client';

import type { AnalyticsBucket } from '@pm/types';

interface ChartProps {
  readonly data: AnalyticsBucket[];
  readonly height?: number;
}

const palette = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#fb7185', '#22d3ee'];

export function BarChart({ data, height = 180 }: ChartProps) {
  const max = Math.max(...data.map((item) => item.value), 1);
  if (data.length === 0) return <EmptyChart />;
  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 420 ${height}`} role="img" aria-label="Bar chart" className="w-full">
        {data.map((item, index) => {
          const width = (item.value / max) * 330;
          const y = index * 34 + 8;
          return (
            <g key={item.key}>
              <title>{`${item.label}: ${item.value}`}</title>
              <text x="0" y={y + 16} className="fill-slate-300 text-[11px]">
                {item.label.slice(0, 18)}
              </text>
              <rect
                x="120"
                y={y}
                width={width}
                height="18"
                rx="4"
                fill={palette[index % palette.length]}
              />
              <text
                x={Math.min(405, 128 + width)}
                y={y + 14}
                className="fill-slate-200 text-[11px]"
              >
                {item.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function LineChart({ data, height = 180 }: ChartProps) {
  const max = Math.max(...data.map((item) => item.value), 1);
  if (data.length === 0) return <EmptyChart />;
  const step = data.length > 1 ? 380 / (data.length - 1) : 0;
  const points = data
    .map(
      (item, index) => `${20 + index * step},${height - 24 - (item.value / max) * (height - 54)}`,
    )
    .join(' ');
  const area = `20,${height - 24} ${points} ${20 + (data.length - 1) * step},${height - 24}`;
  return (
    <svg viewBox={`0 0 420 ${height}`} role="img" aria-label="Line chart" className="w-full">
      <polyline points={area} fill="rgba(52, 211, 153, 0.15)" stroke="none" />
      <polyline
        points={points}
        fill="none"
        stroke="#34d399"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((item, index) => {
        const x = 20 + index * step;
        const y = height - 24 - (item.value / max) * (height - 54);
        return (
          <circle key={item.key} cx={x} cy={y} r="4" fill="#34d399">
            <title>{`${item.label}: ${item.value}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

export function DonutChart({ data }: ChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (data.length === 0 || total === 0) return <EmptyChart />;
  let offset = 0;
  return (
    <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
      <svg viewBox="0 0 120 120" role="img" aria-label="Donut chart" className="mx-auto size-40">
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="none"
          stroke="rgba(148, 163, 184, 0.18)"
          strokeWidth="18"
        />
        {data.map((item, index) => {
          const length = (item.value / total) * 264;
          const segment = (
            <circle
              key={item.key}
              cx="60"
              cy="60"
              r="42"
              fill="none"
              stroke={palette[index % palette.length]}
              strokeWidth="18"
              strokeDasharray={`${length} ${264 - length}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            >
              <title>{`${item.label}: ${item.value}`}</title>
            </circle>
          );
          offset += length;
          return segment;
        })}
        <text x="60" y="64" textAnchor="middle" className="fill-slate-100 text-lg font-semibold">
          {total}
        </text>
      </svg>
      <div className="space-y-2 self-center">
        {data.map((item, index) => (
          <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-300">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: palette[index % palette.length] }}
              />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="font-medium text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyChart() {
  return (
    <div className="grid h-40 place-items-center rounded-lg border border-dashed border-white/10 text-sm text-slate-500">
      No data yet
    </div>
  );
}
