/**
 * App.tsx
 * BatteryIQ main container. One seeded inspection engine (src/inspection) drives the gate cards,
 * hold bay, SPC, alarms, shift figures, traces and the copilot, so every page agrees.
 * Screens have URLs: #/quality_gates/Q3/spc, #/machine/HS-01, #/alarms.
 */

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { CopilotContext } from './copilot/brain';
import { MachineStation, PlantAlarm } from './types';
import { INITIAL_ALARMS, INITIAL_LEAD_ACID_MACHINES, INITIAL_SHIFT_METRICS } from './services/simulation';
import { Sidebar } from './components/Sidebar';
import { ControlRoom } from './components/ControlRoom';
import { LineMonitor } from './components/LineMonitor';
import { MachineDetailView } from './components/MachineDetailView';
import { GateSection, GATE_SECTIONS, QualityGatesView } from './components/QualityGatesView';
import { PredictiveMaintenanceView } from './components/PredictiveMaintenanceView';
import { SensorsGatewaysView } from './components/SensorsGatewaysView';
import { ReportsView } from './components/ReportsView';
import { AlarmsView } from './components/AlarmsView';
import { ProductionView } from './components/ProductionView';
import { TracePanel } from './components/quality/TracePanel';
import { CopilotDrawer } from './components/CopilotDrawer';
import { CopilotView } from './components/CopilotView';
import { IntegrationsView } from './components/IntegrationsView';
import { SettingsView } from './components/SettingsView';
import { Toaster } from './components/toasts';
import { syncGateAlarms } from './inspection/alarms';
import { DEFECT_BY_ID } from './inspection/catalogue';
import { SIM_DATE, clockAt, inspectionReducer } from './inspection/engine';
import { liveMachines } from './inspection/impact';
import { initialInspection } from './inspection/scenario';
import { buildQualityGates, buildShiftMetrics, lineFigures } from './inspection/selectors';
import { GATE_IDS, GateId } from './inspection/types';
import { useHashRoute } from './lib/useHashRoute';
import type { InspectionAction } from './inspection/engine';
import { USERS, can } from './domain/plant';
import { ModelView } from './components/ModelView';
import { ValueView } from './components/ValueView';
import { HistoryView } from './components/HistoryView';
import { DeploymentView } from './components/DeploymentView';
import { toast } from './components/toasts';
import { Moon, Sun, ChevronDown, Zap, RotateCcw, Menu, ArrowRight, Pause, Play } from 'lucide-react';

/** Real seconds between two batteries reaching the first gate. */
const TICK_MS = 1500;
const OPERATOR = 'Shift In-Charge (Demo)';

/** Demo events: each injects a real defect at a gate, and the gate, alarm and machine react. */
const DEMO_EVENTS: { gate: GateId; defectId: string }[] = [
  { gate: 'Q1', defectId: 'q1_missing_cap' },
  { gate: 'Q1', defectId: 'q1_crack' },
  { gate: 'Q2', defectId: 'q2_weld_defect' },
  { gate: 'Q2', defectId: 'q2_dimension' },
  { gate: 'Q3', defectId: 'q3_incomplete_seal' },
  { gate: 'Q3', defectId: 'q3_leak_stain' },
  { gate: 'Q4', defectId: 'q4_ocr_mismatch' },
  { gate: 'Q4', defectId: 'q4_barcode_unreadable' },
];

interface StationEvent {
  id: string;
  code: string;
  title: string;
  desc: string;
  machineCode: string;
  severity: 'critical' | 'major' | 'info';
}

export default function App() {
  const [route, go] = useHashRoute();
  const tab = route[0] || 'control_room';

  // The plant: machines (with operator-injected station faults) and the inspection engine
  const [baseMachines, setBaseMachines] = useState<MachineStation[]>(INITIAL_LEAD_ACID_MACHINES);
  const [inspection, dispatch] = useReducer(inspectionReducer, undefined, initialInspection);
  const [alarms, setAlarms] = useState<PlantAlarm[]>(() => syncGateAlarms(INITIAL_ALARMS, initialInspection()));
  const [stationEvent, setStationEvent] = useState<StationEvent | null>(null);

  // UI
  const [running, setRunning] = useState(true);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [roleIndex, setRoleIndex] = useState(1);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // A stopped station starves or blocks the line: no battery moves until it is reset
  const stoppedStations = baseMachines.filter((m) => m.status === 'stopped').map((m) => m.code);
  const lineStopped = stoppedStations.length > 0;

  // The line: one battery reaches the first gate every tick
  const [tickMs, setTickMs] = useState(TICK_MS);
  useEffect(() => {
    // lets a screen recording speed the line up or hold it, without touching the Pause button
    (window as unknown as { __setTickMs?: (ms: number) => void }).__setTickMs = setTickMs;
  }, []);
  useEffect(() => {
    if (!running || lineStopped) return;
    const t = setInterval(() => dispatch({ type: 'tick' }), tickMs);
    return () => clearInterval(t);
  }, [running, lineStopped, tickMs]);

  // Gate alarms follow the gates: raised, escalated while unacknowledged, cleared on recovery
  useEffect(() => {
    setAlarms((prev) => syncGateAlarms(prev, inspection));
  }, [inspection]);

  // ---- derived, all from the one model ----
  const machines = useMemo(() => liveMachines(baseMachines, inspection, alarms), [baseMachines, inspection, alarms]);
  const openGates = useMemo(() => new Set(alarms.filter((a) => a.gate && a.resolvedAt == null).map((a) => a.gate!)), [alarms]);
  const qualityGates = useMemo(() => buildQualityGates(inspection, openGates), [inspection, openGates]);
  const figures = useMemo(() => lineFigures(inspection), [inspection]);
  const lineOee = useMemo(() => {
    const avg = (f: (m: MachineStation) => number) => machines.reduce((a, m) => a + f(m), 0) / Math.max(machines.length, 1);
    return Math.round((avg((m) => m.availability) * avg((m) => m.performance) * figures.firstPassYield) / 100) / 100;
  }, [machines, figures.firstPassYield]);
  const shiftMetrics = useMemo(() => ({ ...buildShiftMetrics(inspection, INITIAL_SHIFT_METRICS), lineOee }), [inspection, lineOee]);
  const clock = clockAt(inspection.next);
  const openAlarms = alarms.filter((a) => a.resolvedAt == null);
  const faultActive = inspection.faults.some((f) => f.endIndex == null) || baseMachines.some((m) => m.status !== 'nominal');

  // ---- navigation ----
  const defaultGate = (): GateId => GATE_IDS.find((g) => qualityGates[g].inAlarm) ?? 'Q1';
  const goGate = (gate: GateId, section: GateSection = 'live') => go('quality_gates', gate, section);
  const goMachine = (code: string) => {
    if (machines.some((m) => m.code === code)) go('machine', code);
  };
  const selectTab = (next: string) => {
    if (next === 'quality_gates') return goGate(defaultGate());
    go(next);
  };

  // The copilot reads the line as it is when it answers, and its buttons open the page they name
  const copilotRef = useRef<CopilotContext | undefined>(undefined);
  copilotRef.current = { machines, qualityGates, alarms, shiftMetrics, inspection, lineOee };
  const getCopilotContext = () => copilotRef.current!;
  const openFromCopilot = (to: string) => {
    setIsCopilotOpen(false);
    window.location.hash = to;
  };

  // ---- who is acting, and what their role allows ----
  const actor = USERS[roleIndex].name;
  const NEEDS: Record<string, string> = {
    review: 'Release or confirm a review item',
    rework: 'Mark rework done',
    dispose: 'Dispose of a rejected battery',
    endFault: 'Apply a corrective action',
    note: 'Apply a corrective action',
    ack: 'Acknowledge a gate or machine alarm',
  };
  const allowed = (capability: string) => {
    if (can(roleIndex, capability)) return true;
    toast({ title: `${USERS[roleIndex].role} cannot do this`, detail: `"${capability}" needs another role. Switch role in the top bar.`, tone: 'amber' });
    return false;
  };
  /** Every operator action goes through here: checked against the role, and logged under the person's name. */
  const guarded = (a: InspectionAction) => {
    const need = NEEDS[a.type];
    if (need && !allowed(need)) return;
    dispatch(need && 'by' in a ? { ...a, by: actor } : a);
  };

  // ---- handlers ----
  const acknowledge = (alarmId: string) => {
    if (!allowed('Acknowledge a gate or machine alarm')) return;
    const a = alarms.find((x) => x.id === alarmId);
    setAlarms((prev) => prev.map((x) => (x.id === alarmId ? { ...x, acknowledged: true, acknowledgedBy: actor } : x)));
    if (a?.gate) dispatch({ type: 'ack', gate: a.gate, by: actor });
  };

  const injectDemoEvent = (gate: GateId, defectId: string) => {
    dispatch({ type: 'inject', gate, defectId, by: 'Demo events' });
    setIsEventsOpen(false);
  };

  const resetAll = () => {
    dispatch({ type: 'reset', seed: inspection.seed, preload: 540, faults: initialInspection().faults });
    setBaseMachines(INITIAL_LEAD_ACID_MACHINES);
    setAlarms(syncGateAlarms(INITIAL_ALARMS, initialInspection()));
    setStationEvent(null);
    setIsEventsOpen(false);
  };

  const clearFaults = () => {
    dispatch({ type: 'clearFaults', by: OPERATOR });
    setBaseMachines(INITIAL_LEAD_ACID_MACHINES);
    setStationEvent(null);
    setIsEventsOpen(false);
  };

  // A station fault raised from a machine page: that machine stops and an alarm goes up
  const injectStationFault = (machineCode: string) => {
    const target = baseMachines.find((m) => m.code === machineCode);
    setBaseMachines((prev) =>
      prev.map((m) => {
        if (m.code !== machineCode) return m;
        const primary = m.tags[0];
        const spike = primary ? Number((primary.maxNormal * 1.5).toFixed(1)) : 100;
        return {
          ...m,
          status: 'stopped',
          statusReason: `Operator test fault: high vibration and thermal drift on ${machineCode}.`,
          shiftOee: 62.0,
          aiHealthScore: 48,
          tags: m.tags.map((t, i) => (i === 0 ? { ...t, value: spike, history: [...t.history.slice(1), spike] } : t)),
        };
      }),
    );
    setAlarms((prev) => [
      {
        id: `alm-station-${machineCode}-${inspection.next}`,
        code: `ALM-${machineCode}-FAULT`,
        machineId: target?.id || machineCode,
        machineName: `${machineCode} ${target?.name || ''}`,
        severity: 'critical',
        timestamp: 'Just now',
        cause: `Operator test fault: station ${machineCode} safety interlock tripped.`,
        recommendedFix: 'Run the diagnostic self-test, verify sensor registers and clear the station lock.',
        impact: 'Station halted. The in-feed buffer fills with work in progress.',
        triggerReading: 'Manual test trigger',
        readingValue: 'Alarm high',
        threshold: 'Nominal',
        escalation: 'operator',
        acknowledged: false,
        raisedAt: inspection.next,
        suspect: machineCode,
      },
      ...prev,
    ]);
    setStationEvent({
      id: `se-${machineCode}`,
      code: `ALM-${machineCode}-FAULT`,
      title: `Station ${machineCode} halted by operator console`,
      desc: `Safety interlock engaged on ${machineCode}, so the line has stopped. Reset the station to resume.`,
      machineCode,
      severity: 'critical',
    });
  };

  const clearStationFault = (machineCode: string) => {
    setBaseMachines((prev) => prev.map((m) => (m.code === machineCode ? { ...(INITIAL_LEAD_ACID_MACHINES.find((x) => x.code === machineCode) ?? m) } : m)));
    setAlarms((prev) => prev.map((a) => (a.code === `ALM-${machineCode}-FAULT` && a.resolvedAt == null ? { ...a, resolvedAt: inspection.next, acknowledged: true, acknowledgedBy: `${OPERATOR} (cleared)` } : a)));
    if (stationEvent?.machineCode === machineCode) setStationEvent(null);
  };

  // Banner: a station event, else the most serious gate alarm nobody has acknowledged yet
  const banner = useMemo(() => {
    if (stationEvent) return { title: stationEvent.title, desc: stationEvent.desc, machine: stationEvent.machineCode, gate: undefined as GateId | undefined, onClear: () => clearStationFault(stationEvent.machineCode) };
    const a = openAlarms
      .filter((x) => x.gate && !x.acknowledged)
      .sort((x, y) => Number(y.severity === 'critical') - Number(x.severity === 'critical'))[0];
    if (!a || !a.gate) return null;
    const def = a.defectId ? DEFECT_BY_ID[a.defectId] : undefined;
    return {
      title: `Gate ${a.gate} below target at ${a.readingValue}`,
      desc: `${def?.label ?? 'Defects rising'}. ${a.escalation === 'operator' ? 'Operator panel notified.' : a.escalation === 'shift_in_charge' ? 'Shift in-charge notified.' : 'Escalated to the plant head.'}`,
      machine: a.suspect && a.suspect !== 'CONTAINER-LOT' ? a.suspect : undefined,
      gate: a.gate,
      onClear: undefined as (() => void) | undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationEvent, openAlarms]);

  const machineRoute = tab === 'machine' ? machines.find((m) => m.code === route[1]) : undefined;
  const currentTab = tab === 'machine' ? 'line_monitor' : tab;

  const controlRoom = (
    <ControlRoom
      machines={machines}
      qualityGates={qualityGates}
      alarms={alarms}
      shiftMetrics={shiftMetrics}
      processPack="lead_acid"
      isDarkMode={isDarkMode}
      onSelectMachine={(m) => go('machine', m.code)}
      onSelectGate={(g) => goGate(g.id)}
      onAcknowledgeAlarm={acknowledge}
      onOpenCopilot={() => setIsCopilotOpen(true)}
      onNavigateTab={selectTab}
      isFaultInjected={faultActive}
      onToggleFault={() => (faultActive ? clearFaults() : injectDemoEvent('Q3', 'q3_incomplete_seal'))}
      inspection={inspection}
      clock={clock}
    />
  );

  const sidebar = (
    <Sidebar
      currentTab={currentTab}
      onSelectTab={(t) => {
        selectTab(t);
        setIsMobileSidebarOpen(false);
      }}
      clock={clock}
      dateLabel={SIM_DATE.label}
      running={machines.filter((m) => m.status === 'nominal').length}
      machineCount={machines.length}
      openAlarms={openAlarms.filter((a) => !a.acknowledged).length}
      paused={!running || lineStopped}
    />
  );

  const gateParam = (route[1] as GateId) && GATE_IDS.includes(route[1] as GateId) ? (route[1] as GateId) : defaultGate();
  const sectionParam = (GATE_SECTIONS.find((s) => s.id === route[2])?.id ?? 'live') as GateSection;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f4f3ef] text-[#1f1e1d]'} flex flex-col font-sans transition-colors`}>
      <div className="flex flex-1 min-h-screen">
        <div className="hidden lg:block">{sidebar}</div>

        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
            <div className="relative z-10 w-72 h-full">{sidebar}</div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setIsMobileSidebarOpen(true)} aria-label="Open menu" className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-xs truncate">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[12.5px]">MONITOR</span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-md font-sans text-xs truncate">
                  Exide-inspired vehicle battery plant <span className="text-slate-400">Hosur Unit 2</span>
                </span>
                <span className="hidden sm:inline bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-xs">Shift B, {clock}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span className={`w-2 h-2 rounded-full ${running && !lineStopped ? 'bg-emerald-500 animate-pulse' : lineStopped ? 'bg-rose-500' : 'bg-amber-500'}`} />
                <span>{lineStopped ? `Line stopped at ${stoppedStations.join(', ')}` : running ? 'Live' : 'Paused'} · Shift B · {figures.produced} batteries</span>
              </div>

              <button
                onClick={() => setRunning((r) => !r)}
                title={running ? 'Pause the line' : 'Resume the line'}
                aria-label={running ? 'Pause the line' : 'Resume the line'}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsEventsOpen(!isEventsOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${faultActive ? 'bg-rose-700 hover:bg-rose-600 text-white animate-pulse' : 'bg-[#0f7f66] hover:bg-[#0c6b56] text-white'}`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{faultActive ? 'Fault active' : 'Events'}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {isEventsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-50 text-xs">
                    <div className="px-3 py-1 text-[12.5px] uppercase text-slate-400 font-bold">Inject a defect at a gate</div>
                    {DEMO_EVENTS.map((e) => (
                      <button key={e.defectId} onClick={() => injectDemoEvent(e.gate, e.defectId)} className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                        <span><b className="">{e.gate}</b> {DEFECT_BY_ID[e.defectId].label}</span>
                      </button>
                    ))}
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <button onClick={clearFaults} className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" /> <span>Clear all faults and station stops</span>
                    </button>
                    <button onClick={resetAll} className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" /> <span>Restart the demo from 16:42</span>
                    </button>
                  </div>
                )}
              </div>

              <label className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs text-slate-600 dark:text-slate-300" title="Act as: the app lets this role do only what Settings, Roles allows">
                <span className="text-slate-400">Acting as</span>
                <select value={roleIndex} onChange={(e) => setRoleIndex(Number(e.target.value))} aria-label="Acting as" className="bg-transparent font-semibold outline-none">
                  {USERS.map((u, i) => <option key={u.role} value={i}>{u.role}</option>)}
                </select>
              </label>
              <button onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle theme" aria-label="Toggle theme" className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </header>

          {banner && (
            <div className="bg-rose-600 text-white px-4 sm:px-6 py-1.5 flex items-center justify-between gap-3 text-[13px] z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
                                <span className="font-semibold truncate">{banner.title}: {banner.desc}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {banner.gate && (
                  <button type="button" onClick={() => goGate(banner.gate!)} className="px-2.5 py-0.5 bg-white text-rose-700 hover:bg-rose-50 rounded font-semibold flex items-center gap-1">
                    <span>Open gate {banner.gate}</span><ArrowRight size={12} />
                  </button>
                )}
                {banner.machine && (
                  <button type="button" onClick={() => goMachine(banner.machine!)} className="px-2.5 py-0.5 bg-rose-800 hover:bg-rose-900 text-white rounded font-semibold flex items-center gap-1">
                    <span>Inspect {banner.machine}</span><ArrowRight size={12} />
                  </button>
                )}
                {banner.onClear && (
                  <button type="button" onClick={banner.onClear} className="px-2.5 py-0.5 bg-rose-800 hover:bg-rose-900 text-white rounded font-medium">Clear fault</button>
                )}
              </div>
            </div>
          )}

          <main className="flex-1 p-4 sm:px-6 lg:px-8 lg:py-5 max-w-[1600px] w-full mx-auto">
            {machineRoute ? (
              <MachineDetailView
                machine={machineRoute}
                allMachines={machines}
                alarms={alarms}
                tick={inspection.next}
                onBack={() => go('line_monitor')}
                onSelectMachine={(m) => go('machine', m.code)}
                onAcknowledgeAlarm={acknowledge}
                onInjectStationFault={injectStationFault}
                onClearStationFault={clearStationFault}
                onOpenCopilot={() => setIsCopilotOpen(true)}
                onOpenGateway={() => go('gateways')}
              />
            ) : tab === 'line_monitor' ? (
              <LineMonitor machines={machines} onSelectMachine={(m) => go('machine', m.code)} />
            ) : tab === 'quality_gates' ? (
              <QualityGatesView
                state={inspection}
                alarms={alarms}
                dispatch={guarded}
                gate={gateParam}
                section={sectionParam}
                onNavigate={goGate}
                onAcknowledgeAlarm={acknowledge}
                onOpenMachine={goMachine}
              />
            ) : tab === 'traceability' ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Traceability</h2>
                  <p className="text-xs text-slate-500">From a battery back to its lots and tools, and from a defect back to the tool or lot behind it.</p>
                </div>
                <TracePanel state={inspection} onOpenMachine={goMachine} />
              </div>
            ) : tab === 'predictive_ai' ? (
              <PredictiveMaintenanceView machines={machines} onSelectMachine={(m) => go('machine', m.code)} />
            ) : tab === 'gateways' ? (
              <SensorsGatewaysView machines={machines} onSelectMachine={(m) => go('machine', m.code)} />
            ) : tab === 'production_oee' ? (
              <ProductionView machines={machines} qualityGates={qualityGates} shiftMetrics={shiftMetrics} inspection={inspection} onSelectMachine={(m) => go('machine', m.code)} />
            ) : tab === 'alarms' ? (
              <AlarmsView alarms={alarms} now={inspection.next} onAcknowledge={acknowledge} onOpenGate={(g) => goGate(g as GateId)} onOpenMachine={goMachine} />
            ) : tab === 'model' ? (
              <ModelView inspection={inspection} />
            ) : tab === 'value' ? (
              <ValueView inspection={inspection} />
            ) : tab === 'history' ? (
              <HistoryView inspection={inspection} qualityGates={qualityGates} />
            ) : tab === 'deployment' ? (
              <DeploymentView />
            ) : tab === 'integrations' ? (
              <IntegrationsView machines={machines} inspection={inspection} />
            ) : tab === 'settings' ? (
              <SettingsView
                machines={machines}
                inspection={inspection}
                isDarkMode={isDarkMode}
                onSetDark={setIsDarkMode}
                onInjectDefect={(gate, defectId) => dispatch({ type: 'inject', gate, defectId, by: 'Settings' })}
                onInjectStation={injectStationFault}
                onClearStation={clearStationFault}
                onClearFaults={clearFaults}
                onReset={resetAll}
                roleIndex={roleIndex}
              />
            ) : tab === 'copilot' ? (
              <CopilotView getContext={getCopilotContext} onNavigate={openFromCopilot} machineCount={machines.length} />
            ) : tab === 'reports' ? (
              <ReportsView shiftMetrics={shiftMetrics} qualityGates={qualityGates} alarms={alarms} inspection={inspection} lineOee={lineOee} machines={machines} onSignOff={(text) => { if (!allowed('Sign off the shift handover')) return false; dispatch({ type: 'note', by: actor, text }); return true; }} />
            ) : (
              controlRoom
            )}
          </main>
        </div>
      </div>

      <Toaster />
      <CopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onOpenFullPage={() => {
          setIsCopilotOpen(false);
          go('copilot');
        }}
        onNavigate={openFromCopilot}
        getContext={getCopilotContext}
      />
    </div>
  );
}
