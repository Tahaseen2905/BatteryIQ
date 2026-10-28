import React from 'react';

/** A line over a shaded normal band, with the last point marked. */
export const BandLine: React.FC<{ values: number[]; min: number; max: number; unit?: string; xLabels?: [string, string]; height?: number }> = ({ values, min, max, unit, xLabels, height = 120 }) => {
  const W = 420, H = height, P = { l: 6, r: 6, t: 8, b: 16 };
  const span = max - min || 1;
  const lo = Math.min(min - span * 0.25, ...values), hi = Math.max(max + span * 0.25, ...values);
  const x = (i: number) => P.l + (i / Math.max(values.length - 1, 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values[values.length - 1];
  const out = last < min || last > max;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="trend">
      <rect x={P.l} y={y(max)} width={W - P.l - P.r} height={Math.max(2, y(min) - y(max))} fill="#10b981" opacity={0.12} />
      <line x1={P.l} x2={W - P.r} y1={y(max)} y2={y(max)} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} />
      <line x1={P.l} x2={W - P.r} y1={y(min)} y2={y(min)} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} />
      <path d={d} fill="none" stroke={out ? '#f43f5e' : '#0f7f66'} strokeWidth={1.8} />
      <circle cx={x(values.length - 1)} cy={y(last)} r={3.5} fill={out ? '#f43f5e' : '#0f7f66'} />
      {xLabels && (<><text x={P.l} y={H - 3} fontSize={9} fill="#94a3b8">{xLabels[0]}</text><text x={W - P.r} y={H - 3} fontSize={9} textAnchor="end" fill="#94a3b8">{xLabels[1]}{unit ? '' : ''}</text></>)}
    </svg>
  );
};

/** Vertical bars, one highlighted. */
export const Bars: React.FC<{ values: number[]; labels?: string[]; highlight?: number; max?: number; fmt?: (v: number) => string; color?: string; height?: number }> = ({ values, labels, highlight, max, fmt = (v) => String(v), color = 'bg-emerald-600', height = 110 }) => {
  const m = max ?? Math.max(...values, 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
          <span className="text-[12.5px] text-slate-500">{fmt(v)}</span>
          <div className={`w-full rounded-t ${i === highlight ? 'bg-emerald-400' : color}`} style={{ height: `${Math.max(4, (v / m) * 78)}%` }} />
          {labels && <span className="mt-1 text-[12.5px] text-slate-400 truncate w-full text-center">{labels[i]}</span>}
        </div>
      ))}
    </div>
  );
};
