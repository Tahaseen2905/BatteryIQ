/**
 * Defect catalogue and measurement specs for the four gates.
 * Every line of the client's inspection checklist is a defect here, with the machine to look at
 * first, the likely cause, and the corrective action.
 */

import type { DefectDef, GateId, MeasureDef } from './types';

/** Scales the per-defect rates so a healthy gate passes about 99 % of batteries. */
export const NOMINAL_SCALE = 0.6;
/** Camera confidence below this sends the call to the operator review queue. */
export const REVIEW_CONFIDENCE = 0.88;
/** The gate's pass rate is judged over its last ROLLING_WINDOW decided calls. */
export const ROLLING_WINDOW = 50;
export const MIN_ALARM_SAMPLE = 30;
export const TARGET_PASS_RATE = 98.0;

/**
 * A gate is in alarm when the share of bad calls in the window is above the 4-sigma upper limit of a
 * p-chart around the target defect rate. With a 98 % target and 50 calls that is 5 or more bad calls,
 * so a few chance defects never raise an alarm on a healthy line, while a real drift does within a minute or two.
 */
export function alarmLimitFailures(n: number): number {
  const p0 = 1 - TARGET_PASS_RATE / 100;
  return Math.floor(n * (p0 + 4 * Math.sqrt((p0 * (1 - p0)) / n))) + 1;
}

export const GATES: Record<GateId, { id: GateId; title: string; short: string; station: string; stage: string; description: string; checklist: string[] }> = {
  Q1: {
    id: 'Q1',
    title: 'Q1: Casing & Appearance Gate',
    short: 'Casing & appearance',
    station: 'After container moulding, during final assembly',
    stage: 'Casing moulding and final assembly',
    description: 'Vision check of the battery body: missing caps and plugs, wrong or damaged terminals, moulding defects, contamination, cracks, scratches, dents and deformation.',
    checklist: [
      'Missing caps, plugs or external components',
      'Incorrect or damaged terminals',
      'Plastic moulding defects and surface contamination',
      'Cracks, scratches, dents and casing deformation',
    ],
  },
  Q2: {
    id: 'Q2',
    title: 'Q2: Terminal & Connector Gate',
    short: 'Terminals & connectors',
    station: 'After cast-on-strap, inter-cell weld and terminal burn',
    stage: 'Terminal assembly and welding',
    description: 'Stereo vision on the terminal posts and connectors: placement, weld quality, missing or bent posts, and position, alignment and height against drawing.',
    checklist: [
      'Incorrect connector placement',
      'Visible defects in terminal welding or connections',
      'Missing, bent or visibly damaged terminals',
      'Terminal position, alignment and dimensions',
    ],
  },
  Q3: {
    id: 'Q3',
    title: 'Q3: Cover, Seal & Assembly Gate',
    short: 'Cover & seal',
    station: 'After heat sealing, before acid fill and formation',
    stage: 'Cover fitting, sealing and final assembly',
    description: 'Optical and thermal check of the cover joint: leakage stains, missing parts, gaps, excess or incomplete sealant, and cover placement and orientation.',
    checklist: [
      'Leakage stains or visible residue',
      'Missing components and assembly mismatches',
      'Visible gaps, excess sealant or incomplete sealing',
      'Incorrect cover placement or orientation',
    ],
  },
  Q4: {
    id: 'Q4',
    title: 'Q4: Label, Barcode & Final Appearance Gate',
    short: 'Label & barcode',
    station: 'Final inspection, before palletising and dispatch',
    stage: 'Final inspection and dispatch preparation',
    description: 'Label placement and print quality, barcode and QR readability, OCR of the printed model code and manufacturing date, and packaging.',
    checklist: [
      'Label placement, print quality and packaging defects',
      'Barcode or QR-code readability',
      'OCR verification of printed codes and manufacturing dates',
      'Correct product label and model identification',
    ],
  },
};

export const DEFECTS: DefectDef[] = [
  // ---- Q1: casing and physical appearance ----
  {
    id: 'q1_missing_cap', gate: 'Q1', label: 'Missing vent cap / plug', checklist: 'Missing caps, plugs or external components',
    severity: 'major', action: 'rework', baseRate: 0.0015, kind: 'missing', region: { x: 150, y: 98, w: 56, h: 56 },
    suspect: 'AF-01', cause: 'Plug feeder jam or empty bowl after acid fill.', fix: 'Clear the plug feeder, refill the bowl and re-fit the cap by hand.', scopeField: 'none',
  },
  {
    id: 'q1_missing_component', gate: 'Q1', label: 'Missing external component (handle / indicator)', checklist: 'Missing caps, plugs or external components',
    severity: 'major', action: 'rework', baseRate: 0.0008, kind: 'missing', region: { x: 300, y: 150, w: 50, h: 30 },
    suspect: 'HR-01', cause: 'Handle or charge-indicator clip not loaded at the finishing station.', fix: 'Reload the clip magazine and fit the part by hand.', scopeField: 'none',
  },
  {
    id: 'q1_wrong_terminal', gate: 'Q1', label: 'Incorrect terminal type / polarity', checklist: 'Incorrect or damaged terminals',
    severity: 'critical', action: 'reject', baseRate: 0.0006, kind: 'wrongpost', region: { x: 300, y: 25, w: 60, h: 50 },
    suspect: 'CS-01', cause: 'Wrong strap mould fitted for this model, or post mould swapped.', fix: 'Verify the strap mould against the job card and quarantine the lot built since changeover.', scopeField: 'strapMould',
  },
  {
    id: 'q1_damaged_terminal', gate: 'Q1', label: 'Damaged terminal post', checklist: 'Incorrect or damaged terminals',
    severity: 'major', action: 'rework', baseRate: 0.0012, kind: 'bent', region: { x: 40, y: 25, w: 60, h: 50 },
    suspect: 'IW-01', cause: 'Handling damage at the unload gripper after welding.', fix: 'Inspect the gripper pads and re-form or replace the post.', scopeField: 'weldHead',
  },
  {
    id: 'q1_short_shot', gate: 'Q1', label: 'Moulding short shot / void', checklist: 'Plastic moulding defects and surface contamination',
    severity: 'major', action: 'reject', baseRate: 0.0012, kind: 'void', region: { x: 215, y: 70, w: 80, h: 40 },
    suspect: 'CONTAINER-LOT', cause: 'Low melt temperature or blocked vent in the container mould.', fix: 'Hold the container lot, raise melt temperature or clean the mould vents.', scopeField: 'containerLot',
  },
  {
    id: 'q1_contamination', gate: 'Q1', label: 'Surface contamination (oil / lead dust)', checklist: 'Plastic moulding defects and surface contamination',
    severity: 'minor', action: 'rework', baseRate: 0.003, kind: 'stain-dark', region: { x: 60, y: 75, w: 70, h: 30 },
    suspect: 'CS-01', cause: 'Lead dust or release agent carried over from the strap station.', fix: 'Wipe the unit, then check extraction and mould-release dosing at CS-01.', scopeField: 'strapMould',
  },
  {
    id: 'q1_crack', gate: 'Q1', label: 'Crack in casing', checklist: 'Cracks, scratches, dents and casing deformation',
    severity: 'critical', action: 'reject', baseRate: 0.001, kind: 'crack', region: { x: 90, y: 150, w: 100, h: 40 },
    suspect: 'CONTAINER-LOT', cause: 'Stress cracking from cold container or ejector damage.', fix: 'Hold the container lot and ask the supplier for a mould and resin check.', scopeField: 'containerLot',
  },
  {
    id: 'q1_scratch', gate: 'Q1', label: 'Scratch longer than 1.5 mm', checklist: 'Cracks, scratches, dents and casing deformation',
    severity: 'minor', action: 'rework', baseRate: 0.003, kind: 'scratch', region: { x: 200, y: 160, w: 110, h: 24 },
    suspect: 'HR-01', cause: 'Rough conveyor guide or debris on the transfer rail.', fix: 'Clean the rail and replace the worn guide strip.', scopeField: 'none',
  },
  {
    id: 'q1_dent', gate: 'Q1', label: 'Dent / casing deformation', checklist: 'Cracks, scratches, dents and casing deformation',
    severity: 'major', action: 'reject', baseRate: 0.0015, kind: 'dent', region: { x: 310, y: 100, w: 44, h: 60 },
    suspect: 'HS-01', cause: 'Platen pressure too high, or the container warped in storage.', fix: 'Check platen pressure and the container storage rack.', scopeField: 'platen',
  },
  {
    id: 'q1_wall_thin', gate: 'Q1', label: 'Wall thickness out of tolerance', checklist: 'Cracks, scratches, dents and casing deformation',
    severity: 'major', action: 'reject', baseRate: 0, kind: 'dimension', region: { x: 40, y: 190, w: 320, h: 30 },
    suspect: 'CONTAINER-LOT', cause: 'Core shift in the container mould drifting wall thickness.', fix: 'Hold the lot and have the mould core re-centred.', measure: 'wall_mm', scopeField: 'containerLot',
  },

  // ---- Q2: terminal and connector ----
  {
    id: 'q2_connector_misplaced', gate: 'Q2', label: 'Incorrect connector placement', checklist: 'Incorrect connector placement',
    severity: 'major', action: 'reject', baseRate: 0.0015, kind: 'offset', region: { x: 60, y: 150, w: 110, h: 50 },
    suspect: 'CS-01', cause: 'Strap locating pin worn, connector seated on the wrong cell.', fix: 'Replace the locating pin and re-teach the strap loader.', scopeField: 'strapMould',
  },
  {
    id: 'q2_weld_defect', gate: 'Q2', label: 'Weld defect (porosity / cold joint)', checklist: 'Visible defects in terminal welding or connections',
    severity: 'critical', action: 'reject', baseRate: 0.002, kind: 'porosity', region: { x: 255, y: 80, w: 70, h: 70 },
    suspect: 'IW-01', cause: 'Low weld current or oxidised lug surface.', fix: 'Check weld current and electrode tip, and dress the electrodes.', scopeField: 'weldHead',
  },
  {
    id: 'q2_weld_spatter', gate: 'Q2', label: 'Weld spatter / burn', checklist: 'Visible defects in terminal welding or connections',
    severity: 'minor', action: 'rework', baseRate: 0.003, kind: 'spatter', region: { x: 240, y: 70, w: 100, h: 30 },
    suspect: 'IW-01', cause: 'Contaminated lug or high weld energy.', fix: 'Clean the lug surfaces and trim the weld energy; remove spatter by hand.', scopeField: 'weldHead',
  },
  {
    id: 'q2_terminal_missing', gate: 'Q2', label: 'Missing terminal / connector', checklist: 'Missing, bent or visibly damaged terminals',
    severity: 'critical', action: 'reject', baseRate: 0.0005, kind: 'missing', region: { x: 75, y: 75, w: 70, h: 70 },
    suspect: 'CS-01', cause: 'Post not cast, or dropped at the unload.', fix: 'Check the strap mould fill and the post catch.', scopeField: 'strapMould',
  },
  {
    id: 'q2_terminal_bent', gate: 'Q2', label: 'Bent / damaged terminal', checklist: 'Missing, bent or visibly damaged terminals',
    severity: 'major', action: 'rework', baseRate: 0.002, kind: 'bent', region: { x: 255, y: 80, w: 70, h: 70 },
    suspect: 'HR-01', cause: 'Terminal burner clamp too tight, or a handling knock.', fix: 'Loosen the burner clamp and re-form the post.', scopeField: 'none',
  },
  {
    id: 'q2_dimension', gate: 'Q2', label: 'Terminal position / alignment out of tolerance', checklist: 'Terminal position, alignment and dimensions',
    severity: 'major', action: 'reject', baseRate: 0, kind: 'dimension', region: { x: 80, y: 196, w: 240, h: 28 },
    suspect: 'CS-01', cause: 'Strap mould wear or fixture drift is walking the post position.', fix: 'Re-align the strap mould fixture and re-qualify with a first-article check.', measure: 'offset_mm', scopeField: 'strapMould',
  },

  // ---- Q3: cover, seal and assembly ----
  {
    id: 'q3_leak_stain', gate: 'Q3', label: 'Leakage stain / visible residue', checklist: 'Leakage stains or visible residue',
    severity: 'critical', action: 'reject', baseRate: 0.0015, kind: 'stain-yellow', region: { x: 40, y: 150, w: 90, h: 45 },
    suspect: 'HS-01', cause: 'A weak joint is weeping electrolyte from the formation fill.', fix: 'Pressure-test the lot; raise platen temperature and dwell.', scopeField: 'platen',
  },
  {
    id: 'q3_missing_component', gate: 'Q3', label: 'Missing component / assembly mismatch', checklist: 'Missing components and assembly mismatches',
    severity: 'major', action: 'rework', baseRate: 0.0015, kind: 'missing', region: { x: 170, y: 100, w: 60, h: 40 },
    suspect: 'HS-01', cause: 'Flame arrestor or vent gasket not loaded before the cover.', fix: 'Refill the feeder and fit the part before re-sealing.', scopeField: 'none',
  },
  {
    id: 'q3_gap', gate: 'Q3', label: 'Visible gap at cover joint', checklist: 'Visible gaps, excess sealant or incomplete sealing',
    severity: 'major', action: 'reject', baseRate: 0.0025, kind: 'gap', region: { x: 310, y: 40, w: 50, h: 60 },
    suspect: 'HS-01', cause: 'Uneven platen pressure, or a cover not fully seated.', fix: 'Level the platen and check the cover pick-and-place height.', scopeField: 'platen',
  },
  {
    id: 'q3_excess_sealant', gate: 'Q3', label: 'Excess sealant / flash', checklist: 'Visible gaps, excess sealant or incomplete sealing',
    severity: 'minor', action: 'rework', baseRate: 0.004, kind: 'blob', region: { x: 100, y: 36, w: 80, h: 24 },
    suspect: 'HS-01', cause: 'Platen temperature or melt depth too high.', fix: 'Trim the flash and reduce platen dwell by 0.5 s.', scopeField: 'platen',
  },
  {
    id: 'q3_incomplete_seal', gate: 'Q3', label: 'Incomplete seal (bead discontinuity)', checklist: 'Visible gaps, excess sealant or incomplete sealing',
    severity: 'major', action: 'reject', baseRate: 0.003, kind: 'gap', region: { x: 200, y: 176, w: 100, h: 26 },
    suspect: 'HS-01', cause: 'Platen heater or thermocouple drift leaves a cold spot, so the bead breaks.',
    fix: 'Re-calibrate the platen thermocouple, check the heater cartridge and re-run the sealing recipe.',
    drift: { measure: 'bead_mm', sdShift: 1.0, spreadMult: 1.5 }, scopeField: 'platen',
  },
  {
    id: 'q3_cover_orientation', gate: 'Q3', label: 'Cover wrong way round / misplaced', checklist: 'Incorrect cover placement or orientation',
    severity: 'critical', action: 'reject', baseRate: 0.0006, kind: 'flip', region: { x: 40, y: 60, w: 60, h: 50 },
    suspect: 'HS-01', cause: 'Cover loader rotated the part, or the wrong cover for the model.', fix: 'Check the cover orientation sensor and the model changeover.', scopeField: 'none',
  },
  {
    id: 'q3_bead_width', gate: 'Q3', label: 'Seal bead width out of tolerance', checklist: 'Visible gaps, excess sealant or incomplete sealing',
    severity: 'major', action: 'reject', baseRate: 0, kind: 'dimension', region: { x: 120, y: 200, w: 160, h: 26 },
    suspect: 'HS-01', cause: 'Platen temperature drift is changing the melt width.', fix: 'Re-calibrate the platen temperature and verify the melt depth.', measure: 'bead_mm', scopeField: 'platen',
  },

  // ---- Q4: label, barcode and final appearance ----
  {
    id: 'q4_label_placement', gate: 'Q4', label: 'Label misplaced / skewed', checklist: 'Label placement, print quality and packaging defects',
    severity: 'minor', action: 'rework', baseRate: 0, kind: 'skew', region: { x: 50, y: 30, w: 300, h: 180 },
    suspect: 'LB-01', cause: 'Applicator roller worn, or label web tension off.', fix: 'Re-tension the web and re-seat the applicator roller; relabel.', measure: 'skew_deg', scopeField: 'none',
  },
  {
    id: 'q4_print_quality', gate: 'Q4', label: 'Poor print (smudged / faded)', checklist: 'Label placement, print quality and packaging defects',
    severity: 'minor', action: 'rework', baseRate: 0.0025, kind: 'smudge', region: { x: 70, y: 95, w: 150, h: 30 },
    suspect: 'LB-01', cause: 'Thermal-transfer ribbon near its end, or printhead dirty.', fix: 'Replace the ribbon, clean the printhead and relabel.', scopeField: 'none',
  },
  {
    id: 'q4_packaging', gate: 'Q4', label: 'Packaging defect (torn wrap / carton)', checklist: 'Label placement, print quality and packaging defects',
    severity: 'minor', action: 'rework', baseRate: 0.0015, kind: 'tear', region: { x: 30, y: 5, w: 340, h: 24 },
    suspect: 'LB-01', cause: 'Shrink-wrap tunnel temperature or film snag.', fix: 'Check tunnel temperature and re-wrap the unit.', scopeField: 'none',
  },
  {
    id: 'q4_barcode_unreadable', gate: 'Q4', label: 'Barcode / QR unreadable (grade D or F)', checklist: 'Barcode or QR-code readability',
    severity: 'major', action: 'rework', baseRate: 0, kind: 'lowcontrast', region: { x: 250, y: 60, w: 90, h: 90 },
    suspect: 'LB-01', cause: 'Print contrast falling: ribbon, printhead heat or label stock.', fix: 'Raise printhead heat, change the ribbon and re-grade with the verifier.', measure: 'contrast_pct', scopeField: 'none',
  },
  {
    id: 'q4_ocr_mismatch', gate: 'Q4', label: 'OCR mismatch on date code', checklist: 'OCR verification of printed codes and manufacturing dates',
    severity: 'critical', action: 'reject', baseRate: 0.0008, kind: 'ocr', region: { x: 70, y: 125, w: 150, h: 28 },
    suspect: 'LB-01', cause: 'Date-code printer not synchronised with the MES clock or job.', fix: 'Re-sync the printer with the MES job and quarantine units printed since the last good check.', scopeField: 'none',
  },
  {
    id: 'q4_wrong_label', gate: 'Q4', label: 'Wrong product label / model mismatch', checklist: 'Correct product label and model identification',
    severity: 'critical', action: 'reject', baseRate: 0.0005, kind: 'ocr', region: { x: 70, y: 60, w: 170, h: 30 },
    suspect: 'LB-01', cause: 'Label roll for another model loaded at changeover.', fix: 'Verify the label roll against the job card and re-inspect the units since changeover.', scopeField: 'none',
  },
];

export const MEASURES: MeasureDef[] = [
  { key: 'wall_mm', gate: 'Q1', label: 'Wall thickness', unit: 'mm', mean: 2.85, sd: 0.045, lsl: 2.6, usl: 3.1, driftDir: -1, decimals: 2 },
  { key: 'offset_mm', gate: 'Q2', label: 'Terminal position offset', unit: 'mm', mean: 0.16, sd: 0.04, lsl: 0, usl: 0.4, driftDir: 1, folded: true, decimals: 2 },
  { key: 'height_mm', gate: 'Q2', label: 'Terminal height', unit: 'mm', mean: 18.0, sd: 0.09, lsl: 17.5, usl: 18.5, driftDir: 1, decimals: 2 },
  { key: 'angle_deg', gate: 'Q2', label: 'Terminal alignment', unit: '°', mean: 0.35, sd: 0.15, lsl: 0, usl: 0.9, driftDir: 1, folded: true, decimals: 2 },
  { key: 'bead_mm', gate: 'Q3', label: 'Seal bead width', unit: 'mm', mean: 3.4, sd: 0.065, lsl: 3.05, usl: 3.75, driftDir: 1, decimals: 2 },
  { key: 'contrast_pct', gate: 'Q4', label: 'QR print contrast', unit: '%', mean: 93, sd: 1.8, lsl: 80, usl: 100, driftDir: -1, max: 100, decimals: 1 },
  { key: 'skew_deg', gate: 'Q4', label: 'Label skew', unit: '°', mean: 0.35, sd: 0.15, lsl: 0, usl: 1.2, driftDir: 1, folded: true, decimals: 2 },
];

export const DEFECT_BY_ID: Record<string, DefectDef> = Object.fromEntries(DEFECTS.map((d) => [d.id, d]));
export const MEASURE_BY_KEY: Record<string, MeasureDef> = Object.fromEntries(MEASURES.map((m) => [m.key, m]));

export const defectsOf = (gate: GateId) => DEFECTS.filter((d) => d.gate === gate);
export const measuresOf = (gate: GateId) => MEASURES.filter((m) => m.gate === gate);
/** The measurement charted on the gate's SPC page. */
export const primaryMeasure = (gate: GateId) => measuresOf(gate)[0];

export const MODELS = [
  { code: 'MLDIN74', name: 'Exide Mileage DIN74 (74 Ah)', weight: 0.4 },
  { code: 'EEZY35L', name: 'Exide Eezy EZ35L (35 Ah)', weight: 0.35 },
  { code: 'MTRED66', name: 'Exide Matrix RED DIN66 (66 Ah)', weight: 0.25 },
];
