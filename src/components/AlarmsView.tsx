/**
 * AlarmsView.tsx
 * Machine and vision-gate alarms with cause, fix, who has been told, and acknowledgement.
 */

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PlantAlarm } from '../types';
import { ageLabel, ESCALATE_TO_PLANT, ESCALATE_TO_SHIFT } from '../inspection/alarms';

interface Props {
  alarms: PlantAlarm[];
  now: number;
  onAcknowledge: (id: string) => void;
  onOpenGate: (gate: string) => void;
  onOpenMachine: (code: string) => void;
}

const LEVELS: { id: PlantAlarm['escalation']; label: string }[] = [
  { id: 'operator', label: 'Operator' },
  { id: 'shift_in_charge', label: 'Shift in-charge' },
  { id: 'plant_head', label: 'Plant head' },
];

export const AlarmsView: React.FC<Props> = ({ alarms, now, onAcknowledge, onOpenGate, onOpenMachine }) => {
  const [showCleared, setShowCleared] = useState(false);
  const shown = alarms.filter((a) => showCleared || a.resolvedAt == null);
  const open = alarms.filter((a) => a.resolvedAt == null);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Alarms</h2>
          <p className="text-xs text-slate-500">
            An alarm that nobody acknowledges goes to the shift in-charge after about {Math.round(ESCALATE_TO_SHIFT * 0.3)} plant minutes and to the plant head after {Math.round(ESCALATE_TO_PLANT * 0.3)}.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={showCleared} onChange={(e) => setShowCleared(e.target.checked)} /> Show cleared ({alarms.length - open.length})
        </label>
      </div>
      <div className="space-y-3">
        {shown.map((a) => {
          const cleared = a.resolvedAt != null;
          return (
            <div key={a.id} className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm space-y-2 text-xs ${cleared ? 'border-slate-200 dark:border-slate-800 opacity-70' : a.severity === 'critical' ? 'border-rose-300 dark:border-rose-800' : 'border-amber-300 dark:border-amber-800'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[12.5px] font-bold uppercase ${a.severity === 'critical' ? 'bg-rose-600 text-white' : a.severity === 'major' ? 'bg-amber-500 text-slate-900' : 'bg-slate-200 text-slate-700'}`}>{a.severity}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{a.code}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{a.machineName}</span>
                </div>
                <span className="text-[12.5px] text-slate-400">{a.raisedAt != null ? ageLabel(a.raisedAt, now) : a.timestamp}{cleared ? ' · cleared' : ''}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300">{a.cause}</p>
              <p className="text-slate-500"><b>Fix:</b> {a.recommendedFix}</p>
              <p className="text-slate-500"><b>Why it matters:</b> {a.impact}</p>
              <div className="flex items-center gap-1.5 pt-1" aria-label="Who has been told">
                {LEVELS.map((l, i) => {
                  const reached = LEVELS.findIndex((x) => x.id === a.escalation) >= i;
                  return <span key={l.id} className={`px-2 py-0.5 rounded-full border text-[12.5px] ${reached ? 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>{l.label}</span>;
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[12.5px]">
                <span className="text-slate-500">Reading: <strong>{a.triggerReading} = {a.readingValue}</strong> (limit {a.threshold})</span>
                <div className="flex items-center gap-2">
                  {a.gate && <button onClick={() => onOpenGate(a.gate!)} className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">Open gate {a.gate} <ArrowRight size={12} /></button>}
                  {a.suspect && a.suspect !== 'CONTAINER-LOT' && <button onClick={() => onOpenMachine(a.suspect!)} className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">Open {a.suspect} <ArrowRight size={12} /></button>}
                  {!a.acknowledged && !cleared ? (
                    <button onClick={() => onAcknowledge(a.id)} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded font-medium">Acknowledge</button>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{cleared ? 'Cleared' : `Acknowledged by ${a.acknowledgedBy}`}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!shown.length && <p className="text-sm text-slate-500">No open alarms.</p>}
      </div>
    </div>
  );
};
