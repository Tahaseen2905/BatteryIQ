/**
 * PredictiveMaintenanceView.tsx
 * AI-driven Reliability Centered Maintenance. Light and Dark theme adaptive.
 */

import React, { useState } from 'react';
import { MachineStation } from '../types';
import { Wrench, Activity, CheckCircle2 } from 'lucide-react';

interface PredictiveMaintenanceViewProps {
  machines: MachineStation[];
  onSelectMachine: (m: MachineStation) => void;
}

export const PredictiveMaintenanceView: React.FC<PredictiveMaintenanceViewProps> = ({
  machines,
  onSelectMachine,
}) => {
  const [selectedMachineId, setSelectedMachineId] = useState<string>(machines[1]?.id || machines[0]?.id || '');
  const [raisedWorkOrders, setRaisedWorkOrders] = useState<string[]>([]);

  const selectedMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];

  const allParts = machines.flatMap((m) =>
    m.parts.map((p) => ({ ...p, machineCode: m.code, machineId: m.id, machineName: m.name }))
  );
  allParts.sort((a, b) => a.remainingDays - b.remainingDays);

  const handleRaiseWorkOrder = (partName: string) => {
    if (!raisedWorkOrders.includes(partName)) {
      setRaisedWorkOrders([...raisedWorkOrders, partName]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top AI Reliability Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">Line Reliability Index</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">94.8%</div>
          <p className="text-[12.5px] text-slate-400 mt-1">4 AI Models Active Across 16 Stations</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">Actions Before Sunday</span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">3 Stations</div>
          <p className="text-[12.5px] text-slate-400 mt-1">CT-01, SL-01, FM-01 Scheduled</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">Avoided Downtime Savings</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">₹14.8 Lakhs</div>
          <p className="text-[12.5px] text-slate-400 mt-1">Net savings vs unpredicted failures</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">Model 6-Month Accuracy</span>
          <div className="text-2xl font-bold text-teal-600 dark:text-cyan-400 mt-1">96.2%</div>
          <p className="text-[12.5px] text-slate-400 mt-1">Weibull + FFT Multi-Sensor Model</p>
        </div>
      </div>

      {/* Line Stage Flow & Intermediate Buffer Starvation Analysis */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Line WIP Buffers & Starvation Risk Analysis</h3>
          </div>
          <span className="text-xs text-slate-400">Real-Time WIP Queues</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {machines.slice(0, 8).map((m) => {
            const bufRatio = m.bufferAfterUnits / m.bufferCapacity;
            const isStarving = bufRatio < 0.25;

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMachineId(m.id)}
                className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                  selectedMachineId === m.id
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-blue-950/40'
                    : isStarving
                    ? 'border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between font-bold text-[12.5px]">
                  <span className="text-slate-800 dark:text-slate-200">{m.code}</span>
                  <span className={isStarving ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}>
                    {m.bufferAfterUnits}u
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isStarving ? 'bg-rose-500' : bufRatio > 0.8 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, bufRatio * 100)}%` }}
                  />
                </div>
                <div className="text-[12.5px] text-slate-400 mt-1 truncate">
                  {isStarving ? 'High Starvation' : 'Balanced Buffer'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Machine Deep Dive & 4 AI Models */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">4 AI Models: {selectedMachine.code}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{selectedMachine.name}</p>
            </div>
            <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
              {selectedMachine.aiHealthScore}%
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>1. Multi-Sensor Anomaly Detector</span>
                <span className="text-emerald-600 dark:text-emerald-400">Nominal</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[12.5px]">Autoencoder reconstruction error: 0.018 (threshold: 0.050)</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>2. Remaining Life Weibull Model</span>
                <span className="text-amber-600 dark:text-amber-400">{selectedMachine.parts[0]?.remainingDays ?? 45}d Left</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[12.5px]">β = {selectedMachine.parts[0]?.weibullBeta ?? 2.4} (wear-out phase)</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>3. Failure Mode Classifier</span>
                <span className="text-teal-700 dark:text-blue-300">{selectedMachine.parts[0]?.failureMode}</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[12.5px]">Classification confidence: 94.2%</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>4. Cumulative Wear Cycle Counter</span>
                <span className="text-slate-700 dark:text-slate-200">142,850 cycles</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[12.5px]">82% design life consumed</p>
            </div>
          </div>
        </div>

        {/* Priority Parts */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Plant Part Health Sorted by Remaining Life</h3>
            </div>
            <span className="text-xs text-slate-400">Showing Top Priority Components</span>
          </div>

          <div className="space-y-3">
            {allParts.slice(0, 5).map((part, idx) => {
              const isWorkOrderRaised = raisedWorkOrders.includes(part.partName);

              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-bold text-xs bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white">
                        {part.machineCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{part.partName}</span>
                      <span
                        className={`text-[12.5px] px-2 py-0.5 rounded ${
                          part.remainingDays <= 14
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/50'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/50'
                        }`}
                      >
                        {part.remainingDays} DAYS REMAINING
                      </span>
                    </div>
                    <div className="text-[12.5px] text-slate-500 dark:text-slate-400">
                      Failure Mode: {part.failureMode} · Health: {part.healthPercent}%
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isWorkOrderRaised ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Work Order Raised (WO #7412)</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRaiseWorkOrder(part.partName)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-medium transition-colors"
                      >
                        Raise Sunday Shutdown WO
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
