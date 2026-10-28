/**
 * BatteryIQ Core Data Types
 * Comprehensive models for industrial battery manufacturing, IIoT, and 3D digital twins.
 */

export type ProcessPackType = 'lead_acid' | 'lithium_ion';

export type MachineStatus = 'nominal' | 'attention' | 'stopped';

export type AreaCategory = 'electrode_grid' | 'cell_assembly' | 'chemical_formation' | 'pack_dispatch' | 'utilities';

export interface SensorTag {
  id: string;
  name: string;
  value: number;
  unit: string;
  minNormal: number;
  maxNormal: number;
  history: number[]; // 10-20 points for micro trend
  source: 'OPC_UA' | 'Modbus' | 'Wireless_IoT' | 'Analogue_4_20mA';
  samplingRateHz: number;
}

export interface PartHealth {
  partName: string;
  healthPercent: number;
  remainingDays: number;
  weibullBeta: number;
  failureMode: string;
  riskLevel: 'low' | 'medium' | 'high';
  replacementCostEstimate: number;
}

export interface MachineStation {
  id: string;
  name: string;
  code: string; // e.g. "GC-01", "MX-01"
  area: AreaCategory;
  processPack: ProcessPackType;
  description: string;
  status: MachineStatus;
  statusReason?: string;
  currentStep: string;
  stepProgress: number; // 0 - 100%
  cycleTimeSec: number;
  standardCycleTimeSec: number;
  shiftOee: number; // e.g. 86.4%
  availability: number;
  performance: number;
  quality: number;
  tags: SensorTag[];
  parts: PartHealth[];
  aiHealthScore: number; // 0 - 100
  failureChance7d: number; // 0 - 100%
  failureChance30d: number; // 0 - 100%
  powerConsumptionKw: number;
  goldenBatchProfile: {
    stepName: string;
    targetVal: number;
    currentVal: number;
    tolerance: number;
    unit: string;
  }[];
  position3D: [number, number, number]; // x, y, z coordinates on 3D floor
  bufferAfterUnits: number; // WIP buffer to next machine
  bufferCapacity: number;
}

export interface QualityGate {
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  title: string;
  stationName: string;
  description: string;
  inspectedCount: number;
  passedCount: number;
  reworkCount: number;
  rejectCount: number;
  passRatePercent: number;
  targetPassRatePercent: number;
  inAlarm: boolean;
  holdCount: number;
  escalationLevel: 'operator' | 'shift_in_charge' | 'plant_head' | 'resolved';
  lastRejectBatch: string;
  lastRejectUnitId: string;
  recentDefects: {
    defectType: string;
    count: number;
    severity: 'minor' | 'major' | 'critical';
  }[];
  spcData: {
    characteristic: string;
    unit: string;
    mean: number;
    range: number;
    ucl: number;
    lcl: number;
    usl: number;
    lsl: number;
    cp: number;
    cpk: number;
    recentSamples: number[];
  };
  /** Pass rate over the whole shift (passRatePercent is the rolling rate the alarm watches). */
  shiftPassRatePercent: number;
  /** Calls waiting for an operator to review. */
  reviewCount: number;
}

export interface PlantAlarm {
  id: string;
  code: string;
  machineId: string;
  machineName: string;
  severity: 'minor' | 'major' | 'critical';
  timestamp: string;
  cause: string;
  recommendedFix: string;
  impact: string;
  triggerReading: string;
  readingValue: string;
  threshold: string;
  escalation: 'operator' | 'shift_in_charge' | 'plant_head';
  acknowledged: boolean;
  acknowledgedBy?: string;
  /** Set on alarms raised by an inspection gate. */
  gate?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  /** Units produced when the alarm was raised / cleared (the plant clock is derived from it). */
  raisedAt?: number;
  resolvedAt?: number;
  suspect?: string;
  /** The defect behind a gate alarm. */
  defectId?: string;
  correctiveAction?: string;
}

export interface EdgeGateway {
  machineId: string;
  ipAddress: string;
  opcUaStatus: 'connected' | 'degraded' | 'disconnected';
  modbusStatus: 'connected' | 'idle';
  mqttBroker: 'plant-mqtt.exide.internal:1883';
  bufferDays: number;
  bufferOccupancyPercent: number;
  cpuLoadPercent: number;
  memoryUsagePercent: number;
  firmwareVersion: string;
  lastSyncTimestamp: string;
}

export interface ShiftProductionMetrics {
  shiftName: string;
  shiftLead: string;
  plannedUnits: number;
  actualUnits: number;
  goodUnits: number;
  rejectedUnits: number;
  lineOee: number;
  firstPassYield: number;
  hourlyOutput: {
    hourLabel: string;
    target: number;
    actual: number;
  }[];
  downtimePareto: {
    reason: string;
    minutes: number;
    category: 'breakdown' | 'changeover' | 'starvation' | 'quality_hold';
  }[];
}

export interface BatchTraceRecord {
  unitId: string;
  batchId: string;
  producedTimestamp: string;
  processLine: ProcessPackType;
  primaryDefect?: string;
  slurryBatchOrLeadOxideLot: string;
  foilOrGridAlloyLot: string;
  casingMouldOrContainerLot: string;
  assemblyMachine: string;
  curingOrFormationBathId: string;
  operatorId: string;
  shift: string;
  status: 'passed' | 'rework' | 'quarantined';
  unitIndex?: number;
  gate?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  defectIds?: string[];
  model?: string;
}
