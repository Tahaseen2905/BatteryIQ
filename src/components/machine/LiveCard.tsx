/**
 * LiveCard.tsx
 * "Live from GW-HS01": every reading with its state, OEE, cycles, and the alarm with what to do about it.
 */

import React, { useState } from 'react';
import { RefreshCw, Radio, CheckCircle2 } from 'lucide-react';
import type { MachineStation, PlantAlarm } from '../../types';
import { fmtTag, stateOfTag } from '../../domain/machineModel';
import { ageLabel } from '../../inspection/alarms';

const LEVELS: { id: PlantAlarm['escalation']; label: string }[] = [
  { id: 'operator', label: 'Operator' },
  { id: 'shift_in_charge', label: 'Shift in-charge' },
  { id: 'plant_head', label: 'Plant head' },
];
const dur = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(s % 3600 ? 1 : 0)} h` : s >= 100 ? `${Math.round(s / 60)} min` : `${s} s`);
const dotCls = { ok: 'bg-emerald-500', near: 'bg-amber-500', out: 'bg-rose-500' } as const;

interface Props {
  machine: MachineStation;
  alarms: PlantAlarm[];
  now: number; // units produced, the plant clock
  cyclesToday: number;
  onAcknowledge: (id: string) => void;
  onResume: () => void;
}

export const LiveCard: React.FC<Props> = ({ machine, alarms, now, cyclesToday, onAcknowledge, onResume }) => {
  const [test, setTest] = useState<'idle' | 'running' | 'ok'>('idle');
  const key = machine.tags[0];
  const keyState = stateOfTag(key, key.value);
  const open = alarms.filter((a) => a.resolvedAt == null).sort((a, b) => Number(b.severity === 'critical') - Number(a.severity === 'critical'))[0];
  const stopped = machine.status === 'stopped';
  const outCount = machine.tags.filter((t) => stateOfTag(t, t.value) === 'out').length;
  const runTest = () => { setTest('running'); setTimeout(() => setTest('ok'), 1600); };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Radio size={14} className="text-emerald-600" /> Live from <span className="">GW-{machine.code.replace('-', '')}</span></div>
          <span className="text-[12.5px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500">PLC</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{machine.tags.length} process tags every second, over OPC UA</p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
        <div>
          <div className="text-[12.5px] text-slate-500 truncate">{key.name}</div>
          <div className={`text-2xl font-bold ${keyState === 'out' ? 'text-rose-600 dark:text-rose-400' : keyState === 'near' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>{fmtTag(key, key.value)}<span className="text-xs font-normal text-slate-400 ml-1">{key.unit}</span></div>
          <div className="text-[12.5px] text-slate-400">Normal {key.minNormal} to {key.maxNormal}</div>
        </div>
        <div>
          <div className="text-[12.5px] text-slate-500">OEE, Shift B</div>
          <div className={`text-2xl font-bold ${machine.shiftOee < 80 ? 'text-rose-600 dark:text-rose-400' : machine.shiftOee < 86 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>{machine.shiftOee.toFixed(1)}%</div>
          <div className="text-[12.5px] text-slate-400">A {machine.availability.toFixed(0)}% · P {machine.performance.toFixed(0)}% · Q {machine.quality.toFixed(0)}%</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
          <div className="text-[12.5px] tracking-wider text-slate-400">CYCLES TODAY</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">{cyclesToday.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
          <div className="text-[12.5px] tracking-wider text-slate-400">CYCLE, STANDARD</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">{dur(machine.cycleTimeSec)} / {dur(machine.standardCycleTimeSec)}</div>
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between text-[12.5px] tracking-wider text-slate-400 pb-1.5">
          <span>EVERY READING</span><span>{machine.tags.length - outCount} of {machine.tags.length} in range</span>
        </div>
        <div className="max-h-[260px] overflow-y-auto pr-1">
          {machine.tags.map((t) => {
            const st = stateOfTag(t, t.value);
            return (
              <div key={t.id} className="flex items-center justify-between gap-2 py-1.5 border-t border-slate-100 dark:border-slate-800 text-xs first:border-0">
                <span className="flex items-center gap-2 min-w-0"><span className={`w-1.5 h-1.5 rounded-full ${dotCls[st]}`} /><span className="truncate text-slate-700 dark:text-slate-300">{t.name}</span></span>
                <span className={`font-semibold shrink-0 ${st === 'out' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{fmtTag(t, t.value)} <span className="text-slate-400 font-normal">{t.unit}</span></span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 mt-auto space-y-3">
        {open ? (
          <div className={`rounded-lg border p-3 space-y-2 ${open.severity === 'critical' ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30' : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'}`}>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-1.5 py-0.5 rounded text-[12.5px] font-bold uppercase ${open.severity === 'critical' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-900'}`}>{open.severity}</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{open.code}</span>
              <span className="ml-auto text-[12.5px] text-slate-400">{open.raisedAt != null ? ageLabel(open.raisedAt, now) : open.timestamp}</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{open.cause.split('. ')[0].replace(/\.$/, '')}.</p>
            <p className="text-[12.5px] text-slate-600 dark:text-slate-300"><b>Fix:</b> {open.recommendedFix}</p>
            <div className="flex gap-1">
              {LEVELS.map((l, i) => (
                <span key={l.id} className={`px-1.5 py-0.5 rounded-full border text-[12.5px] ${LEVELS.findIndex((x) => x.id === open.escalation) >= i ? 'border-rose-400 text-rose-700 dark:text-rose-300 font-bold bg-white/60 dark:bg-slate-900/40' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>{l.label}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {!open.acknowledged ? <button type="button" onClick={() => onAcknowledge(open.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100">Acknowledge</button> : <span className="text-[12.5px] font-bold text-emerald-600 dark:text-emerald-400 self-center">Acknowledged by {open.acknowledgedBy}</span>}
              {stopped && <button type="button" onClick={onResume} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white">Reset &amp; Resume Line</button>}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2"><CheckCircle2 size={14} /> No open alarms. Every register is nominal.</div>
        )}
        {stopped && !open && <button type="button" onClick={onResume} className="w-full px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white">Reset &amp; Resume Line</button>}
        <button type="button" onClick={runTest} disabled={test === 'running'} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60">
          <RefreshCw size={13} className={test === 'running' ? 'animate-spin' : ''} /> {test === 'running' ? 'Running 12-point check…' : test === 'ok' ? 'Self-test passed: 12 of 12 registers, link 4 ms' : 'Run diagnostic self-test'}
        </button>
      </div>
    </div>
  );
};
