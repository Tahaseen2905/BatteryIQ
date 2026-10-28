/**
 * What the plant is connected to, how the day is planned and who may do what. Illustrative demo data for the
 * lead-acid line, kept in one place so the Integrations, Settings and Reports pages agree.
 */

export interface IntegrationDef {
  id: string;
  name: string;
  protocol: string;
  system: string;
  direction: 'read' | 'read-write';
  status: 'connected' | 'degraded' | 'planned';
  lastSeenSec: number;
  ratePerMin: number;
  latencyMs: number;
}

export const INTEGRATIONS: IntegrationDef[] = [
  { id: 'CN-GW', name: 'IIoT edge gateways', protocol: 'OPC UA, Modbus TCP', system: 'One gateway per machine: reads, range checks, alarms and the 7-day buffer', direction: 'read', status: 'connected', lastSeenSec: 1, ratePerMin: 5400, latencyMs: 18 },
  { id: 'CN-PLC', name: 'Machine PLCs', protocol: 'OPC UA', system: 'Cycle states, set-points and counters from the 12 stations', direction: 'read', status: 'connected', lastSeenSec: 1, ratePerMin: 3600, latencyMs: 24 },
  { id: 'CN-VIS', name: 'Vision gate controllers (Q1–Q4)', protocol: 'GigE Vision, REST', system: 'Camera frames, AI verdicts, confidence and measurements for every battery', direction: 'read', status: 'connected', lastSeenSec: 2, ratePerMin: 200, latencyMs: 85 },
  { id: 'CN-SENS', name: 'Wireless bath sensors', protocol: 'MQTT', system: 'Formation bath and coolant temperatures, battery by battery', direction: 'read', status: 'degraded', lastSeenSec: 42, ratePerMin: 960, latencyMs: 210 },
  { id: 'CN-MES', name: 'Plant MES', protocol: 'REST, ISA-95', system: 'Job cards, model recipes, plan and counts per shift', direction: 'read-write', status: 'connected', lastSeenSec: 6, ratePerMin: 30, latencyMs: 140 },
  { id: 'CN-HIST', name: 'Time-series historian', protocol: 'OPC UA HDA', system: 'Long-term readings for trends and golden-batch comparison', direction: 'read', status: 'connected', lastSeenSec: 3, ratePerMin: 5400, latencyMs: 40 },
  { id: 'CN-CMMS', name: 'Maintenance system (CMMS)', protocol: 'OData', system: 'Work orders raised from alarms, spares and part history', direction: 'read-write', status: 'connected', lastSeenSec: 310, ratePerMin: 2, latencyMs: 260 },
  { id: 'CN-QMS', name: 'Quality system (QMS)', protocol: 'REST', system: 'Non-conformance reports, CAPA and the disposition of rejected batteries', direction: 'read-write', status: 'connected', lastSeenSec: 95, ratePerMin: 4, latencyMs: 190 },
  { id: 'CN-LBL', name: 'Label printer and code server', protocol: 'ZPL over TCP, REST', system: 'Model master, date codes and serials printed at LB-01 and read back at Q4', direction: 'read-write', status: 'connected', lastSeenSec: 4, ratePerMin: 36, latencyMs: 60 },
  { id: 'CN-WMS', name: 'Dispatch and warehouse (WMS)', protocol: 'REST', system: 'Finished batteries released to dispatch by lot and model', direction: 'read-write', status: 'planned', lastSeenSec: 0, ratePerMin: 0, latencyMs: 0 },
  { id: 'CN-ERP', name: 'ERP: supplier lots', protocol: 'OData', system: 'Container, lid and lead lots, to trace a defect back to a supplier', direction: 'read', status: 'planned', lastSeenSec: 0, ratePerMin: 0, latencyMs: 0 },
];

export function agoLabel(sec: number) {
  if (sec < 5) return 'live';
  if (sec < 90) return `${Math.round(sec)} s ago`;
  if (sec < 5400) return `${Math.round(sec / 60)} min ago`;
  if (sec < 172800) return `${Math.round(sec / 3600)} h ago`;
  return `${Math.round(sec / 86400)} days ago`;
}

export const SHIFTS = [
  { id: 'A', name: 'Shift A', from: '06:00', to: '14:00', plan: 1600 },
  { id: 'B', name: 'Shift B', from: '14:00', to: '22:00', plan: 1600 },
  { id: 'C', name: 'Shift C', from: '22:00', to: '06:00', plan: 1400 },
] as const;
export type ShiftId = (typeof SHIFTS)[number]['id'];

export const ROLES = ['Operator', 'Shift in-charge', 'Process engineer', 'Maintenance planner', 'Quality engineer', 'Plant head'];
export const CAPS: [string, boolean[]][] = [
  ['See the line live and in 3D', [true, true, true, true, true, true]],
  ['Ask the copilot', [true, true, true, true, true, true]],
  ['Acknowledge a gate or machine alarm', [true, true, true, true, true, false]],
  ['Release or confirm a review item', [true, true, false, false, true, false]],
  ['Mark rework done', [true, true, false, false, true, false]],
  ['Dispose of a rejected battery', [false, true, false, false, true, false]],
  ['Apply a corrective action', [false, true, true, true, true, false]],
  ['Change gate limits and process limits', [false, false, true, false, true, false]],
  ['Approve a recipe write-back to a PLC', [false, false, true, false, false, true]],
  ['Sign off the shift handover', [false, true, false, false, false, true]],
];

/** What the generated history of a finished shift looks like (Shift A, today). */
export const SHIFT_A = {
  produced: 1548,
  oee: { oee: 84.7, a: 91.8, p: 94.6, q: 97.5 },
  fpy: 96.9,
  stops: [
    { machine: 'CS-01', reason: 'Strap mould changeover', minutes: 24 },
    { machine: 'IW-01', reason: 'Weld head tip dressing', minutes: 14 },
    { machine: 'AF-01', reason: 'Acid line purge', minutes: 11 },
    { machine: 'HS-01', reason: 'Platen warm-up after restart', minutes: 9 },
  ],
  alarms: [
    { code: 'ALM-Q2-WELD', title: 'Gate Q2 below target: weak inter-cell weld', who: 'Anil Kumar', at: '09:48', state: 'Resolved' },
    { code: 'ALM-IW01-TIP', title: 'IW-01 weld head tip worn', who: 'Maintenance', at: '11:20', state: 'Resolved' },
    { code: 'ALM-FB01-BATH', title: 'FB-01 bath 14 coolant return high', who: 'Unassigned', at: '12:05', state: 'Acknowledged' },
  ],
};

/** The people the demo can act as. The role decides what the app lets them do. */
export const USERS = [
  { role: 'Operator', name: 'Suresh Patil (Operator)' },
  { role: 'Shift in-charge', name: 'Vikram Mehta (Shift In-Charge)' },
  { role: 'Process engineer', name: 'Neha Rao (Process Engineer)' },
  { role: 'Maintenance planner', name: 'Anil Kumar (Maintenance)' },
  { role: 'Quality engineer', name: 'Priya Nair (Quality Engineer)' },
  { role: 'Plant head', name: 'R. Iyer (Plant Head)' },
];

export const can = (roleIndex: number, capability: string) => CAPS.find(([c]) => c === capability)?.[1][roleIndex] ?? false;

/** Battery models the line makes; the label, terminal and date code rules are checked at Q4 and Q2. */
export const BATTERY_MODELS = [
  { code: 'MLDIN74', name: 'Exide Mileage DIN74', ah: 74, terminal: 'Tapered, DIN', size: '278 x 175 x 190 mm', label: 'Mileage, red and black', share: 40 },
  { code: 'EEZY35L', name: 'Exide Eezy EZ35L', ah: 35, terminal: 'Tapered, left', size: '187 x 127 x 227 mm', label: 'Eezy, blue', share: 35 },
  { code: 'MTRED66', name: 'Exide Matrix RED DIN66', ah: 66, terminal: 'Tapered, DIN', size: '242 x 175 x 190 mm', label: 'Matrix, red', share: 25 },
];
