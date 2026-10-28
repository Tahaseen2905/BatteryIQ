/**
 * The plant's past days, worked out from the date so they are the same on every visit (illustrative in this demo),
 * with today's figures taken from the live inspection engine. Two earlier problems are written into the history:
 * a weld-head wear spell at Q2 and a cold platen at Q3, so the trends have something to show.
 */

import { DEFECTS, GATES, TARGET_PASS_RATE } from '../inspection/catalogue';
import { SIM_DATE, hash } from '../inspection/engine';
import { GATE_IDS, type GateId } from '../inspection/types';

export interface DayRecord {
  date: Date;
  label: string;
  off: boolean;
  today: boolean;
  inspected: number;
  pass: Record<GateId, number>;
  rework: number;
  reject: number;
  fpy: number;
  defects: Record<string, number>;
}

const u = (a: number, b: number, c = 0) => (hash(a, b, c) % 10000) / 10000;

export function dayRecords(days: number, live: { inspected: number; pass: Record<GateId, number>; rework: number; reject: number; fpy: number; defects: Record<string, number> }): DayRecord[] {
  const end = new Date(2026, 9, Number(SIM_DATE.dd));
  const out: DayRecord[] = [];
  for (let k = days - 1; k >= 0; k--) {
    const date = new Date(end);
    date.setDate(end.getDate() - k);
    const today = k === 0;
    const off = date.getDay() === 0;
    const key = date.getDate() + date.getMonth() * 31;
    const volume = Math.round(4400 + u(key, 1) * 360);
    const pass = {} as Record<GateId, number>;
    for (const g of GATE_IDS) {
      let p = 98.9 + (u(key, 2, g.charCodeAt(1)) - 0.5) * 1.0;
      if (g === 'Q2' && k >= 9 && k <= 11) p -= 3.1 - (k - 9) * 0.5; // weld head wear
      if (g === 'Q3' && k >= 3 && k <= 4) p -= 2.6; // cold platen
      pass[g] = Math.min(99.9, Math.round(p * 10) / 10);
    }
    const defects: Record<string, number> = {};
    for (const d of DEFECTS) {
      const slump = (d.gate === 'Q2' && k >= 9 && k <= 11 && /weld/i.test(d.id)) || (d.gate === 'Q3' && k >= 3 && k <= 4 && /seal/i.test(d.id)) ? 18 : 1;
      defects[d.id] = Math.round(volume * Math.max(d.baseRate, 0.0004) * 1.6 * (0.6 + u(key, 3, d.id.length * 7 + d.id.charCodeAt(2)) * 0.9) * slump);
    }
    // the day's yield follows from its gate pass rates, and the defect counts are scaled to match
    const fpy = Math.round(((pass.Q1 * pass.Q2 * pass.Q3 * pass.Q4) / 1e6) * 10) / 10;
    const bad = Math.round(volume * (1 - fpy / 100));
    const raw = Object.values(defects).reduce((a, b) => a + b, 0) || 1;
    for (const k of Object.keys(defects)) defects[k] = Math.round((defects[k] / raw) * bad);
    const reject = Math.round(bad * 0.46);
    const rec: DayRecord = {
      date, today, off,
      label: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      inspected: off ? 0 : volume,
      pass, rework: off ? 0 : bad - reject, reject: off ? 0 : reject,
      fpy: off ? 0 : fpy,
      defects: off ? {} : defects,
    };
    if (today) Object.assign(rec, { inspected: live.inspected, pass: live.pass, rework: live.rework, reject: live.reject, fpy: live.fpy, defects: live.defects });
    out.push(rec);
  }
  return out;
}

export const TARGET = TARGET_PASS_RATE;

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
}

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const gateName = (g: GateId) => `${g} ${GATES[g].short}`;
