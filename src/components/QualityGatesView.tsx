/**
 * QualityGatesView.tsx
 * The four AI vision gates (Q1 to Q4): live camera frame for the last battery, the client's defect
 * checklist with counts, SPC X-bar/R charts, the review queue and hold bay, and lot tracing.
 * Everything is read from the one inspection engine, so it agrees with every other page.
 */

import React, { useMemo, useState } from 'react';
import { Camera, CheckCircle2, ChevronRight, RotateCcw, ShieldAlert, Wrench, Zap } from 'lucide-react';
import { PlantAlarm } from '../types';
import { DEFECT_BY_ID, GATES, MEASURE_BY_KEY, defectsOf, measuresOf } from '../inspection/catalogue';
import { clockLabel, minuteOf } from '../inspection/engine';
import type { InspectionAction } from '../inspection/engine';
import { ageLabel } from '../inspection/alarms';
import { allGateStats, defectCounts, holdBay, resultsAt, spcChart } from '../inspection/selectors';
import type { GateId, InspectionState } from '../inspection/types';
import { GATE_IDS } from '../inspection/types';
import { BatteryRender } from './quality/BatteryRender';
import { TracePanel } from './quality/TracePanel';
import { XbarChart } from './quality/XbarChart';
import { DecisionChip, SeverityText, Tab, card, shortSerial } from './quality/ui';

export type GateSection = 'live' | 'defects' | 'spc' | 'queues' | 'trace';
export const GATE_SECTIONS: { id: GateSection; label: string }[] = [
  { id: 'live', label: 'Live inspection' },
  { id: 'defects', label: 'Defect checklist' },
  { id: 'spc', label: 'SPC' },
  { id: 'queues', label: 'Review & hold bay' },
  { id: 'trace', label: 'Trace' },
];

interface Props {
  state: InspectionState;
  alarms: PlantAlarm[];
  dispatch: React.Dispatch<InspectionAction>;
  gate: GateId;
  section: GateSection;
  onNavigate: (gate: GateId, section: GateSection) => void;
  onAcknowledgeAlarm: (alarmId: string) => void;
  onOpenMachine: (code: string) => void;
}

const OPERATOR = 'Shift In-Charge (Demo)';

export const QualityGatesView: React.FC<Props> = ({ state, alarms, dispatch, gate, section, onNavigate, onAcknowledgeAlarm, onOpenMachine }) => {
  const openGates = useMemo(() => new Set(alarms.filter((a) => a.gate && a.resolvedAt == null).map((a) => a.gate!)), [alarms]);
  const stats = useMemo(() => allGateStats(state.units, openGates), [state.units, openGates]);
  const holds = useMemo(() => holdBay(state), [state]);
  const reviewCount = holds.filter((h) => h.kind === 'review').length;
  const openAlarm = alarms.find((a) => a.gate === gate && a.resolvedAt == null);
  const openFaults = state.faults.filter((f) => f.gate === gate && f.endIndex == null);

  const [injectId, setInjectId] = useState<string>('');
  const [pinned, setPinned] = useState<number | null>(null);

  const corrective = () => {
    const fix = openAlarm?.recommendedFix ?? 'Operator checked the station and re-ran the golden-sample check.';
    if (openFaults.length) {
      for (const f of openFaults) dispatch({ type: 'endFault', faultId: f.id, by: OPERATOR, note: `Corrective action at ${gate}: ${fix}` });
    } else {
      dispatch({ type: 'note', gate, by: OPERATOR, text: `Corrective action at ${gate}: ${fix}` });
    }
    if (openAlarm && !openAlarm.acknowledged) onAcknowledgeAlarm(openAlarm.id);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`${card} p-4 flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600 dark:text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">AI Vision Quality Gates</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-cyan-950 text-emerald-700 dark:text-cyan-400 border border-emerald-200 dark:border-cyan-500/40">Q1 · Q2 · Q3 · Q4</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Every battery passes the four gates in order. A reject or rework stops at the gate where it was found, and the numbers on this page are counted from those batteries.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={injectId} onChange={(e) => setInjectId(e.target.value)} aria-label="Defect to inject"
            className="max-w-[260px] px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="">Inject a fault at {gate}…</option>
            {defectsOf(gate).map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          <button
            disabled={!injectId}
            onClick={() => { dispatch({ type: 'inject', gate, defectId: injectId }); setInjectId(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" /> Inject
          </button>
          <button
            onClick={() => dispatch({ type: 'clearFaults', by: OPERATOR })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear faults
          </button>
        </div>
      </div>

      {/* Gate cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {GATE_IDS.map((g) => {
          const st = stats[g];
          const sel = g === gate;
          const last = resultsAt(state.units, g).slice(-30);
          return (
            <button
              key={g}
              onClick={() => onNavigate(g, section)}
              className={`text-left p-4 rounded-xl border transition-all shadow-sm ${sel ? 'bg-emerald-50/50 dark:bg-slate-800/90 border-emerald-500 dark:border-cyan-500 ring-1 ring-emerald-500 dark:ring-cyan-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-base text-slate-900 dark:text-white">{g}</span>
                <span className={`text-[12.5px] px-2 py-0.5 rounded-full border ${st.inAlarm ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/60 font-bold' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40'}`}>
                  {st.inAlarm ? 'ALARM' : 'NOMINAL'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{GATES[g].short}</p>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-[12.5px] text-slate-400">LAST 50</span>
                  <div className={`text-lg font-bold ${st.inAlarm ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{st.rollingPassRate}%</div>
                </div>
                <div className="text-right text-[12.5px] text-slate-500 dark:text-slate-400">
                  <div>Shift {st.shiftPassRate}%</div>
                  <div>{st.inspected} seen</div>
                </div>
              </div>
              <div className="mt-2 flex gap-[2px]" aria-label="Last 30 calls">
                {last.map(({ unit, res }) => (
                  <span key={unit.index} className={`h-3 flex-1 rounded-[1px] ${res.decision === 'pass' ? 'bg-emerald-400/70' : res.decision === 'review' ? 'bg-sky-400' : res.decision === 'rework' ? 'bg-amber-400' : 'bg-rose-500'}`} />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[12.5px] text-slate-500">
                <span>Rework {st.rework}</span><span>Reject {st.reject}</span><span>Review {st.review}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Alarm + corrective action */}
      {openAlarm && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
              <ShieldAlert className="w-4 h-4" /> {openAlarm.code} · {openAlarm.severity.toUpperCase()} · {ageLabel(openAlarm.raisedAt ?? 0, state.next)}
              <span className="text-[12.5px] px-1.5 py-0.5 rounded bg-rose-600 text-white">
                {openAlarm.acknowledged ? 'ACKNOWLEDGED' : `TOLD: ${openAlarm.escalation.replace(/_/g, ' ').toUpperCase()}`}
              </span>
            </div>
            <div className="flex gap-2">
              {!openAlarm.acknowledged && <button onClick={() => onAcknowledgeAlarm(openAlarm.id)} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-medium">Acknowledge</button>}
              <button onClick={corrective} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> Apply corrective action</button>
            </div>
          </div>
          <p className="text-slate-700 dark:text-slate-300">{openAlarm.cause}</p>
          <p className="text-slate-600 dark:text-slate-400"><b>Fix:</b> {openAlarm.recommendedFix}{' '}
            {openAlarm.suspect && openAlarm.suspect !== 'CONTAINER-LOT' && (
              <button className="underline decoration-dotted font-semibold" onClick={() => onOpenMachine(openAlarm.suspect!)}>Open {openAlarm.suspect}</button>
            )}
          </p>
        </div>
      )}

      {/* Sections */}
      <div className="flex flex-wrap gap-2">
        {GATE_SECTIONS.map((s) => (
          <Tab key={s.id} active={section === s.id} onClick={() => onNavigate(gate, s.id)} badge={s.id === 'queues' ? reviewCount : undefined}>{s.label}</Tab>
        ))}
        <span className="ml-auto text-[12.5px] text-slate-500 self-center">{GATES[gate].title}</span>
      </div>

      {section === 'live' && <LiveSection state={state} gate={gate} pinned={pinned} setPinned={setPinned} />}
      {section === 'defects' && <DefectsSection state={state} gate={gate} dispatch={dispatch} onOpenMachine={onOpenMachine} />}
      {section === 'spc' && <SpcSection state={state} gate={gate} />}
      {section === 'queues' && <QueuesSection state={state} dispatch={dispatch} />}
      {section === 'trace' && <TracePanel state={state} focusGate={gate} onOpenMachine={onOpenMachine} />}
    </div>
  );
};

// ---------- live ----------

const LiveSection: React.FC<{ state: InspectionState; gate: GateId; pinned: number | null; setPinned: (n: number | null) => void }> = ({ state, gate, pinned, setPinned }) => {
  const rs = resultsAt(state.units, gate);
  const recent = rs.slice(-14).reverse();
  const cur = (pinned != null ? rs.find((x) => x.unit.index === pinned) : undefined) ?? rs[rs.length - 1];
  if (!cur) return null;
  const { unit, res } = cur;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className={`lg:col-span-2 ${card} p-4 space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{GATES[gate].title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{GATES[gate].description}</p>
          </div>
          {pinned != null && <button onClick={() => setPinned(null)} className="px-3 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">Follow live</button>}
        </div>

        <div className="relative bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
          <BatteryRender gate={gate} unit={unit} result={res} className="w-full h-auto max-h-[420px]" />
          <div className="absolute top-2 right-3 text-[12.5px] text-right text-slate-400 pointer-events-none space-y-0.5">
            <div>UNIT {unit.serial}</div>
            <div>{unit.modelCode} · {clockLabel(unit.minute)}</div>
            <div className={res.decision === 'pass' ? 'text-emerald-400' : res.decision === 'review' ? 'text-sky-300' : 'text-rose-400 font-bold'}>
              AI CONFIDENCE {(res.confidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {res.detections.length > 0 ? (
          <div className="space-y-2">
            {res.detections.map((d) => {
              const def = DEFECT_BY_ID[d.defectId];
              return (
                <div key={d.defectId} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between gap-2 font-semibold text-slate-800 dark:text-slate-200">
                    <span>{def.label}</span>
                    <span className="flex items-center gap-2"><SeverityText severity={def.severity} /><DecisionChip decision={res.decision} /></span>
                  </div>
                  <p className="text-slate-500">Likely cause: {def.cause}</p>
                  <p className="text-slate-500">Look at: <b>{def.suspect}</b> · {def.checklist}</p>
                </div>
              );
            })}
            {res.decision === 'review' && <p className="text-xs text-sky-600 dark:text-sky-300">Confidence is under the review threshold, so an operator confirms this one in Review & hold bay.</p>}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" /> No defect found. Everything on the checklist for this gate is within limits.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
            <div className="text-[12.5px] uppercase text-slate-400 mb-1.5">Measurements vs specification</div>
            <table className="w-full text-[12.5px]">
              <tbody>
                {measuresOf(gate).map((m) => {
                  const v = res.measures[m.key];
                  const ok = v >= m.lsl && v <= m.usl;
                  return (
                    <tr key={m.key} className="border-t border-slate-200/70 dark:border-slate-800 first:border-0">
                      <td className="py-1 text-slate-600 dark:text-slate-300">{m.label}</td>
                      <td className={`text-right font-bold ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{v.toFixed(m.decimals)} {m.unit}</td>
                      <td className="text-right text-slate-400 pl-2">{m.lsl}–{m.usl}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {res.ocr && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950 text-[12.5px] space-y-1">
              <div className="text-[12.5px] uppercase text-slate-400 mb-1">OCR and barcode</div>
              {[['Model', res.ocr.modelRead, res.ocr.modelExpected], ['Mfg date', res.ocr.dateRead, res.ocr.dateExpected]].map(([k, read, exp]) => (
                <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className={read === exp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 font-bold'}>{read}{read !== exp && ` ≠ ${exp}`}</span></div>
              ))}
              <div className="flex justify-between"><span className="text-slate-500">QR / barcode grade</span><span className={['A', 'B', 'C'].includes(res.ocr.barcodeGrade) ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 font-bold'}>{res.ocr.barcodeGrade}</span></div>
            </div>
          )}
        </div>
      </div>

      <div className={`${card} p-4 space-y-2`}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Last batteries at {gate}</h3>
        <p className="text-[12.5px] text-slate-500">Click one to look at its frame.</p>
        <div className="space-y-1.5">
          {recent.map(({ unit: u, res: r }) => (
            <button key={u.index} onClick={() => setPinned(u.index)}
              className={`w-full flex items-center justify-between gap-2 p-2 rounded-lg border text-xs text-left ${u.index === unit.index ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300'}`}>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 dark:text-white">{shortSerial(u.serial)}</div>
                <div className="text-[12.5px] text-slate-500 truncate">{r.detections.length ? DEFECT_BY_ID[r.detections[0].defectId].label : 'No defect'}</div>
              </div>
              <DecisionChip decision={r.decision} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------- defect checklist ----------

const DefectsSection: React.FC<{ state: InspectionState; gate: GateId; dispatch: React.Dispatch<InspectionAction>; onOpenMachine: (c: string) => void }> = ({ state, gate, dispatch, onOpenMachine }) => {
  const counts = useMemo(() => defectCounts(state.units, gate), [state.units, gate]);
  const recent = useMemo(() => defectCounts(state.units, gate, 50), [state.units, gate]);
  const max = Math.max(1, ...Object.values(counts));
  const active = new Set(state.faults.filter((f) => f.endIndex == null).map((f) => f.defectId));
  return (
    <div className="space-y-4">
      {GATES[gate].checklist.map((line) => {
        const defs = defectsOf(gate).filter((d) => d.checklist === line);
        const total = defs.reduce((a, d) => a + counts[d.id], 0);
        return (
          <div key={line} className={`${card} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{line}</h3>
              <span className="text-[12.5px] text-slate-500">{total} found this shift</span>
            </div>
            <div className="space-y-2">
              {defs.map((d) => (
                <div key={d.id} className="grid grid-cols-12 items-center gap-2 text-xs">
                  <div className="col-span-12 md:col-span-5">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{d.label}</div>
                    <div className="text-[12.5px] text-slate-500 flex gap-2 items-center"><SeverityText severity={d.severity} /> · {d.action === 'reject' ? 'Reject' : 'Rework'} · look at
                      {d.suspect === 'CONTAINER-LOT' ? <b> container lot</b> : <button className="underline decoration-dotted font-bold" onClick={() => onOpenMachine(d.suspect)}>{d.suspect}</button>}
                    </div>
                  </div>
                  <div className="col-span-9 md:col-span-5 flex items-center gap-2">
                    <div className="h-2 flex-1 bg-slate-100 dark:bg-slate-800 rounded"><div className="h-2 rounded bg-rose-500" style={{ width: `${(counts[d.id] / max) * 100}%` }} /></div>
                    <span className="w-14 text-right text-slate-700 dark:text-slate-300">{counts[d.id]} <span className="text-slate-400">({recent[d.id]})</span></span>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-right">
                    {active.has(d.id)
                      ? <span className="text-[12.5px] font-bold text-rose-600">FAULT ON</span>
                      : <button onClick={() => dispatch({ type: 'inject', gate, defectId: d.id })} className="text-[12.5px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Inject</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-[12.5px] text-slate-500">Numbers are this shift; the bracket is the last 50 calls at the gate.</p>
    </div>
  );
};

// ---------- SPC ----------

const SpcSection: React.FC<{ state: InspectionState; gate: GateId }> = ({ state, gate }) => {
  const ms = measuresOf(gate);
  const [key, setKey] = useState(ms[0].key);
  const mk = ms.find((m) => m.key === key) ?? ms[0];
  const chart = useMemo(() => spcChart(state.units, gate, mk.key), [state.units, gate, mk.key]);
  const tone = (v: number) => (v >= 1.33 ? 'text-emerald-600 dark:text-emerald-400' : v >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400');
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className={`lg:col-span-2 ${card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          {ms.map((m) => (
            <button key={m.key} onClick={() => setKey(m.key)} className={`px-2.5 py-1 text-[12.5px] rounded border ${m.key === mk.key ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{m.label}</button>
          ))}
        </div>
        <XbarChart chart={chart} />
      </div>
      <div className="space-y-4">
        <div className={`${card} p-4 space-y-2 text-xs`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Capability</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-[12.5px] text-slate-400">Cp</div><div className={`text-2xl font-bold ${tone(chart.cp)}`}>{chart.cp}</div></div>
            <div><div className="text-[12.5px] text-slate-400">Cpk</div><div className={`text-2xl font-bold ${tone(chart.cpk)}`}>{chart.cpk}</div></div>
          </div>
          <div className="text-slate-500">Spec {MEASURE_BY_KEY[mk.key].lsl} – {MEASURE_BY_KEY[mk.key].usl} {mk.unit}</div>
          <p className="text-[12.5px] text-slate-500">Control limits come from the process capability study, not from the last few points. Cpk below 1.33 means the process is not safely inside its limits.</p>
        </div>
        <div className={`${card} p-4 space-y-2 text-xs`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Rule checks (latest subgroup)</h3>
          {chart.violations.length ? chart.violations.map((v) => <div key={v} className="text-rose-600 dark:text-rose-400 font-medium">• {v}</div>) : <div className="text-emerald-600 dark:text-emerald-400">In control. No rule broken.</div>}
          <p className="text-[12.5px] text-slate-500">Western Electric rules: one point beyond 3σ; two of three beyond 2σ; four of five beyond 1σ; eight in a row on one side.</p>
        </div>
      </div>
    </div>
  );
};

// ---------- review queue and hold bay ----------

const QueuesSection: React.FC<{ state: InspectionState; dispatch: React.Dispatch<InspectionAction> }> = ({ state, dispatch }) => {
  const holds = useMemo(() => holdBay(state), [state]);
  const review = holds.filter((h) => h.kind === 'review');
  const rework = holds.filter((h) => h.kind === 'rework');
  const reject = holds.filter((h) => h.kind === 'reject');
  const [how, setHow] = useState('Scrapped');
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className={`xl:col-span-2 ${card} p-4 space-y-3`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Operator review queue <span className="text-slate-400">({review.length})</span></h3>
          <span className="text-[12.5px] text-slate-500">Camera was not sure. A call left open for 40 batteries is treated as a defect.</span>
        </div>
        {review.length === 0 && <p className="text-xs text-slate-500">Nothing waiting. The camera was confident on every recent call.</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {review.map(({ unit, gate, age }) => {
            const res = unit.results.find((r) => r.gate === gate)!;
            return (
              <div key={unit.index} className="rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 p-2 space-y-2">
                <BatteryRender gate={gate} unit={unit} result={res} className="w-full h-auto rounded bg-slate-950" />
                <div className="text-[12.5px] flex justify-between"><span className="font-bold">{shortSerial(unit.serial)} · {gate}</span><span className="text-slate-500">{age} batteries ago · {(res.confidence * 100).toFixed(0)}% sure</span></div>
                <div className="text-[12.5px] text-slate-600 dark:text-slate-300">{res.detections.map((d) => DEFECT_BY_ID[d.defectId].label).join(', ')}</div>
                <div className="flex gap-2">
                  <button onClick={() => dispatch({ type: 'review', unitIndex: unit.index, outcome: 'release', by: OPERATOR })} className="flex-1 px-2 py-1 text-xs rounded border border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950">Release (false alarm)</button>
                  <button onClick={() => dispatch({ type: 'review', unitIndex: unit.index, outcome: 'confirm', by: OPERATOR })} className="flex-1 px-2 py-1 text-xs rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold">Confirm defect</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className={`${card} p-4 space-y-2`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Rework bay <span className="text-slate-400">({rework.length})</span></h3>
          <p className="text-[12.5px] text-slate-500">Fixed by hand, then re-inspected from the next gate. The rework cell clears these on its own after 12 batteries.</p>
          {rework.slice(0, 8).map(({ unit, gate }) => (
            <div key={unit.index} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="min-w-0"><div className="font-bold">{shortSerial(unit.serial)} · {gate}</div><div className="text-[12.5px] text-slate-500 truncate">{unit.results.find((r) => r.gate === gate)?.detections.map((d) => DEFECT_BY_ID[d.defectId].label).join(', ')}</div></div>
              <button onClick={() => dispatch({ type: 'rework', unitIndex: unit.index, by: OPERATOR })} className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold shrink-0">Rework done</button>
            </div>
          ))}
          {rework.length === 0 && <p className="text-xs text-slate-500">Empty.</p>}
        </div>

        <div className={`${card} p-4 space-y-2`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Reject hold bay <span className="text-slate-400">({reject.length})</span></h3>
            <select value={how} onChange={(e) => setHow(e.target.value)} className="text-[12.5px] px-1.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
              <option>Scrapped</option><option>Returned to supplier</option><option>Downgraded to B-grade</option>
            </select>
          </div>
          {reject.slice(0, 8).map(({ unit, gate }) => (
            <div key={unit.index} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="min-w-0"><div className="font-bold">{shortSerial(unit.serial)} · {gate}</div><div className="text-[12.5px] text-slate-500 truncate">{unit.results.find((r) => r.gate === gate)?.detections.map((d) => DEFECT_BY_ID[d.defectId].label).join(', ')}</div></div>
              <button onClick={() => dispatch({ type: 'dispose', unitIndex: unit.index, how, by: OPERATOR })} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold shrink-0 flex items-center gap-1">Dispose <ChevronRight className="w-3 h-3" /></button>
            </div>
          ))}
          {reject.length === 0 && <p className="text-xs text-slate-500">Empty.</p>}
        </div>

        <div className={`${card} p-4 space-y-2`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Action log</h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {state.actions.slice(0, 14).map((a) => (
              <div key={a.id} className="text-[12.5px] text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
                <span className="text-slate-400">{clockLabelOf(a.atIndex)}</span> {a.text} <span className="text-slate-400">· {a.by}</span>
              </div>
            ))}
            {!state.actions.length && <p className="text-xs text-slate-500">No operator actions yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const clockLabelOf = (idx: number) => clockLabel(minuteOf(idx));
