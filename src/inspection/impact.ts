/**
 * What the gates find flows back to the machines: a machine that a fault or an open gate alarm
 * points at goes to Attention with the reason and a reading out of range. Healthy machines get
 * a small repeatable wobble in their key reading instead of random jitter.
 */

import type { MachineStation, PlantAlarm } from '../types';
import { DEFECT_BY_ID, GATES } from './catalogue';
import { hash, rngFrom } from './engine';
import type { InspectionState } from './types';

/** Machines whose key reading falls when their process goes wrong (a cold platen, a weak weld). */
const LOW_SIDE = new Set(['HS-01', 'IW-01']);

export function suspectsOf(state: InspectionState, alarms: PlantAlarm[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const f of state.faults) {
    if (f.endIndex != null) continue;
    const d = DEFECT_BY_ID[f.defectId];
    if (!d || d.suspect === 'CONTAINER-LOT') continue;
    const scope = f.scope ? ` on ${f.scope.field === 'platen' ? 'platen' : f.scope.field === 'weldHead' ? 'weld head' : 'strap mould'} ${f.scope.value}` : '';
    out.set(d.suspect, `${f.gate} ${GATES[f.gate].short}: ${d.label.toLowerCase()}${scope}`);
  }
  for (const a of alarms) {
    if (a.gate && a.resolvedAt == null && a.suspect && a.suspect !== 'CONTAINER-LOT' && !out.has(a.suspect)) {
      out.set(a.suspect, `${a.gate} alarm: pass rate ${a.readingValue}`);
    }
  }
  return out;
}

export function liveMachines(base: MachineStation[], state: InspectionState, alarms: PlantAlarm[]): MachineStation[] {
  const suspects = suspectsOf(state, alarms);
  return base.map((m, i) => {
    const tag = m.tags[0];
    if (!tag) return m;
    const hit = suspects.get(m.code);
    if (hit && m.status === 'nominal') {
      const range = tag.maxNormal - tag.minNormal;
      const value = LOW_SIDE.has(m.code) ? tag.minNormal - range * 0.35 : tag.maxNormal + range * 0.25;
      const v = Number(value.toFixed(tag.value > 100 ? 0 : tag.value > 10 ? 1 : 2));
      return {
        ...m,
        status: 'attention',
        statusReason: hit,
        aiHealthScore: Math.min(m.aiHealthScore, 71),
        shiftOee: Math.min(m.shiftOee, 84),
        tags: m.tags.map((t, k) => {
          if (k === 0) return { ...t, value: v, history: [...t.history.slice(1), v] };
          // the cold platen also shows on its own tag, so the machine page agrees with the alarm
          if (m.code === 'HS-01' && t.name === 'Platen 2 Temp') return { ...t, value: Number((t.minNormal - (t.maxNormal - t.minNormal) * 0.3).toFixed(0)) };
          return t;
        }),
      };
    }
    // every tag wobbles a little, repeatably, so the machine page and the twin read the same numbers
    const wobble = (t: (typeof m.tags)[number], k: number) => {
      const r = rngFrom(hash(state.seed, i, k, Math.floor(state.next / 2)));
      const d = (r() - 0.5) * (t.maxNormal - t.minNormal) * 0.02;
      return Number((t.value + d).toFixed(t.value > 100 ? 0 : t.value > 10 ? 1 : 2));
    };
    if (m.status !== 'nominal' && !hit) return { ...m, tags: m.tags.map((t, k) => (k === 0 ? t : { ...t, value: wobble(t, k) })) };
    return { ...m, tags: m.tags.map((t, k) => ({ ...t, value: wobble(t, k) })) };
  });
}

