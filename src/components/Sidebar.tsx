/**
 * Sidebar.tsx
 * Complete Industrial Navigation Sidebar matching the JoulesToWatts / BatteryIQ layout.
 */

import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Radio,
  AlertTriangle,
  Wrench,
  BarChart2,
  Camera,
  Search,
  FileText,
  Cable,
  Brain,
  Wallet,
  History as HistoryIcon,
  Rocket,
  Settings2,
  MessageSquare,
  Factory,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: any) => void;
  clock: string;
  dateLabel: string;
  running: number;
  machineCount: number;
  openAlarms: number;
  paused: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  clock,
  dateLabel,
  running,
  machineCount,
  openAlarms,
  paused,
}) => {
  const groups: { label: string; items: { id: string; label: string; sub: string; icon: any; badge?: string; live?: boolean }[] }[] = [
    {
      label: 'Monitor',
      items: [
        { id: 'control_room', label: 'Control room', sub: 'The whole line, live', icon: LayoutDashboard, live: true },
        { id: 'line_monitor', label: 'Line monitor', sub: 'Every machine, step and reading', icon: Cpu },
        { id: 'gateways', label: 'Sensors and gateways', sub: 'Tags, sampling and gateway health', icon: Radio },
      ],
    },
    {
      label: 'Inspect',
      items: [
        { id: 'quality_gates', label: 'Quality gates', sub: 'Four AI vision gates and hold bay', icon: Camera },
        { id: 'traceability', label: 'Traceability', sub: 'Battery to lots, tools and pictures', icon: Search },
        { id: 'model', label: 'AI model', sub: 'Accuracy, verdicts and learning', icon: Brain },
      ],
    },
    {
      label: 'Act',
      items: [
        { id: 'alarms', label: 'Alarms', sub: 'Cause, fix and owner', icon: AlertTriangle, badge: openAlarms ? String(openAlarms) : undefined },
        { id: 'predictive_ai', label: 'AI maintenance', sub: 'AI health and remaining life', icon: Wrench },
        { id: 'copilot', label: 'Copilot', sub: 'Ask in English or Hindi', icon: MessageSquare },
      ],
    },
    {
      label: 'Analyse',
      items: [
        { id: 'production_oee', label: 'Production and OEE', sub: 'Output, losses and downtime', icon: BarChart2 },
        { id: 'history', label: 'History', sub: 'Trends, Pareto and export', icon: HistoryIcon },
        { id: 'value', label: 'Savings', sub: 'What it is worth, and payback', icon: Wallet },
        { id: 'reports', label: 'Reports', sub: 'Shift handover and the day', icon: FileText },
      ],
    },
    {
      label: 'Platform',
      items: [
        { id: 'integrations', label: 'Integrations', sub: 'PLC, MES, CMMS, QMS, historian', icon: Cable },
        { id: 'deployment', label: 'Deployment', sub: 'Speed, cameras and rollout', icon: Rocket },
        { id: 'settings', label: 'Settings', sub: 'Demo, limits, models and roles', icon: Settings2 },
      ],
    },
  ];

  return (
    <aside className="w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 h-screen sticky top-0 select-none z-30">
      {/* Brand and shift: fixed */}
      <div className="flex flex-col items-center border-b border-slate-200 dark:border-slate-800 px-5 pt-6 pb-5">
        <img src="/j2w-logo.png" alt="Joules to Watts" width={400} height={194} className="w-[150px] h-auto dark:hidden" />
        <img src="/j2w-logo-dark.png" alt="Joules to Watts" width={400} height={194} className="w-[150px] h-auto hidden dark:block" />
        <div className="mt-3 h-px w-8 bg-slate-300 dark:bg-slate-700" />
        <div className="mt-3 text-center">
          <div className="text-[15px] leading-none font-extrabold tracking-[0.16em] uppercase text-slate-900 dark:text-white">BatteryIQ</div>
          <div className="mt-2 text-[10.5px] leading-none font-semibold tracking-[0.18em] uppercase text-slate-400 whitespace-nowrap">Industry 4.0 line intelligence</div>
        </div>

        <div className="mt-4 w-full rounded-[9px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[12.5px] font-bold text-slate-900 dark:text-white">{dateLabel} · Shift B</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap text-emerald-700 dark:text-emerald-400">
              <span className={`w-1.5 h-1.5 rounded-full ${paused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              {paused ? 'Paused' : 'Live'}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px] text-slate-500">
            <span className="truncate">{running} of {machineCount} machines running</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">{clock} IST</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(running / Math.max(machineCount, 1)) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Plant card: fixed */}
      <div className="px-4 pt-4 pb-1">
        <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-slate-400 mb-1.5 px-0.5">Plant</div>
        <div className="flex items-center gap-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5">
          <span className="grid place-items-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0"><Factory size={19} /></span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[15px] leading-tight font-bold text-slate-900 dark:text-white">Exide-inspired plant</span>
            <span className="mt-0.5 block truncate text-[12px] leading-tight text-slate-500">Hosur Unit 2 · India</span>
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 px-0.5 text-[12px] text-slate-500">
          <span className="truncate">{machineCount} machines · 4 vision gates</span>
          <span className="ml-auto px-2 py-0.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Lead-acid</span>
        </div>
      </div>

      {/* Navigation: the only part that scrolls */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]" aria-label="Sections">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-slate-400 px-3.5 pt-4 pb-1.5">{g.label}</div>
            {g.items.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${active ? 'bg-emerald-50 dark:bg-emerald-950/60' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}
                >
                  <Icon size={18} className={`shrink-0 ${active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`flex items-center gap-2 text-[14.5px] leading-tight ${active ? 'font-bold text-emerald-800 dark:text-emerald-300' : 'font-medium text-slate-600 dark:text-slate-300'}`}>
                      <span className="truncate">{item.label}</span>
                      {item.live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-label="live" />}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] leading-tight text-slate-400">{item.sub}</span>
                  </span>
                  {item.badge && <span className="h-[18px] min-w-[18px] px-1.5 text-[12px] leading-[18px] font-semibold text-center rounded-full bg-rose-600 text-white">{item.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: fixed */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-[12px] leading-snug text-slate-500">
        <span className="font-semibold text-slate-700 dark:text-slate-300">Simulated plant.</span> Every reading is computed live from a seeded model.
      </div>
    </aside>
  );
};
