/**
 * Everything the screens show about inspection is computed here from the unit list.
 */

import type { BatchTraceRecord, QualityGate, ShiftProductionMetrics } from '../types';
import {
  DEFECT_BY_ID, GATES, MEASURE_BY_KEY, MIN_ALARM_SAMPLE, ROLLING_WINDOW, TARGET_PASS_RATE, alarmLimitFailures, defectsOf, measuresOf, primaryMeasure,
} from './catalogue';
import { PLAN_PER_MIN, PLAN_PER_SHIFT, SHIFT_START_MIN, minuteOf } from './engine';
import type { GateId, GateResult, InspectionState, Unit } from './types';
import { GATE_IDS } from './types';

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

export function resultsAt(units: Unit[], gate: GateId): { unit: Unit; res: GateResult }[] {
  const out: { unit: Unit; res: GateResult }[] = [];
  for (const unit of units) {
    const res = unit.results.find((r) => r.gate === gate);
    if (res) out.push({ unit, res });
  }
  return out;
}

export interface GateStats {
  gate: GateId;
  inspected: number;
  passed: number;
  rework: number;
  reject: number;
  review: number;
  /** Pass rate over the whole shift, decided calls only. */
  shiftPassRate: number;
  /** Pass rate over the last ROLLING_WINDOW decided calls. The alarm watches the bad calls in this window against a p-chart limit. */
  rollingPassRate: number;
  /** Share of calls that sent a pass to the review queue and the operator released (camera false alarms). */
  falseAlarmRate: number;
  /** Bad calls (rework, reject) in the rolling window. */
  windowFails: number;
  inAlarm: boolean;
}

/** An alarm that is already open stays open until the window is nearly clean (limit minus 2 bad calls), so it does not flap. */
export const ALARM_CLEAR_MARGIN = 2;

export function gateStats(units: Unit[], gate: GateId, wasInAlarm = false): GateStats {
  const rs = resultsAt(units, gate);
  let passed = 0, rework = 0, reject = 0, review = 0, released = 0, reviewed = 0;
  for (const { res } of rs) {
    if (res.decision === 'pass') passed++;
    else if (res.decision === 'rework') rework++;
    else if (res.decision === 'reject') reject++;
    else review++;
    if (res.reviewed) {
      reviewed++;
      if (res.reviewed.outcome === 'release') released++;
    }
  }
  const decided = rs.filter(({ res }) => res.decision !== 'review');
  const window = decided.slice(-ROLLING_WINDOW);
  const windowFails = window.filter(({ res }) => res.decision !== 'pass').length;
  const rolling = window.length ? ((window.length - windowFails) / window.length) * 100 : 100;
  const shift = decided.length ? (passed / decided.length) * 100 : 100;
  return {
    gate,
    inspected: rs.length,
    passed, rework, reject, review,
    shiftPassRate: round(shift),
    rollingPassRate: round(rolling),
    falseAlarmRate: reviewed ? round((released / reviewed) * 100, 1) : 0,
    windowFails,
    inAlarm: window.length >= MIN_ALARM_SAMPLE && windowFails >= alarmLimitFailures(window.length) - (wasInAlarm ? ALARM_CLEAR_MARGIN : 0),
  };
}

export function allGateStats(units: Unit[], openGates: ReadonlySet<GateId> = new Set()): Record<GateId, GateStats> {
  return Object.fromEntries(GATE_IDS.map((g) => [g, gateStats(units, g, openGates.has(g))])) as Record<GateId, GateStats>;
}

export function defectCounts(units: Unit[], gate: GateId, lastN?: number): Record<string, number> {
  const rs = resultsAt(units, gate);
  const slice = lastN ? rs.slice(-lastN) : rs;
  const out: Record<string, number> = {};
  for (const d of defectsOf(gate)) out[d.id] = 0;
  for (const { res } of slice) for (const det of res.detections) out[det.defectId] = (out[det.defectId] ?? 0) + 1;
  return out;
}

export function topDefect(units: Unit[], gate: GateId, lastN = ROLLING_WINDOW): { id: string; count: number } | null {
  const counts = defectCounts(units, gate, lastN);
  const [id, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];
  return id && count > 0 ? { id, count } : null;
}

// ---------- line figures ----------

export interface LineFigures {
  produced: number;
  passedAll: number;
  inProcess: number;
  rejected: number;
  inRework: number;
  inReview: number;
  /** Batteries with no defect at any gate they reached, over those that finished or stopped. */
  firstPassYield: number;
  plannedToNow: number;
}

export function lineFigures(state: InspectionState): LineFigures {
  const { units, next } = state;
  let passedAll = 0, rejected = 0, rework = 0, review = 0, clean = 0;
  for (const u of units) {
    if (u.status === 'passed') passedAll++;
    if (u.status === 'rejected') rejected++;
    if (u.status === 'rework') rework++;
    if (u.status === 'review') review++;
    if (u.results.every((r) => r.firstPass) && u.results.length === GATE_IDS.length) clean++;
  }
  return {
    produced: next,
    passedAll,
    inProcess: 0,
    rejected,
    inRework: rework,
    inReview: review,
    firstPassYield: units.length ? round((clean / units.length) * 100, 1) : 100,
    plannedToNow: Math.floor((minuteOf(next) - SHIFT_START_MIN) * PLAN_PER_MIN),
  };
}

// ---------- hold bay ----------

export interface HoldItem { unit: Unit; gate: GateId; kind: 'rework' | 'reject' | 'review'; age: number }

export function holdBay(state: InspectionState): HoldItem[] {
  const out: HoldItem[] = [];
  for (const unit of state.units) {
    const h = unit.hold;
    if (h && !h.resolution) out.push({ unit, gate: h.gate, kind: h.kind, age: state.next - h.sinceIndex });
  }
  return out.sort((a, b) => b.unit.index - a.unit.index);
}

// ---------- SPC ----------

export const SUBGROUP = 5;
const A2 = 0.577, D3 = 0, D4 = 2.114, D2 = 2.326;

export interface SpcPoint { n: number; x: number; r: number; xOut: boolean; rOut: boolean; rules: string[] }
export interface SpcChart {
  measure: string; label: string; unit: string; decimals: number;
  mean: number; ucl: number; lcl: number; usl: number; lsl: number;
  rBar: number; rUcl: number; rLcl: number;
  points: SpcPoint[];
  cp: number; cpk: number;
  violations: string[];
}

/** Control limits come from the process capability study (mean and sigma on the spec sheet), not from the last few points. */
export function spcChart(units: Unit[], gate: GateId, measureKey: string, groups = 24): SpcChart {
  const m = MEASURE_BY_KEY[measureKey];
  const vals = resultsAt(units, gate).map(({ res }) => res.measures[measureKey]).filter((v) => v != null);
  const sg: number[][] = [];
  for (let i = vals.length - SUBGROUP; i >= 0 && sg.length < groups; i -= SUBGROUP) sg.unshift(vals.slice(i, i + SUBGROUP));
  const xb = m.sd / Math.sqrt(SUBGROUP);
  const mean = m.mean, ucl = mean + 3 * xb, lcl = mean - 3 * xb;
  const rBar = D2 * m.sd, rUcl = D4 * rBar, rLcl = D3 * rBar;
  const points: SpcPoint[] = sg.map((g, i) => {
    const x = g.reduce((a, b) => a + b, 0) / g.length;
    const r = Math.max(...g) - Math.min(...g);
    return { n: i, x, r, xOut: x > ucl || x < lcl, rOut: r > rUcl, rules: [] };
  });
  applyRules(points, mean, xb);
  // capability from the last 100 individual measurements, within-subgroup sigma
  const recent = vals.slice(-100);
  const ranges: number[] = [];
  for (let i = 0; i + SUBGROUP <= recent.length; i += SUBGROUP) {
    const g = recent.slice(i, i + SUBGROUP);
    ranges.push(Math.max(...g) - Math.min(...g));
  }
  const sigma = ranges.length ? ranges.reduce((a, b) => a + b, 0) / ranges.length / D2 : m.sd;
  const mu = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : m.mean;
  const cp = sigma > 0 ? (m.usl - m.lsl) / (6 * sigma) : 0;
  const cpk = sigma > 0 ? Math.min(m.usl - mu, mu - m.lsl) / (3 * sigma) : 0;
  const last = points[points.length - 1];
  const violations = last ? [...last.rules, ...(last.rOut ? ['Range above its limit'] : [])] : [];
  return { measure: m.key, label: m.label, unit: m.unit, decimals: m.decimals, mean, ucl, lcl, usl: m.usl, lsl: m.lsl, rBar, rUcl, rLcl, points, cp: round(cp), cpk: round(cpk), violations };
}

/** Western Electric rules 1, 2, 3 and 4 on the X-bar chart. */
function applyRules(points: SpcPoint[], mean: number, sigma: number) {
  const z = (p: SpcPoint) => (p.x - mean) / sigma;
  points.forEach((p, i) => {
    if (Math.abs(z(p)) > 3) p.rules.push('1 point beyond 3σ');
    if (i >= 2) {
      const w = points.slice(i - 2, i + 1).map(z);
      if (w.filter((v) => v > 2).length >= 2 || w.filter((v) => v < -2).length >= 2) p.rules.push('2 of 3 beyond 2σ');
    }
    if (i >= 4) {
      const w = points.slice(i - 4, i + 1).map(z);
      if (w.filter((v) => v > 1).length >= 4 || w.filter((v) => v < -1).length >= 4) p.rules.push('4 of 5 beyond 1σ');
    }
    if (i >= 7) {
      const w = points.slice(i - 7, i + 1).map(z);
      if (w.every((v) => v > 0) || w.every((v) => v < 0)) p.rules.push('8 in a row on one side');
    }
  });
}

// ---------- root cause ----------

export interface Suspect { field: string; value: string; share: number; population: number; lift: number; count: number }

const ATTRS: { field: string; get: (u: Unit) => string }[] = [
  { field: 'HS-01 platen', get: (u) => String(u.tooling.platen) },
  { field: 'IW-01 weld head', get: (u) => u.tooling.weldHead },
  { field: 'CS-01 strap mould', get: (u) => String(u.tooling.strapMould) },
  { field: 'Container lot', get: (u) => u.lots.container },
  { field: 'Grid alloy lot', get: (u) => u.lots.alloy },
  { field: 'Lead oxide lot', get: (u) => u.lots.oxide },
  { field: 'Operator', get: (u) => u.operator },
  { field: 'Model', get: (u) => u.modelCode },
];

/** P(X >= k) for X ~ Binomial(n, p). */
export function binomialTail(n: number, k: number, p: number): number {
  if (k <= 0) return 1;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let logPmf = n * Math.log(1 - p); // i = 0
  let tail = 0;
  for (let i = 0; i <= n; i++) {
    if (i >= k) tail += Math.exp(logPmf);
    logPmf += Math.log((n - i) / (i + 1)) + Math.log(p / (1 - p));
  }
  return Math.min(1, tail);
}

/** At least this many defective units before any tool or lot is named, so a chance cluster is not blamed. */
export const MIN_SUSPECT_COUNT = 5;

/**
 * Which tooling or lot the defective units have in common, compared with how often it appears among
 * the batteries built over the same period. A suspect is only named when the cluster is very unlikely
 * to be chance (binomial test, corrected for the number of tools and lots compared).
 */
export function rootCause(units: Unit[], gate: GateId, defectId?: string, lastN = 200): Suspect[] {
  const seen = units.slice(-lastN).filter((u) => u.results.some((r) => r.gate === gate));
  const isBad = (u: Unit) => u.results.some((r) => r.gate === gate && r.detections.some((d) => !defectId || d.defectId === defectId));
  const firstBad = seen.find(isBad);
  if (!firstBad) return [];
  // Compare with what was running over the same period, so a lot or operator that simply
  // changed at that time is not blamed for a defect that started on one tool.
  const recent = seen.filter((u) => u.index >= firstBad.index);
  const bad = recent.filter(isBad);
  if (bad.length < MIN_SUSPECT_COUNT) return [];
  const out: (Suspect & { p: number })[] = [];
  let comparisons = 0;
  for (const a of ATTRS) {
    const popCount = new Map<string, number>();
    const badCount = new Map<string, number>();
    for (const u of recent) popCount.set(a.get(u), (popCount.get(a.get(u)) ?? 0) + 1);
    for (const u of bad) badCount.set(a.get(u), (badCount.get(a.get(u)) ?? 0) + 1);
    comparisons += popCount.size;
    for (const [value, count] of badCount) {
      const share = count / bad.length;
      const population = (popCount.get(value) ?? 0) / recent.length;
      if (count >= MIN_SUSPECT_COUNT && share > population) {
        out.push({ field: a.field, value, share: round(share * 100, 0), population: round(population * 100, 0), lift: round(share / Math.max(population, 0.01), 1), count, p: binomialTail(bad.length, count, population) });
      }
    }
  }
  return out
    .filter((s) => s.p * comparisons < 0.05 && s.lift >= 1.5)
    .sort((a, b) => a.p - b.p)
    .slice(0, 4)
    .map(({ p: _p, ...s }) => s);
}

// ---------- adapters for the existing screens ----------

export function buildQualityGates(state: InspectionState, openGates: ReadonlySet<GateId> = new Set()): Record<string, QualityGate> {
  const stats = allGateStats(state.units, openGates);
  const out: Record<string, QualityGate> = {};
  for (const gate of GATE_IDS) {
    const st = stats[gate];
    const meta = GATES[gate];
    const pm = primaryMeasure(gate);
    const spc = spcChart(state.units, gate, pm.key, 7);
    const defs = Object.entries(defectCounts(state.units, gate, 200))
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ defectType: DEFECT_BY_ID[id].label, count, severity: DEFECT_BY_ID[id].severity }));
    const rs = resultsAt(state.units, gate);
    const lastBad = [...rs].reverse().find(({ res }) => res.decision === 'reject' || res.decision === 'rework');
    const holds = holdBay(state).filter((h) => h.gate === gate && h.kind !== 'rework').length;
    out[gate] = {
      id: gate,
      title: meta.title,
      stationName: meta.station,
      description: meta.description,
      inspectedCount: st.inspected,
      passedCount: st.passed,
      reworkCount: st.rework,
      rejectCount: st.reject,
      passRatePercent: st.rollingPassRate,
      targetPassRatePercent: TARGET_PASS_RATE,
      inAlarm: st.inAlarm,
      holdCount: holds,
      escalationLevel: st.inAlarm ? 'shift_in_charge' : 'resolved',
      lastRejectBatch: lastBad?.unit.lots.container ?? '-',
      lastRejectUnitId: lastBad?.unit.serial ?? '-',
      recentDefects: defs,
      spcData: {
        characteristic: pm.label,
        unit: pm.unit,
        mean: round(spc.points.length ? spc.points.reduce((a, p) => a + p.x, 0) / spc.points.length : pm.mean, pm.decimals),
        range: round(spc.rBar, 2),
        ucl: round(spc.ucl, pm.decimals + 1),
        lcl: round(spc.lcl, pm.decimals + 1),
        usl: pm.usl,
        lsl: pm.lsl,
        cp: spc.cp,
        cpk: spc.cpk,
        recentSamples: spc.points.slice(-7).map((p) => round(p.x, pm.decimals + 1)),
      },
      shiftPassRatePercent: st.shiftPassRate,
      reviewCount: st.review,
    };
  }
  return out;
}

export function buildShiftMetrics(state: InspectionState, base: ShiftProductionMetrics): ShiftProductionMetrics {
  const f = lineFigures(state);
  const hold = holdBay(state).filter((h) => h.kind !== 'rework').length;
  const rejects = state.units.filter((u) => u.status === 'rejected').length;
  const minutes = Math.max(0, minuteOf(state.next) - SHIFT_START_MIN);
  const hourly = [];
  const hours = Math.ceil(minutes / 60);
  for (let h = 0; h < hours; h++) {
    const from = SHIFT_START_MIN + h * 60;
    const inHour = state.units.filter((u) => u.minute >= from && u.minute < from + 60);
    const out = inHour.filter((u) => u.status === 'passed').length;
    const label = `${String(Math.floor(from / 60)).padStart(2, '0')}:00`;
    hourly.push({ hourLabel: label, target: 200, actual: out });
  }
  const pareto = base.downtimePareto.map((d) => (d.category === 'quality_hold' ? { ...d, minutes: Math.round(hold * 1.5) } : d));
  return {
    ...base,
    plannedUnits: PLAN_PER_SHIFT,
    actualUnits: f.produced,
    goodUnits: f.passedAll,
    rejectedUnits: rejects,
    firstPassYield: f.firstPassYield,
    hourlyOutput: hourly.length ? hourly : base.hourlyOutput,
    downtimePareto: pareto,
  };
}

export function buildTraceRecords(state: InspectionState, limit = 60): BatchTraceRecord[] {
  const interesting = state.units.filter((u) => u.results.some((r) => !r.firstPass));
  const recent = interesting.slice(-limit).reverse();
  return recent.map((u) => {
    const bad = u.results.find((r) => !r.firstPass);
    const d = bad ? DEFECT_BY_ID[bad.detections[0].defectId] : undefined;
    const status = u.status === 'passed' ? (u.results.some((r) => r.reworked || r.reviewed) ? 'rework' : 'passed') : u.status === 'rejected' ? 'quarantined' : 'rework';
    return {
      unitId: u.serial,
      batchId: u.lots.container,
      producedTimestamp: `${clock(u.minute)} today`,
      processLine: 'lead_acid',
      primaryDefect: d ? `${d.label} (${bad!.gate} ${bad!.decision})` : undefined,
      slurryBatchOrLeadOxideLot: u.lots.oxide,
      foilOrGridAlloyLot: u.lots.alloy,
      casingMouldOrContainerLot: u.lots.container,
      assemblyMachine: `CS-01 mould ${u.tooling.strapMould} · IW-01 head ${u.tooling.weldHead} · HS-01 platen ${u.tooling.platen}`,
      curingOrFormationBathId: u.lots.bath,
      operatorId: u.operator,
      shift: u.shift,
      status,
      unitIndex: u.index,
      gate: bad?.gate,
      defectIds: bad ? bad.detections.map((x) => x.defectId) : [],
      model: u.modelCode,
    };
  });
}

function clock(minute: number) {
  const m = Math.floor(minute);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export { measuresOf };
