/**
 * ValueView.tsx
 * What the system saves, with every assumption editable: defects it catches, escapes it prevents, scrap it avoids by
 * seeing a drifting process earlier, inspector time freed, and the payback. The defect rate comes from the live line.
 */

import React, { useState } from 'react';
import type { InspectionState } from '../inspection/types';
import { lineFigures } from '../inspection/selectors';
import { Button, ConnectedStrip, Note, PageHead, Panel, Prov, Stat } from './ui-kit';

const inr = (v: number) => (Math.abs(v) >= 1e7 ? `₹${(v / 1e7).toFixed(2)} cr` : Math.abs(v) >= 1e5 ? `₹${(v / 1e5).toFixed(1)} lakh` : `₹${Math.round(v).toLocaleString('en-IN')}`);

const DEFAULTS = {
  perDay: 4600,
  days: 26,
  scrap: 3100,
  rework: 180,
  escape: 6500,
  miss: 12,
  incidents: 6,
  minutes: 45,
  inspectors: 6,
  salary: 28000,
  freed: 60,
  invest: 8500000,
  running: 420000,
};

function Field({ label, hint, value, onChange, unit }: { label: string; hint?: string; value: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <span className="mt-1 flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:border-emerald-600">
        <input type="number" min={0} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} className="w-full bg-transparent px-3 py-1.5 text-[14px] tabular-nums outline-none" />
        {unit && <span className="pr-3 text-[12.5px] text-slate-400">{unit}</span>}
      </span>
      {hint && <span className="mt-0.5 block text-[12px] text-slate-400">{hint}</span>}
    </label>
  );
}

export const ValueView: React.FC<{ inspection: InspectionState }> = ({ inspection }) => {
  const [a, setA] = useState(DEFAULTS);
  const set = (k: keyof typeof DEFAULTS) => (v: number) => setA((s) => ({ ...s, [k]: v }));
  const f = lineFigures(inspection);

  // the live line's defect rate scales to a month of production
  const badRate = Math.max(0, 1 - f.firstPassYield / 100);
  const perMonth = a.perDay * a.days;
  const defects = perMonth * badRate;
  const rejects = defects * 0.46;
  const reworks = defects - rejects;
  const escapes = defects * (a.miss / 100);
  const escapesSaved = escapes * a.escape;
  const perHour = a.perDay / 21; // three shifts, about 21 working hours
  const driftSaved = a.incidents * (a.minutes / 60) * perHour * (badRate * 4) * a.scrap * 0.5;
  const labour = a.inspectors * a.salary * (a.freed / 100);
  const gross = escapesSaved + driftSaved + labour;
  const net = gross - a.running;
  const payback = net > 0 ? a.invest / net : Infinity;

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Analyse"
        title="Savings"
        description="What the system is worth to this plant. The defect rate is the live line’s; every other number is an assumption you can change to the plant’s own."
        actions={<Button onClick={() => setA(DEFAULTS)}>Reset assumptions</Button>}
      />
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Stat label="Net saving, a month" value={inr(net)} sub={`${inr(gross)} saved less ${inr(a.running)} to run`} prov="computed" tone={net > 0 ? 'teal' : 'red'} />
        <Stat label="Payback" value={Number.isFinite(payback) ? `${payback.toFixed(1)} months` : 'Not reached'} sub={`On ${inr(a.invest)} invested`} prov="computed" tone="teal" />
        <Stat label="Defects caught, a month" value={Math.round(defects).toLocaleString('en-IN')} sub={`${Math.round(rejects).toLocaleString('en-IN')} rejected, ${Math.round(reworks).toLocaleString('en-IN')} reworked`} prov="model" />
        <Stat label="Escapes prevented" value={Math.round(escapes).toLocaleString('en-IN')} sub={`Would have reached customers at a ${a.miss}% miss rate`} prov="model" />
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel className="h-full" title="Where the saving comes from" description="A month of production at the live defect rate" actions={<Prov k="computed" compact />}>
          <ul className="space-y-4">
            {([
              ['Field failures avoided', escapesSaved, `${Math.round(escapes)} defective batteries that manual checks would miss, at ${inr(a.escape)} each in warranty and returns`],
              ['Scrap avoided by catching drift early', driftSaved, `${a.incidents} incidents a month found ${a.minutes} min sooner, so fewer batteries are built bad`],
              ['Inspector time redeployed', labour, `${a.freed}% of ${a.inspectors} inspectors’ time moved to rework and process checks`],
            ] as const).map(([k, v, hint]) => (
              <li key={k}>
                <div className="flex justify-between gap-3 text-[14px]"><span className="font-semibold text-slate-900 dark:text-white">{k}</span><span className="font-semibold tabular-nums">{inr(v)}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${gross ? (v / gross) * 100 : 0}%` }} /></div>
                <div className="mt-1 text-[12.5px] text-slate-500">{hint}</div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-[14px]">
            <span className="text-slate-500">Running cost, a month</span><span className="font-semibold tabular-nums">−{inr(a.running)}</span>
          </div>
        </Panel>

        <Panel className="h-full" title="Assumptions" description="Replace with the plant’s own numbers">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Batteries a day" value={a.perDay} onChange={set('perDay')} />
            <Field label="Working days a month" value={a.days} onChange={set('days')} />
            <Field label="Cost of a scrapped battery" value={a.scrap} onChange={set('scrap')} unit="₹" />
            <Field label="Cost of a rework" value={a.rework} onChange={set('rework')} unit="₹" />
            <Field label="Cost of one field failure" value={a.escape} onChange={set('escape')} unit="₹" hint="Warranty, transport, brand" />
            <Field label="Defects missed by manual checks" value={a.miss} onChange={set('miss')} unit="%" />
            <Field label="Drift incidents a month" value={a.incidents} onChange={set('incidents')} />
            <Field label="Found sooner by" value={a.minutes} onChange={set('minutes')} unit="min" />
            <Field label="Inspectors on the four checks" value={a.inspectors} onChange={set('inspectors')} />
            <Field label="Time freed" value={a.freed} onChange={set('freed')} unit="%" />
            <Field label="Cost per inspector, a month" value={a.salary} onChange={set('salary')} unit="₹" />
            <Field label="One-time investment" value={a.invest} onChange={set('invest')} unit="₹" hint="Cameras, edge boxes, server, setup" />
            <Field label="Running cost, a month" value={a.running} onChange={set('running')} unit="₹" hint="Support, licences, spares" />
          </div>
        </Panel>
      </div>
      <Note>Illustrative. The defect rate is live; the rupee values, miss rate and investment are example assumptions to be replaced with the plant’s own figures and the measured results of the pilot.</Note>
      <ConnectedStrip ids={['CN-VIS', 'CN-QMS', 'CN-MES']} />
    </div>
  );
};
