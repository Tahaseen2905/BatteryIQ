/**
 * SensorsGatewaysView.tsx
 * Edge IIoT Gateway console for BatteryIQ. Theme-adaptive.
 */

import React from 'react';
import { MachineStation } from '../types';
import { Cpu, Server } from 'lucide-react';

interface SensorsGatewaysViewProps {
  machines: MachineStation[];
  onSelectMachine: (m: MachineStation) => void;
}

export const SensorsGatewaysView: React.FC<SensorsGatewaysViewProps> = ({
  machines,
  onSelectMachine,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Edge IIoT Gateways & Plant Server Bus</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40">
              16/16 Gateways Online
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Standard DIN-rail edge gateways in each machine panel: OPC UA to PLCs, Modbus/Wireless sensors, MQTT to Plant Server with 7-day edge ring buffer.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
          <div>Broker: <strong className="text-slate-900 dark:text-white">plant-broker.exide.internal:1883</strong></div>
          <span>·</span>
          <div>Sampling: <strong className="text-emerald-600 dark:text-emerald-400">10ms - 1s</strong></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {machines.map((m, idx) => (
          <div
            key={m.id}
            onClick={() => onSelectMachine(m)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-4 transition-all cursor-pointer space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-teal-600 dark:text-blue-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-white">{m.code}</span>
              </div>
              <span className="text-[12.5px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40">
                192.168.10.{40 + idx}
              </span>
            </div>

            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{m.name}</div>

            <div className="space-y-1.5 text-[12.5px] text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>OPC UA Protocol</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Connected</span>
              </div>
              <div className="flex justify-between">
                <span>Modbus Registers</span>
                <span className="text-slate-700 dark:text-slate-300">32 Channels</span>
              </div>
              <div className="flex justify-between">
                <span>7-Day Ring Buffer</span>
                <span className="text-slate-700 dark:text-slate-300">2.4 GB / 8 GB (30%)</span>
              </div>
              <div className="flex justify-between">
                <span>CPU / Memory Load</span>
                <span className="text-slate-700 dark:text-slate-300">12% / 34%</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[12.5px] text-slate-400">
              <span>{m.tags.length} Active Tags</span>
              <span className="text-emerald-600 dark:text-blue-400">View Node Registry →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
