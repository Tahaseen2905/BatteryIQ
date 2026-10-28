/**
 * What each machine does and measures, beyond the headline readings on its machine sheet:
 * the steps of its cycle, the full set of sensor tags, and how its power draw follows the cycle.
 */

import type { MachineStation, SensorTag } from '../types';

export const STEPS: Record<string, string[]> = {
  'GC-01': ['Melt and hold', 'Pour into mould', 'Solidify', 'Eject grids', 'Trim and stack'],
  'OM-01': ['Charge lead', 'Tumble and oxidise', 'Cool with air', 'Classify powder', 'Discharge to silo'],
  'PM-01': ['Dry mix oxide', 'Add water', 'Add acid', 'Mix and cool', 'Discharge paste'],
  'PP-01': ['Feed grids', 'Paste fill', 'Flash-dry surface', 'Part the plates', 'Stack plates'],
  'CC-01': ['Load racks', 'Steam up', 'Humid cure', 'Dry out', 'Unload'],
  'CS-01': ['Load plate group', 'Flux the lugs', 'Close strap mould', 'Pour lead', 'Cool and eject'],
  'IW-01': ['Load cells', 'Align partitions', 'Squeeze', 'Weld pulse', 'Hold and release'],
  'HS-01': ['Load container and lid', 'Heat platens', 'Press and fuse', 'Cool and hold', 'Leak test'],
  'AF-01': ['Load battery', 'Pull vacuum', 'Fill acid', 'Level check', 'Seal plugs'],
  'FB-01': ['Connect leads', 'Soak', 'Ramp current', 'Hold charge', 'Cool and disconnect'],
  'HR-01': ['Load battery', 'Clamp terminals', 'High-rate discharge', 'Check voltage', 'Burn terminals'],
  'LB-01': ['Feed battery', 'Print label', 'Apply label', 'Read barcode and OCR', 'Pack and stack'],
};

/** Relative power draw in each step (1 = average). */
export const STEP_LOAD: Record<string, number[]> = {
  'GC-01': [1.1, 1.0, 0.8, 0.9, 1.0],
  'OM-01': [0.6, 1.3, 1.1, 0.9, 0.7],
  'PM-01': [0.8, 0.7, 0.8, 1.4, 0.9],
  'CC-01': [0.4, 1.4, 1.2, 1.1, 0.4],
  'HS-01': [0.4, 1.4, 1.2, 0.8, 0.6],
  'FB-01': [0.3, 0.6, 1.5, 1.2, 0.4],
  'HR-01': [0.3, 0.5, 1.8, 0.6, 0.8],
};
const GENERIC_LOAD = [0.5, 0.9, 1.3, 1.0, 0.6];

/** Extra sensor tags: name, value, unit, normal min, normal max, source. */
type Extra = [string, number, string, number, number, SensorTag['source']];
export const EXTRA_TAGS: Record<string, Extra[]> = {
  'GC-01': [['Mould #1 Temp', 156.2, '°C', 145, 165, 'Wireless_IoT'], ['Ladle Level', 72, '%', 55, 90, 'Analogue_4_20mA'], ['Grid Weight', 38.4, 'g', 37, 40, 'OPC_UA'], ['Cooling Water Flow', 46, 'L/min', 40, 55, 'Modbus'], ['Hydraulic Pressure', 118, 'bar', 105, 130, 'OPC_UA']],
  'OM-01': [['Airflow', 420, 'm³/h', 380, 460, 'Modbus'], ['Pot Rotation Speed', 36, 'rpm', 33, 39, 'OPC_UA'], ['Oxide Particle Size', 4.1, 'µm', 3.5, 4.8, 'Wireless_IoT'], ['Cooling Air Temp', 62, '°C', 50, 75, 'Analogue_4_20mA'], ['Silo Level', 64, '%', 20, 90, 'Analogue_4_20mA']],
  'PM-01': [['Acid Addition Rate', 12, 'L/min', 10.5, 13.5, 'Modbus'], ['Water Addition', 38, 'L/min', 34, 42, 'Modbus'], ['Mixer Motor Current', 142, 'A', 120, 165, 'OPC_UA'], ['Paste Penetration', 31, '1/10 mm', 28, 34, 'Wireless_IoT'], ['Batch Weight', 1480, 'kg', 1450, 1510, 'OPC_UA']],
  'PP-01': [['Belt Speed', 22, 'm/min', 20, 24, 'OPC_UA'], ['Plate Thickness', 1.71, 'mm', 1.65, 1.78, 'Wireless_IoT'], ['Flash-Dryer Temp', 285, '°C', 270, 300, 'Analogue_4_20mA'], ['Paste Hopper Level', 58, '%', 30, 90, 'Analogue_4_20mA'], ['Parting Knife Wear', 38, '%', 0, 80, 'Wireless_IoT']],
  'CC-01': [['Wet Bulb Temp', 53.6, '°C', 50, 57, 'Analogue_4_20mA'], ['Steam Pressure', 2.4, 'bar', 2.0, 2.8, 'Modbus'], ['Cure Time Elapsed', 36, 'h', 0, 48, 'OPC_UA'], ['Exhaust Fan Speed', 1180, 'rpm', 1100, 1250, 'OPC_UA'], ['Plate Moisture', 1.6, '%', 0.5, 2.5, 'Wireless_IoT']],
  'CS-01': [['Lead Pot Temp', 468, '°C', 450, 490, 'OPC_UA'], ['Pour Time', 3.2, 's', 2.8, 3.6, 'OPC_UA'], ['Lug Penetration', 2.1, 'mm', 1.8, 2.5, 'Wireless_IoT'], ['Mould Clamp Force', 8.6, 'kN', 7.5, 9.5, 'Modbus'], ['Flux Tank Level', 66, '%', 20, 95, 'Analogue_4_20mA']],
  'IW-01': [['Weld Time', 0.42, 's', 0.38, 0.46, 'OPC_UA'], ['Shear Strength', 148, 'N', 140, 160, 'Wireless_IoT'], ['Electrode Tip Temp', 74, '°C', 55, 95, 'Analogue_4_20mA'], ['Cooling Water Temp', 24.5, '°C', 18, 30, 'Analogue_4_20mA'], ['Pneumatic Pressure', 6.2, 'bar', 5.5, 7.0, 'Modbus']],
  'HS-01': [['Platen 1 Temp', 376, '°C', 365, 385, 'OPC_UA'], ['Platen 2 Temp', 374, '°C', 365, 385, 'OPC_UA'], ['Seal Pressure', 5.2, 'bar', 4.8, 5.6, 'Modbus'], ['Dwell Time', 4.5, 's', 4.2, 4.8, 'OPC_UA'], ['Leak Test Pressure', 0.35, 'bar', 0.30, 0.40, 'Analogue_4_20mA']],
  'AF-01': [['Fill Vacuum', -85, 'kPa', -90, -80, 'Modbus'], ['Fill Time', 22, 's', 20, 25, 'OPC_UA'], ['Acid Tank Level', 71, '%', 25, 95, 'Analogue_4_20mA'], ['Fill Volume per Cell', 410, 'mL', 400, 420, 'OPC_UA'], ['Acid Pump Pressure', 2.1, 'bar', 1.8, 2.5, 'Modbus']],
  'FB-01': [['Bath Coolant Return', 37.2, '°C', 30, 36, 'Wireless_IoT'], ['Charge Voltage', 15.6, 'V', 14.4, 16.2, 'OPC_UA'], ['Ah Delivered', 61, '%', 0, 100, 'OPC_UA'], ['Coolant Flow', 52, 'L/min', 45, 60, 'Modbus'], ['Electrolyte Temp', 41, '°C', 30, 52, 'Wireless_IoT']],
  'HR-01': [['Discharge Current', 480, 'A', 450, 510, 'OPC_UA'], ['Terminal Burn Temp', 410, '°C', 380, 440, 'Analogue_4_20mA'], ['Clamp Pressure', 4.6, 'bar', 4.0, 5.2, 'Modbus'], ['Cold Crank Result', 102, '%', 95, 115, 'OPC_UA'], ['Fume Extraction', 420, 'm³/h', 350, 480, 'Modbus']],
  'LB-01': [['Print Contrast', 93, '%', 85, 100, 'Wireless_IoT'], ['Label Skew', 0.35, '°', 0, 1.2, 'Wireless_IoT'], ['Ribbon Remaining', 64, '%', 15, 100, 'Analogue_4_20mA'], ['Printhead Temp', 52, '°C', 40, 65, 'Analogue_4_20mA'], ['OCR Match Rate', 99.9, '%', 99, 100, 'OPC_UA']],
};

/** Adds the extra tags to a machine, keeping its headline tags first. */
export function withModel(m: MachineStation): MachineStation {
  const extras = (EXTRA_TAGS[m.code] ?? []).map(([name, value, unit, min, max, source], i): SensorTag => ({
    id: `x-${m.code}-${i}`,
    name,
    value,
    unit,
    minNormal: min,
    maxNormal: max,
    history: Array.from({ length: 8 }, (_, k) => Number((value + Math.sin(k * 1.7 + i) * (max - min) * 0.03).toFixed(3))),
    source,
    samplingRateHz: source === 'Wireless_IoT' ? 2 : source === 'Analogue_4_20mA' ? 1 : 5,
  }));
  return { ...m, tags: [...m.tags, ...extras] };
}

export const stepsOf = (code: string) => STEPS[code] ?? ['Load', 'Process', 'Hold', 'Unload'];
export const loadOf = (code: string, n: number) => (STEP_LOAD[code] && STEP_LOAD[code].length === n ? STEP_LOAD[code] : GENERIC_LOAD.slice(0, n));

/** Where in its cycle a machine is at a given moment. Cycles are shown between 30 and 60 s so the demo always moves. */
export function cyclePosition(code: string, cycleSec: number, seconds: number) {
  const steps = stepsOf(code);
  const shownSec = Math.min(60, Math.max(30, cycleSec));
  const f = (((seconds / shownSec) % 1) + 1) % 1;
  const index = Math.min(steps.length - 1, Math.floor(f * steps.length));
  return { steps, index, within: f * steps.length - index, fraction: f, shownSec, changed: Math.abs(shownSec - cycleSec) > 0.5 };
}

export const stateOfTag = (t: SensorTag, v: number): 'ok' | 'near' | 'out' => {
  if (v < t.minNormal || v > t.maxNormal) return 'out';
  const band = t.maxNormal - t.minNormal;
  return v < t.minNormal + band * 0.08 || v > t.maxNormal - band * 0.08 ? 'near' : 'ok';
};

export const fmtTag = (t: SensorTag, v: number) => {
  const d = Math.abs(t.maxNormal - t.minNormal) < 3 ? 2 : Math.abs(v) >= 1000 ? 0 : 1;
  return v.toFixed(d);
};
