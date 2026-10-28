/**
 * HistoryView.tsx
 * Quality over days: pass rate per gate against target, the defect Pareto for the range, a day table, and CSV export.
 */

import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { QualityGate } from '../types';
import type { InspectionState } from '../inspection/types';
import { GATE_IDS, type GateId } from '../inspection/types';
import { DEFECT_BY_ID } from '../inspection/catalogue';
import { defectCounts, lineFigures } from '../inspection/selectors';
import { TARGET, dayRecords, download, gateName, toCsv } from '../domain/history';
import { Button, ConnectedStrip, Note, PageHead, Panel, Prov, Segmented, Stat, TD, TH } from './ui-kit';
import { toast } from './toasts';

const COLORS: Record<GateId, string> = { Q1: '#2a78d6', Q2: '#eb6834', Q3: '#1baf7a', Q4: '#8b5cf6' };
const n0 = (v: number) => Math.round(v).toLocaleString('en-IN');

function PassChart({ days, gates }: { days: ReturnType<typeof dayRecords>; gates: GateId[] }) {
  const W = 760, H = 240, L = 40, R = 12, T = 12, B = 28;
  const worked = days.filter((d) => !d.off);
  const lo = 94, hi = 100;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(worked.length - 1, 1);
  const y = (v: number) => T + ((hi - Math.max(v, lo)) / (hi - lo)) * (H - T - B);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Pass rate per gate by day">
      {[94, 96, 98, 100].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-slate-700" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} className="fill-slate-400">{v}%</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(TARGET)} y2={y(TARGET)} stroke="#dc2626" strokeDasharray="5 4" />
      <text x={W - R} y={y(TARGET) - 4} textAnchor="end" fontSize={11} fill="#dc2626">target {TARGET}%</text>
      {gates.map((g) => (
        <polyline key={g} fill="none" stroke={COLORS[g]} strokeWidth={2} points={worked.map((d, i) => `${x(i)},${y(d.pass[g])}`).join(' ')} />
      ))}
      {worked.map((d, i) => ((i % Math.ceil(worked.length / 7) === 0 && worked.length - 1 - i > 1) || d.today ? (
        <text key={d.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} className="fill-slate-400">{d.label.replace(/^\w+ /, '')}</text>
      ) : null))}
    </svg>
  );
}

export const HistoryView: React.FC<{ inspection: InspectionState; qualityGates: Record<string, QualityGate> }> = ({ inspection, qualityGates }) => {
  const [range, setRange] = useState<'7' | '14' | '30'>('14');
  const [gate, setGate] = useState<GateId | 'all'>('all');
  const f = lineFigures(inspection);
  const live = useMemo(() => {
    const pass = {} as Record<GateId, number>;
    const defects: Record<string, number> = {};
    for (const g of GATE_IDS) {
      pass[g] = qualityGates[g].shiftPassRatePercent;
      Object.entries(defectCounts(inspection.units, g)).forEach(([k, v]) => { defects[k] = v; });
    }
    return { inspected: f.produced, pass, rework: GATE_IDS.reduce((a, g) => a + qualityGates[g].reworkCount, 0), reject: GATE_IDS.reduce((a, g) => a + qualityGates[g].rejectCount, 0), fpy: f.firstPassYield, defects };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspection.next]);
  const days = useMemo(() => dayRecords(Number(range), live), [range, live]);
  const gates = gate === 'all' ? GATE_IDS : [gate];

  const pareto = useMemo(() => {
    const tot: Record<string, number> = {};
    days.forEach((d) => Object.entries(d.defects).forEach(([k, v]) => { tot[k] = (tot[k] ?? 0) + v; }));
    return Object.entries(tot).filter(([k]) => gate === 'all' || DEFECT_BY_ID[k]?.gate === gate).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [days, gate]);
  const max = pareto[0]?.[1] ?? 1;
  const worked = days.filter((d) => !d.off);
  const sum = (fn: (d: (typeof days)[number]) => number) => worked.reduce((a, d) => a + fn(d), 0);
  const avgFpy = sum((d) => d.fpy) / Math.max(worked.length, 1);

  const exportCsv = () => {
    const rows = [['Date', 'Inspected', ...GATE_IDS.map((g) => `${g} pass %`), 'Rework', 'Reject', 'First-pass yield %'], ...days.map((d) => [d.date.toISOString().slice(0, 10), String(d.inspected), ...GATE_IDS.map((g) => String(d.off ? '' : d.pass[g])), String(d.rework), String(d.reject), String(d.off ? '' : d.fpy)])];
    download(`batteryiq-quality-${range}d.csv`, toCsv(rows));
    toast({ title: 'CSV exported', detail: `${days.length} days, one row per day, with today's live figures.`, tone: 'teal' });
  };

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Analyse"
        title="History"
        description="Quality over the days: each gate's pass rate against target, what the defects were, and the days in a table you can export."
        actions={<Button onClick={exportCsv}><Download size={14} />Export CSV</Button>}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={range} onChange={setRange} options={[{ value: '7', label: 'Last 7 days' }, { value: '14', label: 'Last 14 days' }, { value: '30', label: 'Last 30 days' }]} />
        <Segmented<GateId | 'all'> value={gate} onChange={setGate} options={[{ value: 'all', label: 'All gates' }, ...GATE_IDS.map((g) => ({ value: g, label: g }))]} />
      </div>

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Stat label="Batteries inspected" value={n0(sum((d) => d.inspected))} sub={`${worked.length} working days`} prov="plc" />
        <Stat label="First-pass yield" value={`${avgFpy.toFixed(1)}%`} sub="Average over the range" prov="computed" tone={avgFpy < 95 ? 'amber' : 'teal'} />
        <Stat label="Rejected" value={n0(sum((d) => d.reject))} sub={`${((sum((d) => d.reject) / Math.max(sum((d) => d.inspected), 1)) * 100).toFixed(2)}% of batteries`} prov="computed" />
        <Stat label="Sent to rework" value={n0(sum((d) => d.rework))} sub={`${((sum((d) => d.rework) / Math.max(sum((d) => d.inspected), 1)) * 100).toFixed(2)}% of batteries`} prov="computed" />
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel className="h-full" title="Pass rate by gate" description="Each day, against the 98% target" actions={<Prov k="computed" compact />}>
          <PassChart days={days} gates={gates} />
          <div className="mt-2 flex flex-wrap gap-4 text-[12.5px] text-slate-500">
            {gates.map((g) => <span key={g} className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm" style={{ background: COLORS[g] }} />{gateName(g)}</span>)}
          </div>
        </Panel>
        <Panel className="h-full" title="Defect Pareto" description="Most frequent defects in the range" actions={<Prov k="computed" compact />}>
          <ul className="space-y-3">
            {pareto.map(([id, n]) => (
              <li key={id}>
                <div className="flex justify-between gap-3 text-[13.5px]"><span className="text-slate-700 dark:text-slate-300">{DEFECT_BY_ID[id]?.label ?? id} <span className="text-slate-400">· {DEFECT_BY_ID[id]?.gate}</span></span><span className="font-semibold tabular-nums">{n0(n)}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${(n / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel flush title="Day by day" description="Today is live; earlier days are illustrative in this demo" actions={<Prov k="computed" compact />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr>{['Day', 'Inspected', ...GATE_IDS.map((g) => `${g} pass`), 'Rework', 'Reject', 'FPY'].map((h, i) => <th key={h} className={`${TH} ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
            <tbody>
              {[...days].reverse().map((d) => d.off ? (
                <tr key={d.label}><td className={`${TD} text-slate-400`} colSpan={9}>{d.label} · Weekly off</td></tr>
              ) : (
                <tr key={d.label}>
                  <td className={`${TD} font-semibold`}>{d.label}{d.today && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">live</span>}</td>
                  <td className={`${TD} text-right tabular-nums`}>{n0(d.inspected)}</td>
                  {GATE_IDS.map((g) => <td key={g} className={`${TD} text-right tabular-nums ${d.pass[g] < TARGET ? 'font-semibold text-rose-600' : ''}`}>{d.pass[g]}%</td>)}
                  <td className={`${TD} text-right tabular-nums`}>{n0(d.rework)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{n0(d.reject)}</td>
                  <td className={`${TD} text-right font-semibold tabular-nums`}>{d.fpy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Note>Two spells are written into the history so the trends have something to show: weld-head wear at Q2 about ten days ago, and a cold platen at Q3 a few days ago. In a pilot these come from the plant’s own records.</Note>
      <ConnectedStrip ids={['CN-VIS', 'CN-HIST', 'CN-MES', 'CN-QMS']} />
    </div>
  );
};
