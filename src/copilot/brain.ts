/**
 * The offline copilot: answers from the live inspection and machine data, in English or Hindi.
 * Pure, so it can be tested. An optional server endpoint can replace it (see CopilotDrawer).
 */

import type { MachineStation, PlantAlarm, QualityGate, ShiftProductionMetrics } from '../types';
import { DEFECT_BY_ID, GATES } from '../inspection/catalogue';
import { ageLabel } from '../inspection/alarms';
import { clockAt } from '../inspection/engine';
import { holdBay, lineFigures, rootCause, topDefect } from '../inspection/selectors';
import type { GateId, InspectionState } from '../inspection/types';
import { GATE_IDS } from '../inspection/types';

export interface CopilotContext {
  machines: MachineStation[];
  qualityGates: Record<string, QualityGate>;
  alarms: PlantAlarm[];
  shiftMetrics: ShiftProductionMetrics;
  inspection: InspectionState;
  lineOee: number;
}

export interface CopilotReply { text: string; sources: string[] }

const isHindi = (q: string) => /[ऀ-ॿ]/.test(q);

function gateFromQuestion(q: string): GateId | null {
  const m = q.match(/\bq\s?([1-4])\b/i);
  if (m) return `Q${m[1]}` as GateId;
  if (/(seal|cover|leak|gap|sealant|सील)/i.test(q)) return 'Q3';
  if (/(terminal|weld|connector|post|टर्मिनल)/i.test(q)) return 'Q2';
  if (/(label|barcode|qr|ocr|date code|लेबल)/i.test(q)) return 'Q4';
  if (/(casing|crack|scratch|dent|cap|plug|mould|container)/i.test(q)) return 'Q1';
  return null;
}

function gateAnswer(g: GateId, ctx: CopilotContext): string {
  const gate = ctx.qualityGates[g];
  const top = topDefect(ctx.inspection.units, g);
  const def = top ? DEFECT_BY_ID[top.id] : undefined;
  const sus = rootCause(ctx.inspection.units, g, top?.id)[0];
  const open = ctx.alarms.find((a) => a.gate === g && a.resolvedAt == null);
  const lines = [
    `${GATES[g].title}: ${gate.passRatePercent}% over the last 50 batteries (target ${gate.targetPassRatePercent}%), ${gate.shiftPassRatePercent}% this shift. ${gate.inAlarm ? 'It is IN ALARM.' : 'It is on target.'}`,
    `Seen ${gate.inspectedCount}: ${gate.passedCount} passed, ${gate.reworkCount} to rework, ${gate.rejectCount} rejected, ${gate.reviewCount} waiting for review. ${gate.holdCount} rejects are in the hold bay.`,
  ];
  if (def) lines.push(`Main defect in the last 50: ${def.label} (${top!.count}). Likely cause: ${def.cause}`);
  if (sus) lines.push(`Where it comes from: ${sus.share}% of the defective batteries came from ${sus.field} ${sus.value}, which made ${sus.population}% of the output.`);
  if (def && gate.inAlarm) lines.push(`Fix: ${def.fix} Look at ${def.suspect === 'CONTAINER-LOT' ? 'the container lot' : def.suspect}.`);
  if (open) lines.push(`Alarm ${open.code} was raised ${ageLabel(open.raisedAt ?? 0, ctx.inspection.next)}; ${open.acknowledged ? `acknowledged by ${open.acknowledgedBy}` : `not acknowledged, now with the ${open.escalation.replace(/_/g, ' ')}`}.`);
  return lines.join('\n');
}

function hindiSummary(ctx: CopilotContext): string {
  const f = lineFigures(ctx.inspection);
  const bad = GATE_IDS.filter((g) => ctx.qualityGates[g].inAlarm);
  const attention = ctx.machines.filter((m) => m.status !== 'nominal');
  const lines = [`नमस्ते! अभी ${clockAt(ctx.inspection.next)} बजे शिफ्ट B में ${f.produced} बैटरियों की जाँच हो चुकी है। फर्स्ट-पास यील्ड ${f.firstPassYield}% है।`];
  if (bad.length) {
    for (const g of bad) {
      const top = topDefect(ctx.inspection.units, g);
      lines.push(`${g} गेट अलार्म में है: पिछली 50 बैटरियों में पास दर ${ctx.qualityGates[g].passRatePercent}% (लक्ष्य 98%)।${top ? ` मुख्य खराबी: ${DEFECT_BY_ID[top.id].label}।` : ''}`);
    }
  } else lines.push('चारों विज़न गेट लक्ष्य के भीतर हैं।');
  if (attention.length) lines.push(`ध्यान देने योग्य मशीनें: ${attention.map((m) => m.code).join(', ')}।`);
  lines.push(`होल्ड/रिव्यू में ${holdBay(ctx.inspection).length} बैटरियाँ हैं।`);
  return lines.join('\n');
}

export function answer(prompt: string, ctx: CopilotContext): CopilotReply {
  const q = prompt.toLowerCase();
  const src = ['Inspection engine (Q1–Q4)', 'Plant server'];

  if (isHindi(prompt)) return { text: hindiSummary(ctx), sources: src };

  const mc = prompt.match(/\b([A-Z]{2}-\d{2})\b/i)?.[1]?.toUpperCase();
  const machine = mc ? ctx.machines.find((m) => m.code === mc) : undefined;
  if (machine) {
    const open = ctx.alarms.filter((a) => a.resolvedAt == null && (a.machineId === machine.id || a.suspect === machine.code));
    const worst = [...machine.parts].sort((a, b) => a.remainingDays - b.remainingDays)[0];
    return {
      text: [
        `${machine.code} ${machine.name} is ${machine.status}${machine.statusReason ? `: ${machine.statusReason}` : ''}.`,
        `Shift OEE ${machine.shiftOee}% (A ${machine.availability}% · P ${machine.performance}% · Q ${machine.quality}%). AI health ${machine.aiHealthScore}, failure chance ${machine.failureChance7d}% in 7 days and ${machine.failureChance30d}% in 30.`,
        machine.tags[0] ? `Key reading: ${machine.tags[0].name} ${machine.tags[0].value} ${machine.tags[0].unit} (normal ${machine.tags[0].minNormal}–${machine.tags[0].maxNormal}).` : '',
        worst ? `Part with least life: ${worst.partName}, ${worst.remainingDays} days left (${worst.failureMode}).` : '',
        open.length ? `Open alarms: ${open.map((a) => a.code).join(', ')}.` : 'No open alarms.',
      ].filter(Boolean).join('\n'),
      sources: ['Machine sheet', 'OPC UA tags', ...src],
    };
  }

  const g = gateFromQuestion(prompt);
  if (g && !/(oee|downtime|loss|pareto|sunday|spare)/.test(q)) return { text: gateAnswer(g, ctx), sources: src };

  if (/(trace|root cause|lot|why|कारण)/.test(q)) {
    const bad = GATE_IDS.find((x) => ctx.qualityGates[x].inAlarm) ?? 'Q3';
    return { text: gateAnswer(bad, ctx), sources: src };
  }

  if (/(hold|review|queue|rework|quarantine)/.test(q)) {
    const h = holdBay(ctx.inspection);
    const by = (k: string) => h.filter((x) => x.kind === k).length;
    return { text: `${h.length} batteries are waiting: ${by('review')} for operator review, ${by('rework')} in rework and ${by('reject')} in the reject bay. Review calls the camera was not sure about; one left for 40 batteries is treated as a defect.`, sources: src };
  }

  if (/(alarm|escalat|acknowledg)/.test(q)) {
    const open = ctx.alarms.filter((a) => a.resolvedAt == null);
    if (!open.length) return { text: 'No open alarms.', sources: src };
    return { text: open.map((a) => `${a.code} (${a.severity}) ${a.machineName}: ${a.acknowledged ? 'acknowledged' : `not acknowledged, with the ${a.escalation.replace(/_/g, ' ')}`}. ${a.cause}`).join('\n\n'), sources: src };
  }

  if (/(downtime|loss|pareto|oee)/.test(q)) {
    const total = ctx.shiftMetrics.downtimePareto.reduce((a, d) => a + d.minutes, 0);
    return {
      text: `Shift B downtime so far: ${total} min.\n${[...ctx.shiftMetrics.downtimePareto].sort((a, b) => b.minutes - a.minutes).map((d, i) => `${i + 1}. ${d.reason}: ${d.minutes} min`).join('\n')}\nLine OEE is ${ctx.lineOee}%.`,
      sources: ['MES', 'Plant server'],
    };
  }

  if (/(sunday|spare|part|shutdown|due)/.test(q)) {
    const due = ctx.machines.flatMap((m) => m.parts.map((p) => ({ code: m.code, ...p }))).filter((p) => p.remainingDays <= 30).sort((a, b) => a.remainingDays - b.remainingDays).slice(0, 5);
    return { text: due.length ? `Parts due within 30 days:\n${due.map((p, i) => `${i + 1}. ${p.code} ${p.partName}: ${p.remainingDays} days (${p.failureMode}, about ₹${p.replacementCostEstimate.toLocaleString('en-IN')})`).join('\n')}` : 'No parts due within 30 days.', sources: ['Machine sheets', 'Wear models'] };
  }

  const f = lineFigures(ctx.inspection);
  const bad = GATE_IDS.filter((x) => ctx.qualityGates[x].inAlarm);
  return {
    text: [
      `At ${clockAt(ctx.inspection.next)}: ${f.produced} batteries inspected (plan to now ${f.plannedToNow}), ${f.passedAll} passed all gates, first-pass yield ${f.firstPassYield}%, line OEE ${ctx.lineOee}%.`,
      bad.length ? `Gates in alarm: ${bad.join(', ')}.` : 'All four gates are on target.',
      `${ctx.alarms.filter((a) => a.resolvedAt == null && !a.acknowledged).length} unacknowledged alarms. ${holdBay(ctx.inspection).length} batteries waiting in review, rework or reject bays.`,
      'Ask about a gate (Q1–Q4, "why is the seal gate failing?"), a machine (HS-01), the hold bay, alarms, downtime or parts due.',
    ].join('\n'),
    sources: src,
  };
}

/* ------------------------------------------------------------------ rich answers */

/** An answer as blocks the chat can lay out: text, bullets, a table, bars, sources and buttons that open a page. */
export type CopilotBlock =
  | { type: 'text'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'bars'; rows: { label: string; value: number; unit: string }[] }
  | { type: 'sources'; items: string[] }
  | { type: 'actions'; items: { label: string; to: string }[] };

export interface RichAnswer {
  blocks: CopilotBlock[];
  followUps: string[];
  lang: 'en' | 'hi';
}

const MACHINE_CODE = /^[A-Z]{2}-\d{2}$/;

export function answerRich(prompt: string, ctx: CopilotContext): RichAnswer {
  const base = answer(prompt, ctx);
  const q = prompt.toLowerCase();
  const lang = isHindi(prompt) ? 'hi' : 'en';
  const [first, ...rest] = base.text.split('\n').filter(Boolean);
  const blocks: CopilotBlock[] = [{ type: 'text', text: first }];
  let followUps: string[] = ['What is waiting in the hold bay?', 'Which parts are due before Sunday shutdown?'];
  const actions: { label: string; to: string }[] = [];
  const rows = (items: string[]) => items.length && blocks.push({ type: 'bullets', items });

  const mc = prompt.match(/\b([A-Z]{2}-\d{2})\b/i)?.[1]?.toUpperCase();
  const machine = mc ? ctx.machines.find((m) => m.code === mc) : undefined;
  const g = gateFromQuestion(prompt);

  if (lang === 'hi') {
    rows(rest);
    followUps = ['Why is the seal gate failing?', 'What is waiting in the hold bay?'];
  } else if (machine) {
    rows(rest);
    actions.push({ label: `Open ${machine.code}`, to: `#/machine/${machine.code}` });
    followUps = ['Which tool is causing the Q3 rejects?', 'Which parts are due before Sunday shutdown?'];
  } else if (g && !/(oee|downtime|loss|pareto|sunday|spare)/.test(q)) {
    rows(rest);
    const top = topDefect(ctx.inspection.units, g);
    const def = top ? DEFECT_BY_ID[top.id] : undefined;
    actions.push({ label: `Open gate ${g}`, to: `#/quality_gates/${g}/live` });
    if (def && MACHINE_CODE.test(def.suspect)) actions.push({ label: `Open ${def.suspect}`, to: `#/machine/${def.suspect}` });
    actions.push({ label: 'Trace the cause', to: `#/quality_gates/${g}/trace` });
    followUps = ['What is waiting in the hold bay?', `How is ${def && MACHINE_CODE.test(def.suspect) ? def.suspect : 'HS-01'}?`];
  } else if (/(trace|root cause|lot|why|कारण)/.test(q)) {
    rows(rest);
    const bad = GATE_IDS.find((x) => ctx.qualityGates[x].inAlarm) ?? 'Q3';
    actions.push({ label: `Open gate ${bad}`, to: `#/quality_gates/${bad}/trace` });
  } else if (/(hold|review|queue|rework|quarantine)/.test(q)) {
    const h = holdBay(ctx.inspection);
    const by = (k: string) => h.filter((x) => x.kind === k).length;
    blocks.push({ type: 'table', columns: ['Bay', 'Batteries'], rows: [['Operator review', String(by('review'))], ['Rework', String(by('rework'))], ['Reject hold', String(by('reject'))]] });
    actions.push({ label: 'Open the hold bay', to: `#/quality_gates/${GATE_IDS.find((x) => ctx.qualityGates[x].inAlarm) ?? 'Q3'}/queues` });
    followUps = ['Why is the seal gate failing?', 'Show the open alarms'];
  } else if (/(alarm|escalat|acknowledg)/.test(q)) {
    const open = ctx.alarms.filter((a) => a.resolvedAt == null);
    if (open.length) blocks[0] = { type: 'text', text: `${open.length} open alarm${open.length > 1 ? 's' : ''}.` };
    if (open.length) blocks.push({ type: 'table', columns: ['Alarm', 'Severity', 'Where', 'State'], rows: open.map((a) => [a.code, a.severity, a.machineName, a.acknowledged ? 'Acknowledged' : `With ${a.escalation.replace(/_/g, ' ')}`]) });
    actions.push({ label: 'Open alarms', to: '#/alarms' });
    followUps = ['Why is the seal gate failing?', 'How is HS-01?'];
  } else if (/(downtime|loss|pareto|oee)/.test(q)) {
    const rowsD = [...ctx.shiftMetrics.downtimePareto].sort((a, b) => b.minutes - a.minutes);
    blocks.push({ type: 'bars', rows: rowsD.map((d) => ({ label: d.reason, value: d.minutes, unit: 'min' })) });
    blocks.push({ type: 'text', text: `Line OEE is ${ctx.lineOee}%.` });
    actions.push({ label: 'Open Production and OEE', to: '#/production_oee' });
  } else if (/(sunday|spare|part|shutdown|due)/.test(q)) {
    const due = ctx.machines.flatMap((m) => m.parts.map((p) => ({ code: m.code, ...p }))).filter((p) => p.remainingDays <= 30).sort((a, b) => a.remainingDays - b.remainingDays).slice(0, 5);
    if (due.length) blocks[0] = { type: 'text', text: 'Parts due within 30 days:' };
    if (due.length) blocks.push({ type: 'table', columns: ['Machine', 'Part', 'Days left', 'Failure mode'], rows: due.map((p) => [p.code, p.partName, String(p.remainingDays), p.failureMode]) });
    actions.push({ label: 'Open AI maintenance', to: '#/predictive_ai' });
  } else {
    rows(rest.slice(0, 2));
    actions.push({ label: 'Open Quality gates', to: `#/quality_gates/${GATE_IDS.find((x) => ctx.qualityGates[x].inAlarm) ?? 'Q1'}/live` });
    followUps = ['Why is the seal gate failing?', 'How is HS-01?', 'What is waiting in the hold bay?'];
  }

  if (actions.length) blocks.push({ type: 'actions', items: actions });
  blocks.push({ type: 'sources', items: base.sources });
  return { blocks, followUps, lang };
}
