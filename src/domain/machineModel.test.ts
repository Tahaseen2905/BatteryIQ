import { describe, expect, it } from 'vitest';
import { INITIAL_LEAD_ACID_MACHINES } from '../services/simulation';
import { cyclePosition, stateOfTag, stepsOf } from './machineModel';
import { dailySeries } from '../components/machine/tabs';

describe('machine model', () => {
  it('every machine has a full tag set, steps, and a golden batch', () => {
    for (const m of INITIAL_LEAD_ACID_MACHINES) {
      expect(m.tags.length, m.code).toBeGreaterThanOrEqual(6);
      expect(stepsOf(m.code).length, m.code).toBe(5);
      expect(m.goldenBatchProfile.length, m.code).toBeGreaterThan(0);
      expect(new Set(m.tags.map((t) => t.id)).size, `${m.code} tag ids`).toBe(m.tags.length);
    }
  });
  it('the cycle position is within range and moves with time', () => {
    for (const m of INITIAL_LEAD_ACID_MACHINES) {
      const a = cyclePosition(m.code, m.cycleTimeSec, 3);
      const b = cyclePosition(m.code, m.cycleTimeSec, 3 + a.shownSec / 2);
      expect(a.index).toBeGreaterThanOrEqual(0);
      expect(a.index).toBeLessThan(a.steps.length);
      expect(a.fraction).not.toBeCloseTo(b.fraction, 3);
    }
  });
  it('a reading that is out of range today drifted there over the last days', () => {
    const hs = INITIAL_LEAD_ACID_MACHINES.find((m) => m.code === 'HS-01')!;
    const cold = { ...hs.tags[0], value: 352 };
    expect(stateOfTag(cold, cold.value)).toBe('out');
    const s = dailySeries('HS-01', 0, cold);
    expect(s).toHaveLength(30);
    expect(s[29]).toBe(352);
    expect(s[10]).toBeGreaterThanOrEqual(cold.minNormal - 8);
    expect(JSON.stringify(dailySeries('HS-01', 0, cold))).toBe(JSON.stringify(s));
  });
});
