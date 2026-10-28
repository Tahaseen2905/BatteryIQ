/**
 * TracePanel.tsx
 * Find a battery, see its journey through the four gates, the lots and tools that built it, and
 * which tool or lot the defective batteries have in common.
 */

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DEFECT_BY_ID, GATES } from '../../inspection/catalogue';
import { clockLabel } from '../../inspection/engine';
import { rootCause } from '../../inspection/selectors';
import type { GateId, InspectionState, Unit } from '../../inspection/types';
import { GATE_IDS } from '../../inspection/types';
import { BatteryRender } from './BatteryRender';
import { DecisionChip, card } from './ui';

const statusText: Record<Unit['status'], string> = {
  in_process: 'In process', passed: 'Passed all gates', rework: 'In rework', rejected: 'Rejected', review: 'Waiting for review',
};

export const TracePanel: React.FC<{ state: InspectionState; focusGate?: GateId; onOpenMachine?: (code: string) => void }> = ({ state, focusGate, onOpenMachine }) => {
  const [q, setQ] = useState('');
  const [onlyBad, setOnlyBad] = useState(true);
  const [pick, setPick] = useState<number | null>(null);
  const [gate, setGate] = useState<GateId>(focusGate ?? 'Q3');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...state.units].reverse().filter((u) => {
      if (onlyBad && u.results.every((r) => r.firstPass)) return false;
      if (!needle) return true;
      return [u.serial, u.modelCode, u.lots.container, u.lots.oxide, u.lots.alloy, u.lots.bath, u.operator].some((t) => t.toLowerCase().includes(needle));
    }).slice(0, 60);
  }, [state.units, q, onlyBad]);

  const unit = state.units.find((u) => u.index === pick) ?? list[0];
  const suspects = useMemo(() => rootCause(state.units, gate), [state.units, gate]);

  const sharing = (label: string, test: (u: Unit) => boolean) => {
    const pool = state.units.filter(test);
    const bad = pool.filter((u) => u.results.some((r) => !r.firstPass));
    return { label, pool: pool.length, bad: bad.length };
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className={`${card} p-4 space-y-3`}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Find a battery</h3>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Serial, lot, model, operator…"
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-600"
          />
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-slate-500">
          <input type="checkbox" checked={onlyBad} onChange={(e) => setOnlyBad(e.target.checked)} /> Only batteries with a defect
        </label>
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {list.map((u) => {
            const bad = u.results.find((r) => !r.firstPass);
            return (
              <button key={u.index} onClick={() => setPick(u.index)}
                className={`w-full text-left p-2 rounded-lg border text-xs transition-colors ${unit?.index === u.index ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300'}`}>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>{u.serial}</span>
                  <span className="text-[12.5px] text-slate-500">{clockLabel(u.minute)}</span>
                </div>
                <div className="text-[12.5px] text-slate-500 mt-0.5 truncate">
                  {bad ? `${bad.gate}: ${DEFECT_BY_ID[bad.detections[0].defectId]?.label}` : 'No defects'} · {u.modelCode}
                </div>
              </button>
            );
          })}
          {!list.length && <p className="text-xs text-slate-500">No batteries match.</p>}
        </div>
      </div>

      <div className="xl:col-span-2 space-y-6">
        {unit ? (
          <div className={`${card} p-4 space-y-4`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{unit.serial}</h3>
                <p className="text-xs text-slate-500">{unit.modelName} · built {clockLabel(unit.minute)} · {unit.shift} · {unit.operator}</p>
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{statusText[unit.status]}</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {GATE_IDS.map((g) => {
                const r = unit.results.find((x) => x.gate === g);
                return (
                  <div key={g} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 p-1.5">
                    <div className="flex items-center justify-between px-1 pb-1">
                      <span className="text-[12.5px] font-bold text-slate-300">{g}</span>
                      {r ? <DecisionChip decision={r.decision} /> : <span className="text-[12.5px] text-slate-500">not reached</span>}
                    </div>
                    {r ? <BatteryRender gate={g} unit={unit} result={r} boxes className="w-full h-auto rounded" /> : <div className="aspect-[400/240] rounded bg-slate-900 border border-dashed border-slate-700" />}
                    {r?.detections.length ? <p className="text-[12.5px] text-rose-300 px-1 pt-1 truncate">{r.detections.map((d) => DEFECT_BY_ID[d.defectId].label).join(', ')}</p> : null}
                    {r?.reviewed && <p className="text-[12.5px] text-sky-300 px-1">Reviewed: {r.reviewed.outcome === 'release' ? 'released' : 'confirmed'} by {r.reviewed.by}</p>}
                    {r?.reworked && <p className="text-[12.5px] text-amber-300 px-1">Reworked and re-inspected</p>}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12.5px]">
              <div className="space-y-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-800">Built from</div>
                <div>Lead oxide lot: <b className="text-emerald-700 dark:text-sky-300">{unit.lots.oxide}</b></div>
                <div>Grid alloy lot: <b className="text-emerald-700 dark:text-sky-300">{unit.lots.alloy}</b></div>
                <div>Container lot: <b className="text-emerald-700 dark:text-sky-300">{unit.lots.container}</b></div>
                <div>Formation bath: <b className="text-amber-700 dark:text-amber-300">{unit.lots.bath}</b></div>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-800">Made on</div>
                {[
                  { code: 'CS-01', what: `strap mould ${unit.tooling.strapMould}`, s: sharing('', (u) => u.tooling.strapMould === unit.tooling.strapMould) },
                  { code: 'IW-01', what: `weld head ${unit.tooling.weldHead}`, s: sharing('', (u) => u.tooling.weldHead === unit.tooling.weldHead) },
                  { code: 'HS-01', what: `platen ${unit.tooling.platen}`, s: sharing('', (u) => u.tooling.platen === unit.tooling.platen) },
                  { code: 'Container', what: unit.lots.container, s: sharing('', (u) => u.lots.container === unit.lots.container) },
                ].map(({ code, what, s: sh }) => (
                  <div key={code} className="flex justify-between gap-2">
                    {code.includes('-') ? (
                      <button type="button" onClick={() => onOpenMachine?.(code)} className="underline decoration-dotted text-left">{code} · {what}</button>
                    ) : (
                      <span>{code} · {what}</span>
                    )}
                    <span className={sh.bad / Math.max(sh.pool, 1) > 0.08 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}>{sh.bad}/{sh.pool} with defects</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={`${card} p-6 text-xs text-slate-500`}>Pick a battery to see its journey.</div>
        )}

        <div className={`${card} p-4 space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">What the defective batteries have in common</h3>
            <div className="flex gap-1">
              {GATE_IDS.map((g) => (
                <button key={g} onClick={() => setGate(g)} className={`px-2 py-0.5 text-[12.5px] rounded border ${gate === g ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{g}</button>
              ))}
            </div>
          </div>
          <p className="text-[12.5px] text-slate-500">{GATES[gate].title}. Compared with the batteries built over the same period, so a lot that simply changed is not blamed.</p>
          {suspects.length ? (
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[12.5px] uppercase text-slate-400"><th className="py-1">Tool or lot</th><th>Share of defects</th><th>Share of output</th><th>Times over-represented</th></tr></thead>
              <tbody>
                {suspects.map((s) => (
                  <tr key={s.field + s.value} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 font-medium text-slate-800 dark:text-slate-200">{s.field} <span className="">{s.value}</span></td>
                    <td className="text-rose-600 dark:text-rose-400">{s.share}% ({s.count})</td>
                    <td className="text-slate-500">{s.population}%</td>
                    <td className="font-bold">{s.lift}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-500">No tool or lot stands out at {gate}. Defects are spread evenly, which points to the process rather than one machine.</p>
          )}
        </div>
      </div>
    </div>
  );
};
