/**
 * Gate alarms: raised when a gate's rolling pass rate falls under target, escalated while nobody
 * acknowledges them, and resolved when the gate recovers.
 */

import type { PlantAlarm } from '../types';
import { DEFECT_BY_ID, GATES, TARGET_PASS_RATE } from './catalogue';
import { clockLabel, minuteOf } from './engine';
import { allGateStats, rootCause, topDefect } from './selectors';
import type { GateId, InspectionState } from './types';
import { GATE_IDS } from './types';

/** Units without an acknowledgement before the alarm goes up a level (about 12 and 30 plant minutes). */
export const ESCALATE_TO_SHIFT = 40;
export const ESCALATE_TO_PLANT = 100;

export const alarmIdFor = (gate: GateId, raisedAt: number) => `alm-gate-${gate}-${raisedAt}`;
export const isGateAlarm = (a: PlantAlarm) => !!a.gate;

export function escalationFor(age: number): PlantAlarm['escalation'] {
  if (age >= ESCALATE_TO_PLANT) return 'plant_head';
  if (age >= ESCALATE_TO_SHIFT) return 'shift_in_charge';
  return 'operator';
}

export function ageLabel(raisedAt: number, now: number): string {
  const mins = Math.max(0, Math.round((now - raisedAt) * 0.3));
  return mins < 1 ? 'Just now' : mins === 1 ? '1 min ago' : `${mins} mins ago`;
}

function causeText(state: InspectionState, gate: GateId, rolling: number): string {
  const top = topDefect(state.units, gate);
  const def = top ? DEFECT_BY_ID[top.id] : undefined;
  const sus = rootCause(state.units, gate, top?.id)[0];
  const susText = sus ? ` ${sus.share}% of them came from ${sus.field} ${sus.value}, which made ${sus.population}% of the output.` : '';
  return def
    ? `Pass rate is ${rolling}% over the last 50 (target ${TARGET_PASS_RATE}%). Main defect: ${def.label} (${top!.count} in the last 50). ${def.cause}${susText}`
    : `Pass rate is ${rolling}% over the last 50 (target ${TARGET_PASS_RATE}%).`;
}

export function syncGateAlarms(prev: PlantAlarm[], state: InspectionState): PlantAlarm[] {
  const openGates = new Set(prev.filter((a) => a.gate && a.resolvedAt == null).map((a) => a.gate!));
  const stats = allGateStats(state.units, openGates);
  let alarms = prev;
  for (const gate of GATE_IDS) {
    const st = stats[gate];
    const open = alarms.find((a) => a.gate === gate && a.resolvedAt == null);
    if (st.inAlarm && !open) {
      const top = topDefect(state.units, gate);
      const def = top ? DEFECT_BY_ID[top.id] : undefined;
      const severity = st.rollingPassRate < 90 || def?.severity === 'critical' ? 'critical' : 'major';
      alarms = [{
        id: alarmIdFor(gate, state.next),
        code: `ALM-${gate}-FPY`,
        machineId: `gate-${gate}`,
        machineName: `${GATES[gate].short} / ${gate} Quality Gate`,
        severity,
        timestamp: 'Just now',
        cause: causeText(state, gate, st.rollingPassRate),
        recommendedFix: def?.fix ?? 'Inspect the station and re-run the golden-sample check.',
        impact: `Rejected batteries are held at ${gate}. Output of the stage after ${def?.suspect ?? 'this gate'} is at risk.`,
        triggerReading: `Gate ${gate} pass rate (last 50)`,
        readingValue: `${st.rollingPassRate}%`,
        threshold: `< ${TARGET_PASS_RATE}%`,
        escalation: 'operator',
        acknowledged: false,
        gate,
        raisedAt: state.next,
        suspect: def?.suspect,
        defectId: top?.id,
      }, ...alarms];
      continue;
    }
    if (open) {
      if (!st.inAlarm) {
        alarms = alarms.map((a) => (a.id === open.id ? { ...a, resolvedAt: state.next, readingValue: `${st.rollingPassRate}%`, acknowledged: true, acknowledgedBy: a.acknowledgedBy ?? 'Auto-cleared (gate recovered)' } : a));
      } else {
        const age = state.next - (open.raisedAt ?? state.next);
        const level = open.acknowledged ? open.escalation : escalationFor(age);
        const top = topDefect(state.units, gate);
        alarms = alarms.map((a) => (a.id === open.id
          ? { ...a, escalation: level, cause: causeText(state, gate, st.rollingPassRate), readingValue: `${st.rollingPassRate}%`, timestamp: ageLabel(open.raisedAt ?? 0, state.next), suspect: top ? DEFECT_BY_ID[top.id].suspect : a.suspect, defectId: top ? top.id : a.defectId }
          : a));
      }
    }
  }
  return alarms === prev ? prev : alarms;
}

export function alarmClock(alarm: PlantAlarm): string {
  return alarm.raisedAt != null ? clockLabel(minuteOf(alarm.raisedAt)) : '';
}
