import React from 'react';
import type { MachineStation } from '../../types';
import { cyclePosition } from '../../domain/machineModel';

/** The cycle as steps, with the one running now. A stopped machine stays where it stopped. */
export const StepTimeline: React.FC<{ machine: MachineStation; seconds: number }> = ({ machine, seconds }) => {
  const pos = cyclePosition(machine.code, machine.cycleTimeSec, seconds);
  const stopped = machine.status === 'stopped';
  return (
    <div className="rounded-xl bg-slate-900 text-slate-100 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-xs">
        <div>
          <span className="text-[12.5px] tracking-wider text-slate-400">STEP {pos.index + 1} OF {pos.steps.length}</span>
          <span className="ml-2 text-sm font-semibold">{pos.steps[pos.index]}</span>
        </div>
        <span className="text-[12.5px] text-slate-400">
          {stopped ? 'Stopped' : `${(pos.within * (pos.shownSec / pos.steps.length)).toFixed(1)} of ${(pos.shownSec / pos.steps.length).toFixed(1)} s in this step`}
          {' · '}standard cycle {machine.standardCycleTimeSec >= 3600 ? `${(machine.standardCycleTimeSec / 3600).toFixed(1)} h` : machine.standardCycleTimeSec >= 100 ? `${Math.round(machine.standardCycleTimeSec / 60)} min` : `${machine.standardCycleTimeSec} s`}
          {pos.changed ? ' (shown sped up)' : ''}
        </span>
      </div>
      <div className="flex gap-1.5">
        {pos.steps.map((s, i) => (
          <div key={s} className="flex-1 min-w-0">
            <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div className={`h-full rounded-full ${stopped ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: i < pos.index ? '100%' : i === pos.index ? `${pos.within * 100}%` : '0%' }} />
            </div>
            <div className={`mt-1 truncate text-[12px] ${i === pos.index ? 'text-white font-semibold' : 'text-slate-400'}`}>{s}</div>
          </div>
        ))}
      </div>
      {stopped && <p className="text-xs text-rose-300">Stopped: {machine.statusReason}</p>}
    </div>
  );
};
