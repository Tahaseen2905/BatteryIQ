/**
 * DeploymentView.tsx
 * What it takes to put this on a line: inspection speed, cameras and lighting at each gate, the edge and server hardware,
 * what the plant provides, and a rollout plan. Typical figures, to be confirmed at the site survey.
 */

import React from 'react';
import { Camera, Cpu, HardDrive, Network } from 'lucide-react';
import { GATE_IDS } from '../inspection/types';
import { GATES } from '../inspection/catalogue';
import { MIN_PER_UNIT } from '../inspection/engine';
import { ConnectedStrip, Note, PageHead, Panel, Stat, TD, TH } from './ui-kit';

const GATE_KIT: Record<string, { cams: string; light: string; spot: string; edge: string }> = {
  Q1: { cams: '4 area cameras (top and four sides)', light: 'Diffuse dome light, shielded from the moulding area', spot: 'After casing, before assembly', edge: 'Edge box with GPU' },
  Q2: { cams: '2 high-resolution cameras on the terminals', light: 'Low-angle ring light for weld and height', spot: 'After inter-cell weld and strap casting', edge: 'Edge box with GPU' },
  Q3: { cams: '3 cameras on the cover joint, plus a thermal camera', light: 'Bar lights for sealant beads and gaps', spot: 'After heat sealing', edge: 'Edge box with GPU' },
  Q4: { cams: '2 cameras for label and code, one reading the date code', light: 'Coaxial light for QR contrast', spot: 'After labelling, before packing', edge: 'Edge box with GPU' },
};

const PLAN: [string, string, string][] = [
  ['Weeks 1 to 2', 'Site survey', 'Line walk, camera positions, lighting, network, PLC I/O list and the interfaces to the MES and CMMS.'],
  ['Weeks 3 to 6', 'Collect and label images', 'Cameras run in listen-only mode and gather frames; your team labels good and defective batteries with us.'],
  ['Weeks 7 to 9', 'Train and prove', 'Models are trained on your images and the targets are measured on a held-out set your team has not seen.'],
  ['Weeks 10 to 12', 'Pilot on one line', 'Live alongside the manual check. Rejects are shown, not yet diverted. Results reviewed weekly.'],
  ['Week 13 on', 'Switch on', 'Reject diverter and line-stop rules go live, one gate at a time, then the other lines.'],
];

export const DeploymentView: React.FC = () => {
  const takt = Math.round(MIN_PER_UNIT * 60);
  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Platform"
        title="Deployment"
        description="What it takes to run this on a line: speed, cameras and lighting at each gate, the hardware, what the plant provides and the rollout. Typical figures, confirmed at the site survey."
      />
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Stat label="Line speed in the demo" value={`${takt} s`} sub="One battery to the first gate every 18 s; set to the real rate at survey" prov="config" />
        <Stat label="Decision time" value="< 100 ms" sub="Per frame, on the gate’s edge box" prov="config" />
        <Stat label="Cameras" value="11" sub="Across the four gates, with lighting" prov="config" />
        <Stat label="Works offline" value="Yes" sub="Edge boxes keep inspecting with no network" prov="config" />
      </div>

      <Panel flush title="At each gate" description="Cameras, lighting and where it sits on the line">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead><tr>{['Gate', 'Where', 'Cameras', 'Lighting', 'Compute'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {GATE_IDS.map((g) => (
                <tr key={g}>
                  <td className={`${TD} font-semibold whitespace-nowrap`}>{g} <span className="font-normal text-slate-400">{GATES[g].short}</span></td>
                  <td className={TD}>{GATE_KIT[g].spot}</td>
                  <td className={TD}>{GATE_KIT[g].cams}</td>
                  <td className={TD}>{GATE_KIT[g].light}</td>
                  <td className={TD}>{GATE_KIT[g].edge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid items-stretch gap-5 lg:grid-cols-3">
        {([
          [<Camera key="c" size={16} />, 'On the line', 'Industrial cameras, lights and a reject diverter at each gate; an I/O link to the PLC for reject, rework and line-stop signals.'],
          [<Cpu key="e" size={16} />, 'At each gate', 'An industrial PC with a GPU runs the vision model and keeps seven days of frames if the network drops.'],
          [<HardDrive key="s" size={16} />, 'In the plant', 'One server or a virtual machine for the historian, traceability store, alarms and this app, with backup and role-based login.'],
        ] as const).map(([icon, t, d]) => (
          <div key={t} className="flex h-full gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">{icon}</span>
            <div><div className="text-[14.5px] font-semibold text-slate-900 dark:text-white">{t}</div><p className="mt-1 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">{d}</p></div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel flush title="Rollout" description="About 13 weeks from survey to the first line live">
          {PLAN.map(([when, what, d]) => (
            <div key={when} className="flex gap-4 border-b border-slate-100 dark:border-slate-800 px-5 py-3 last:border-b-0">
              <div className="w-28 shrink-0 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">{when}</div>
              <div><div className="text-[14px] font-semibold text-slate-900 dark:text-white">{what}</div><div className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-300">{d}</div></div>
            </div>
          ))}
        </Panel>
        <Panel title="What we need from the plant" description="Before the survey">
          <ul className="space-y-2.5 text-[13.5px] text-slate-700 dark:text-slate-300">
            {['Line drawings and the PLC I/O list at each gate', 'About 500 good and 200 defective images for each defect on the checklist (we help collect them)', 'Read access to the MES, CMMS and QMS, and who owns each', 'A place for the plant server, power, and a network port at each gate', 'A named quality owner who signs off the pilot results', 'The battery model master, with label and date-code rules'].map((t) => (
              <li key={t} className="flex gap-2"><Network size={15} className="mt-0.5 shrink-0 text-emerald-700" />{t}</li>
            ))}
          </ul>
        </Panel>
      </div>
      <Note>Typical figures for a line of this kind. The camera count, speed and hardware depend on the real line rate, space and lighting, and are fixed at the site survey.</Note>
      <ConnectedStrip ids={['CN-GW', 'CN-PLC', 'CN-VIS']} />
    </div>
  );
};
