/**
 * MachineDetailView.tsx
 * One machine, in depth: the machine in 3D with its sensor and power tags and an X-ray view, the step of
 * its cycle running now, a strip to move between machines (or tour them all), every live reading with
 * OEE and the alarm to act on, and seven tabs behind it.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageSquareText, Radio, Zap, Factory } from 'lucide-react';
import { MachineStation, PlantAlarm } from '../types';
import { cyclePosition, loadOf } from '../domain/machineModel';
import { MachineStudio, Power } from './machine/MachineStudio';
import { StepTimeline } from './machine/StepTimeline';
import { MachineStrip } from './machine/MachineStrip';
import { LiveCard } from './machine/LiveCard';
import { useClockSeconds } from './machine/hooks';
import { AlarmsTab, ConditionTab, DetailsTab, EnergyTab, OeeTab, PredictiveTab, ProcessTab } from './machine/tabs';

interface MachineDetailViewProps {
  machine: MachineStation;
  allMachines: MachineStation[];
  alarms: PlantAlarm[];
  /** Batteries produced so far: the plant clock. */
  tick: number;
  onBack: () => void;
  onSelectMachine: (m: MachineStation) => void;
  onAcknowledgeAlarm: (alarmId: string) => void;
  onInjectStationFault?: (machineCode: string) => void;
  onClearStationFault?: (machineCode: string) => void;
  onOpenCopilot?: () => void;
  onOpenGateway?: () => void;
}

type TabId = 'process' | 'pdm' | 'condition' | 'oee' | 'alarms' | 'energy' | 'details';

const chip = {
  nominal: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  attention: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  stopped: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};
const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800';

export const MachineDetailView: React.FC<MachineDetailViewProps> = ({
  machine, allMachines, alarms, tick, onBack, onSelectMachine, onAcknowledgeAlarm, onInjectStationFault, onClearStationFault, onOpenCopilot, onOpenGateway,
}) => {
  const [tab, setTab] = useState<TabId>('process');
  const [touring, setTouring] = useState(false);
  const stopped = machine.status === 'stopped';
  const seconds = useClockSeconds(stopped);

  const machineAlarms = useMemo(
    () => alarms.filter((a) => a.machineId === machine.id || a.suspect === machine.code || a.machineName.includes(machine.code)),
    [alarms, machine.id, machine.code],
  );
  const openAlarms = machineAlarms.filter((a) => a.resolvedAt == null);

  // cycle, power and energy all follow the same step
  const pos = cyclePosition(machine.code, machine.cycleTimeSec, seconds);
  const load = loadOf(machine.code, pos.steps.length)[pos.index];
  const rated = machine.powerConsumptionKw * 1.25;
  const kw = stopped ? machine.powerConsumptionKw * 0.04 : machine.powerConsumptionKw * load;
  const volts = 415 + Math.sin(seconds * 0.7) * 3;
  const pf = 0.88;
  const power: Power = { kw, volts, pf, amps: (kw * 1000) / (Math.sqrt(3) * volts * pf) };
  void rated;
  const hours = (162 + tick * 0.3) / 60;
  const cyclesToday = Math.floor((hours * 3600 * (machine.availability / 100)) / Math.max(machine.cycleTimeSec, 1));

  const index = allMachines.findIndex((m) => m.code === machine.code);
  const go = (delta: number) => onSelectMachine(allMachines[(index + delta + allMachines.length) % allMachines.length]);

  // ← → move between machines
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /input|select|textarea/i.test(t.tagName)) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  // the tour visits each machine in process order
  useEffect(() => {
    if (!touring) return;
    const t = setTimeout(() => go(1), 7000);
    return () => clearTimeout(t);
  }, [touring, machine.code]);

  const faultBtn = stopped ? onClearStationFault : onInjectStationFault;
  const status = machine.status;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'process', label: 'Process and health' },
    { id: 'pdm', label: 'Predictive maintenance' },
    { id: 'condition', label: 'Condition trends' },
    { id: 'oee', label: 'OEE and cycles' },
    { id: 'alarms', label: 'Alarms', count: openAlarms.length },
    { id: 'energy', label: 'Energy' },
    { id: 'details', label: 'Details' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12.5px] font-bold tracking-wider text-slate-400 uppercase">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"><ArrowLeft size={12} /> Line monitor</button>
            <span className="flex items-center gap-1 normal-case tracking-normal font-normal border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900"><Factory size={11} /> <b className="">{machine.code}</b> {machine.area.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{machine.name}</h1>
            <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${chip[status]}`}>{status === 'nominal' ? 'Running' : status === 'attention' ? 'Attention' : 'Stopped'}</span>
            {openAlarms[0] && <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${openAlarms[0].severity === 'critical' ? chip.stopped : chip.attention}`}>{openAlarms[0].severity === 'critical' ? 'Critical alarm' : 'Major alarm'}</span>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{machine.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenCopilot && <button type="button" className={btn} onClick={onOpenCopilot}><MessageSquareText size={14} /> Ask about {machine.code}</button>}
          {onOpenGateway && <button type="button" className={btn} onClick={onOpenGateway}><Radio size={14} /> Gateway</button>}
          {faultBtn && (
            <button type="button" onClick={() => faultBtn(machine.code)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${stopped ? 'bg-rose-700 hover:bg-rose-600 text-white' : 'bg-emerald-700 hover:bg-emerald-600 text-white'}`}>
              <Zap size={14} /> {stopped ? 'Clear Station Fault' : 'Inject Station Fault'}
            </button>
          )}
        </div>
      </div>

      {/* The machine, and what it is doing now */}
      <div className="grid grid-cols-1 min-[1100px]:grid-cols-[minmax(0,1fr)_390px] gap-5 items-start">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 space-y-4">
          <MachineStudio machine={machine} power={power}>
            <StepTimeline machine={machine} seconds={seconds} />
          </MachineStudio>
          <MachineStrip machines={allMachines} current={machine} touring={touring} onSelect={onSelectMachine} onToggleTour={() => setTouring((v) => !v)} />
        </div>
        <LiveCard
          machine={machine}
          alarms={machineAlarms}
          now={tick}
          cyclesToday={cyclesToday}
          onAcknowledge={onAcknowledgeAlarm}
          onResume={() => onClearStationFault?.(machine.code)}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 text-xs overflow-x-auto" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            {t.label}
            {t.count ? <span className="ml-1.5 px-1.5 rounded-full text-[12.5px] bg-rose-500 text-white">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'process' && <ProcessTab machine={machine} />}
      {tab === 'pdm' && <PredictiveTab machine={machine} />}
      {tab === 'condition' && <ConditionTab machine={machine} />}
      {tab === 'oee' && <OeeTab machine={machine} />}
      {tab === 'alarms' && <AlarmsTab alarms={machineAlarms} now={tick} onAcknowledge={onAcknowledgeAlarm} />}
      {tab === 'energy' && <EnergyTab machine={machine} power={power} stepIndex={pos.index} tick={tick} produced={tick} />}
      {tab === 'details' && <DetailsTab machine={machine} />}
    </div>
  );
};
