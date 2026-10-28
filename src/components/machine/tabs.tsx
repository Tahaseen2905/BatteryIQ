/**
 * The seven tabs of the machine page.
 */

import React, { useMemo, useState } from 'react';
import { Sparkles, Wrench } from 'lucide-react';
import type { MachineStation, PlantAlarm, SensorTag } from '../../types';
import { fmtTag, loadOf, stateOfTag, stepsOf } from '../../domain/machineModel';
import { hash, rngFrom } from '../../inspection/engine';
import { ageLabel } from '../../inspection/alarms';
import { BandLine, Bars } from './charts';
import type { Power } from './MachineStudio';

const card = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm';
const h2 = 'text-sm font-bold text-slate-900 dark:text-white';
const codeSeed = (code: string) => [...code].reduce((a, c) => a + c.charCodeAt(0), 0);

// ---------- Process & health ----------

export const ProcessTab: React.FC<{ machine: MachineStation }> = ({ machine }) => {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {machine.tags.map((t) => {
        const st = stateOfTag(t, t.value);
        const hist = [...t.history, t.value];
        const lo = Math.min(...hist, t.minNormal), hi = Math.max(...hist, t.maxNormal);
        return (
          <button type="button" key={t.id} onClick={() => setSel(sel === t.id ? null : t.id)}
            className={`text-left rounded-xl border p-4 shadow-sm transition-all ${sel === t.id ? 'ring-2 ring-emerald-500 border-emerald-500' : st === 'out' ? 'border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}`}>
            <div className="flex items-center justify-between text-xs mb-1 gap-2"><span className="font-bold text-slate-800 dark:text-slate-200 truncate">{t.name}</span><span className="text-[12.5px] px-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">{t.source}</span></div>
            <div className="flex items-baseline gap-1.5 my-2"><span className={`text-2xl font-bold tabular-nums ${st === 'out' ? 'text-rose-600 dark:text-rose-400' : st === 'near' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>{fmtTag(t, t.value)}</span><span className="text-xs text-slate-400">{t.unit}</span></div>
            <div className="text-[12.5px] text-slate-500 flex justify-between"><span>Min {t.minNormal}</span><span>Max {t.maxNormal}</span></div>
            <div className="h-7 flex items-end gap-1 mt-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              {hist.map((v, i) => <div key={i} className={`flex-1 rounded-t ${st === 'out' && i === hist.length - 1 ? 'bg-rose-500' : 'bg-emerald-600'}`} style={{ height: `${Math.max(15, ((v - lo) / (hi - lo || 1)) * 100)}%` }} title={`${v}`} />)}
            </div>
            {sel === t.id && <div className="mt-2 text-[12.5px] text-slate-500">{t.samplingRateHz} Hz · {t.source.replace(/_/g, ' ')}</div>}
          </button>
        );
      })}
    </div>
  );
};

// ---------- Predictive maintenance ----------

export const PredictiveTab: React.FC<{ machine: MachineStation }> = ({ machine }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className={`${card} p-5 space-y-4`}>
      <h2 className={`${h2} flex items-center gap-1.5`}><Sparkles size={14} className="text-emerald-500" /> AI health and remaining life</h2>
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
        <div className={`text-4xl font-bold ${machine.aiHealthScore >= 85 ? 'text-emerald-600' : machine.aiHealthScore >= 65 ? 'text-amber-600' : 'text-rose-600'}`}>{machine.aiHealthScore}</div>
        <div className="text-xs text-slate-500">Composite station health, out of 100</div>
      </div>
      <div className="space-y-2 text-xs">
        {[['Failure chance in 7 days', `${machine.failureChance7d}%`], ['Failure chance in 30 days', `${machine.failureChance30d}%`], ['Best time to act', machine.failureChance7d > 8 ? 'Now, at the next stop' : 'Sunday shutdown']].map(([k, v]) => (
          <div key={k} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800"><span className="text-slate-500">{k}</span><span className="font-bold text-slate-800 dark:text-slate-100">{v}</span></div>
        ))}
      </div>
    </div>
    <div className={`lg:col-span-2 ${card} p-5 space-y-3`}>
      <h2 className={`${h2} flex items-center gap-1.5`}><Wrench size={14} className="text-amber-500" /> Wear parts and Weibull remaining life</h2>
      {machine.parts.map((p) => (
        <div key={p.partName} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-800 dark:text-white">{p.partName}</span><span className="text-slate-500">Remaining life <strong className={p.remainingDays <= 14 ? 'text-rose-600' : 'text-amber-600'}>{p.remainingDays} days</strong></span></div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden"><div className={`h-full rounded-full ${p.healthPercent >= 80 ? 'bg-emerald-500' : p.healthPercent >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${p.healthPercent}%` }} /></div>
          <div className="flex flex-wrap justify-between gap-2 text-[12.5px] text-slate-500"><span>{p.failureMode}</span><span>β {p.weibullBeta}</span><span>₹{(p.replacementCostEstimate * 82).toLocaleString('en-IN')} to replace</span></div>
        </div>
      ))}
    </div>
  </div>
);

// ---------- 30-day condition trends ----------

/** 30 daily values for a tag. A reading that is out of range today drifted there over the last week. */
export function dailySeries(code: string, k: number, t: SensorTag, days = 30): number[] {
  const r = rngFrom(hash(codeSeed(code), k, 91));
  const mid = (t.minNormal + t.maxNormal) / 2, band = t.maxNormal - t.minNormal;
  const drift = stateOfTag(t, t.value) !== 'ok';
  const out: number[] = [];
  for (let d = 0; d < days; d++) {
    const ramp = drift ? Math.max(0, (d - (days - 9)) / 8) : 0;
    const base = mid + (r() - 0.5) * band * 0.28;
    out.push(base + ramp * (t.value - base));
  }
  out[days - 1] = t.value;
  return out.map((v) => Number(v.toFixed(3)));
}

export const ConditionTab: React.FC<{ machine: MachineStation }> = ({ machine }) => {
  const tags = machine.tags.slice(0, 6);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tags.map((t, k) => {
          const s = dailySeries(machine.code, k, t);
          const change = s[s.length - 1] - s[0];
          return (
            <div key={t.id} className={`${card} p-4 space-y-1`}>
              <div className="flex items-baseline justify-between gap-2"><span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{t.name}</span><span className="text-[12.5px] text-slate-500">{fmtTag(t, t.value)} {t.unit}</span></div>
              <BandLine values={s} min={t.minNormal} max={t.maxNormal} xLabels={['30 days ago', 'today']} />
              <div className="text-[12.5px] text-slate-500">{stateOfTag(t, t.value) === 'out' ? <span className="text-rose-600 dark:text-rose-400 font-bold">Out of its normal range, drifting for about a week. </span> : null}30-day change {change >= 0 ? '+' : ''}{change.toFixed(Math.abs(change) < 10 ? 2 : 0)} {t.unit}</div>
            </div>
          );
        })}
      </div>
      <div className={`${card} p-5 space-y-3`}>
        <h2 className={h2}>Part health, last 30 days</h2>
        {machine.parts.map((p, i) => {
          const r = rngFrom(hash(codeSeed(machine.code), i, 17));
          const start = Math.min(100, p.healthPercent + (30 / Math.max(p.remainingDays, 10)) * (100 - p.healthPercent) * 0.5 + 6);
          const s = Array.from({ length: 30 }, (_, d) => start + (p.healthPercent - start) * (d / 29) + (r() - 0.5) * 1.6);
          s[29] = p.healthPercent;
          return (
            <div key={p.partName} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div className="text-xs"><div className="font-semibold text-slate-800 dark:text-slate-200">{p.partName}</div><div className="text-slate-500">{p.healthPercent}% health · {p.remainingDays} days left</div></div>
              <div className="md:col-span-2"><BandLine values={s} min={60} max={100} height={70} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------- OEE and cycles ----------

export const OeeTab: React.FC<{ machine: MachineStation }> = ({ machine }) => {
  const seed = codeSeed(machine.code);
  const week = useMemo(() => {
    const r = rngFrom(hash(seed, 5));
    const v = Array.from({ length: 7 }, () => Number((machine.shiftOee + (r() - 0.55) * 6).toFixed(1)));
    v[6] = machine.shiftOee;
    return v;
  }, [machine.code, machine.shiftOee, seed]);
  const cycles = useMemo(() => {
    const r = rngFrom(hash(seed, 6));
    return Array.from({ length: 24 }, () => Number((machine.cycleTimeSec * (1 + (r() - 0.45) * 0.08)).toFixed(2)));
  }, [machine.code, machine.cycleTimeSec, seed]);
  const stops = useMemo(() => {
    const r = rngFrom(hash(seed, 7));
    const reasons = [machine.status !== 'nominal' && machine.statusReason ? machine.statusReason.split(':')[0] : 'Planned changeover', 'Starved by the machine before', 'Blocked by the buffer after', 'Planned changeover', 'Minor jam cleared'];
    return [0, 1, 2].map((i) => ({ at: `${14 + i}:${String(Math.floor(r() * 50) + 5).padStart(2, '0')}`, min: Math.round(3 + r() * 12), reason: reasons[(i + (r() > 0.5 ? 1 : 0)) % reasons.length] }));
  }, [machine.code, machine.status, machine.statusReason, seed]);
  const tile = (k: string, v: string, s: string) => (<div className={`${card} p-4`}><div className="text-[12.5px] tracking-wider text-slate-400">{k}</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{v}</div><div className="text-[12.5px] text-slate-500">{s}</div></div>);
  const cmax = Math.max(...cycles, machine.standardCycleTimeSec) * 1.05, cmin = Math.min(...cycles, machine.standardCycleTimeSec) * 0.95;
  const cy = (v: number) => 8 + (1 - (v - cmin) / (cmax - cmin || 1)) * 90;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tile('OEE, SHIFT B', `${machine.shiftOee.toFixed(1)}%`, 'Availability × performance × quality')}
        {tile('AVAILABILITY', `${machine.availability.toFixed(0)}%`, 'Time running of time planned')}
        {tile('PERFORMANCE', `${machine.performance.toFixed(0)}%`, `Cycle ${machine.cycleTimeSec} s against ${machine.standardCycleTimeSec} s`)}
        {tile('QUALITY', `${machine.quality.toFixed(1)}%`, 'Good batteries of those made')}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${card} p-4 space-y-2`}><h2 className={h2}>OEE, last 7 days</h2><Bars values={week} labels={['-6d', '-5d', '-4d', '-3d', '-2d', 'Yest.', 'Today']} highlight={6} max={100} fmt={(v) => `${v.toFixed(0)}`} /></div>
        <div className={`${card} p-4 space-y-2`}>
          <h2 className={h2}>Cycle time, last 24 cycles</h2>
          <svg viewBox="0 0 420 110" className="w-full h-auto">
            <line x1={6} x2={414} y1={cy(machine.standardCycleTimeSec)} y2={cy(machine.standardCycleTimeSec)} stroke="#10b981" strokeDasharray="4 3" />
            <text x={410} y={cy(machine.standardCycleTimeSec) - 3} fontSize={9} textAnchor="end" fill="#10b981">standard {machine.standardCycleTimeSec} s</text>
            <path d={cycles.map((v, i) => `${i ? 'L' : 'M'}${(6 + (i / 23) * 408).toFixed(1)},${cy(v).toFixed(1)}`).join(' ')} fill="none" stroke="#0f7f66" strokeWidth={1.8} />
          </svg>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${card} p-4 space-y-2`}>
          <h2 className={h2}>Golden batch: this cycle against the best one</h2>
          <table className="w-full text-xs"><thead><tr className="text-left text-[12.5px] uppercase text-slate-400"><th className="py-1">Step</th><th>Golden</th><th>Now</th><th>Gap</th></tr></thead><tbody>
            {machine.goldenBatchProfile.map((g) => {
              const dev = g.currentVal - g.targetVal, bad = Math.abs(dev) > g.tolerance;
              return (<tr key={g.stepName} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1.5 text-slate-700 dark:text-slate-300">{g.stepName}</td><td className="">{g.targetVal} {g.unit}</td><td className="">{g.currentVal} {g.unit}</td><td className={`font-bold ${bad ? 'text-rose-600' : 'text-emerald-600'}`}>{dev >= 0 ? '+' : ''}{dev.toFixed(2)} {bad ? '(out)' : ''}</td></tr>);
            })}
          </tbody></table>
        </div>
        <div className={`${card} p-4 space-y-2`}>
          <h2 className={h2}>Stops this shift</h2>
          {stops.map((s) => (<div key={s.at} className="flex items-center justify-between text-xs py-1.5 border-t border-slate-100 dark:border-slate-800 first:border-0"><span className="text-slate-400">{s.at}</span><span className="flex-1 mx-3 text-slate-700 dark:text-slate-300 truncate">{s.reason}</span><span className="font-bold">{s.min} min</span></div>))}
        </div>
      </div>
    </div>
  );
};

// ---------- Alarms ----------

export const AlarmsTab: React.FC<{ alarms: PlantAlarm[]; now: number; onAcknowledge: (id: string) => void }> = ({ alarms, now, onAcknowledge }) => (
  <div className={`${card} p-5 space-y-3`}>
    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800"><h2 className={h2}>Alarms on this machine</h2><span className="text-xs font-bold text-slate-500">{alarms.length} in total</span></div>
    {alarms.length === 0 && <p className="text-xs text-slate-500 py-8 text-center">No alarms. Every register is nominal.</p>}
    {alarms.map((a) => (
      <div key={a.id} className={`p-4 rounded-xl border text-xs space-y-2 ${a.resolvedAt != null ? 'opacity-60 border-slate-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'}`}>
        <div className="flex items-center justify-between font-bold"><span>{a.severity.toUpperCase()} · {a.code}</span><span className="text-slate-400 font-normal">{a.raisedAt != null ? ageLabel(a.raisedAt, now) : a.timestamp}{a.resolvedAt != null ? ' · cleared' : ''}</span></div>
        <p className="text-slate-800 dark:text-slate-200 font-semibold">{a.cause}</p>
        <p className="text-slate-500">Fix: {a.recommendedFix}</p>
        <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800">
          <span className="text-[12.5px] text-slate-400">Told: {a.escalation.replace(/_/g, ' ')}</span>
          {a.resolvedAt != null ? <span className="text-emerald-600 font-bold">Cleared</span> : !a.acknowledged ? <button type="button" onClick={() => onAcknowledge(a.id)} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold">Acknowledge</button> : <span className="text-emerald-600 font-bold">Acknowledged by {a.acknowledgedBy}</span>}
        </div>
      </div>
    ))}
  </div>
);

// ---------- Energy ----------

export const EnergyTab: React.FC<{ machine: MachineStation; power: Power; stepIndex: number; tick: number; produced: number }> = ({ machine, power, stepIndex, tick, produced }) => {
  const steps = stepsOf(machine.code), load = loadOf(machine.code, steps.length);
  const hours = (162 + tick * 0.3) / 60;
  const kwh = machine.powerConsumptionKw * hours * (machine.availability / 100);
  const rate = 8.5;
  const rated = machine.powerConsumptionKw * Math.max(...load) * 1.15;
  const tile = (k: string, v: string, s: string) => (<div className={`${card} p-4`}><div className="text-[12.5px] tracking-wider text-slate-400">{k}</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{v}</div><div className="text-[12.5px] text-slate-500">{s}</div></div>);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tile('POWER NOW', `${power.kw.toFixed(0)} kW`, `Rated ${rated.toFixed(0)} kW`)}
        {tile('ENERGY, SHIFT B', `${kwh.toFixed(0)} kWh`, `${hours.toFixed(1)} h at ${machine.availability.toFixed(0)}% availability`)}
        {tile('COST SO FAR', `₹${Math.round(kwh * rate).toLocaleString('en-IN')}`, `At ₹${rate} per kWh`)}
        {tile('PER BATTERY', `${produced ? (kwh / produced).toFixed(2) : '0'} kWh`, `${produced} batteries this shift`)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${card} p-4 space-y-2`}>
          <h2 className={h2}>Power through the cycle</h2>
          <Bars values={load.map((l) => machine.powerConsumptionKw * l)} labels={steps} highlight={stepIndex} fmt={(v) => v.toFixed(0)} color="bg-violet-500" height={140} />
          <p className="text-[12.5px] text-slate-500">Heating and welding steps draw the most. The highlighted step is running now.</p>
        </div>
        <div className={`${card} p-4 space-y-2 text-xs`}>
          <h2 className={`${h2} font-sans`}>Electrical, three-phase</h2>
          {[['Voltage', `${power.volts.toFixed(0)} V`], ['Current', `${power.amps.toFixed(0)} A`], ['Power factor', power.pf.toFixed(2)], ['Frequency', '50.0 Hz'], ['Load against rating', `${((power.kw / rated) * 100).toFixed(0)}%`]].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 border-t border-slate-100 dark:border-slate-800 first:border-0"><span className="text-slate-500">{k}</span><span className="font-bold text-slate-800 dark:text-slate-100">{v}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------- Details ----------

export const DetailsTab: React.FC<{ machine: MachineStation }> = ({ machine }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className={`${card} p-5 space-y-2 text-xs`}>
      <h2 className={h2}>What it does</h2>
      <p className="text-slate-600 dark:text-slate-300">{machine.description}</p>
      <div className="space-y-1.5 pt-2">
        {[['Code', machine.code], ['Area', machine.area.replace(/_/g, ' ')], ['Standard cycle', `${machine.standardCycleTimeSec} s`], ['Rated power', `${machine.powerConsumptionKw} kW`], ['Buffer after', `${machine.bufferAfterUnits} of ${machine.bufferCapacity} units`]].map(([k, v]) => (
          <div key={k} className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5"><span className="text-slate-500">{k}</span><span className="font-bold">{v}</span></div>
        ))}
      </div>
    </div>
    <div className={`${card} p-5 space-y-2 text-xs`}>
      <h2 className={h2}>Gateway</h2>
      <div className="space-y-1.5">
        {[['Gateway', `GW-${machine.code.replace('-', '')}`], ['PLC link', `opc.tcp://plc-${machine.code.toLowerCase()}.exide.internal:4840`], ['Plant bus', 'plant-mqtt.exide.internal:1883'], ['Edge buffer', '7 days'], ['Models on board', 'Anomaly, wear counters']].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-1.5"><span className="text-slate-500 shrink-0">{k}</span><span className="font-bold text-right break-all">{v}</span></div>
        ))}
      </div>
    </div>
    <div className={`${card} p-5 text-xs`}>
      <h2 className={`${h2} mb-2`}>Tags and sampling</h2>
      <table className="w-full"><tbody>
        {machine.tags.map((t) => (<tr key={t.id} className="border-t border-slate-100 dark:border-slate-800 first:border-0"><td className="py-1 text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{t.name}</td><td className="text-slate-400 text-right">{t.source.replace(/_/g, ' ')} · {t.samplingRateHz} Hz</td></tr>))}
      </tbody></table>
    </div>
  </div>
);
