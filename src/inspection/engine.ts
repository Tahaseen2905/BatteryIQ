/**
 * Seeded inspection engine. A unit's whole story (lots, tooling, every gate result) is a pure
 * function of (seed, unit index, faults active at that index), so runs are repeatable and the
 * same unit always shows the same picture on every page.
 */

import {
  DEFECTS, DEFECT_BY_ID, MEASURES, MODELS, NOMINAL_SCALE, REVIEW_CONFIDENCE, defectsOf, measuresOf,
} from './catalogue';
import type {
  ActionLog, Decision, Detection, Fault, GateId, GateResult, InspectionState, OcrReading, Unit,
} from './types';
import { GATE_IDS } from './types';

// ---------- seeded random ----------

export function hash(...n: number[]): number {
  let h = 2166136261;
  for (const x of n) {
    h ^= x | 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  const u = Math.max(r(), 1e-9);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------- plant calendar ----------

/** Shift B runs 14:00 to 22:00 on the simulated day. */
export const SHIFT_START_MIN = 14 * 60;
/** About 200 batteries an hour reach the first gate. */
export const MIN_PER_UNIT = 0.3;
export const PLAN_PER_SHIFT = 1600;
export const PLAN_PER_MIN = PLAN_PER_SHIFT / (8 * 60);
export const SIM_DATE = { dd: '28', mm: '10', yy: '26', label: 'Wed, 28 Oct 2026' };

export const minuteOf = (index: number) => SHIFT_START_MIN + index * MIN_PER_UNIT;

export function clockLabel(minute: number): string {
  const m = Math.floor(minute) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function clockAt(next: number): string {
  return clockLabel(minuteOf(next));
}

// ---------- unit creation ----------

const OPERATORS = ['OP-4182 (K. Verma)', 'OP-3091 (S. Nair)', 'OP-2018 (A. Patil)', 'OP-2740 (R. Iyer)'];

function pickModel(r: number) {
  let acc = 0;
  for (const m of MODELS) {
    acc += m.weight;
    if (r < acc) return m;
  }
  return MODELS[MODELS.length - 1];
}

export function makeUnit(seed: number, index: number): Unit {
  const r = rngFrom(hash(seed, index, 1));
  const model = pickModel(r());
  const minute = minuteOf(index);
  return {
    index,
    serial: `EXB${SIM_DATE.yy}${SIM_DATE.mm}${SIM_DATE.dd}-${String(index + 1).padStart(5, '0')}`,
    modelCode: model.code,
    modelName: model.name,
    mfgDate: `${SIM_DATE.dd}/${SIM_DATE.mm}/${SIM_DATE.yy}`,
    minute,
    shift: 'Shift B',
    operator: OPERATORS[Math.floor(index / 90) % OPERATORS.length],
    lots: {
      oxide: `PBO-${2610}-${String(40 + Math.floor(index / 240)).padStart(3, '0')}`,
      alloy: `PB-CA-${2604 + Math.floor(index / 180)}`,
      container: `CNT-PP-${5500 + Math.floor(index / 90)}`,
      bath: `FB-${String(1 + (index % 24)).padStart(2, '0')}`,
    },
    // independent draws, so no tool is a stand-in for another when tracing a defect
    tooling: {
      strapMould: 1 + Math.floor(r() * 6),
      weldHead: r() < 0.5 ? 'A' : 'B',
      platen: 1 + Math.floor(r() * 4),
    },
    results: [],
    status: 'in_process',
  };
}

// ---------- fault scope ----------

export function inScope(f: Fault, u: Unit): boolean {
  if (f.endIndex != null && u.index >= f.endIndex) return false;
  if (u.index < f.startIndex) return false;
  if (!f.scope || f.scope.field === 'none') return true;
  switch (f.scope.field) {
    case 'platen': return u.tooling.platen === f.scope.value;
    case 'weldHead': return u.tooling.weldHead === f.scope.value;
    case 'strapMould': return u.tooling.strapMould === f.scope.value;
    case 'containerLot': return u.lots.container === f.scope.value;
    default: return true;
  }
}

/** Faults ramp in over 25 units so a drift looks like a drift, not a step. */
const ramp = (f: Fault, idx: number) => Math.min(1, (idx - f.startIndex + 1) / 25);

export function scopeValueFor(field: DefectScopeField, u: Unit): string | number | undefined {
  switch (field) {
    case 'platen': return u.tooling.platen;
    case 'weldHead': return u.tooling.weldHead;
    case 'strapMould': return u.tooling.strapMould;
    case 'containerLot': return u.lots.container;
    default: return undefined;
  }
}
type DefectScopeField = import('./types').ScopeField;

// ---------- one gate ----------

const GATE_NO: Record<GateId, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

export function barcodeGrade(contrast: number): OcrReading['barcodeGrade'] {
  if (contrast >= 90) return 'A';
  if (contrast >= 85) return 'B';
  if (contrast >= 80) return 'C';
  if (contrast >= 75) return 'D';
  return 'F';
}

function mutateDate(d: string, r: () => number): string {
  const digits = d.split('');
  const idx = [0, 1, 3, 4, 6, 7][Math.floor(r() * 6)];
  const repl: Record<string, string> = { '0': '8', '1': '7', '2': '7', '3': '8', '5': '6', '6': '8', '7': '1', '8': '3', '9': '4', '4': '9' };
  digits[idx] = repl[digits[idx]] ?? '0';
  return digits.join('');
}

export function runGate(unit: Unit, gate: GateId, faults: Fault[], seed: number): GateResult {
  const r = rngFrom(hash(seed, unit.index, GATE_NO[gate], 7));
  const active = faults.filter((f) => f.gate === gate && inScope(f, unit));

  // measurements (fixed draw order so faults never reshuffle the healthy samples)
  const measures: Record<string, number> = {};
  for (const m of measuresOf(gate)) {
    let mean = m.mean;
    let spread = 1;
    for (const f of active) {
      const d = DEFECT_BY_ID[f.defectId];
      const k = ramp(f, unit.index);
      if (d?.measure === m.key) {
        // the process walks toward the limit it is drifting to, ending one sigma inside it
        const edge = m.driftDir > 0 ? m.usl - m.sd : m.lsl + m.sd;
        mean += (edge - m.mean) * k;
        spread *= 1 + 0.4 * k;
      }
      if (d?.drift?.measure === m.key) {
        mean += m.driftDir * d.drift.sdShift * m.sd * k * 2.4;
        spread *= 1 + (d.drift.spreadMult - 1) * k;
      }
    }
    let v = mean + gauss(r) * m.sd * spread;
    if (m.folded) v = Math.abs(v);
    if (m.max != null) v = Math.min(m.max, v);
    const p = 10 ** m.decimals;
    measures[m.key] = Math.round(v * p) / p;
  }

  // detections (two draws per defect, always, in catalogue order)
  const detections: Detection[] = [];
  for (const d of defectsOf(gate)) {
    const occur = r();
    const confDraw = r();
    let hit = false;
    if (d.measure) {
      const m = MEASURES.find((x) => x.key === d.measure)!;
      const v = measures[m.key];
      hit = v < m.lsl || v > m.usl;
    } else {
      let p = d.baseRate * NOMINAL_SCALE;
      for (const f of active) if (f.defectId === d.id) p = Math.max(p, f.rate * ramp(f, unit.index));
      hit = occur < p;
    }
    if (hit) detections.push({ defectId: d.id, confidence: Math.round((0.99 - 0.2 * confDraw ** 3) * 1000) / 1000 });
  }

  // OCR and barcode (Q4)
  let ocr: OcrReading | undefined;
  if (gate === 'Q4') {
    const wrongModel = detections.some((x) => x.defectId === 'q4_wrong_label');
    const badDate = detections.some((x) => x.defectId === 'q4_ocr_mismatch');
    const other = MODELS.find((m) => m.code !== unit.modelCode)!;
    ocr = {
      dateExpected: unit.mfgDate,
      dateRead: badDate ? mutateDate(unit.mfgDate, r) : unit.mfgDate,
      modelExpected: unit.modelCode,
      modelRead: wrongModel ? other.code : unit.modelCode,
      barcodeGrade: barcodeGrade(measures.contrast_pct),
    };
  }

  const decision = decide(detections);
  const confidence = detections.length
    ? Math.min(...detections.map((x) => x.confidence))
    : Math.round((0.985 + r() * 0.014) * 1000) / 1000;
  return { gate, detections, measures, decision, confidence, firstPass: detections.length === 0, ocr };
}

function decide(detections: Detection[]): Decision {
  if (!detections.length) return 'pass';
  if (Math.min(...detections.map((x) => x.confidence)) < REVIEW_CONFIDENCE) return 'review';
  return detections.some((x) => DEFECT_BY_ID[x.defectId].action === 'reject') ? 'reject' : 'rework';
}

/** The decision the gate would take if the operator confirms the camera's call. */
export function confirmedDecision(res: GateResult): Decision {
  return res.detections.some((x) => DEFECT_BY_ID[x.defectId].action === 'reject') ? 'reject' : 'rework';
}

// ---------- unit journey ----------

/** Send the unit through gates from `fromGate` on, stopping at the first gate that does not pass. */
export function journey(unit: Unit, fromGate: number, faults: Fault[], seed: number): Unit {
  let u: Unit = { ...unit, results: [...unit.results], hold: undefined };
  for (let g = fromGate; g < GATE_IDS.length; g++) {
    const res = runGate(u, GATE_IDS[g], faults, seed);
    u.results.push(res);
    if (res.decision === 'pass') continue;
    const kind = res.decision === 'review' ? 'review' : res.decision === 'reject' ? 'reject' : 'rework';
    u.status = kind === 'reject' ? 'rejected' : kind === 'rework' ? 'rework' : 'review';
    u.hold = { gate: res.gate, kind, sinceIndex: u.index };
    return u;
  }
  u.status = 'passed';
  return u;
}

// ---------- state ----------

/** Rework cell turnaround, reject disposal, and review time-out, all in units produced. */
export const REWORK_TURNAROUND = 12;
export const REJECT_DISPOSE_AFTER = 90;
export const REVIEW_TIMEOUT = 40;
export const MAX_UNITS = 3000;

export function createInitialState(seed: number, preload: number, faults: Fault[] = []): InspectionState {
  let s: InspectionState = { seed, next: 0, faults, units: [], actions: [] };
  s = produce(s, preload);
  return s;
}

function log(s: InspectionState, e: Omit<ActionLog, 'id' | 'atIndex'>, atIndex = s.next): InspectionState {
  const a: ActionLog = { id: `act-${s.actions.length + 1}-${atIndex}`, atIndex, ...e };
  return { ...s, actions: [a, ...s.actions].slice(0, 200) };
}

export function produce(state: InspectionState, n: number): InspectionState {
  let s = state;
  const units = [...s.units];
  for (let i = 0; i < n; i++) {
    const idx = s.next;
    units.push(journey(makeUnit(s.seed, idx), 0, s.faults, s.seed));
    s = { ...s, next: idx + 1, units };
    settle(units, s);
  }
  if (units.length > MAX_UNITS) {
    // keep everything still on hold plus the newest units
    const keepFrom = units.length - MAX_UNITS + 500;
    const trimmed = units.filter((u, i) => i >= keepFrom || (u.hold && !u.hold.resolution));
    return { ...s, units: trimmed };
  }
  return s;
}

/** Time-driven clean-up: the rework cell finishes, old rejects are disposed, stale reviews time out. */
function settle(units: Unit[], s: InspectionState) {
  const now = s.next;
  for (let i = units.length - 1; i >= 0; i--) {
    const u = units[i];
    const h = u.hold;
    if (!h || h.resolution) continue;
    const age = now - h.sinceIndex;
    if (h.kind === 'rework' && age >= REWORK_TURNAROUND) units[i] = applyReworkDone(u, s, 'Rework cell', now);
    else if (h.kind === 'reject' && age >= REJECT_DISPOSE_AFTER) units[i] = { ...u, hold: { ...h, resolution: { by: 'Stores', how: 'Scrapped', atIndex: now } } };
    else if (h.kind === 'review' && age >= REVIEW_TIMEOUT) units[i] = applyReview(u, s, 'confirm', 'System time-out', now);
  }
}

function applyReworkDone(u: Unit, s: InspectionState, by: string, now: number): Unit {
  const gi = GATE_IDS.indexOf(u.hold!.gate);
  const results = u.results.map((r, i) => (i === gi ? { ...r, reworked: true } : r));
  const done: Unit = { ...u, results, hold: { ...u.hold!, resolution: { by, how: 'Reworked and re-inspected', atIndex: now } } };
  const next = journey(done, gi + 1, s.faults, s.seed);
  return { ...next, hold: next.hold ?? done.hold };
}

function applyReview(u: Unit, s: InspectionState, outcome: 'release' | 'confirm', by: string, now: number): Unit {
  const gi = GATE_IDS.indexOf(u.hold!.gate);
  const res = u.results[gi];
  const decided: GateResult = {
    ...res,
    decision: outcome === 'release' ? 'pass' : confirmedDecision(res),
    reviewed: { by, outcome, atIndex: now },
  };
  const results = u.results.map((r, i) => (i === gi ? decided : r));
  const base: Unit = { ...u, results, hold: undefined };
  if (outcome === 'release') return journey(base, gi + 1, s.faults, s.seed);
  const kind = decided.decision === 'reject' ? 'reject' : 'rework';
  return { ...base, status: kind === 'reject' ? 'rejected' : 'rework', hold: { gate: res.gate, kind, sinceIndex: now } };
}

// ---------- reducer ----------

/** Injected faults are sized to reach about a fifth of all batteries, whichever share of them the tool makes. */
const DEFAULT_RATE: Record<string, number> = { none: 0.22, containerLot: 0.3, weldHead: 0.45, platen: 0.9, strapMould: 1 };

export type InspectionAction =
  | { type: 'tick'; n?: number }
  | { type: 'inject'; gate: GateId; defectId: string; rate?: number; scopeValue?: string | number; by?: string }
  | { type: 'endFault'; faultId: string; by: string; note: string }
  | { type: 'clearFaults'; by: string }
  | { type: 'review'; unitIndex: number; outcome: 'release' | 'confirm'; by: string }
  | { type: 'rework'; unitIndex: number; by: string }
  | { type: 'dispose'; unitIndex: number; how: string; by: string }
  | { type: 'ack'; gate: GateId; by: string }
  | { type: 'note'; gate?: GateId; by: string; text: string }
  | { type: 'reset'; seed: number; preload: number; faults: Fault[] };

const mapUnit = (s: InspectionState, idx: number, fn: (u: Unit) => Unit): InspectionState => ({
  ...s,
  units: s.units.map((u) => (u.index === idx ? fn(u) : u)),
});

export function inspectionReducer(s: InspectionState, a: InspectionAction): InspectionState {
  switch (a.type) {
    case 'tick':
      return produce(s, a.n ?? 1);
    case 'inject': {
      const d = DEFECTS.find((x) => x.id === a.defectId);
      if (!d) return s;
      const latest = s.units[s.units.length - 1];
      // a drifting measurement (cold platen, worn mould) affects the whole process; a random defect clusters on one tool
      const scopeField = d.measure ? 'none' : d.scopeField;
      const value = a.scopeValue ?? (latest ? scopeValueFor(scopeField, latest) : undefined);
      const fault: Fault = {
        id: `flt-${s.next}-${d.id}`,
        gate: d.gate,
        defectId: d.id,
        startIndex: s.next,
        rate: a.rate ?? DEFAULT_RATE[scopeField],
        scope: scopeField !== 'none' && value !== undefined ? { field: scopeField, value } : undefined,
        note: 'Injected from the demo events menu',
      };
      return log({ ...s, faults: [...s.faults.filter((f) => f.defectId !== d.id || f.endIndex != null), fault] },
        { by: a.by ?? 'Demo', gate: d.gate, kind: 'inject', text: `Fault injected: ${d.label}${fault.scope ? ` (${fault.scope.field} ${fault.scope.value})` : ''}` });
    }
    case 'endFault': {
      const f = s.faults.find((x) => x.id === a.faultId);
      if (!f || f.endIndex != null) return s;
      return log({ ...s, faults: s.faults.map((x) => (x.id === a.faultId ? { ...x, endIndex: s.next } : x)) },
        { by: a.by, gate: f.gate, kind: 'corrective', text: a.note });
    }
    case 'clearFaults': {
      const open = s.faults.filter((f) => f.endIndex == null);
      if (!open.length) return s;
      return log({ ...s, faults: s.faults.map((f) => (f.endIndex == null ? { ...f, endIndex: s.next } : f)) },
        { by: a.by, kind: 'corrective', text: 'All injected faults cleared' });
    }
    case 'review': {
      const u = s.units.find((x) => x.index === a.unitIndex);
      if (!u?.hold || u.hold.kind !== 'review' || u.hold.resolution) return s;
      const gate = u.hold.gate;
      const next = mapUnit(s, a.unitIndex, (x) => applyReview(x, s, a.outcome, a.by, s.next));
      return log(next, { by: a.by, gate, kind: 'review', text: `${u.serial}: ${a.outcome === 'release' ? 'released as a false alarm' : 'defect confirmed'} at ${gate}` });
    }
    case 'rework': {
      const u = s.units.find((x) => x.index === a.unitIndex);
      if (!u?.hold || u.hold.kind !== 'rework' || u.hold.resolution) return s;
      const gate = u.hold.gate;
      const next = mapUnit(s, a.unitIndex, (x) => applyReworkDone(x, s, a.by, s.next));
      return log(next, { by: a.by, gate, kind: 'rework', text: `${u.serial}: rework done, re-inspected from ${GATE_IDS[GATE_IDS.indexOf(gate) + 1] ?? 'dispatch'}` });
    }
    case 'dispose': {
      const u = s.units.find((x) => x.index === a.unitIndex);
      if (!u?.hold || u.hold.kind !== 'reject' || u.hold.resolution) return s;
      const gate = u.hold.gate;
      const next = mapUnit(s, a.unitIndex, (x) => ({ ...x, hold: { ...x.hold!, resolution: { by: a.by, how: a.how, atIndex: s.next } } }));
      return log(next, { by: a.by, gate, kind: 'dispose', text: `${u.serial}: ${a.how}` });
    }
    case 'ack':
      return log(s, { by: a.by, gate: a.gate, kind: 'ack', text: `Alarm on ${a.gate} acknowledged` });
    case 'note':
      return log(s, { by: a.by, gate: a.gate, kind: 'corrective', text: a.text });
    case 'reset':
      return createInitialState(a.seed, a.preload, a.faults);
    default:
      return s;
  }
}
