/**
 * IntegrationsView.tsx
 * How the plant's data gets in and where it goes (as in LineIQ): the machines and cameras, an IIoT gateway on
 * each station, the plant server, and the MES, CMMS, QMS, historian and label systems.
 */

import React, { useState } from 'react';
import { ArrowLeftRight, Building2, Cpu, Server } from 'lucide-react';
import type { MachineStation } from '../types';
import type { InspectionState } from '../inspection/types';
import { clockAt } from '../inspection/engine';
import { GATES } from '../inspection/catalogue';
import { GATE_IDS } from '../inspection/types';
import { shortSerial } from './quality/ui';
import { INTEGRATIONS, agoLabel } from '../domain/plant';
import { Button, Code, ConnectedStrip, Meter, PageHead, Panel, Prov, Stat, Status, TD, TH } from './ui-kit';
import { toast } from './toasts';

/** Sources, edge, plant server and plant systems, with the guarded way back to the PLC. */
function ConnectionMap() {
  const cols = [
    { x: 30, title: 'On the machine', items: ['Machine PLC', 'Weld and seal controllers', 'Formation chargers', 'Cameras at Q1–Q4'] },
    { x: 290, title: 'IIoT gateway (one per station)', items: ['PLC and sensor reads', 'Range checks and alarms', 'Vision inference at the gate', 'Copilot, 7-day buffer'] },
    { x: 560, title: 'Plant server (on-premise)', items: ['Historian', 'Model service', 'Alarms and escalation', 'Traceability store'] },
    { x: 830, title: 'Plant systems and this app', items: ['MES', 'CMMS', 'QMS', 'Label and code server'] },
  ];
  const W = 1080;
  const H = 300;
  const ink = 'currentColor';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-slate-700 dark:text-slate-200" role="img" aria-label="Data flow from the machines to the plant systems">
      {cols.map((c) => (
        <g key={c.title}>
          <text x={c.x} y={22} fontSize={11} fontWeight={700} letterSpacing="0.1em" fill="#94a3b8" style={{ textTransform: 'uppercase' }}>{c.title}</text>
          {c.items.map((it, i) => (
            <g key={it}>
              <rect x={c.x} y={40 + i * 46} width={210} height={34} rx={8} className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700" />
              <circle cx={c.x + 14} cy={57 + i * 46} r={3} fill="#16a34a" />
              <text x={c.x + 25} y={61.5 + i * 46} fontSize={12.5} fontWeight={500} fill={ink}>{it}</text>
            </g>
          ))}
        </g>
      ))}
      {[240, 510, 780].map((x, i) => (
        <g key={x}>
          {[0, 1, 2, 3].map((r) => (
            <line key={r} x1={x} y1={57 + r * 46} x2={x + 50} y2={57 + r * 46} stroke="#148f7e" strokeWidth={1.5} strokeDasharray="5 5">
              <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1.2s" repeatCount="indefinite" />
            </line>
          ))}
          <text x={x + 25} y={H - 70} fontSize={11} textAnchor="middle" fill="#94a3b8">{['OPC UA, Modbus, GigE Vision', 'MQTT Sparkplug B', 'REST, OData, ISA-95'][i]}</text>
        </g>
      ))}
      <path d={`M 395 ${H - 40} L 135 ${H - 40} L 135 228`} fill="none" stroke="#3f51b5" strokeWidth={1.6} strokeDasharray="6 4" />
      <path d={`M 129 236 L 135 226 L 141 236`} fill="none" stroke="#3f51b5" strokeWidth={1.6} />
      <line x1={395} y1={228} x2={395} y2={H - 40} stroke="#3f51b5" strokeWidth={1.6} strokeDasharray="6 4" />
      <text x={150} y={H - 20} fontSize={12} fontWeight={600} fill="#3f51b5">Approved recipe changes only, written back over OPC UA inside guardrails (heater set-points, weld energy)</text>
    </svg>
  );
}

function Pillar({ icon, title, children, optional }: { icon: React.ReactNode; title: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">{icon}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-slate-900 dark:text-white">
          {title}
          {optional && <span className="rounded-full border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[11.5px] font-medium text-slate-500">Optional</span>}
        </div>
        <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">{children}</p>
      </div>
    </div>
  );
}

const RULES: { id: string; rule: string; detail: string; on: boolean }[] = [
  { id: 'divert-reject', rule: 'Divert a confident reject', detail: 'The gate pulses its reject output; the diverter sends the battery to the reject bay', on: true },
  { id: 'divert-rework', rule: 'Divert a rework', detail: 'The battery goes to the rework lane and is re-inspected from the next gate', on: true },
  { id: 'hold-review', rule: 'Hold a doubtful call', detail: 'The battery waits in the review lane until an operator decides', on: true },
  { id: 'stop-line', rule: 'Stop the line after consecutive rejects', detail: 'Five rejects in a row at one gate stops the infeed until a person resets it', on: false },
  { id: 'hold-lot', rule: 'Hold the lot behind a traced cause', detail: 'When the root cause names a tool or lot, batteries from it are held automatically', on: true },
];

const outputOf = (kind: string, gate: string) => `${gate}_${kind === 'reject' ? 'REJECT' : kind === 'rework' ? 'REWORK' : 'HOLD'}`;

export const IntegrationsView: React.FC<{ machines: MachineStation[]; inspection: InspectionState }> = ({ machines, inspection }) => {
  const [q, setQ] = useState('');
  const [rules, setRules] = useState(RULES);
  const signals = inspection.units.filter((u) => u.hold).slice(-9).reverse();
  const connected = INTEGRATIONS.filter((i) => i.status === 'connected').length;
  const degraded = INTEGRATIONS.filter((i) => i.status === 'degraded').length;
  const planned = INTEGRATIONS.filter((i) => i.status === 'planned').length;
  const writes = INTEGRATIONS.filter((i) => i.direction === 'read-write').length;
  const tags = machines.flatMap((m) => m.tags.map((t) => ({ machine: m.code, ...t }))).filter((t) => !q || `${t.id} ${t.name} ${t.machine}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Platform"
        title="Integrations"
        description="How the line’s data gets in and where it goes: the PLCs, sensors and cameras through a gateway on each station, a plant server on site, and the plant’s MES, CMMS, QMS, historian and label systems. Everything runs on-premise."
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Connected" value={connected} unit={`of ${INTEGRATIONS.length}`} sub="Live data flowing now" prov="computed" />
        <Stat label="Degraded" value={degraded} tone={degraded ? 'amber' : undefined} sub={degraded ? 'Bath sensors: gaps are back-filled' : 'Every link healthy'} prov="computed" />
        <Stat label="Write-back links" value={writes} sub="Approved changes only, inside guardrails" prov="config" />
        <Stat label="Planned" value={planned} sub="Ready to switch on in a later phase" prov="config" />
      </div>

      <Panel title="Connection map" description="From the machine to the app, and the guarded path back to the machine PLC">
        <ConnectionMap />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Pillar icon={<Cpu size={16} />} title="On every station">The IIoT gateway in the control panel: PLC and sensor reads, range checks, the vision model at each gate and the copilot. It keeps working with no network at all.</Pillar>
        <Pillar icon={<Server size={16} />} title="In the plant">One plant server or a virtual machine for the historian, plant-wide models, alarm escalation, battery traceability and this app. No data leaves the site.</Pillar>
        <Pillar icon={<Building2 size={16} />} title="Across plants" optional>Group dashboards comparing lines and plants, with anonymised KPIs only.</Pillar>
      </div>

      <Panel flush title="Connectors" description={`${INTEGRATIONS.length} systems`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr>{['System', 'Protocol', 'What it carries', 'Direction', 'Status', 'Last data', 'Rate', ''].map((h, i) => <th key={h + i} className={`${TH} ${i === 5 || i === 6 ? 'text-right' : ''}`}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {INTEGRATIONS.map((i) => (
                <tr key={i.id}>
                  <td className={TD}><div className="text-[14px] font-semibold text-slate-900 dark:text-white">{i.name}</div><div className="text-[12px] text-slate-400">{i.id}</div></td>
                  <td className={TD}>{i.protocol}</td>
                  <td className={`${TD} max-w-[280px]`}>{i.system}</td>
                  <td className={TD}>{i.direction === 'read-write' ? <span className="inline-flex items-center gap-1.5"><ArrowLeftRight size={14} className="text-indigo-600" />Read and write</span> : 'Read'}</td>
                  <td className={TD}>{i.status === 'connected' ? <Status s="pass">Connected</Status> : i.status === 'degraded' ? <Status s="near">Degraded</Status> : <Status s="pending">Planned</Status>}</td>
                  <td className={`${TD} text-right tabular-nums`}>{i.status === 'planned' ? 'Not yet' : agoLabel(i.lastSeenSec)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{i.ratePerMin ? `${i.ratePerMin.toLocaleString('en-IN')}/min` : 'On change'}</td>
                  <td className={`${TD} text-right`}>
                    <Button size="sm" disabled={i.status === 'planned'} onClick={() => toast({ title: `${i.name} answered`, detail: `Round trip ${i.latencyMs || 120} ms over ${i.protocol}.`, tone: 'teal' })}>Test</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid items-stretch gap-5 xl:grid-cols-2">
        <Panel flush className="h-full" title="Line actions" description="What the gates tell the line to do. The PLC acts on these outputs; the app only sets the rules">
          {rules.map((r) => (
            <div key={r.id} className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-slate-900 dark:text-white">{r.rule}</div>
                <div className="mt-0.5 text-[12.5px] text-slate-500">{r.detail}</div>
              </div>
              <button type="button" role="switch" aria-checked={r.on} aria-label={r.rule} onClick={() => { setRules((x) => x.map((y) => (y.id === r.id ? { ...y, on: !y.on } : y))); toast({ title: `${r.rule}: ${r.on ? 'off' : 'on'}`, detail: 'Sent to the gate controllers as a rule change, logged with the person who made it.', tone: 'teal' }); }} className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${r.on ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${r.on ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 text-[12.5px] text-slate-500">
            Outputs per gate: {GATE_IDS.map((g) => `${g}_REJECT, ${g}_REWORK, ${g}_HOLD`).join(' · ')}. Each is a digital output to the PLC; the line stop is a separate safe-stop input.
          </div>
        </Panel>
        <Panel flush className="h-full" title="Signals sent to the PLC" description="The latest outputs, live from the gates" actions={<Prov k="plc" compact />}>
          {signals.length ? signals.map((u) => (
            <div key={u.index} className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-2 last:border-b-0">
              <span className="w-12 text-[12.5px] tabular-nums text-slate-400">{clockAt(u.hold!.sinceIndex)}</span>
              <Code>{outputOf(u.hold!.kind, u.hold!.gate)}</Code>
              <span className="min-w-0 flex-1 truncate text-[13px] text-slate-600 dark:text-slate-300">{shortSerial(u.serial)} · {GATES[u.hold!.gate].short}</span>
              <span className="text-[12.5px] font-semibold text-emerald-700">pulse sent</span>
            </div>
          )) : <div className="px-5 py-6 text-[13.5px] text-slate-500">No signals yet.</div>}
        </Panel>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel
          title="Tag mapping"
          description="Machine and sensor tags mapped to the names the platform uses"
          flush
          actions={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a tag" aria-label="Find a tag" className="w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600" />}
        >
          <div className="max-h-[440px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0"><tr>{['Source tag', 'Platform signal', 'Unit', 'Sampling', 'Source'].map((h, i) => <th key={h} className={`${TH} ${i === 3 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
              <tbody>
                {tags.map((t) => (
                  <tr key={`${t.machine}-${t.id}`}>
                    <td className={TD}><Code>{t.id}</Code></td>
                    <td className={TD}><span className="text-slate-900 dark:text-slate-100">{t.name}</span> <span className="text-slate-400">· {t.machine}</span></td>
                    <td className={TD}>{t.unit || 'None'}</td>
                    <td className={`${TD} text-right tabular-nums`}>{t.samplingRateHz >= 1 ? `${t.samplingRateHz} Hz` : `every ${Math.round(1 / t.samplingRateHz)} s`}</td>
                    <td className={TD}>{t.source.replace(/_/g, ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Data quality, last 24 hours" description="Share of expected samples received" actions={<Prov k="computed" compact />}>
          <ul className="flex flex-col gap-3.5">
            {INTEGRATIONS.filter((i) => i.status !== 'planned' && i.ratePerMin > 0).map((i, k) => {
              const missing = i.status === 'degraded' ? 6.8 : [0.02, 0.05, 0.1, 0.3, 0.2, 0.4][k % 6];
              return (
                <li key={i.id}>
                  <div className="flex justify-between gap-3 text-[13.5px]">
                    <span className="text-slate-600 dark:text-slate-300">{i.name}</span>
                    <span className={`font-semibold tabular-nums ${missing > 1 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>{(100 - missing).toFixed(2)}%</span>
                  </div>
                  <Meter className="mt-1.5" value={100 - missing * 5} max={100} tone={missing > 1 ? 'amber' : 'teal'} />
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
      <ConnectedStrip ids={INTEGRATIONS.slice(0, 5).map((i) => i.id)} />
    </div>
  );
};
