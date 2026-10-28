/**
 * The demo opens at 16:42 in Shift B with a seal problem already in play: HS-01 platen 2
 * has started to run cold, so the Q3 gate is in alarm with bead breaks clustering on that platen.
 */

import { createInitialState } from './engine';
import type { Fault, InspectionState } from './types';

export const DEMO_SEED = 20261028;
/** Batteries produced between 14:00 and 16:42. */
export const DEMO_PRELOAD = 540;

export const DEMO_FAULTS: Fault[] = [
  {
    id: 'flt-seed-q3',
    gate: 'Q3',
    defectId: 'q3_incomplete_seal',
    startIndex: 470,
    rate: 0.9,
    scope: { field: 'platen', value: 2 },
    note: 'HS-01 platen 2 thermocouple drifting low',
  },
];

export const initialInspection = (): InspectionState => createInitialState(DEMO_SEED, DEMO_PRELOAD, DEMO_FAULTS);
