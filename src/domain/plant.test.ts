import { describe, expect, it } from 'vitest';
import { dayRecords } from './history';
import { CAPS, ROLES, USERS, can } from './plant';
import { GATE_IDS } from '../inspection/types';

const live = { inspected: 540, pass: { Q1: 98, Q2: 98, Q3: 74, Q4: 99 }, rework: 8, reject: 26, fpy: 93.4, defects: {} };

describe('roles', () => {
  it('has a person for every role, and every capability lists every role', () => {
    expect(USERS.map((u) => u.role)).toEqual(ROLES);
    for (const [, allowed] of CAPS) expect(allowed).toHaveLength(ROLES.length);
  });
  it('lets an operator acknowledge but not dispose of a reject', () => {
    expect(can(0, 'Acknowledge a gate or machine alarm')).toBe(true);
    expect(can(0, 'Dispose of a rejected battery')).toBe(false);
    expect(can(1, 'Dispose of a rejected battery')).toBe(true);
  });
});

describe('history', () => {
  it('ends on today with the live figures and skips Sundays', () => {
    const d = dayRecords(14, live);
    expect(d).toHaveLength(14);
    expect(d[13].today).toBe(true);
    expect(d[13].fpy).toBe(93.4);
    expect(d.filter((x) => x.off).every((x) => x.inspected === 0)).toBe(true);
  });
  it('is the same on every call, and a day yield follows its gate pass rates', () => {
    expect(dayRecords(30, live)).toEqual(dayRecords(30, live));
    const w = dayRecords(30, live).find((x) => !x.off && !x.today)!;
    const prod = GATE_IDS.reduce((a, g) => a * (w.pass[g] / 100), 1) * 100;
    expect(Math.abs(w.fpy - prod)).toBeLessThan(0.2);
  });
});
