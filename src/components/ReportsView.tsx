/**
 * ReportsView.tsx
 * The shift handover, written from the line's own data (as in LineIQ): a drafted summary to sign off,
 * the shift's figures, OEE losses, biggest stops, alarms, what waits for the next shift, and the last six days.
 */

import React, { useMemo, useState } from 'react';
import { Download, PenLine, Printer, Send, Sparkles } from 'lucide-react';
import type { MachineStation, PlantAlarm, QualityGate, ShiftProductionMetrics } from '../types';
import type { InspectionState } from '../inspection/types';
import { GATE_IDS } from '../inspection/types';
import { DEFECT_BY_ID, GATES } from '../inspection/catalogue';
import { SIM_DATE, clockAt, hash } from '../inspection/engine';
import { holdBay, lineFigures, topDefect } from '../inspection/selectors';
import { SHIFTS, SHIFT_A, type ShiftId } from '../domain/plant';
import { Button, Code, ConnectedStrip, HeadTab, Meter, Note, PageHead, Panel, Prov, Segmented, Stat, Status, TD, TH } from './ui-kit';
import { toast } from './toasts';

interface ReportsViewProps {
  shiftMetrics: ShiftProductionMetrics;
  qualityGates: Record<string, QualityGate>;
  alarms: PlantAlarm[];
  inspection: InspectionState;
  lineOee: number;
  machines: MachineStation[];
  onSignOff: (text: string) => boolean;
}

const NEXT: Record<ShiftId, ShiftId> = { A: 'B', B: 'C', C: 'A' };
const n0 = (v: number) => Math.round(v).toLocaleString('en-IN');
const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;
const machineOf = (reason: string) => reason.match(/\b[A-Z]{2}-\d{2}\b/)?.[0] ?? 'Line';

/** Six past production days, each worked out from the date so the table is the same on every visit. */
function lastDays() {
  const base = new Date(2026, 9, Number(SIM_DATE.dd));
  return Array.from({ length: 6 }, (_, k) => {
    const d = new Date(base);
    d.setDate(base.getDate() - (k + 1));
    const off = d.getDay() === 0;
    const h = (salt: number) => hash(d.getDate(), salt, 7) % 1000 / 1000;
    const a = 89 + h(1) * 5, p = 92 + h(2) * 5, q = 96 + h(3) * 2.6;
    const plan = 4600;
    const made = Math.round(plan * (0.93 + h(4) * 0.06));
    return { label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), off, a, p, q, oee: (a * p * q) / 10000, plan, made };
  });
}

export const ReportsView: React.FC<ReportsViewProps> = ({ shiftMetrics, qualityGates, alarms, inspection, lineOee, machines, onSignOff }) => {
  const [pick, setPick] = useState<ShiftId>('B');
  const [signed, setSigned] = useState<Partial<Record<ShiftId, boolean>>>({});
  const live = pick === 'B';
  const past = pick === 'A';
  const open = alarms.filter((a) => a.resolvedAt == null);
  const stoppedNow = machines.filter((m) => m.status === 'stopped');
  const bay = holdBay(inspection);
  const bad = GATE_IDS.filter((g) => qualityGates[g].inAlarm);
  const week = useMemo(lastDays, []);

  // figures for the picked shift
  const f = live
    ? {
        made: shiftMetrics.actualUnits,
        plan: lineFigures(inspection).plannedToNow,
        oee: { oee: lineOee, a: avg(machines, (m) => m.availability), p: avg(machines, (m) => m.performance), q: shiftMetrics.firstPassYield },
        fpy: shiftMetrics.firstPassYield,
        stops: [...shiftMetrics.downtimePareto].filter((d) => d.minutes > 0).sort((a, b) => b.minutes - a.minutes).map((d) => ({ machine: machineOf(d.reason), reason: d.reason, minutes: d.minutes })),
      }
    : { made: SHIFT_A.produced, plan: 1600, oee: SHIFT_A.oee, fpy: SHIFT_A.fpy, stops: SHIFT_A.stops };
  const stopMin = f.stops.reduce((a, s) => a + s.minutes, 0);

  const summary = live
    ? [
        `Shift B so far: ${n0(f.made)} batteries inspected against ${n0(f.plan)} planned, ${pct(f.plan ? (f.made / f.plan) * 100 : 0, 0)} of plan.`,
        `Line OEE ${pct(f.oee.oee)}, with availability ${pct(f.oee.a)}, performance ${pct(f.oee.p)} and quality ${pct(f.oee.q)}.`,
        f.stops[0] ? `The biggest loss was ${f.stops[0].reason}, ${f.stops[0].minutes} min of ${stopMin} min stopped in all.` : 'No stops this shift.',
        `First-pass yield ${pct(f.fpy)}.`,
        bad.length
          ? bad.map((g) => {
              const top = topDefect(inspection.units, g);
              return `Gate ${g} (${GATES[g].short}) is in alarm at ${qualityGates[g].passRatePercent}% on the last 50${top ? `, mainly ${DEFECT_BY_ID[top.id].label.toLowerCase()}` : ''}.`;
            }).join(' ')
          : 'All four vision gates are on target.',
        open.filter((a) => a.severity === 'critical').length ? `Still open and critical: ${open.filter((a) => a.severity === 'critical').map((a) => a.code).join(', ')}.` : 'No critical alarm is open.',
        `${bay.length} batteries are waiting in review, rework or the reject bay.`,
      ].join(' ')
    : `Shift A: ${n0(f.made)} batteries inspected against ${n0(f.plan)} planned, ${pct((f.made / f.plan) * 100, 0)} of plan. Line OEE ${pct(f.oee.oee)}. The biggest loss was ${SHIFT_A.stops[0].reason} on ${SHIFT_A.stops[0].machine}, ${SHIFT_A.stops[0].minutes} min of ${stopMin} min stopped. First-pass yield ${pct(f.fpy)}. Two alarms were resolved and one is acknowledged and carried over.`;

  const waiting = machines
    .flatMap((m) => m.parts.map((p) => ({ code: m.code, ...p })))
    .filter((p) => p.remainingDays <= 7)
    .sort((a, b) => a.remainingDays - b.remainingDays)
    .slice(0, 5);

  const notes = inspection.actions.filter((a) => a.kind !== 'inject').slice(-6).reverse();
  const shiftInfo = SHIFTS.find((s) => s.id === pick)!;

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Analyse"
        title="Reports"
        description="The shift handover, written from the line’s own data: output against plan, OEE and its losses, stops, alarms, quality and the work waiting for the next shift."
        actions={
          <>
            <Button onClick={() => { toast({ title: 'Sent for printing', detail: `Shift ${pick} handover, A4, two pages.` }); window.print(); }}><Printer size={14} />Print</Button>
            <Button onClick={() => toast({ title: 'PDF ready', detail: `Shift ${pick} handover saved to the plant server.`, tone: 'teal' })}><Download size={14} />PDF</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<ShiftId>
          value={pick}
          onChange={setPick}
          options={SHIFTS.map((s) => ({ value: s.id, label: `Shift ${s.id}${s.id === 'B' ? ', now' : s.id === 'C' ? ', next' : ''}` }))}
        />
        <span className="text-[13px] text-slate-500">
          {shiftInfo.from} to {shiftInfo.to}{live ? `, report up to ${clockAt(inspection.next)}` : ''} · {SIM_DATE.label}
        </span>
      </div>

      {pick === 'C' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-10 text-center shadow-sm">
          <div className="text-[15px] font-semibold text-slate-900 dark:text-white">Shift C has not started</div>
          <div className="mt-1 text-[14px] text-slate-500">It starts at 22:00. Its handover fills in as the shift runs.</div>
        </div>
      ) : (
        <>
          <Panel title={`Shift ${pick} handover`} description="Written by the copilot from the line’s data; the shift in-charge checks it and signs it off" actions={<Prov k="model" label="Copilot draft" />}>
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="mt-[3px] shrink-0 text-amber-600" />
              <p className="text-[15px] leading-relaxed text-slate-900 dark:text-slate-100">{summary}</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              {signed[pick] ? (
                <Status s="pass">{`Signed off by ${shiftMetrics.shiftLead.split(' (')[0]}`}</Status>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!onSignOff(`Signed off the Shift ${pick} handover, to Shift ${NEXT[pick]}`)) return;
                    setSigned((s) => ({ ...s, [pick]: true }));
                    toast({ title: `Shift ${pick} handover signed off`, detail: `Shift ${NEXT[pick]} in-charge notified by SMS and in the app.`, tone: 'teal' });
                  }}
                >
                  <PenLine size={14} />Sign off and hand over
                </Button>
              )}
              <Button onClick={() => toast({ title: 'Sent', detail: `Shift ${pick} handover sent to the production head and the Shift ${NEXT[pick]} in-charge.`, tone: 'teal' })}><Send size={14} />Send by email</Button>
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 min-[87.5rem]:grid-cols-5">
            <Stat label="Batteries inspected" value={n0(f.made)} sub={`Plan ${n0(f.plan)}${live ? ' to now' : ''}`} prov="plc" />
            <Stat label="Line OEE" value={pct(f.oee.oee)} sub={`A ${pct(f.oee.a, 0)} · P ${pct(f.oee.p, 0)} · Q ${pct(f.oee.q, 0)}`} prov="computed" tone="teal" />
            <Stat label="Stopped" value={`${stopMin} min`} sub={`${f.stops.length} stops on ${new Set(f.stops.map((s) => s.machine)).size} stations`} prov="plc" />
            <Stat label="First-pass" value={pct(f.fpy)} sub={live ? `${GATE_IDS.reduce((a, g) => a + qualityGates[g].rejectCount, 0)} rejected at the four gates` : '41 rejected at the four gates'} prov="computed" tone={f.fpy < 95 ? 'amber' : 'teal'} />
            <Stat label="Alarms" value={live ? open.length : SHIFT_A.alarms.length} sub={live ? `${open.filter((a) => a.acknowledged).length} acknowledged, ${open.filter((a) => !a.acknowledged).length} not yet` : '2 resolved, 1 carried over'} prov="model" />
          </div>

          <div className="grid items-stretch gap-5 xl:grid-cols-2">
              <Panel className="h-full" title="OEE losses" description="Where the shift's planned time went" actions={<Prov k="computed" compact />}>
                <div className="space-y-3.5">
                  {([['Availability', f.oee.a, 'Stops and changeovers'], ['Performance', f.oee.p, 'Slow cycles and small stops'], ['Quality', f.oee.q, 'Batteries held or rejected']] as const).map(([k, v, hint]) => (
                    <div key={k}>
                      <div className="flex justify-between text-[13.5px]"><span className="text-slate-600 dark:text-slate-300">{k} <span className="text-slate-400">· {hint}</span></span><span className="font-semibold tabular-nums">{pct(v)}</span></div>
                      <Meter className="mt-1.5" value={v} max={100} tone={v < 90 ? 'amber' : 'teal'} />
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel className="h-full" title="Biggest stops" description="Largest first" flush actions={<Prov k="plc" compact />}>
                <table className="w-full">
                  <tbody>
                    {f.stops.map((r) => (
                      <tr key={r.reason}>
                        <td className={`${TD} whitespace-nowrap`}><Code>{r.machine}</Code></td>
                        <td className={TD}>{r.reason}</td>
                        <td className={`${TD} text-right font-semibold whitespace-nowrap`}>{r.minutes} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
          </div>

          <div className="grid items-stretch gap-5 xl:grid-cols-2">
            <Panel className="h-full" title="Alarms in the shift" description="Raised this shift, or still open from before" flush>
              {live
                ? alarms.slice(0, 8).map((a) => (
                    <a key={a.id} href={a.gate ? `#/quality_gates/${a.gate}/live` : `#/alarms`} className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-2.5 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[11.5px] font-bold uppercase ${a.severity === 'critical' ? 'bg-rose-100 text-rose-700' : a.severity === 'major' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{a.severity}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold leading-snug text-slate-900 dark:text-white">{a.machineName}</span>
                        <span className="mt-0.5 block text-[12.5px] text-slate-500">{a.code} · {a.acknowledged ? `acknowledged by ${a.acknowledgedBy}` : 'not acknowledged'}</span>
                      </span>
                      {a.resolvedAt != null ? <Status s="pass">Resolved</Status> : a.acknowledged ? <Status s="near">Acknowledged</Status> : <Status s="fail">Open</Status>}
                    </a>
                  ))
                : SHIFT_A.alarms.map((a) => (
                    <div key={a.code} className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-2.5 last:border-b-0">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold leading-snug text-slate-900 dark:text-white">{a.title}</span>
                        <span className="mt-0.5 block text-[12.5px] text-slate-500">{a.code} · {a.at} · {a.who}</span>
                      </span>
                      {a.state === 'Resolved' ? <Status s="pass">Resolved</Status> : <Status s="near">Acknowledged</Status>}
                    </div>
                  ))}
            </Panel>
            <Panel className="h-full" title={`Waiting for Shift ${NEXT[pick]}`} description="Parts due within a week" flush>
              {waiting.length ? waiting.map((w) => (
                <a key={`${w.code}-${w.partName}`} href={`#/machine/${w.code}`} className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-2.5 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Code>{w.code}</Code>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{w.partName}</div>
                    <div className="text-[12.5px] text-slate-500">{w.failureMode}</div>
                  </div>
                  <span className={`text-[12.5px] font-semibold ${w.remainingDays <= 3 ? 'text-rose-600' : 'text-slate-600'}`}>{w.remainingDays} d</span>
                </a>
              )) : <div className="px-5 py-6 text-[13.5px] text-slate-500">Nothing due this week. Every part has more than a week of life left.</div>}
            </Panel>
          </div>

          <Panel title="Carried into the next shift" description="What is still running its course, and the notes left for it" flush>
              <div className="grid divide-y divide-slate-100 dark:divide-slate-800 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="px-5 py-3.5">
                <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Stopped now</div>
                {live && stoppedNow.length ? stoppedNow.map((m) => <div key={m.code} className="text-[13.5px]"><Code>{m.code}</Code> {m.statusReason}</div>) : <div className="text-[13.5px] text-slate-500">Every station is running.</div>}
              </div>
              <div className="px-5 py-3.5">
                <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-400">In the hold bay</div>
                <div className="text-[13.5px] text-slate-700 dark:text-slate-300">
                  {live ? `${bay.filter((x) => x.kind === 'review').length} to review, ${bay.filter((x) => x.kind === 'rework').length} in rework, ${bay.filter((x) => x.kind === 'reject').length} in the reject bay.` : 'Cleared at the end of the shift.'}
                </div>
              </div>
              <div className="px-5 py-3.5">
                <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Notes and actions</div>
                {live && notes.length ? (
                  <ol className="flex flex-col gap-1.5">
                    {notes.map((n) => (
                      <li key={n.id}>
                        <div className="text-[12.5px] text-slate-500">{clockAt(n.atIndex)} · {n.by}</div>
                        <div className="text-[13.5px] text-slate-800 dark:text-slate-200">{n.text}</div>
                      </li>
                    ))}
                  </ol>
                ) : <div className="text-[13.5px] text-slate-500">{live ? 'No notes yet. Actions taken in the app collect here.' : 'No notes left by Shift A.'}</div>}
              </div>
              </div>
            </Panel>
        </>
      )}

      <Panel title="The last six days" description="Each production day from 06:00, for the daily report" flush actions={<Prov k="computed" compact />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead><tr>{['Day', 'Inspected', 'Plan', 'Line OEE', 'Availability', 'Performance', 'Quality'].map((h, i) => <th key={h} className={`${TH} ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
            <tbody>
              {week.map((w) => (
                <tr key={w.label}>
                  {w.off ? <td className={`${TD} text-slate-400`} colSpan={7}>{w.label} · Weekly off</td> : (
                    <>
                      <td className={TD}>{w.label}</td>
                      <td className={`${TD} text-right font-semibold tabular-nums`}>{n0(w.made)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{n0(w.plan)}</td>
                      <td className={`${TD} text-right font-semibold tabular-nums`}>{pct(w.oee)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{pct(w.a)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{pct(w.p)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{pct(w.q)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Note>The handover is a draft until the shift in-charge signs it. Figures come from the PLC counts, the stop reasons on the HMI and the four vision gates. Earlier shifts and days are illustrative in this demo.</Note>
      <ConnectedStrip ids={['CN-MES', 'CN-PLC', 'CN-CMMS', 'CN-QMS']} />
    </div>
  );
};

function avg(ms: MachineStation[], f: (m: MachineStation) => number) {
  return ms.reduce((a, m) => a + f(m), 0) / Math.max(ms.length, 1);
}
