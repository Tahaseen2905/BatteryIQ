import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Square } from 'lucide-react';
import type { MachineStation } from '../../types';

const dot = (m: MachineStation) => (m.status === 'stopped' ? 'bg-rose-500' : m.status === 'attention' ? 'bg-amber-500' : 'bg-emerald-500');
const health = (n: number) => (n >= 85 ? 'text-emerald-600 dark:text-emerald-400' : n >= 65 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400');

interface Props {
  machines: MachineStation[];
  current: MachineStation;
  touring: boolean;
  onSelect: (m: MachineStation) => void;
  onToggleTour: () => void;
}

/** "Machine 8 of 12", the arrows, the tour, and a tile for every machine in process order. */
export const MachineStrip: React.FC<Props> = ({ machines, current, touring, onSelect, onToggleTour }) => {
  const i = machines.findIndex((m) => m.code === current.code);
  const prev = machines[(i - 1 + machines.length) % machines.length];
  const next = machines[(i + 1) % machines.length];
  const sel = useRef<HTMLButtonElement>(null);
  useEffect(() => { sel.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }, [current.code]);
  const btn = 'p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btn} onClick={() => onSelect(prev)} aria-label={`Previous machine ${prev.code}`}><ChevronLeft size={16} /></button>
        <div className="text-center leading-tight">
          <div className="text-[12.5px] font-bold tracking-wider text-slate-500 dark:text-slate-400">MACHINE {i + 1} OF {machines.length}</div>
          <div className="text-[12.5px] text-slate-400">In process order, or use ← →</div>
        </div>
        <button type="button" className={btn} onClick={() => onSelect(next)} aria-label={`Next machine ${next.code}`}><ChevronRight size={16} /></button>
        <button type="button" onClick={onToggleTour} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold ${touring ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
          {touring ? <Square size={12} /> : <Play size={12} />} {touring ? 'Stop tour' : 'Tour all machines'}
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {machines.map((m) => {
          const on = m.code === current.code;
          return (
            <button
              key={m.code}
              ref={on ? sel : undefined}
              type="button"
              onClick={() => onSelect(m)}
              className={`shrink-0 w-[150px] text-left rounded-lg border px-3 py-2 transition-colors ${on ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot(m)}`} />
                <span className="text-xs font-bold text-slate-900 dark:text-white">{m.code}</span>
                <span className={`ml-auto text-xs font-bold ${health(m.aiHealthScore)}`} title="AI health score">{m.aiHealthScore}</span>
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-slate-500 dark:text-slate-400">{m.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
