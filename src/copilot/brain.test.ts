import { describe, expect, it } from 'vitest';
import { syncGateAlarms } from '../inspection/alarms';
import { initialInspection } from '../inspection/scenario';
import { buildQualityGates, buildShiftMetrics } from '../inspection/selectors';
import { INITIAL_ALARMS, INITIAL_LEAD_ACID_MACHINES, INITIAL_SHIFT_METRICS } from '../services/simulation';
import { answer, answerRich } from './brain';

const ctx = () => {
  const inspection = initialInspection();
  return {
    inspection,
    machines: INITIAL_LEAD_ACID_MACHINES,
    qualityGates: buildQualityGates(inspection),
    alarms: syncGateAlarms(INITIAL_ALARMS, inspection),
    shiftMetrics: buildShiftMetrics(inspection, INITIAL_SHIFT_METRICS),
    lineOee: 86.1,
  };
};

describe('copilot', () => {
  it('explains the seal gate alarm from the live data, with the tooling that causes it', () => {
    const r = answer('Why is the seal gate failing?', ctx());
    expect(r.text).toContain('Q3');
    expect(r.text).toContain('IN ALARM');
    expect(r.text).toMatch(/platen/);
  });
  it('answers for a machine by its code', () => {
    expect(answer('How is HS-01?', ctx()).text).toContain('HS-01');
  });
  it('answers in Hindi when asked in Hindi', () => {
    expect(answer('कौन सी मशीनें ध्यान आकर्षित कर रही हैं?', ctx()).text).toMatch(/[ऀ-ॿ]/);
  });
  it('never mentions the old tyre or Li-ion lines', () => {
    for (const q of ['summary', 'downtime', 'parts due', 'alarms', 'Q1', 'Q4 label']) {
      expect(answer(q, ctx()).text).not.toMatch(/CT-01|SL-01|FM-01|calender|Li-?ion/i);
    }
  });
  it('lays a gate answer out as blocks with buttons that open the gate and the machine behind it', () => {
    const r = answerRich('Why is the seal gate failing?', ctx());
    expect(r.blocks[0].type).toBe('text');
    const actions = r.blocks.find((b) => b.type === 'actions');
    expect(actions && actions.type === 'actions' && actions.items.map((a) => a.to)).toEqual(expect.arrayContaining(['#/quality_gates/Q3/live', '#/machine/HS-01']));
    expect(r.blocks.at(-1)?.type).toBe('sources');
    expect(r.followUps.length).toBeGreaterThan(0);
  });
  it('gives the downtime ranking as bars and parts due as a table', () => {
    expect(answerRich('downtime', ctx()).blocks.some((b) => b.type === 'bars')).toBe(true);
    expect(answerRich('parts due', ctx()).blocks.some((b) => b.type === 'table')).toBe(true);
  });
});
