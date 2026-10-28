/**
 * BatteryRender.tsx
 * The camera frame for one gate: a procedural drawing of the part as that camera sees it,
 * with each detected defect drawn where it occurs and boxed with its label and confidence.
 */

import React from 'react';
import { DEFECT_BY_ID, MEASURE_BY_KEY } from '../../inspection/catalogue';
import type { DefectDef, GateId, GateResult, Region, Unit } from '../../inspection/types';
import { MODELS } from '../../inspection/catalogue';

interface Props {
  gate: GateId;
  unit?: Unit;
  result?: GateResult;
  boxes?: boolean;
  className?: string;
}

const SEV_COLOR = { critical: '#f43f5e', major: '#f59e0b', minor: '#eab308' } as const;

const cx = (r: Region) => r.x + r.w / 2;
const cy = (r: Region) => r.y + r.h / 2;

function hashBits(str: string, n: number): boolean[] {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  const out: boolean[] = [];
  for (let i = 0; i < n; i++) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; out.push((h & 4) !== 0); }
  return out;
}

/** The drawing of one defect, in its own region of the frame. */
function Mark({ d, res }: { d: DefectDef; res: GateResult }) {
  const r = d.region;
  const x = cx(r), y = cy(r);
  switch (d.kind) {
    case 'missing':
      return <g><circle cx={x} cy={y} r={Math.min(r.w, r.h) / 2 - 6} fill="#020617" stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1.5} /></g>;
    case 'wrongpost':
      return <g><rect x={x - 13} y={y - 13} width={26} height={26} rx={3} fill="#f59e0b" stroke="#fde68a" strokeWidth={1.5} /><text x={x} y={y + 4} fontSize={11} textAnchor="middle" fill="#451a03" fontWeight={700}>?</text></g>;
    case 'bent':
      return <g transform={`rotate(28 ${x} ${y + 14})`}><rect x={x - 11} y={y - 22} width={22} height={40} rx={5} fill="#94a3b8" stroke="#f43f5e" strokeWidth={1.5} /></g>;
    case 'void':
      return <polygon points={`${r.x + 8},${y} ${x - 10},${r.y + 6} ${x + 12},${r.y + 12} ${r.x + r.w - 8},${y + 4} ${x + 6},${r.y + r.h - 6} ${x - 14},${r.y + r.h - 12}`} fill="#020617" stroke="#475569" />;
    case 'crack':
      return <polyline points={`${r.x},${r.y + 10} ${r.x + 24},${r.y + 22} ${r.x + 38},${r.y + 12} ${r.x + 62},${r.y + 30} ${r.x + 78},${r.y + 18} ${r.x + r.w},${r.y + r.h - 4}`} fill="none" stroke="#020617" strokeWidth={2.2} />;
    case 'scratch':
      return <g stroke="#cbd5e1" strokeWidth={1.4} opacity={0.9}><line x1={r.x} y1={r.y + 18} x2={r.x + r.w} y2={r.y + 4} /><line x1={r.x + 8} y1={r.y + 22} x2={r.x + r.w - 6} y2={r.y + 8} /><line x1={r.x + 20} y1={r.y + 12} x2={r.x + r.w - 30} y2={r.y + 2} /></g>;
    case 'dent':
      return <g><ellipse cx={x} cy={y} rx={r.w / 2 - 2} ry={r.h / 2 - 4} fill="url(#dentGrad)" /><ellipse cx={x - 6} cy={y - 8} rx={8} ry={4} fill="#e2e8f0" opacity={0.35} /></g>;
    case 'stain-dark':
      return <g fill="#020617" opacity={0.6}><ellipse cx={x - 8} cy={y} rx={22} ry={9} /><ellipse cx={x + 14} cy={y + 4} rx={12} ry={6} /><circle cx={x + 28} cy={y - 6} r={4} /></g>;
    case 'stain-yellow':
      return <g fill="#eab308" opacity={0.55}><ellipse cx={x - 6} cy={y} rx={30} ry={13} /><ellipse cx={x + 22} cy={y + 8} rx={14} ry={7} /><circle cx={x - 30} cy={y + 10} r={5} /></g>;
    case 'offset':
      return <g><rect x={r.x + 22} y={r.y + 6} width={64} height={20} rx={3} fill="#c2410c" stroke="#fb923c" /><line x1={r.x + 6} y1={r.y + 38} x2={r.x + 22} y2={r.y + 38} stroke="#f43f5e" strokeWidth={1.5} /><text x={r.x + 6} y={r.y + 48} fontSize={8} fill="#fda4af" fontFamily="monospace">shifted</text></g>;
    case 'porosity':
      return <g fill="#020617">{[[-14, -8, 3.2], [2, 10, 2.6], [12, -12, 3.4], [-6, 14, 2.2], [16, 6, 2.8]].map(([dx, dy, rr], i) => <circle key={i} cx={x + dx} cy={y + dy} r={rr} />)}</g>;
    case 'spatter':
      return <g fill="#fb923c">{[[0, 4], [14, 12], [28, 2], [44, 14], [58, 6], [72, 12], [86, 3]].map(([dx, dy], i) => <circle key={i} cx={r.x + 6 + dx} cy={r.y + dy + 4} r={1.8 + (i % 3) * 0.6} />)}</g>;
    case 'gap':
      return <g><rect x={r.x + 6} y={y - 5} width={r.w - 12} height={10} fill="#020617" /><line x1={r.x + 6} y1={y - 5} x2={r.x + r.w - 6} y2={y - 5} stroke="#e2e8f0" strokeWidth={0.8} opacity={0.5} /></g>;
    case 'blob':
      return <g><ellipse cx={x} cy={y} rx={r.w / 2 - 6} ry={9} fill="#cbd5e1" /><ellipse cx={x - 8} cy={y - 3} rx={14} ry={3} fill="#fff" opacity={0.45} /></g>;
    case 'flip':
      return <g><polygon points={`${x},${r.y + r.h - 8} ${x - 14},${r.y + 10} ${x + 14},${r.y + 10}`} fill="#f43f5e" opacity={0.9} /><text x={x} y={r.y + r.h + 8} fontSize={8} fill="#fda4af" textAnchor="middle" fontFamily="monospace">FRONT?</text></g>;
    case 'dimension': {
      const mk = d.measure ? MEASURE_BY_KEY[d.measure] : undefined;
      const v = mk ? res.measures[mk.key] : undefined;
      const out = mk && v != null && (v < mk.lsl || v > mk.usl);
      const col = out ? '#f43f5e' : '#38bdf8';
      return (
        <g fontFamily="monospace" fontSize={9}>
          <line x1={r.x + 4} y1={y} x2={r.x + r.w - 4} y2={y} stroke={col} strokeWidth={1} />
          <line x1={r.x + 4} y1={y - 5} x2={r.x + 4} y2={y + 5} stroke={col} /><line x1={r.x + r.w - 4} y1={y - 5} x2={r.x + r.w - 4} y2={y + 5} stroke={col} />
          {mk && v != null && <text x={x} y={y - 6} textAnchor="middle" fill={col}>{mk.label} {v.toFixed(mk.decimals)} {mk.unit} (spec {mk.lsl}–{mk.usl})</text>}
        </g>
      );
    }
    default:
      return null;
  }
}

function SceneQ1({ has }: { has: (id: string) => boolean }) {
  return (
    <g>
      <rect x={40} y={60} width={320} height={130} rx={10} fill="#1f2937" stroke="#334155" strokeWidth={2} />
      <rect x={52} y={72} width={296} height={106} rx={6} fill="#273449" />
      <rect x={150} y={52} width={100} height={10} rx={5} fill="#334155" />
      <rect x={52} y={72} width={296} height={12} fill="#b91c1c" opacity={0.85} />
      <text x={200} y={82} fontSize={8} fill="#fee2e2" textAnchor="middle" fontFamily="monospace" letterSpacing={3}>EXIDE</text>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const x = 95 + i * 42;
        if (i === 2 && has('q1_missing_cap')) return null;
        return <g key={i}><circle cx={x} cy={126} r={13} fill="#0f172a" stroke="#64748b" strokeWidth={1.5} /><line x1={x - 7} y1={126} x2={x + 7} y2={126} stroke="#64748b" /></g>;
      })}
      {!has('q1_damaged_terminal') && <><circle cx={70} cy={50} r={16} fill="#94a3b8" stroke="#e2e8f0" /><text x={70} y={55} textAnchor="middle" fontSize={14} fontWeight={700} fill="#0f172a">+</text></>}
      {!has('q1_wrong_terminal') && <><circle cx={330} cy={50} r={13} fill="#94a3b8" stroke="#e2e8f0" /><text x={330} y={55} textAnchor="middle" fontSize={14} fontWeight={700} fill="#0f172a">−</text></>}
      {!has('q1_missing_component') && <rect x={306} y={156} width={38} height={14} rx={3} fill="#16a34a" opacity={0.85} />}
    </g>
  );
}

function SceneQ2({ has, res }: { has: (id: string) => boolean; res?: GateResult }) {
  const off = res ? res.measures.offset_mm ?? 0.16 : 0.16;
  return (
    <g>
      <rect x={20} y={30} width={360} height={190} rx={10} fill="#1f2937" stroke="#334155" strokeWidth={2} />
      <line x1={110} y1={40} x2={110} y2={190} stroke="#38bdf8" strokeDasharray="2 4" opacity={0.35} />
      <line x1={290} y1={40} x2={290} y2={190} stroke="#38bdf8" strokeDasharray="2 4" opacity={0.35} />
      {!has('q2_terminal_missing') && <g transform={`translate(${off * 14},0)`}><circle cx={110} cy={115} r={30} fill="#cbd5e1" stroke="#64748b" strokeWidth={2} /><circle cx={110} cy={115} r={14} fill="#94a3b8" /><text x={110} y={121} textAnchor="middle" fontSize={16} fontWeight={700} fill="#0f172a">+</text></g>}
      {!has('q2_terminal_bent') && <g><circle cx={290} cy={115} r={26} fill="#cbd5e1" stroke="#64748b" strokeWidth={2} /><circle cx={290} cy={115} r={11} fill="#94a3b8" /><text x={290} y={121} textAnchor="middle" fontSize={16} fontWeight={700} fill="#0f172a">−</text></g>}
      {!has('q2_connector_misplaced') && <rect x={80} y={152} width={60} height={18} rx={3} fill="#b45309" stroke="#f59e0b" />}
      <rect x={260} y={152} width={60} height={18} rx={3} fill="#b45309" stroke="#f59e0b" />
    </g>
  );
}

function SceneQ3({ has, res }: { has: (id: string) => boolean; res?: GateResult }) {
  const bead = res ? res.measures.bead_mm ?? 3.4 : 3.4;
  return (
    <g>
      <rect x={30} y={40} width={340} height={160} rx={8} fill="#1f2937" stroke="#334155" strokeWidth={2} />
      <rect x={46} y={56} width={308} height={128} rx={5} fill="#273449" />
      <rect x={45} y={55} width={310} height={130} rx={5} fill="none" stroke="#0b1220" strokeWidth={bead * 1.8} />
      {!has('q3_missing_component') && <><circle cx={200} cy={120} r={16} fill="#0f172a" stroke="#64748b" strokeWidth={1.5} /><circle cx={200} cy={120} r={6} fill="#334155" /></>}
      <polygon points="70,100 58,80 82,80" fill="#38bdf8" opacity={0.7} />
      <text x={70} y={112} fontSize={7} textAnchor="middle" fill="#7dd3fc" fontFamily="monospace">FRONT</text>
    </g>
  );
}

function SceneQ4({ unit, res }: { unit?: Unit; res?: GateResult }) {
  const ocr = res?.ocr;
  const model = MODELS.find((m) => m.code === (ocr?.modelRead ?? unit?.modelCode)) ?? MODELS[0];
  const date = ocr?.dateRead ?? unit?.mfgDate ?? '28/10/26';
  const skew = res?.measures.skew_deg ?? 0.3;
  const contrast = res?.measures.contrast_pct ?? 93;
  const bits = hashBits(unit?.serial ?? 'EXB', 11 * 11);
  const cell = 7;
  const qx = 258, qy = 66;
  return (
    <g>
      <rect x={20} y={10} width={360} height={220} rx={8} fill="#0f172a" stroke="#1e293b" />
      <g transform={`rotate(${skew * 3} 200 120)`}>
        <rect x={50} y={30} width={300} height={180} rx={4} fill="#f8fafc" />
        <rect x={50} y={30} width={300} height={26} rx={4} fill="#dc2626" />
        <text x={64} y={48} fontSize={14} fontWeight={800} fill="#fff" fontFamily="sans-serif" letterSpacing={2}>EXIDE</text>
        <text x={72} y={80} fontSize={11} fontWeight={700} fill="#0f172a" fontFamily="monospace">{model.name.replace('Exide ', '')}</text>
        <text x={72} y={112} fontSize={10} fill="#334155" fontFamily="monospace">12V · {model.code}</text>
        <text x={72} y={144} fontSize={12} fontWeight={700} fill="#0f172a" fontFamily="monospace">MFG {date}</text>
        <text x={72} y={176} fontSize={8} fill="#475569" fontFamily="monospace">{unit?.serial ?? 'EXB-----'}</text>
        <g opacity={Math.max(0.25, (contrast - 55) / 45)}>
          {bits.map((b, i) => b ? <rect key={i} x={qx + (i % 11) * cell} y={qy + Math.floor(i / 11) * cell} width={cell} height={cell} fill="#0f172a" /> : null)}
          <rect x={qx} y={qy} width={21} height={21} fill="none" stroke="#0f172a" strokeWidth={3} />
          <rect x={qx + 56} y={qy} width={21} height={21} fill="none" stroke="#0f172a" strokeWidth={3} />
          <rect x={qx} y={qy + 56} width={21} height={21} fill="none" stroke="#0f172a" strokeWidth={3} />
        </g>
        <g fill="#0f172a">{Array.from({ length: 28 }).map((_, i) => <rect key={i} x={72 + i * 3.4 + (i % 3)} y={184} width={1 + (i % 4 === 0 ? 1.4 : 0.4)} height={18} />)}</g>
      </g>
    </g>
  );
}

export const BatteryRender: React.FC<Props> = ({ gate, unit, result, boxes = true, className }) => {
  const detections = result?.detections ?? [];
  const ids = new Set(detections.map((d) => d.defectId));
  const has = (id: string) => ids.has(id);
  const decision = result?.decision;
  const col = decision === 'pass' ? '#34d399' : decision === 'review' ? '#fbbf24' : decision ? '#fb7185' : '#94a3b8';
  const defs = detections.map((d) => ({ d: DEFECT_BY_ID[d.defectId], conf: d.confidence })).filter((x) => x.d);

  return (
    <svg viewBox="0 0 400 240" className={className} role="img" aria-label={`${gate} camera frame`}>
      <defs>
        <radialGradient id="dentGrad"><stop offset="0%" stopColor="#020617" stopOpacity={0.75} /><stop offset="100%" stopColor="#020617" stopOpacity={0} /></radialGradient>
      </defs>
      <rect width={400} height={240} fill="#030712" />
      {gate === 'Q1' && <SceneQ1 has={has} />}
      {gate === 'Q2' && <SceneQ2 has={has} res={result} />}
      {gate === 'Q3' && <SceneQ3 has={has} res={result} />}
      {gate === 'Q4' && <SceneQ4 unit={unit} res={result} />}

      {result && defs.map(({ d }) => <Mark key={`m-${d.id}`} d={d} res={result} />)}

      {result && boxes && defs.map(({ d, conf }) => {
        const c = SEV_COLOR[d.severity];
        const lab = `${d.label.length > 30 ? d.label.slice(0, 29) + '…' : d.label} ${(conf * 100).toFixed(0)}%`;
        const ly = d.region.y < 16 ? d.region.y + d.region.h + 10 : d.region.y - 4;
        const w = Math.min(230, lab.length * 5.2 + 8);
        const lx = Math.min(Math.max(d.region.x, 2), 398 - w);
        return (
          <g key={`b-${d.id}`}>
            <rect x={d.region.x} y={d.region.y} width={d.region.w} height={d.region.h} fill={c} fillOpacity={0.12} stroke={c} strokeWidth={1.4} rx={2} />
            <rect x={lx} y={ly - 9} width={w} height={11} fill="#020617" fillOpacity={0.88} rx={2} />
            <text x={lx + 4} y={ly - 1} fontSize={8} fill={c} fontFamily="monospace" fontWeight={700}>{lab}</text>
          </g>
        );
      })}

      {result?.ocr && gate === 'Q4' && (result.ocr.dateRead !== result.ocr.dateExpected || result.ocr.modelRead !== result.ocr.modelExpected) && (
        <text x={200} y={236} fontSize={8} fill="#fb7185" textAnchor="middle" fontFamily="monospace">
          {result.ocr.modelRead !== result.ocr.modelExpected ? `model read ${result.ocr.modelRead}, expected ${result.ocr.modelExpected}  ` : ''}
          {result.ocr.dateRead !== result.ocr.dateExpected ? `date read ${result.ocr.dateRead}, expected ${result.ocr.dateExpected}` : ''}
        </text>
      )}

      <rect x={4} y={4} width={64} height={14} rx={3} fill="#020617" fillOpacity={0.85} />
      <text x={10} y={14} fontSize={9} fill={col} fontFamily="monospace" fontWeight={700}>{decision ? decision.toUpperCase() : 'WAITING'}</text>
    </svg>
  );
};
