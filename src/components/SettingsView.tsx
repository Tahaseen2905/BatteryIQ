/**
 * SettingsView.tsx
 * The controls behind the demo, the limits that raise alarms, the plan and buffers, and the roles (as in LineIQ).
 */

import React, { useState } from 'react';
import { Check, Minus, Play, RotateCcw, Zap, Cog } from 'lucide-react';
import type { MachineStation } from '../types';
import type { GateId, InspectionState } from '../inspection/types';
import { GATE_IDS } from '../inspection/types';
import { DEFECTS, GATES, MEASURES, MIN_ALARM_SAMPLE, REVIEW_CONFIDENCE, ROLLING_WINDOW, TARGET_PASS_RATE, alarmLimitFailures } from '../inspection/catalogue';
import { ESCALATE_TO_PLANT, ESCALATE_TO_SHIFT } from '../inspection/alarms';
import { MIN_PER_UNIT, REJECT_DISPOSE_AFTER, REVIEW_TIMEOUT, REWORK_TURNAROUND } from '../inspection/engine';
import { BATTERY_MODELS, CAPS, ROLES, SHIFTS } from '../domain/plant';
import { download, toCsv } from '../domain/history';
import { clockAt } from '../inspection/engine';
import { Button, Code, HeadTab, KeyValues, Note, PageHead, Panel, Prov, Segmented, Status, TD, TH } from './ui-kit';
import { toast } from './toasts';

type Tab = 'demo' | 'limits' | 'plan' | 'models' | 'roles' | 'audit';

interface SettingsViewProps {
  machines: MachineStation[];
  inspection: InspectionState;
  isDarkMode: boolean;
  onSetDark: (v: boolean) => void;
  onInjectDefect: (gate: GateId, defectId: string) => void;
  onInjectStation: (code: string) => void;
  onClearStation: (code: string) => void;
  onClearFaults: () => void;
  onReset: () => void;
  roleIndex: number;
}

const minutes = (units: number) => Math.round(units * MIN_PER_UNIT);

function DemoTab(p: SettingsViewProps) {
  const [gate, setGate] = useState<GateId>('Q3');
  const active = new Set(p.inspection.faults.filter((f) => f.endIndex == null).map((f) => f.defectId));
  const stopped = p.machines.filter((m) => m.status === 'stopped');
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col gap-5">
        <Panel flush title="Quality faults, one for each line of the inspection checklist" description="The camera starts failing batteries at that gate; the alarm is raised with its fix, and the machine behind it goes to Attention"
          actions={<Segmented<GateId> value={gate} onChange={setGate} options={GATE_IDS.map((g) => ({ value: g, label: g }))} />}>
          {DEFECTS.filter((d) => d.gate === gate).map((d) => (
            <div key={d.id} className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-3 last:border-b-0">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"><Zap size={15} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold text-slate-900 dark:text-white">{d.label}</span>
                  <Code>{d.suspect}</Code>
                  {active.has(d.id) && <Status s="running">Fault on</Status>}
                </div>
                <div className="mt-0.5 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{d.checklist}</div>
                <div className="mt-0.5 text-[12.5px] leading-snug text-slate-400">Fix the model gives: {d.fix}</div>
              </div>
              <Button size="sm" variant={active.has(d.id) ? 'secondary' : 'primary'} disabled={active.has(d.id)} onClick={() => { p.onInjectDefect(d.gate, d.id); toast({ title: `${d.label}: started`, detail: `Watch gate ${d.gate}, its alarm and ${d.suspect}.`, tone: 'amber' }); }}>
                <Play size={13} />Trigger
              </Button>
            </div>
          ))}
        </Panel>
        <Panel flush title="Station faults, one for each machine" description="The machine stops and the whole line stops with it, until it is reset">
          {p.machines.map((m) => (
            <div key={m.code} className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-2.5 last:border-b-0">
              <Code>{m.code}</Code>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-slate-700 dark:text-slate-300">{m.name}</span>
              {m.status === 'stopped' ? (
                <Button size="sm" variant="danger" onClick={() => p.onClearStation(m.code)}><RotateCcw size={13} />Reset</Button>
              ) : (
                <Button size="sm" onClick={() => { p.onInjectStation(m.code); toast({ title: `${m.code} stopped`, detail: 'The line is held until the station is reset.', tone: 'amber' }); }}><Cog size={13} />Stop it</Button>
              )}
            </div>
          ))}
        </Panel>
      </div>
      <div className="flex flex-col gap-4">
        <Panel title="Display" description="For the room you are presenting in">
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Theme</div>
              <Segmented value={p.isDarkMode ? 'dark' : 'light'} onChange={(v) => p.onSetDark(v === 'dark')} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button onClick={() => { p.onClearFaults(); toast({ title: 'Faults cleared', detail: 'Every injected fault and station stop is cleared.', tone: 'teal' }); }}>Clear all faults{stopped.length ? ` and ${stopped.length} stop${stopped.length > 1 ? 's' : ''}` : ''}</Button>
              <Button onClick={() => { p.onReset(); toast({ title: 'Demo reset', detail: 'Back to 16:42 in Shift B, with the Q3 seal problem running.' }); }}><RotateCcw size={14} />Reset the demo</Button>
            </div>
          </div>
        </Panel>
        <Panel title="What happens on its own">
          <ul className="flex flex-col gap-2 text-[13.5px] leading-snug text-slate-600 dark:text-slate-300">
            <li>The demo opens with HS-01 platen 2 running cold, so gate Q3 is already in alarm.</li>
            <li>Every battery goes Q1 to Q4; the camera sends doubtful ones to operator review.</li>
            <li>Unacknowledged alarms escalate to the shift in-charge, then the plant head.</li>
            <li>The rework cell clears its batteries on its own after {REWORK_TURNAROUND} batteries.</li>
          </ul>
        </Panel>
        <Panel title="About this demo">
          <p className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">BatteryIQ by JoulesToWatts: AI vision inspection and monitoring for a lead-acid vehicle battery line. Every number comes from one seeded model, so the same figures appear on every run and every page agrees with every other. Nothing is sent anywhere.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['React 19 and TypeScript', 'three.js', 'Seeded simulation', 'Works offline'].map((t) => <span key={t} className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[12px] font-medium text-slate-500">{t}</span>)}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function LimitsTab({ machines }: { machines: MachineStation[] }) {
  const [code, setCode] = useState(machines[0].code);
  const m = machines.find((x) => x.code === code) ?? machines[0];
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel flush title="Process limits" description="The normal range of every reading, from the machine sheets; a reading outside it raises a machine alarm"
        actions={
          <select value={code} onChange={(e) => setCode(e.target.value)} aria-label="Machine" className="w-60 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600">
            {machines.map((x) => <option key={x.code} value={x.code}>{x.code}, {x.name}</option>)}
          </select>
        }>
        <table className="w-full">
          <thead><tr>{['Reading', 'Low', 'High', 'Unit'].map((h, i) => <th key={h} className={`${TH} ${i === 1 || i === 2 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
          <tbody>
            {m.tags.map((t) => (
              <tr key={t.id}>
                <td className={`${TD} font-semibold`}>{t.name}</td>
                <td className={`${TD} text-right tabular-nums`}>{t.minNormal}</td>
                <td className={`${TD} text-right tabular-nums`}>{t.maxNormal}</td>
                <td className={TD}>{t.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <div className="flex flex-col gap-5">
        <Panel title="Gate alarm limits" description="When a vision gate goes into alarm, and how it escalates" actions={<Prov k="config" compact />}>
          <KeyValues w={170} rows={[
            ['Target pass rate', `${TARGET_PASS_RATE}% per gate`],
            ['Rolling window', `Last ${ROLLING_WINDOW} batteries`],
            ['Alarm at', `${alarmLimitFailures(ROLLING_WINDOW)} or more bad in ${ROLLING_WINDOW} (4-sigma p-chart)`],
            ['Minimum sample', `${MIN_ALARM_SAMPLE} batteries`],
            ['Sent to review below', `${Math.round(REVIEW_CONFIDENCE * 100)}% camera confidence`],
            ['Review left alone for', `${REVIEW_TIMEOUT} batteries (${minutes(REVIEW_TIMEOUT)} min), then a defect`],
            ['Rework turnaround', `${REWORK_TURNAROUND} batteries (${minutes(REWORK_TURNAROUND)} min)`],
            ['Reject bay disposed after', `${REJECT_DISPOSE_AFTER} batteries (${minutes(REJECT_DISPOSE_AFTER)} min)`],
            ['Escalate to shift in-charge', `${minutes(ESCALATE_TO_SHIFT)} plant minutes unacknowledged`],
            ['Escalate to plant head', `${minutes(ESCALATE_TO_PLANT)} plant minutes unacknowledged`],
          ]} />
        </Panel>
        <Panel title="Measurement specifications" description="A battery measuring outside these is a defect" flush actions={<Prov k="config" compact />}>
          <table className="w-full">
            <tbody>
              {MEASURES.map((x) => (
                <tr key={x.key}>
                  <td className={TD}><div className="font-semibold text-slate-900 dark:text-white">{x.label}</div><div className="text-[12px] text-slate-400">{GATES[x.gate].title}</div></td>
                  <td className={`${TD} text-right tabular-nums`}>{x.lsl} to {x.usl} {x.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Note>Limits change only through a process engineer, and every change is logged with who made it and why.</Note>
      </div>
    </div>
  );
}

function PlanTab({ machines }: { machines: MachineStation[] }) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Panel title="Shifts and plan" description="The production day starts with Shift A" actions={<Prov k="config" compact />}>
        <KeyValues w={140} rows={[
          ...SHIFTS.map((s): [string, string] => [s.name, `${s.from} to ${s.to}, plan ${s.plan.toLocaleString('en-IN')} batteries`]),
          ['Day plan', `${SHIFTS.reduce((a, s) => a + s.plan, 0).toLocaleString('en-IN')} batteries`],
          ['Weekly off', 'Sunday'],
          ['Line OEE measured at', 'The four vision gates (output is what passes them)'],
        ]} />
      </Panel>
      <Panel title="Buffers between stations" description="Work in progress waiting after each station, against its capacity" flush actions={<Prov k="config" compact />}>
        <table className="w-full">
          <thead><tr>{['After', 'Station', 'Waiting', 'Capacity', 'Filled'].map((h, i) => <th key={h} className={`${TH} ${i > 1 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
          <tbody>
            {machines.map((m) => (
              <tr key={m.code}>
                <td className={TD}><Code>{m.code}</Code></td>
                <td className={TD}>{m.name}</td>
                <td className={`${TD} text-right tabular-nums`}>{m.bufferAfterUnits}</td>
                <td className={`${TD} text-right tabular-nums`}>{m.bufferCapacity}</td>
                <td className={`${TD} text-right tabular-nums`}>{Math.round((m.bufferAfterUnits / Math.max(m.bufferCapacity, 1)) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function RolesTab({ roleIndex }: { roleIndex: number }) {
  return (
    <Panel title="Roles and permissions" description="Who can do what. The app enforces it: switch role in the top bar and try an action. Every action is logged with the person and the time." flush>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead><tr><th className={TH}>Can</th>{ROLES.map((r) => <th key={r} className={`${TH} text-center ${ROLES[roleIndex] === r ? '!bg-emerald-50 !text-emerald-700 dark:!bg-emerald-950' : ''}`}>{r}{ROLES[roleIndex] === r ? ' (you)' : ''}</th>)}</tr></thead>
          <tbody>
            {CAPS.map(([cap, allowed]) => (
              <tr key={cap}>
                <td className={`${TD} font-semibold`}>{cap}</td>
                {allowed.map((a, i) => (
                  <td key={i} className={`${TD} text-center`}>
                    {a ? <Check className="mx-auto size-4 text-emerald-600" aria-label="Allowed" /> : <Minus className="mx-auto size-4 text-slate-300" aria-label="Not allowed" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ModelsTab() {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel flush title="Battery models" description="The model master the gates check against: label text and colour at Q4, terminal type at Q2" actions={<Prov k="config" compact />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr>{['Model', 'Name', 'Capacity', 'Terminal', 'Size', 'Label', 'Share of output'].map((h, i) => <th key={h} className={`${TH} ${i === 6 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
            <tbody>
              {BATTERY_MODELS.map((m) => (
                <tr key={m.code}>
                  <td className={TD}><Code>{m.code}</Code></td>
                  <td className={`${TD} font-semibold`}>{m.name}</td>
                  <td className={TD}>{m.ah} Ah</td>
                  <td className={TD}>{m.terminal}</td>
                  <td className={TD}>{m.size}</td>
                  <td className={TD}>{m.label}</td>
                  <td className={`${TD} text-right tabular-nums`}>{m.share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="flex flex-col gap-5">
        <Panel title="At a model changeover" description="What the gates do">
          <ul className="flex flex-col gap-2 text-[13.5px] leading-snug text-slate-600 dark:text-slate-300">
            <li>The MES sends the new job card; the gates load that model’s rules.</li>
            <li>Q4 reads the label and checks it is the one for the model being built.</li>
            <li>A wrong label raises a Q4 critical and the units since the changeover are re-inspected.</li>
            <li>Adding a model is a data entry here, plus a few sample images for the AI.</li>
          </ul>
        </Panel>
        <Note>Illustrative models and sizes. The real master comes from the plant’s MES at the site survey.</Note>
      </div>
    </div>
  );
}

function AuditTab({ inspection }: { inspection: InspectionState }) {
  const rows = [...inspection.actions].reverse();
  return (
    <Panel flush title="Audit log" description="Every action in the app: who did it, when, and at which gate" actions={
      <Button size="sm" onClick={() => { download('batteryiq-audit-log.csv', toCsv([['Time', 'Who', 'Gate', 'Kind', 'Action'], ...rows.map((a) => [clockAt(a.atIndex), a.by, a.gate ?? '', a.kind, a.text])])); toast({ title: 'Audit log exported', detail: `${rows.length} entries.`, tone: 'teal' }); }}>Export CSV</Button>
    }>
      <div className="max-h-[560px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0"><tr>{['Time', 'Who', 'Gate', 'Kind', 'Action'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length ? rows.map((a) => (
              <tr key={a.id}>
                <td className={`${TD} whitespace-nowrap tabular-nums`}>{clockAt(a.atIndex)}</td>
                <td className={`${TD} whitespace-nowrap`}>{a.by}</td>
                <td className={TD}>{a.gate ?? '·'}</td>
                <td className={`${TD} capitalize`}>{a.kind}</td>
                <td className={TD}>{a.text}</td>
              </tr>
            )) : <tr><td className={TD} colSpan={5}>Nothing yet. Actions taken in the app appear here.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export const SettingsView: React.FC<SettingsViewProps> = (props) => {
  const [tab, setTab] = useState<Tab>('demo');
  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Platform"
        title="Settings"
        description="The controls behind this demo, the limits that raise alarms, the plan and the roles."
        tabs={
          <>
            <HeadTab on={tab === 'demo'} onClick={() => setTab('demo')} count={DEFECTS.length + props.machines.length}>Demo controls</HeadTab>
            <HeadTab on={tab === 'limits'} onClick={() => setTab('limits')}>Limits</HeadTab>
            <HeadTab on={tab === 'plan'} onClick={() => setTab('plan')}>Plan and buffers</HeadTab>
            <HeadTab on={tab === 'models'} onClick={() => setTab('models')} count={BATTERY_MODELS.length}>Battery models</HeadTab>
            <HeadTab on={tab === 'roles'} onClick={() => setTab('roles')} count={ROLES.length}>Roles</HeadTab>
            <HeadTab on={tab === 'audit'} onClick={() => setTab('audit')} count={props.inspection.actions.length}>Audit log</HeadTab>
          </>
        }
      />
      {tab === 'demo' && <DemoTab {...props} />}
      {tab === 'limits' && <LimitsTab machines={props.machines} />}
      {tab === 'plan' && <PlanTab machines={props.machines} />}
      {tab === 'models' && <ModelsTab />}
      {tab === 'roles' && <RolesTab roleIndex={props.roleIndex} />}
      {tab === 'audit' && <AuditTab inspection={props.inspection} />}
    </div>
  );
};
