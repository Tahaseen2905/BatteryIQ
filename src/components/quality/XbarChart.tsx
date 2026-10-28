/**
 * XbarChart.tsx
 * X-bar and R control charts, plotted by value against the control limits.
 */

import React from 'react';
import type { SpcChart } from '../../inspection/selectors';

const W = 560, H = 150, PAD = { l: 44, r: 62, t: 12, b: 18 };

function Chart({ title, values, mean, ucl, lcl, flags, fmt, tone }: {
  title: string; values: number[]; mean: number; ucl: number; lcl: number; flags: boolean[]; fmt: (v: number) => string; tone: (i: number) => string;
}) {
  const span = Math.max(ucl - mean, mean - lcl, 1e-6);
  const lo = Math.min(lcl - span * 0.25, ...values);
  const hi = Math.max(ucl + span * 0.25, ...values);
  const x = (i: number) => PAD.l + (values.length <= 1 ? 0 : (i / (values.length - 1)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const L = (v: number, label: string, color: string, dash?: string) => (
    <g key={label}>
      <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={color} strokeDasharray={dash} strokeWidth={1} />
      <text x={W - PAD.r + 4} y={y(v) + 3} fontSize={9} fill={color} fontFamily="monospace">{label} {fmt(v)}</text>
    </g>
  );
  return (
    <div>
      <div className="text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title}>
        {L(ucl, 'UCL', '#f43f5e', '4 3')}
        {L(mean, 'CL', '#94a3b8', '2 3')}
        {lcl > lo && L(lcl, 'LCL', '#f43f5e', '4 3')}
        <path d={line} fill="none" stroke="#64748b" strokeWidth={1.2} />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={flags[i] ? 4 : 2.6} fill={tone(i)} stroke={flags[i] ? '#fff' : 'none'} strokeWidth={1}>
            <title>{`Subgroup ${i + 1}: ${fmt(v)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

export const XbarChart: React.FC<{ chart: SpcChart }> = ({ chart }) => {
  const f = (v: number) => v.toFixed(chart.decimals + 1);
  return (
    <div className="space-y-3">
      <Chart
        title={`X-bar (mean of 5) · ${chart.label} (${chart.unit})`}
        values={chart.points.map((p) => p.x)}
        mean={chart.mean} ucl={chart.ucl} lcl={chart.lcl}
        flags={chart.points.map((p) => p.xOut || p.rules.length > 0)}
        fmt={f}
        tone={(i) => (chart.points[i].xOut ? '#f43f5e' : chart.points[i].rules.length ? '#f59e0b' : '#10b981')}
      />
      <Chart
        title={`Range (R) · ${chart.label}`}
        values={chart.points.map((p) => p.r)}
        mean={chart.rBar} ucl={chart.rUcl} lcl={chart.rLcl}
        flags={chart.points.map((p) => p.rOut)}
        fmt={(v) => v.toFixed(chart.decimals + 1)}
        tone={(i) => (chart.points[i].rOut ? '#f43f5e' : '#10b981')}
      />
    </div>
  );
};
