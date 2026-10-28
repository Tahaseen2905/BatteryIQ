import { describe, expect, it } from 'vitest';
import { syncGateAlarms, ESCALATE_TO_PLANT, ESCALATE_TO_SHIFT } from './alarms';
import { DEFECTS, alarmLimitFailures } from './catalogue';
import { createInitialState, inspectionReducer, journey, makeUnit, produce } from './engine';
import { DEMO_PRELOAD, initialInspection } from './scenario';
import { allGateStats, buildQualityGates, buildShiftMetrics, holdBay, lineFigures, rootCause, spcChart } from './selectors';
import { INITIAL_SHIFT_METRICS } from '../services/simulation';
import { GATE_IDS } from './types';
import type { InspectionState } from './types';

const clean = (n = 400) => createInitialState(7, n);

describe('engine', () => {
  it('is repeatable for the same seed and different for another', () => {
    const a = initialInspection();
    const b = initialInspection();
    expect(JSON.stringify(a.units.slice(-30))).toBe(JSON.stringify(b.units.slice(-30)));
    const c = createInitialState(1234, DEMO_PRELOAD, a.faults);
    expect(JSON.stringify(c.units.slice(-30))).not.toBe(JSON.stringify(a.units.slice(-30)));
  });

  it('sends a unit through the gates in order and stops it at the first failure', () => {
    const s = initialInspection();
    for (const u of s.units) {
      const gates = u.results.map((r) => r.gate);
      expect(gates).toEqual(GATE_IDS.slice(0, gates.length));
      const failedAt = u.results.findIndex((r) => r.decision !== 'pass');
      const resumed = u.results.some((r) => r.reworked || r.reviewed);
      if (failedAt >= 0 && !resumed) expect(u.results.length).toBe(failedAt + 1);
      if (u.status === 'passed') expect(u.results.length).toBe(4);
    }
  });

  it('keeps gate counts consistent with the unit list', () => {
    const s = initialInspection();
    const st = allGateStats(s.units);
    for (const g of GATE_IDS) {
      expect(st[g].passed + st[g].rework + st[g].reject + st[g].review).toBe(st[g].inspected);
    }
    // a gate only sees what the gate before it passed (or sent to rework / review and returned)
    expect(st.Q2.inspected).toBeLessThanOrEqual(st.Q1.inspected);
    expect(st.Q1.inspected).toBe(s.next);
    expect(lineFigures(s).produced).toBe(s.next);
  });

  it('a healthy line passes about 98 to 100 % at every gate', () => {
    const st = allGateStats(clean(800).units);
    for (const g of GATE_IDS) expect(st[g].shiftPassRate).toBeGreaterThan(97);
  });

  it('covers every item of the client checklist', () => {
    const lines = new Set(DEFECTS.map((d) => d.checklist));
    for (const needle of [
      'Missing caps, plugs or external components', 'Incorrect or damaged terminals', 'Plastic moulding defects and surface contamination',
      'Cracks, scratches, dents and casing deformation', 'Incorrect connector placement', 'Visible defects in terminal welding or connections',
      'Missing, bent or visibly damaged terminals', 'Terminal position, alignment and dimensions', 'Leakage stains or visible residue',
      'Missing components and assembly mismatches', 'Visible gaps, excess sealant or incomplete sealing', 'Incorrect cover placement or orientation',
      'Label placement, print quality and packaging defects', 'Barcode or QR-code readability',
      'OCR verification of printed codes and manufacturing dates', 'Correct product label and model identification',
    ]) expect(lines.has(needle), needle).toBe(true);
  });

  it('reads the OCR date and model at Q4, and a mismatch is a reject', () => {
    let s = clean(10);
    s = inspectionReducer(s, { type: 'inject', gate: 'Q4', defectId: 'q4_ocr_mismatch', rate: 1 });
    s = produce(s, 80);
    const bad = s.units.flatMap((u) => u.results).filter((r) => r.gate === 'Q4' && r.detections.some((d) => d.defectId === 'q4_ocr_mismatch'));
    expect(bad.length).toBeGreaterThan(5);
    for (const r of bad) expect(r.ocr!.dateRead).not.toBe(r.ocr!.dateExpected);
  });
});

describe('operator flow', () => {
  const withReview = (): InspectionState => {
    let s = clean(10);
    s = inspectionReducer(s, { type: 'inject', gate: 'Q1', defectId: 'q1_scratch', rate: 1 });
    return produce(s, 120);
  };

  it('puts low-confidence calls in the review queue and continues the unit when released', () => {
    const s = withReview();
    const item = holdBay(s).find((h) => h.kind === 'review');
    expect(item).toBeTruthy();
    const before = item!.unit.results.length;
    const after = inspectionReducer(s, { type: 'review', unitIndex: item!.unit.index, outcome: 'release', by: 'QA' });
    const u = after.units.find((x) => x.index === item!.unit.index)!;
    expect(u.results[0].decision).toBe('pass');
    expect(u.results[0].reviewed?.outcome).toBe('release');
    expect(u.results.length).toBeGreaterThan(before);
    expect(after.actions[0].kind).toBe('review');
  });

  it('confirming a review applies the defect action', () => {
    const s = withReview();
    const item = holdBay(s).find((h) => h.kind === 'review')!;
    const after = inspectionReducer(s, { type: 'review', unitIndex: item.unit.index, outcome: 'confirm', by: 'QA' });
    const u = after.units.find((x) => x.index === item.unit.index)!;
    expect(u.results[0].decision).toBe('rework');
    expect(u.hold?.kind).toBe('rework');
  });

  it('rework sends the unit on to the next gate; rejects are disposed', () => {
    let s = clean(10);
    s = inspectionReducer(s, { type: 'inject', gate: 'Q1', defectId: 'q1_crack', rate: 1 });
    s = produce(s, 60);
    const rej = holdBay(s).find((h) => h.kind === 'reject');
    expect(rej).toBeTruthy();
    const after = inspectionReducer(s, { type: 'dispose', unitIndex: rej!.unit.index, how: 'Scrapped', by: 'QA' });
    expect(holdBay(after).find((h) => h.unit.index === rej!.unit.index)).toBeUndefined();

    let r = clean(10);
    r = inspectionReducer(r, { type: 'inject', gate: 'Q1', defectId: 'q1_missing_cap', rate: 1 });
    r = produce(r, 50);
    const rw = holdBay(r).find((h) => h.kind === 'rework' && h.unit.results[0].detections.every((d) => d.confidence >= 0.88));
    expect(rw).toBeTruthy();
    const done = inspectionReducer(r, { type: 'rework', unitIndex: rw!.unit.index, by: 'Rework cell' });
    const u = done.units.find((x) => x.index === rw!.unit.index)!;
    expect(u.results[0].reworked).toBe(true);
    expect(u.results.length).toBeGreaterThan(1);
  });

  it('the rework cell and stores clear their queues on their own', () => {
    const s = produce(withReview(), 400);
    const old = holdBay(s).filter((h) => h.age > 120);
    expect(old.length).toBe(0);
  });
});

describe('faults, alarms and corrective action', () => {
  it('an injected fault drives the gate into alarm, clusters on the tooling, and a corrective action clears it', () => {
    let s = clean(300);
    let alarms = syncGateAlarms([], s);
    expect(alarms.length).toBe(0);

    s = inspectionReducer(s, { type: 'inject', gate: 'Q2', defectId: 'q2_weld_defect', rate: 0.5 });
    s = produce(s, 60);
    alarms = syncGateAlarms(alarms, s);
    const a = alarms.find((x) => x.gate === 'Q2');
    expect(a).toBeTruthy();
    expect(a!.resolvedAt).toBeUndefined();
    expect(a!.suspect).toBe('IW-01');
    const sus = rootCause(s.units, 'Q2', 'q2_weld_defect');
    expect(sus[0].field).toBe('IW-01 weld head');

    const fault = s.faults.find((f) => f.endIndex == null)!;
    s = inspectionReducer(s, { type: 'endFault', faultId: fault.id, by: 'Maintenance', note: 'Dressed weld electrodes' });
    s = produce(s, 80);
    alarms = syncGateAlarms(alarms, s);
    expect(alarms.find((x) => x.id === a!.id)!.resolvedAt).toBeDefined();
    expect(s.actions.some((x) => x.kind === 'corrective')).toBe(true);
  });

  it('escalates an unacknowledged alarm and stops escalating once acknowledged', () => {
    let s = initialInspection();
    let alarms = syncGateAlarms([], s);
    const open = alarms.find((x) => x.gate === 'Q3')!;
    expect(open.escalation).toBe('operator');
    s = produce(s, ESCALATE_TO_SHIFT + 2);
    alarms = syncGateAlarms(alarms, s);
    expect(alarms.find((x) => x.id === open.id)!.escalation).toBe('shift_in_charge');
    s = produce(s, ESCALATE_TO_PLANT);
    alarms = syncGateAlarms(alarms, s);
    expect(alarms.find((x) => x.id === open.id)!.escalation).toBe('plant_head');
  });
});

describe('derived views', () => {
  it('gate cards, shift figures and SPC all agree with the unit list', () => {
    const s = initialInspection();
    const gates = buildQualityGates(s);
    const st = allGateStats(s.units);
    expect(gates.Q3.inAlarm).toBe(true);
    expect(gates.Q3.inspectedCount).toBe(st.Q3.inspected);
    const shift = buildShiftMetrics(s, INITIAL_SHIFT_METRICS);
    expect(shift.actualUnits).toBe(s.next);
    expect(shift.goodUnits + shift.rejectedUnits).toBeLessThanOrEqual(shift.actualUnits);
    expect(shift.firstPassYield).toBe(lineFigures(s).firstPassYield);
  });

  it('SPC uses fixed capability limits and flags the drift on the faulted gate', () => {
    const s = initialInspection();
    const c = spcChart(s.units, 'Q3', 'bead_mm');
    expect(c.ucl).toBeCloseTo(c.mean + 3 * (0.065 / Math.sqrt(5)), 3);
    expect(c.points.length).toBeGreaterThan(10);
    expect(c.points.some((p) => p.xOut || p.rules.length > 0 || p.rOut)).toBe(true);
  });

  it('makeUnit and journey are pure', () => {
    const u = makeUnit(5, 12);
    expect(JSON.stringify(journey(u, 0, [], 5))).toBe(JSON.stringify(journey(u, 0, [], 5)));
  });
});

describe('alarm rule', () => {
  it('a healthy line never raises a gate alarm, even over several shifts', () => {
    for (const seed of [7, 11, 2024]) {
      let s = createInitialState(seed, 60);
      let alarms: import('../types').PlantAlarm[] = [];
      for (let i = 0; i < 300; i++) {
        s = produce(s, 10);
        alarms = syncGateAlarms(alarms, s);
      }
      expect(alarms.length, `seed ${seed}`).toBe(0);
    }
  });
  it('the p-chart limit is 5 bad calls in 50', async () => {
    const { alarmLimitFailures } = await import('./catalogue');
    expect(alarmLimitFailures(50)).toBe(5);
  });
});

describe('every defect in the catalogue', () => {
  it.each(DEFECTS.map((d) => [d.id, d] as const))('%s can be injected and the gate then alarms', (_id, d) => {
    let s = createInitialState(7, 300);
    s = inspectionReducer(s, { type: 'inject', gate: d.gate, defectId: d.id });
    let alarms: import('../types').PlantAlarm[] = [];
    for (let i = 0; i < 15; i++) {
      s = produce(s, 10);
      alarms = syncGateAlarms(alarms, s);
    }
    expect(alarms.some((a) => a.gate === d.gate), d.label).toBe(true);
  });
});

describe('root cause is not guessed from chance', () => {
  it('names nothing on a healthy line, whatever the seed', () => {
    for (const seed of [3, 5, 8, 13, 21, 34, 55, 89]) {
      const s = createInitialState(seed, 900);
      for (const g of GATE_IDS) expect(rootCause(s.units, g), `seed ${seed} ${g}`).toEqual([]);
    }
  });
  it('names the weld head for a weld-head fault and not an unrelated tool', () => {
    for (const seed of [3, 5, 8]) {
      let s = createInitialState(seed, 300);
      s = inspectionReducer(s, { type: 'inject', gate: 'Q2', defectId: 'q2_weld_defect' });
      s = produce(s, 80);
      const sus = rootCause(s.units, 'Q2', 'q2_weld_defect');
      expect(sus[0]?.field, `seed ${seed}`).toBe('IW-01 weld head');
      expect(sus.some((x) => x.field.startsWith('CS-01'))).toBe(false);
    }
  });
});

describe('alarm hysteresis', () => {
  it('an open alarm stays open until the window is nearly clean', () => {
    const s = initialInspection();
    const q3 = allGateStats(s.units, new Set()).Q3;
    expect(q3.inAlarm).toBe(true);
    const fails = q3.windowFails;
    const limit = alarmLimitFailures(50);
    expect(fails).toBeGreaterThanOrEqual(limit);
    // between limit-2 and limit-1 bad calls: closed gate stays quiet, open gate stays in alarm
    const quiet = allGateStats(s.units.slice(0, 460), new Set());
    expect(quiet.Q3.inAlarm).toBe(false);
  });
});
