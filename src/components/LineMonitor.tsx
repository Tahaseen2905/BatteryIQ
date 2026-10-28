/**
 * LineMonitor.tsx
 * Process-ordered telemetry monitoring across all 16 machine stations.
 * Fully responsive to Light and Dark themes.
 */

import React, { useState } from 'react';
import { MachineStation } from '../types';
import { Search, ArrowRight } from 'lucide-react';

interface LineMonitorProps {
  machines: MachineStation[];
  onSelectMachine: (machine: MachineStation) => void;
}

export const LineMonitor: React.FC<LineMonitorProps> = ({ machines, onSelectMachine }) => {
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMachines = machines.filter((m) => {
    if (selectedArea !== 'all' && m.area !== selectedArea) return false;
    if (selectedStatus !== 'all' && m.status !== selectedStatus) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Area Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setSelectedArea('all')}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                selectedArea === 'all'
                  ? 'bg-emerald-700 text-white font-medium shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Areas ({machines.length})
            </button>
            <button
              onClick={() => setSelectedArea('electrode_grid')}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                selectedArea === 'electrode_grid'
                  ? 'bg-emerald-700 text-white font-medium shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Electrode & Grid
            </button>
            <button
              onClick={() => setSelectedArea('cell_assembly')}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                selectedArea === 'cell_assembly'
                  ? 'bg-emerald-700 text-white font-medium shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Cell Assembly
            </button>
            <button
              onClick={() => setSelectedArea('chemical_formation')}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                selectedArea === 'chemical_formation'
                  ? 'bg-emerald-700 text-white font-medium shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Formation & Aging
            </button>
            <button
              onClick={() => setSelectedArea('pack_dispatch')}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                selectedArea === 'pack_dispatch'
                  ? 'bg-emerald-700 text-white font-medium shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Pack & Dispatch
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus('attention')}
              className={`px-2.5 py-1 rounded transition-colors text-amber-700 dark:text-amber-400 ${
                selectedStatus === 'attention' ? 'bg-amber-100 dark:bg-amber-950/80 font-medium' : 'opacity-70'
              }`}
            >
              Attention
            </button>
            <button
              onClick={() => setSelectedStatus('stopped')}
              className={`px-2.5 py-1 rounded transition-colors text-rose-700 dark:text-rose-400 ${
                selectedStatus === 'stopped' ? 'bg-rose-100 dark:bg-rose-950/80 font-medium' : 'opacity-70'
              }`}
            >
              Stopped
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search machine, code, step..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Machine Cards List in Process Flow Order */}
      <div className="space-y-3">
        {filteredMachines.map((m, index) => {
          const statusBadge =
            m.status === 'nominal'
              ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400'
              : m.status === 'attention'
              ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400'
              : 'border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400';

          const criticalPart = [...m.parts].sort((a, b) => a.remainingDays - b.remainingDays)[0];

          return (
            <div
              key={m.id}
              onClick={() => onSelectMachine(m)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-4 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm"
            >
              {/* Left Column: Index, Code, Name, Step */}
              <div className="flex items-start gap-3 min-w-[280px]">
                <span className="text-xs text-slate-400 dark:text-slate-600 mt-1">#{index + 1}</span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{m.code}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{m.name}</span>
                    <span className={`text-[12.5px] px-2 py-0.5 rounded border ${statusBadge}`}>
                      {m.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>Step: <strong className="text-slate-700 dark:text-slate-200">{m.currentStep}</strong></span>
                    <span>·</span>
                    <span>Progress: {m.stepProgress}%</span>
                  </div>
                  {m.statusReason && (
                    <p className="text-[12.5px] text-amber-700 dark:text-amber-300 mt-0.5">{m.statusReason}</p>
                  )}
                </div>
              </div>

              {/* Middle Column: OEE & Cycle Time */}
              <div className="flex items-center gap-6 text-xs border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-[12.5px] text-slate-400">SHIFT OEE</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{m.shiftOee}%</div>
                  <div className="text-[12.5px] text-slate-500 dark:text-slate-400">Avail {m.availability}%</div>
                </div>

                <div>
                  <div className="text-[12.5px] text-slate-400">CYCLE TIME</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    {m.cycleTimeSec}s{' '}
                    <span className="text-[12.5px] text-slate-400 font-normal">/ {m.standardCycleTimeSec}s</span>
                  </div>
                  <div className="text-[12.5px] text-slate-500 dark:text-slate-400">Power {m.powerConsumptionKw} kW</div>
                </div>

                <div>
                  <div className="text-[12.5px] text-slate-400">WIP BUFFER</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    {m.bufferAfterUnits} <span className="text-[12.5px] text-slate-400 font-normal">/ {m.bufferCapacity}</span>
                  </div>
                  <div className="text-[12.5px] text-emerald-600 dark:text-emerald-400">Nominal</div>
                </div>
              </div>

              {/* Sensor Tags Column */}
              <div className="flex flex-wrap items-center gap-2 max-w-sm">
                {m.tags.slice(0, 3).map((tag) => {
                  const isOutOfRange = tag.value < tag.minNormal || tag.value > tag.maxNormal;
                  return (
                    <div
                      key={tag.id}
                      className={`px-2 py-1 rounded text-[12.5px] border ${
                        isOutOfRange
                          ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-[12.5px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">{tag.name}</div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {tag.value} {tag.unit}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: AI Health & Critical Part */}
              <div className="flex items-center justify-between lg:justify-end gap-4 min-w-[200px] border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100 dark:border-slate-800">
                <div className="text-right">
                  <div className="text-[12.5px] text-slate-400">AI HEALTH</div>
                  <div
                    className={`text-sm font-bold ${
                      m.aiHealthScore >= 90
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : m.aiHealthScore >= 75
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {m.aiHealthScore}%
                  </div>
                  {criticalPart && (
                    <div className="text-[12.5px] text-slate-500 dark:text-slate-400">
                      {criticalPart.partName.split(' ')[0]}: {criticalPart.remainingDays}d left
                    </div>
                  )}
                </div>

                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
