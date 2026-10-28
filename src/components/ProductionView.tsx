/**
 * ProductionView.tsx
 * Output against plan, how many batteries survive each gate, OEE by machine and the downtime Pareto.
 */

import React, { useMemo } from 'react';
import { MachineStation, QualityGate, ShiftProductionMetrics } from '../types';
import { GATES } from '../inspection/catalogue';
import { lineFigures } from '../inspection/selectors';
import type { InspectionState } from '../inspection/types';
import { GATE_IDS } from '../inspection/types';
import { card } from './quality/ui';

interface Props {
  machines: MachineStation[];
  qualityGates: Record<string, QualityGate>;
  shiftMetrics: ShiftProductionMetrics;
  inspection: InspectionState;
  onSelectMachine: (m: MachineStation) => void;
}

export const ProductionView: React.FC<Props> = ({ machines, qualityGates, shiftMetrics, inspection, onSelectMachine }) => {
  const f = useMemo(() => lineFigures(inspection), [inspection]);
  const rows = useMemo(
    () => machines.map((m) => ({ m, oee: (m.availability * m.performance * f.firstPassYield) / 10000 })).sort((a, b) => a.oee - b.oee),
    [machines, f.firstPassYield],
  );
  const totalDown = shiftMetrics.downtimePareto.reduce((a, d) => a + d.minutes, 0);
  const maxHour = Math.max(220, ...shiftMetrics.hourlyOutput.map((h) => h.actual));
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Production & OEE</h2>
        <p className="text-xs text-slate-500">Shift B, 14:00 to 22:00. Output, yield and losses, counted from the batteries that went through the gates.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Inspected', f.produced.toLocaleString('en-IN'), `Plan to now ${f.plannedToNow}`],
          ['Passed all gates', f.passedAll.toLocaleString('en-IN'), 'Ready for dispatch'],
          ['Rejected', f.rejected.toLocaleString('en-IN'), `${f.inRework} in rework, ${f.inReview} in review`],
          ['First-pass yield', `${f.firstPassYield}%`, 'No defect at any gate'],
        ].map(([k, v, s]) => (
          <div key={k} className={`${card} p-4`}>
            <div className="text-[12.5px] uppercase text-slate-400">{k}</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{v}</div>
            <div className="text-[12.5px] text-slate-500">{s}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${card} p-4 space-y-3`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Passed per hour against 200 target</h3>
          <div className="h-36 flex items-end gap-2">
            {shiftMetrics.hourlyOutput.map((h, i) => (
              <div key={h.hourLabel} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[12.5px] text-slate-500">{h.actual}</span>
                <div className={`w-full rounded-t ${i === shiftMetrics.hourlyOutput.length - 1 ? 'bg-emerald-500/60' : h.actual >= h.target * 0.95 ? 'bg-emerald-600' : 'bg-amber-500'}`} style={{ height: `${(h.actual / maxHour) * 100}%` }} />
                <span className="text-[12.5px] text-slate-400 mt-1">{h.hourLabel}</span>
              </div>
            ))}
          </div>
          <p className="text-[12.5px] text-slate-500">The last bar is the hour in progress.</p>
        </div>

        <div className={`${card} p-4 space-y-3`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Where batteries drop out</h3>
          {GATE_IDS.map((g) => {
            const q = qualityGates[g];
            const pct = f.produced ? (q.passedCount / f.produced) * 100 : 0;
            return (
              <div key={g} className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="font-medium text-slate-700 dark:text-slate-300">{g} · {GATES[g].short}</span><span className="text-slate-500">{q.inspectedCount} seen · {q.reworkCount} rework · {q.rejectCount} reject</span></div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded"><div className="h-2 rounded bg-emerald-600" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${card} p-4`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">OEE by machine, lowest first</h3>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[12.5px] uppercase text-slate-400"><th className="py-1">Machine</th><th>A</th><th>P</th><th>Q</th><th>OEE</th></tr></thead>
            <tbody>
              {rows.map(({ m, oee }) => (
                <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => onSelectMachine(m)}>
                  <td className="py-1.5 font-bold text-slate-800 dark:text-slate-200">{m.code} <span className="font-sans font-normal text-slate-500">{m.name}</span></td>
                  <td className="">{m.availability.toFixed(0)}%</td><td className="">{m.performance.toFixed(0)}%</td><td className="">{f.firstPassYield.toFixed(0)}%</td>
                  <td className={`font-bold ${oee < 80 ? 'text-rose-600' : oee < 85 ? 'text-amber-600' : 'text-emerald-600'}`}>{oee.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`${card} p-4 space-y-3`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Downtime Pareto <span className="text-slate-400">({totalDown} min)</span></h3>
          {[...shiftMetrics.downtimePareto].sort((a, b) => b.minutes - a.minutes).map((d) => (
            <div key={d.reason} className="space-y-1 text-xs">
              <div className="flex justify-between gap-2"><span className="text-slate-700 dark:text-slate-300">{d.reason}</span><span className="font-bold">{d.minutes} min</span></div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded"><div className="h-1.5 rounded bg-amber-500" style={{ width: `${totalDown ? (d.minutes / totalDown) * 100 : 0}%` }} /></div>
              <div className="text-[12.5px] text-slate-400 uppercase">{d.category.replace('_', ' ')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
