/**
 * CopilotView.tsx
 * The copilot as a full page: the chat, with what it knows and how its answers stay honest.
 */

import React from 'react';
import { BookOpen, Cpu, Gauge, Languages, ListChecks, ScanSearch, ShieldCheck, Wrench } from 'lucide-react';
import type { CopilotContext } from '../copilot/brain';
import { CopilotChat } from '../copilot/CopilotChat';
import { Panel } from './ui-kit';

function Line({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 py-2.5 last:border-b-0">
      <span className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400">{icon}</span>
      <span className="text-[13.5px] leading-snug text-slate-600 dark:text-slate-300">{children}</span>
    </li>
  );
}

export const CopilotView: React.FC<{ getContext: () => CopilotContext; onNavigate: (to: string) => void; machineCount: number }> = ({ getContext, onNavigate, machineCount }) => (
  <div className="space-y-4">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">Copilot</h1>
      <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-3xl">
        Ask in plain English or Hindi. It answers from the line’s own data: the four vision gates, the hold bay, alarms, machines and maintenance. It runs on the plant server, so nothing leaves the site.
      </p>
    </div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel flush className="h-[max(520px,calc(100vh-190px))]" bodyClassName="flex min-h-0 flex-col">
        <CopilotChat getContext={getContext} onNavigate={onNavigate} />
      </Panel>
      <div className="flex flex-col gap-4">
        <Panel title="What it knows" description="Read from the plant, never sent outside it">
          <ul>
            <Line icon={<ScanSearch size={16} />}>Q1–Q4 inspection results, defects, SPC and traceability</Line>
            <Line icon={<Gauge size={16} />}>Live readings and status of {machineCount} machines</Line>
            <Line icon={<ListChecks size={16} />}>The review, rework and reject hold bays</Line>
            <Line icon={<Wrench size={16} />}>Part health, alarms and escalation</Line>
            <Line icon={<BookOpen size={16} />}>Shift figures, OEE and the downtime ranking</Line>
          </ul>
        </Panel>
        <Panel title="How answers stay honest">
          <ul>
            <Line icon={<ListChecks size={16} />}>Every answer lists the records it used</Line>
            <Line icon={<ShieldCheck size={16} />}>It points to the page to act on; a person decides</Line>
            <Line icon={<Cpu size={16} />}>It names a tool or lot only when the data points to it</Line>
            <Line icon={<Languages size={16} />}>English and Hindi</Line>
          </ul>
        </Panel>
      </div>
    </div>
  </div>
);
