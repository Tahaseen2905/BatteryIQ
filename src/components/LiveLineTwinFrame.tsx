/**
 * LiveLineTwinFrame.tsx
 * JoulesToWatts House Design System 3D Live Line Twin
 * Features:
 * - Direct iframe integration with the Three.js procedural twin
 * - In-place floating SelectedCard for machine-level live monitoring
 * - Process sequence tour with animated progress bar
 * - Readings vs AI Health mode toggle with floating health legend
 * - Stage breadcrumbs (01 - 05) that smoothly fly the 3D camera
 * - Universal light/dark theme adaptation
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Compass,
  Crosshair,
  Maximize2,
  Minimize2,
  X,
  RadioTower,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { MachineStation, PlantAlarm, ProcessPackType } from '../types';
import { Code, Status, Badge, Button, Segmented, StateDot } from './ui-kit';

interface LiveLineTwinFrameProps {
  machines: MachineStation[];
  alarms: PlantAlarm[];
  selectedMachineId?: string | null;
  onSelectMachineId?: (id: string | null) => void;
  onOpenMachineDetail?: (machine: MachineStation) => void;
  onOpenGateway?: (machine: MachineStation) => void;
  isDarkMode?: boolean;
  onOpenCopilot?: () => void;
  isFaultInjected?: boolean;
  onToggleFault?: () => void;
  processPack?: ProcessPackType;
}

const HEALTH_DOTS = {
  act: '#e24b4a',
  plan: '#ef9f27',
  watch: '#2fb5a1',
  ok: '#1d9e75',
} as const;

/** The twin has 10 process stations; the vision gates (QC chips) and the last two machines map onto the nearest one. */
const TWIN_TO_MACHINE_MAP: Record<string, string> = {
  'QC-01': 'HS-01',
  'QC-02': 'IW-01',
  'QC-03': 'HS-01',
  'QC-04': 'LB-01',
};

const MACHINE_TO_TWIN_INDEX: Record<string, number> = {
  'GC-01': 0,
  'OM-01': 1,
  'PM-01': 2,
  'PP-01': 3,
  'CC-01': 4,
  'CS-01': 5,
  'IW-01': 6,
  'HS-01': 7,
  'AF-01': 8,
  'FB-01': 9,
  'HR-01': 9,
  'LB-01': 9,
};

function resolveMachineFromTwin(
  rawId: string | number,
  machines: MachineStation[],
  processPack?: ProcessPackType
): MachineStation | null {
  const strId = String(rawId).toUpperCase();

  // 1. Direct match by code or ID
  const direct = machines.find(
    (m) => m.code.toUpperCase() === strId || m.id.toUpperCase() === strId
  );
  if (direct) return direct;

  // 2. Lead-acid translation table
  if (processPack === 'lead_acid') {
    const mapped = TWIN_TO_MACHINE_MAP[strId];
    if (mapped) {
      const found = machines.find((m) => m.code === mapped);
      if (found) return found;
    }
  }

  // 3. Match numeric index
  if (typeof rawId === 'number' && machines[rawId]) {
    return machines[rawId];
  }

  // 4. Match digits in string (e.g. "M-03" -> 3 -> index 2)
  const digits = strId.match(/\d+/);
  if (digits) {
    const idx = parseInt(digits[0], 10) - 1;
    if (idx >= 0 && idx < machines.length) {
      return machines[idx];
    }
  }

  return null;
}

export const LiveLineTwinFrame: React.FC<LiveLineTwinFrameProps> = ({
  machines,
  alarms,
  selectedMachineId: externalSelectedId,
  onSelectMachineId,
  onOpenMachineDetail,
  onOpenGateway,
  isDarkMode = false,
  onOpenCopilot,
  isFaultInjected: externalFaultInjected,
  onToggleFault,
  processPack = 'lead_acid',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [labelsMode, setLabelsMode] = useState<'readings' | 'health'>('readings');
  const [isSpinning, setIsSpinning] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalFaultInjected, setInternalFaultInjected] = useState(false);

  const isFaultInjected = externalFaultInjected !== undefined ? externalFaultInjected : internalFaultInjected;

  // Effective selected ID (controlled or uncontrolled)
  const activeSelectedId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  // Find the selected machine accurately without silent fallback to machines[0]
  const selectedMachine = useMemo(() => {
    if (!activeSelectedId) return null;
    return resolveMachineFromTwin(activeSelectedId, machines, processPack);
  }, [activeSelectedId, machines, processPack]);

  // Primary sensor tag of selected machine
  const primaryTag = selectedMachine?.tags?.[0];

  // Alarms for the selected machine
  const machineAlarms = useMemo(() => {
    if (!selectedMachine) return [];
    return alarms.filter(
      (a) =>
        a.machineId === selectedMachine.id ||
        a.machineName.toLowerCase().includes(selectedMachine.name.toLowerCase()) ||
        a.machineName.toLowerCase().includes(selectedMachine.code.toLowerCase())
    );
  }, [selectedMachine, alarms]);

  // Helper to safely call methods inside the twin iframe
  const callIframeMethod = useCallback((methodName: string, ...args: any[]) => {
    try {
      const win = iframeRef.current?.contentWindow as any;
      if (win && typeof win[methodName] === 'function') {
        win[methodName](...args);
      }
    } catch (err) {
      console.warn('Iframe communication notice:', err);
    }
  }, []);

  // Sync theme with iframe content
  useEffect(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc?.documentElement) {
        doc.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
      }
    } catch (e) {
      // Ignore cross-origin in tests
    }
  }, [isDarkMode]);

  // Catch postMessage from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MACHINE_CLICKED' && event.data.id) {
        const clickedId = event.data.id;
        const matched = resolveMachineFromTwin(clickedId, machines, processPack);
        const idToSet = matched ? matched.code : clickedId;
        if (onSelectMachineId) {
          onSelectMachineId(idToSet);
        } else {
          setInternalSelectedId(idToSet);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [machines, onSelectMachineId, processPack]);

  // Push each machine's live status into the twin (rings, stack lights, and whether it animates)
  const pushStatuses = useCallback(() => {
    const map: Record<string, string> = {};
    machines.forEach((m) => {
      map[m.code] = m.status === 'stopped' ? 'stop' : m.status === 'attention' ? 'warn' : 'ok';
    });
    callIframeMethod('setStatuses', map);
  }, [machines, callIframeMethod]);

  useEffect(() => {
    pushStatuses();
  }, [pushStatuses]);

  // Hook into the iframe's selection logic once loaded
  const handleIframeLoad = () => {
    pushStatuses();
    try {
      const win = iframeRef.current?.contentWindow as any;
      const doc = iframeRef.current?.contentDocument;
      if (!win) return;

      // Ensure theme matches
      if (doc?.documentElement) {
        doc.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
      }

      // Hide the default raw unstyled #info inside the canvas so our React SelectedCard takes over cleanly
      const rawInfo = doc?.getElementById('info');
      if (rawInfo) {
        rawInfo.style.display = 'none';
      }

      // Override win.sel to notify React
      const originalSel = win.sel;
      win.sel = function (index: number) {
        if (typeof originalSel === 'function') {
          originalSel(index);
        }
        if (win.D && win.D[index]) {
          const item = win.D[index];
          const matched =
            resolveMachineFromTwin(item.id, machines, processPack) ||
            machines[Math.min(index, machines.length - 1)];
          const idToSet = matched ? matched.code : item.id;
          if (onSelectMachineId) {
            onSelectMachineId(idToSet);
          } else {
            setInternalSelectedId(idToSet);
          }
        }
      };
    } catch (err) {
      console.warn('Could not hook iframe methods:', err);
    }
  };

  // Change mode (Readings vs AI Health)
  const handleModeChange = (mode: 'readings' | 'health') => {
    setLabelsMode(mode);
    callIframeMethod('setMode', mode === 'health' ? 'a' : 'r');
  };

  // Select machine handler
  const selectMachine = useCallback(
    (code: string | null) => {
      if (onSelectMachineId) {
        onSelectMachineId(code);
      } else {
        setInternalSelectedId(code);
      }

      if (code) {
        // Find index in iframe win.D
        try {
          const win = iframeRef.current?.contentWindow as any;
          if (win && win.D) {
            let targetIdx = win.D.findIndex((x: any) => x.id === code);
            if (targetIdx < 0 && MACHINE_TO_TWIN_INDEX[code] !== undefined) targetIdx = MACHINE_TO_TWIN_INDEX[code];

            if (targetIdx >= 0) {
              callIframeMethod('sel', targetIdx);
              return;
            }
          }
        } catch (e) {}
        // Fallback: search in machines
        const mIdx = machines.findIndex((m) => m.code === code || m.id === code);
        if (mIdx >= 0) {
          callIframeMethod('sel', Math.min(mIdx, 13));
        }
      } else {
        callIframeMethod('rv');
      }
    },
    [callIframeMethod, machines, onSelectMachineId]
  );

  // Line tour logic
  useEffect(() => {
    if (!isTouring) return;
    const interval = setInterval(() => {
      setTourIndex((prev) => {
        const next = (prev + 1) % machines.length;
        const target = machines[next];
        if (target) {
          selectMachine(target.code);
        }
        return next;
      });
    }, 8500);

    return () => clearInterval(interval);
  }, [isTouring, machines, selectMachine]);

  const toggleTour = () => {
    if (isTouring) {
      setIsTouring(false);
      callIframeMethod('tend');
    } else {
      setIsTouring(true);
      setTourIndex(0);
      const first = machines[0];
      if (first) {
        selectMachine(first.code);
      }
    }
  };

  const handleResetToWholeLine = () => {
    setIsTouring(false);
    selectMachine(null);
  };

  const handleToggleSpin = () => {
    setIsSpinning(!isSpinning);
    callIframeMethod('spin');
  };

  const handleToggleFault = () => {
    callIframeMethod('inj');
    if (onToggleFault) {
      onToggleFault();
    } else {
      setInternalFaultInjected(!internalFaultInjected);
    }
  };

  // Determine machine band for AI health
  const getMachineHealthBand = (health: number) => {
    if (health < 70) return { band: 'act' as const, word: 'Act now', color: '#e24b4a' };
    if (health < 82) return { band: 'plan' as const, word: 'Plan job', color: '#ef9f27' };
    if (health < 90) return { band: 'watch' as const, word: 'Watch', color: '#2fb5a1' };
    return { band: 'ok' as const, word: 'Optimal', color: '#1d9e75' };
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col transition-all ${
        isExpanded ? 'fixed inset-4 z-50 shadow-2xl' : ''
      }`}
    >
      {/* Top Header of Twin Card */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Live line twin</h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            From lead alloy to tested batteries. Click a machine or its tag to inspect it.
          </p>
        </div>

        {/* Action Controls matching reference */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Labels Mode Toggle */}
          <Segmented
            value={labelsMode}
            onChange={(v) => handleModeChange(v as 'readings' | 'health')}
            options={[
              { value: 'readings', label: 'Readings' },
              { value: 'health', label: 'AI health' },
            ]}
          />

          {/* Tour Button */}
          <Button
            size="sm"
            variant={isTouring ? 'primary' : 'secondary'}
            onClick={toggleTour}
          >
            {isTouring ? <Pause size={13} /> : <Play size={13} />}
            <span>{isTouring ? `Stop tour, ${tourIndex + 1} of ${machines.length}` : 'Tour the line'}</span>
          </Button>

          {/* Whole line reset button */}
          {activeSelectedId && !isTouring && (
            <Button size="sm" onClick={handleResetToWholeLine}>
              <Crosshair size={13} />
              <span>Whole line</span>
            </Button>
          )}

          {/* Inject fault demo button */}
          <button
            type="button"
            onClick={handleToggleFault}
            className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
              isFaultInjected
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            <Zap size={13} />
            <span>{isFaultInjected ? 'Clear fault' : 'Inject fault'}</span>
          </button>

          {/* Expand Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Restore' : 'Expand full view'}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Process Flow Stage Strip (01 Grid & oxide -> 02 Paste & plates -> 03 Assembly -> 04 Formation -> 05 Quality) */}
      <div className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-5 py-1.5 flex items-center gap-3 overflow-x-auto text-xs">
        {[
          { step: '01', title: 'Grid & oxide', desc: 'Cast grids · prepare oxide', mCode: 'M-01', idx: 0 },
          { step: '02', title: 'Paste & plates', desc: 'Paste · apply · cure', mCode: 'M-03', idx: 2 },
          { step: '03', title: 'Battery assembly', desc: 'Stack · separate · weld', mCode: 'M-05', idx: 5 },
          { step: '04', title: 'Formation & fill', desc: 'Charge · fill · seal', mCode: 'M-07', idx: 7 },
          { step: '05', title: 'Quality & dispatch', desc: 'Test · label · pack', mCode: 'M-09', idx: 9 },
        ].map((st, i) => {
          const isActive =
            selectedMachine &&
            (selectedMachine.code === st.mCode ||
              (i === 0 && (selectedMachine.code === 'M-01' || selectedMachine.code === 'M-02')) ||
              (i === 1 && (selectedMachine.code === 'M-03' || selectedMachine.code === 'M-04')) ||
              (i === 2 && (selectedMachine.code === 'M-05' || selectedMachine.code === 'M-06')) ||
              (i === 3 && (selectedMachine.code === 'M-07' || selectedMachine.code === 'M-08')) ||
              (i === 4 && selectedMachine.code === 'M-09'));

          return (
            <React.Fragment key={st.step}>
              {i > 0 && <span className="text-slate-300 dark:text-slate-600">→</span>}
              <button
                type="button"
                onClick={() => {
                  const m = machines.find((x) => x.code === st.mCode) || machines[st.idx];
                  if (m) selectMachine(m.code);
                }}
                className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition-all shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-emerald-500 font-semibold text-slate-900 dark:text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[12.5px] flex items-center justify-center">
                  {st.step}
                </span>
                <div>
                  <div className="font-semibold">{st.title}</div>
                  <div className="text-[12.5px] text-slate-500">{st.desc}</div>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Embedded 3D Canvas from user's BatteryIQ HTML */}
      <div
        className={`relative w-full ${
          isExpanded ? 'flex-1 min-h-[500px]' : 'h-[max(460px,calc(100vh-170px))] max-h-[760px]'
        } bg-[#111925] overflow-hidden select-none`}
      >
        {/* Animated Tour progress bar at top */}
        {isTouring && (
          <div
            key={activeSelectedId || 'tour'}
            className="absolute top-0 left-0 right-0 z-30 h-[3px] bg-emerald-500 animate-[pulse_1.5s_infinite]"
          />
        )}

        {/* Top-Left Floating Controls HUD */}
        <div className="absolute top-3 left-3 z-15 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 text-slate-300 text-xs shadow-lg">
          <button
            type="button"
            onClick={() => callIframeMethod('rv')}
            title="Reset View"
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            onClick={handleToggleSpin}
            title="Toggle 360° Spin"
            className={`p-1 rounded transition-colors ${
              isSpinning ? 'text-emerald-400 bg-slate-800' : 'hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass size={13} />
          </button>
          <span className="text-slate-600">|</span>
          <span className="text-[12.5px] text-slate-400 px-1">Scroll to zoom · drag to pan</span>
        </div>

        {/* Top-Right HUD Hint */}
        <div className="absolute top-3 right-3 z-15 hidden sm:flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-400 text-xs shadow-lg pointer-events-none">
          <Crosshair size={12} className="text-emerald-400" />
          <span className="text-[12.5px]">Click any machine or chip to inspect</span>
        </div>

        {/* Bottom-Left Floating AI Health Legend */}
        {labelsMode === 'health' && (
          <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-[#0b1220]/80 px-3 py-1.5 text-[12.5px] text-white/85 backdrop-blur-md shadow-lg">
            <span className="font-bold text-white flex items-center gap-1">
              <Sparkles size={11} className="text-emerald-400" />
              AI health
            </span>
            {(['act', 'plan', 'watch', 'ok'] as const).map((b) => (
              <span key={b} className="inline-flex items-center gap-1 text-[12.5px]">
                <span className="w-2 h-2 rounded-full" style={{ background: HEALTH_DOTS[b] }} />
                <span className="capitalize">{b === 'act' ? 'Act now' : b === 'plan' ? 'Plan job' : b}</span>
              </span>
            ))}
          </div>
        )}

        {/* Floating SelectedCard matching user's reference code! */}
        {selectedMachine && (
          <div className="absolute right-4 bottom-4 w-[340px] max-w-[calc(100%-2rem)] z-20 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header: Machine ID code, Name, and Close X */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Code className="text-slate-500 dark:text-slate-400">{selectedMachine.code}</Code>
                <div className="truncate text-[15px] font-bold text-slate-900 dark:text-white mt-1">
                  {selectedMachine.name}
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetToWholeLine}
                aria-label="Close"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* State and Open Alarms Badges */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Status
                s={
                  selectedMachine.status === 'nominal'
                    ? 'running'
                    : selectedMachine.status === 'stopped'
                    ? 'fail'
                    : 'near'
                }
              >
                <span className="capitalize">{selectedMachine.status === 'nominal' ? 'Running' : selectedMachine.status}</span>
              </Status>
              {machineAlarms.length > 0 && (
                <Badge
                  tone={machineAlarms.some((a) => a.severity === 'critical') ? 'red' : 'amber'}
                >
                  {`${machineAlarms.length} alarm${machineAlarms.length > 1 ? 's' : ''} open`}
                </Badge>
              )}
            </div>

            {/* 2 Key Telemetry Metrics Grid */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {/* Primary Process Tag */}
              {primaryTag && (
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                  <div className="text-[12.5px] text-slate-400 truncate">
                    {primaryTag.name}
                  </div>
                  <div className="text-base font-bold mt-0.5 text-slate-900 dark:text-white">
                    {primaryTag.value}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      {primaryTag.unit}
                    </span>
                  </div>
                </div>
              )}

              {/* Shift OEE */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                <div className="text-[12.5px] text-slate-400 truncate">
                  {selectedMachine.code.startsWith('U') ? 'Availability' : 'OEE this shift'}
                </div>
                <div className="text-base font-bold mt-0.5 text-slate-900 dark:text-white">
                  {selectedMachine.shiftOee}%
                </div>
              </div>
            </div>

            {/* Cycle / Step description */}
            <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              {selectedMachine.statusReason ? (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  Stopped: {selectedMachine.statusReason}
                </span>
              ) : selectedMachine.status === 'nominal' ? (
                `${selectedMachine.currentStep}, ${selectedMachine.cycleTimeSec}s of ${selectedMachine.standardCycleTimeSec}s`
              ) : (
                'Station idle between batch cycles'
              )}
            </div>

            {/* AI Health Note (when in AI Health mode) */}
            {labelsMode === 'health' && (
              <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Sparkles size={11} className="text-emerald-500" />
                    AI health {selectedMachine.aiHealthScore}
                  </span>
                  <span
                    className="font-bold text-[12.5px]"
                    style={{ color: getMachineHealthBand(selectedMachine.aiHealthScore).color }}
                  >
                    {getMachineHealthBand(selectedMachine.aiHealthScore).word}
                  </span>
                </div>
                <div className="mt-1 text-[12.5px] leading-snug text-slate-600 dark:text-slate-400 line-clamp-2">
                  {selectedMachine.parts?.[0]
                    ? `${selectedMachine.parts[0].partName}: ${selectedMachine.parts[0].failureMode}. Remaining life ${selectedMachine.parts[0].remainingDays} days.`
                    : `Remaining life estimate: 24 days before scheduled servicing.`}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-3.5 flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  if (onOpenMachineDetail) onOpenMachineDetail(selectedMachine);
                }}
              >
                <span>Open machine</span>
                <ArrowRight size={13} />
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (onOpenGateway) onOpenGateway(selectedMachine);
                }}
              >
                <RadioTower size={13} />
                <span>Gateway</span>
              </Button>
            </div>
          </div>
        )}

        {/* Native Embedded Iframe loading the user's tested HTML file */}
        <iframe
          ref={iframeRef}
          src="/assets/aistudio/BatteryIQ_live_line_twin_cf33b3bd.html?v=7"
          title="BatteryIQ Live Line Twin"
          onLoad={handleIframeLoad}
          className="w-full h-full border-0 select-none"
        />
      </div>

      {/* Bottom Status Bar */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span>01 Lead alloy in</span>
          <span>·</span>
          <span>Labelled batteries out</span>
          <span>·</span>
          <span>
            <strong className="text-slate-900 dark:text-white">12</strong> machines, 4 vision gates
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StateDot state="running" />
          <span className="text-[12.5px]">Sensor updates streaming every 5 sec</span>
        </div>
      </div>
    </div>
  );
};
