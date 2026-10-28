/**
 * ControlRoom.tsx
 * JoulesToWatts House Design System Control Room (matching user's reference code & screenshot).
 * Features:
 * - Scope & Header with live plant context
 * - 6 Stat KPI cards with Provenance badges and sparkline indicators
 * - 3D Live Line Twin with in-place floating SelectedCard
 * - LineStrip showing all machines in process order with state dot, key reading, and shift OEE
 * - Bottom cards: Active alarms with escalation, Production by shift with meters, Downtime Pareto
 * - ConnectedStrip industrial bus indicators
 */

import React, { useState, useMemo } from 'react';
import {
  Download,
  Plus,
  ArrowRight,
  RadioTower,
  Activity,
  Layers,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Factory,
  Clock,
  Sparkles,
} from 'lucide-react';
import { MachineStation, QualityGate, PlantAlarm, ShiftProductionMetrics, ProcessPackType } from '../types';
import { LiveLineTwinFrame } from './LiveLineTwinFrame';
import type { InspectionState } from '../inspection/types';
import { GATE_IDS } from '../inspection/types';
import { GATES } from '../inspection/catalogue';
import { lineFigures } from '../inspection/selectors';
import {
  Panel,
  Button,
  Stat,
  StateDot,
  SeverityBadge,
  Code,
  Meter,
  Prov,
  ConnectedStrip,
} from './ui-kit';

interface ControlRoomProps {
  machines: MachineStation[];
  qualityGates: Record<string, QualityGate>;
  alarms: PlantAlarm[];
  shiftMetrics: ShiftProductionMetrics;
  processPack: ProcessPackType;
  isDarkMode?: boolean;
  onSelectMachine: (machine: MachineStation) => void;
  onSelectGate?: (gate: QualityGate) => void;
  onAcknowledgeAlarm: (alarmId: string) => void;
  onOpenCopilot: () => void;
  onNavigateTab?: (tab: string) => void;
  isFaultInjected?: boolean;
  onToggleFault?: () => void;
  inspection: InspectionState;
  clock: string;
}

export const ControlRoom: React.FC<ControlRoomProps> = ({
  machines,
  qualityGates,
  alarms,
  shiftMetrics,
  processPack,
  isDarkMode = false,
  onSelectMachine,
  onSelectGate,
  onAcknowledgeAlarm,
  onOpenCopilot,
  onNavigateTab,
  isFaultInjected,
  onToggleFault,
  inspection,
  clock,
}) => {
  const [selectedMachineCode, setSelectedMachineCode] = useState<string | null>(null);

  // Open alarms: raised and not yet cleared
  const openAlarms = useMemo(() => alarms.filter((a) => a.resolvedAt == null).sort((x, y) => (x.severity === y.severity ? 0 : x.severity === 'critical' ? -1 : y.severity === 'critical' ? 1 : x.severity === 'major' ? -1 : 1)), [alarms]);
  const activeAlarms = useMemo(() => openAlarms.filter((a) => !a.acknowledged), [openAlarms]);
  const critCount = useMemo(() => openAlarms.filter((a) => a.severity === 'critical').length, [openAlarms]);
  const majorCount = useMemo(() => openAlarms.filter((a) => a.severity === 'major').length, [openAlarms]);
  const ackCount = useMemo(() => openAlarms.filter((a) => a.acknowledged).length, [openAlarms]);

  // Everything below comes from the inspection engine and the machine list, so it agrees with the other pages
  const figures = useMemo(() => lineFigures(inspection), [inspection]);
  const avg = (f: (m: MachineStation) => number) => (machines.length ? machines.reduce((a, m) => a + f(m), 0) / machines.length : 0);
  const availability = avg((m) => m.availability);
  const performance = avg((m) => m.performance);
  const quality = figures.firstPassYield;
  const partsDue = useMemo(
    () => machines.flatMap((m) => m.parts.map((p) => ({ code: m.code, ...p }))).filter((p) => p.remainingDays <= 14).sort((a, b) => a.remainingDays - b.remainingDays),
    [machines],
  );
  const gateRejects = GATE_IDS.map((g) => `${qualityGates[g]?.rejectCount ?? 0} at ${g}`).join(', ');
  const hourly = shiftMetrics.hourlyOutput;
  const avgPerHour = hourly.length > 1 ? Math.round(hourly.slice(0, -1).reduce((a, h) => a + h.actual, 0) / (hourly.length - 1)) : hourly[0]?.actual ?? 0;
  const ahead = figures.produced - figures.plannedToNow;
  const downtimeTotal = shiftMetrics.downtimePareto.reduce((a, d) => a + d.minutes, 0);
  const downtimeSorted = [...shiftMetrics.downtimePareto].sort((a, b) => b.minutes - a.minutes);

  // Running vs Attention
  const runningCount = useMemo(() => machines.filter((m) => m.status === 'nominal').length, [machines]);
  const attentionMachines = useMemo(() => machines.filter((m) => m.status !== 'nominal'), [machines]);

  // Handle clicking a machine from LineStrip: first click selects & focuses in 3D twin, second click opens detail
  const handleStripMachineClick = (m: MachineStation) => {
    if (selectedMachineCode === m.code) {
      onSelectMachine(m);
    } else {
      setSelectedMachineCode(m.code);
    }
  };

  // Sparkline miniature generator
  const renderSparkline = (points: number[], color: string) => {
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = Math.max(1, max - min);
    const width = 64;
    const height = 24;
    const coords = points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - ((p - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords}
        />
      </svg>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Page header: one tight row (the top bar already carries plant, shift and clock) */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">Control room</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-3xl">
            12V vehicle battery line: four AI vision gates, machines, OEE, output against plan and alarms, live.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button size="sm" onClick={() => window.print()} title="Export shift summary report">
            <Download size={13} />
            <span>Export report</span>
          </Button>
          <Button variant="primary" size="sm" onClick={onOpenCopilot}>
            <Plus size={13} />
            <span>Ask BatteryIQ</span>
          </Button>
        </div>
      </div>

      {/* 6 Executive KPI Stat Cards (with Provenance badges & sparklines) */}
      <div className="grid grid-cols-2 md:grid-cols-3 min-[87.5rem]:grid-cols-6 gap-3">
        <Stat
          label="Line OEE, Shift B"
          value={`${((availability * performance * quality) / 10000).toFixed(1)}%`}
          tone="teal"
          sub={`A ${availability.toFixed(0)}% · P ${performance.toFixed(0)}% · Q ${quality.toFixed(0)}%`}
          prov="computed"
          hint="Availability and performance of the machines on the line, with quality taken from the first-pass yield of the four vision gates."
        />

        <Stat
          label="Batteries inspected, Shift B"
          value={figures.produced.toLocaleString('en-IN')}
          tone={ahead >= 0 ? 'teal' : 'amber'}
          sub={`Plan to now ${figures.plannedToNow.toLocaleString('en-IN')}, ${Math.abs(ahead)} ${ahead >= 0 ? 'ahead' : 'behind'}`}
          prov="plc"
          spark={hourly.length > 1 ? renderSparkline(hourly.map((h) => h.actual), '#10b981') : undefined}
          hint="Batteries that reached the first gate since 14:00. Shift target is 1,600."
        />

        <Stat
          label="Open alarms"
          value={openAlarms.length}
          tone={critCount > 0 ? 'red' : majorCount > 0 ? 'amber' : 'neutral'}
          sub={`${critCount} critical, ${majorCount} major, ${ackCount} ack`}
          prov="model"
          hint="Machine alerts and vision-gate alarms that are raised and not yet cleared."
        />

        <Stat
          label="First-pass yield"
          value={`${figures.firstPassYield}%`}
          tone={figures.firstPassYield < 95 ? 'amber' : 'teal'}
          sub={`Rejects: ${gateRejects}`}
          prov="computed"
          hint="Batteries with no defect at any of the four vision gates, over all batteries inspected this shift."
        />

        <Stat
          label="Machines running"
          value={`${runningCount} of ${machines.length}`}
          tone={attentionMachines.length > 0 ? 'amber' : 'neutral'}
          sub={
            attentionMachines.length > 0
              ? `Attention: ${attentionMachines.map((m) => m.code).slice(0, 3).join(', ')}`
              : 'All stations nominal'
          }
          prov="plc"
          hint="Live machine status polled via OPC UA gateway connections."
        />

        <Stat
          label="Parts due in 14 days"
          value={partsDue.length}
          tone={partsDue.length ? 'amber' : 'neutral'}
          sub={partsDue[0] ? `Next: ${partsDue[0].code} ${partsDue[0].partName.toLowerCase()}, ${partsDue[0].remainingDays}d` : 'Nothing due'}
          prov="model"
          hint="Predicted remaining useful life from the machines' wear models."
        />
      </div>

      {/* 3D Live Line Twin Card with in-place SelectedCard */}
      <LiveLineTwinFrame
        machines={machines}
        alarms={alarms}
        selectedMachineId={selectedMachineCode}
        onSelectMachineId={(code) => setSelectedMachineCode(code)}
        onOpenMachineDetail={(m) => onSelectMachine(m)}
        onOpenGateway={(m) => {
          if (onNavigateTab) onNavigateTab('gateways');
          else onSelectMachine(m);
        }}
        isDarkMode={isDarkMode}
        onOpenCopilot={onOpenCopilot}
        isFaultInjected={isFaultInjected}
        onToggleFault={onToggleFault}
        processPack={processPack}
      />

      {/* The four vision gates, live */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {GATE_IDS.map((g) => {
          const gate = qualityGates[g];
          if (!gate) return null;
          return (
            <button
              key={g}
              type="button"
              onClick={() => onSelectGate?.(gate)}
              className={`text-left rounded-lg border p-3 transition-colors ${gate.inAlarm ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-700' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white">{g} · {GATES[g].short}</span>
                <span className={`font-bold ${gate.inAlarm ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{gate.passRatePercent}%</span>
              </div>
              <div className="mt-1 text-[12.5px] text-slate-500">
                {gate.inAlarm ? 'Too many bad calls. ' : 'In control. '}
                {gate.holdCount} held · {gate.reviewCount} to review
              </div>
            </button>
          );
        })}
      </div>

      {/* LineStrip: In process order status tiles matching reference */}
      <Panel
        title="Line status"
        description="In process order, mixing to final inspection, then the utilities. Click a machine to focus in the 3D twin."
        actions={
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('line_monitor')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <span>Line monitor</span>
            <ArrowRight size={13} />
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9">
          {machines.map((m) => {
            const isSelected = selectedMachineCode === m.code;
            const isStopped = m.status === 'stopped';
            const isAttention = m.status === 'attention';
            const primaryTag = m.tags?.[0];
            const isNear = primaryTag && (primaryTag.value > primaryTag.maxNormal || primaryTag.value < primaryTag.minNormal);

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleStripMachineClick(m)}
                onDoubleClick={() => onSelectMachine(m)}
                title={`${m.name}${m.statusReason ? `. Stopped: ${m.statusReason}` : ''} - Click to focus in 3D, click again to open machine`}
                className={`flex min-w-0 flex-col gap-1 rounded-lg border p-2.5 text-left transition-all ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                {/* Header: Dot + Machine Code + Shift OEE */}
                <div className="flex items-center gap-1.5 w-full">
                  <StateDot
                    state={
                      isStopped
                        ? 'alert'
                        : isAttention || isNear
                        ? 'watch'
                        : m.status === 'nominal'
                        ? 'running'
                        : 'idle'
                    }
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {m.code}
                  </span>
                  <span
                    className="ml-auto text-[12.5px] text-slate-400"
                    title="OEE this shift"
                  >
                    {m.shiftOee}%
                  </span>
                </div>

                {/* Primary Reading */}
                <div className="truncate text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {primaryTag ? (
                    <>
                      <span className={isNear ? 'text-amber-600 dark:text-amber-400' : ''}>
                        {primaryTag.value}
                      </span>
                      <span className="text-[12.5px] font-normal text-slate-400 ml-1">
                        {primaryTag.unit}
                      </span>
                    </>
                  ) : (
                    <span>-</span>
                  )}
                </div>

                {/* Current step / stop reason */}
                <div
                  className={`truncate text-[12px] leading-tight ${
                    isStopped ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {isStopped ? m.statusReason : m.status === 'nominal' ? m.currentStep : 'Between cycles'}
                </div>

                {/* Hint if selected: click again to open */}
                {isSelected && (
                  <div className="flex items-center gap-1 text-[12.5px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 pt-1 border-t border-emerald-200 dark:border-emerald-800/60 animate-in fade-in">
                    <span>Open station</span>
                    <ArrowRight size={10} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* 3 Bottom Operational Cards Row matching reference */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* Card 1: Active Alarms & Escalation */}
        <Panel
          title="Active alarms"
          description={`${openAlarms.length} open alarms, most severe first`}
          flush
          actions={
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('alarms')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <span>All alarms</span>
              <ArrowRight size={13} />
            </button>
          }
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {openAlarms.slice(0, 4).map((a) => (
              <div
                key={a.id}
                className="p-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <span className="text-[12.5px] text-slate-400">{a.timestamp}</span>
                  </div>
                  <Code className="text-slate-400">{a.code}</Code>
                </div>

                <div className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                  {a.machineName}
                </div>

                <div className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {a.cause}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="text-slate-400 truncate">
                    {a.acknowledged ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Acknowledged by {a.acknowledgedBy || 'Shift Lead'}
                      </span>
                    ) : (
                      `Escalation: ${
                        a.escalation === 'shift_in_charge'
                          ? 'Shift In-Charge notified'
                          : a.escalation === 'plant_head'
                          ? 'Escalated to Plant Head'
                          : 'Operator panel'
                      }`
                    )}
                  </span>
                  {!a.acknowledged && (
                    <button
                      type="button"
                      onClick={() => onAcknowledgeAlarm(a.id)}
                      className="px-2 py-0.5 rounded text-[12.5px] font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Card 2: Production by Shift */}
        <Panel
          title="Production by shift"
          description="Batteries through all four gates, against plan"
          actions={<Prov k="plc" compact />}
        >
          <div className="space-y-4">
            {/* Shift A */}
            <div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Shift A <span className="text-[12.5px] font-normal text-slate-400">06:00 to 14:00 (Completed)</span>
                </span>
                <span className="text-xs">
                  <strong className="text-slate-900 dark:text-white">1,180</strong> of 1,200
                </span>
              </div>
              <Meter value={1180} max={1200} className="mt-1.5" tone="teal" />
              <div className="mt-1 flex items-center justify-between text-[12px] text-slate-400">
                <span>OEE 85.8% · A 91% · P 92% · Q 98%</span>
                <span className="text-emerald-600 dark:text-emerald-400">98% of plan</span>
              </div>
            </div>

            {/* Shift B (Current Live) */}
            <div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Shift B <span className="text-[12.5px] font-normal text-slate-400">14:00 to 22:00 (Active now)</span>
                </span>
                <span className="text-xs">
                  <strong className="text-slate-900 dark:text-white">{figures.passedAll.toLocaleString('en-IN')}</strong> passed of 1,600
                </span>
              </div>
              <Meter value={figures.passedAll} max={1600} marker={figures.plannedToNow} className="mt-1.5" tone="teal" />
              <div className="mt-1 flex items-center justify-between text-[12px] text-slate-400">
                <span>OEE {((availability * performance * quality) / 10000).toFixed(1)}% · A {availability.toFixed(0)}% · P {performance.toFixed(0)}% · Q {quality.toFixed(0)}%</span>
                <span className={ahead >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}>{ahead >= 0 ? `+${ahead} ahead` : `${ahead} behind`} of plan to now</span>
              </div>
            </div>

            {/* Shift C */}
            <div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Shift C <span className="text-[12.5px] font-normal text-slate-400">22:00 to 06:00 (Next)</span>
                </span>
                <span className="text-xs text-slate-400">Plan 1,200</span>
              </div>
              <Meter value={0} max={1200} className="mt-1.5" tone="neutral" />
            </div>

            {/* Hourly Distribution Bar Chart */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-500">Hourly throughput (batteries/hr)</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  Avg {avgPerHour} / hr
                </span>
              </div>
              <div className="h-20 flex items-end gap-1.5 px-1">
                {shiftMetrics.hourlyOutput.map((h, i) => {
                  const max = 220;
                  const pct = Math.min(100, (h.actual / max) * 100);
                  const isCurrent = i === shiftMetrics.hourlyOutput.length - 1;

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div
                        className={`w-full rounded-t transition-all ${
                          isCurrent
                            ? 'bg-emerald-500 animate-pulse'
                            : h.actual >= h.target
                            ? 'bg-emerald-600/80 dark:bg-emerald-500/70'
                            : 'bg-amber-500/80'
                        }`}
                        style={{ height: `${pct}%` }}
                        title={`${h.hourLabel}: ${h.actual} units (target ${h.target})`}
                      />
                      <span className="text-[12.5px] text-slate-400 mt-1">{h.hourLabel.slice(0, 2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Panel>

        {/* Card 3: Downtime Today Pareto Ranking */}
        <Panel
          title="Downtime this shift"
          description={`${downtimeTotal} min over ${downtimeSorted.length} reasons since 14:00, largest first`}
          actions={
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('production_oee')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <span>Production & OEE</span>
              <ArrowRight size={13} />
            </button>
          }
        >
          <div className="space-y-3">
            {downtimeSorted.map((d, i) => {
              const code = d.reason.match(/^[A-Z]{2}-\d{2}/)?.[0] ?? (d.category === 'quality_hold' ? 'QA' : 'LINE');
              const share = downtimeTotal ? Math.round((d.minutes / downtimeTotal) * 100) : 0;
              return (
                <div key={d.reason} className="space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-400 text-[12.5px] w-3">{i + 1}.</span>
                      <Code className="text-slate-400 text-[12.5px]">{code}</Code>
                      <span className="truncate text-slate-700 dark:text-slate-300 text-xs">{d.reason}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white shrink-0 ml-2">{d.minutes} min</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${i === 0 ? 'bg-rose-500' : i === 1 ? 'bg-amber-500' : 'bg-emerald-600'}`} style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 text-[12.5px] text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <span>Quality hold = batteries waiting at the gates</span>
              <span className="text-slate-600 dark:text-slate-300 font-semibold">{downtimeTotal} min total</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Industrial Bus Connection Indicators */}
      <ConnectedStrip />
    </div>
  );
};
