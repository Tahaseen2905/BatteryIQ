/**
 * Inspection domain types.
 * A battery (Unit) travels through four AI vision gates in order; every gate produces a
 * GateResult. Everything on screen (gate cards, SPC, hold bay, trace, alarms, shift
 * figures) is derived from the same list of units, so the numbers always agree.
 */

export type GateId = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export const GATE_IDS: GateId[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export type Severity = 'minor' | 'major' | 'critical';
export type Decision = 'pass' | 'rework' | 'reject' | 'review';

/** How a defect is drawn on the camera frame. */
export type DefectKind =
  | 'missing' | 'wrongpost' | 'bent' | 'void' | 'crack' | 'scratch' | 'dent' | 'stain-dark'
  | 'offset' | 'porosity' | 'spatter' | 'dimension'
  | 'stain-yellow' | 'gap' | 'blob' | 'flip'
  | 'skew' | 'smudge' | 'tear' | 'lowcontrast' | 'ocr';

export interface Region { x: number; y: number; w: number; h: number }

export interface DefectDef {
  id: string;
  gate: GateId;
  label: string;
  /** Which line of the client's inspection checklist this defect belongs to. */
  checklist: string;
  severity: Severity;
  /** What the gate does with the unit when this defect is confirmed. */
  action: 'rework' | 'reject';
  /** Per-unit probability on a healthy process (before NOMINAL_SCALE). 0 for dimension defects. */
  baseRate: number;
  kind: DefectKind;
  /** Bounding box on the gate's 400 x 240 camera frame. */
  region: Region;
  /** Where to look first: a line machine code or a supplier lot. */
  suspect: string;
  cause: string;
  fix: string;
  /** Dimension defects are raised when this measurement leaves its specification. */
  measure?: string;
  /** Side effect on a measurement while the fault is active (e.g. a weak seal widens the bead). */
  drift?: { measure: string; sdShift: number; spreadMult: number };
  /** Tooling attribute a fault on this defect clusters on, for root-cause tracing. */
  scopeField: ScopeField;
}

export type ScopeField = 'platen' | 'weldHead' | 'strapMould' | 'containerLot' | 'none';

export interface MeasureDef {
  key: string;
  gate: GateId;
  label: string;
  unit: string;
  mean: number;
  sd: number;
  lsl: number;
  usl: number;
  /** Direction a fault pushes the process: toward USL (+1) or LSL (-1). */
  driftDir: 1 | -1;
  /** Take the absolute value (offsets are magnitudes). */
  folded?: boolean;
  /** Upper clamp (e.g. the barcode contrast cannot exceed 100 %). */
  max?: number;
  decimals: number;
}

export interface Detection { defectId: string; confidence: number }

export interface OcrReading {
  dateExpected: string; dateRead: string;
  modelExpected: string; modelRead: string;
  barcodeGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface GateResult {
  gate: GateId;
  detections: Detection[];
  measures: Record<string, number>;
  /** Current decision (a reviewed 'review' becomes 'pass', 'rework' or 'reject'). */
  decision: Decision;
  /** Lowest detection confidence, or the camera's pass confidence. */
  confidence: number;
  firstPass: boolean;
  ocr?: OcrReading;
  reviewed?: { by: string; outcome: 'release' | 'confirm'; atIndex: number };
  reworked?: boolean;
}

export type UnitStatus = 'in_process' | 'passed' | 'rework' | 'rejected' | 'review';

export interface Tooling {
  strapMould: number; // CS-01 mould 1-6
  weldHead: 'A' | 'B'; // IW-01 weld head
  platen: number; // HS-01 platen 1-4
}

export interface Lots {
  oxide: string; alloy: string; container: string; bath: string;
}

export interface Hold {
  gate: GateId;
  kind: 'rework' | 'reject' | 'review';
  sinceIndex: number;
  resolution?: { by: string; how: string; atIndex: number };
}

export interface Unit {
  index: number;
  serial: string;
  modelCode: string;
  modelName: string;
  mfgDate: string;
  minute: number; // minutes since midnight of the simulated day
  shift: string;
  operator: string;
  lots: Lots;
  tooling: Tooling;
  results: GateResult[];
  status: UnitStatus;
  hold?: Hold;
}

export interface Fault {
  id: string;
  gate: GateId;
  defectId: string;
  startIndex: number;
  endIndex?: number;
  /** Extra per-unit probability for non-dimension defects. */
  rate: number;
  scope?: { field: ScopeField; value: string | number };
  note?: string;
}

export interface ActionLog {
  id: string;
  atIndex: number;
  by: string;
  gate?: GateId;
  kind: 'inject' | 'corrective' | 'review' | 'rework' | 'dispose' | 'ack' | 'system';
  text: string;
}

export interface InspectionState {
  seed: number;
  /** Index of the next unit to be produced (== units produced so far). */
  next: number;
  faults: Fault[];
  units: Unit[];
  actions: ActionLog[];
}
