/**
 * ModelView.tsx
 * The AI behind the four gates, shown honestly: what it is, how the camera's calls hold up against the operators'
 * verdicts (live), the learning loop that turns those verdicts into a retraining set, the targets a pilot must
 * prove on the plant's own labelled images, and a reference image library.
 */

import React, { useRef, useState } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';
import type { InspectionState } from '../inspection/types';
import { GATE_IDS, type GateId } from '../inspection/types';
import { DEFECTS, DEFECT_BY_ID, GATES, REVIEW_CONFIDENCE } from '../inspection/catalogue';
import { clockAt } from '../inspection/engine';
import { allGateStats } from '../inspection/selectors';
import { BatteryRender } from './quality/BatteryRender';
import { Button, Code, ConnectedStrip, KeyValues, Note, PageHead, Panel, Prov, Stat, Status, TD, TH } from './ui-kit';
import { toast } from './toasts';
import { shortSerial } from './quality/ui';

const TARGETS: [string, string, string][] = [
  ['Defects caught (recall)', '99% or better', 'Of all defective batteries, how many the gate flags'],
  ['Good batteries wrongly stopped', '1% or less', 'False rejects: each one costs a battery or a re-check'],
  ['Defects reaching dispatch', '0.1% or less', 'Escapes past all four gates'],
  ['Calls sent to operator review', '3% or less', 'The camera is unsure, so a person decides'],
  ['Decision time', 'Under 100 ms a frame', 'On the gate’s edge box, with no cloud'],
];

export const ModelView: React.FC<{ inspection: InspectionState }> = ({ inspection }) => {
  const stats = allGateStats(inspection.units);
  const [photos, setPhotos] = useState<{ url: string; name: string }[]>([]);
  const [library, setLibrary] = useState<GateId>('Q3');
  const [queued, setQueued] = useState(0);
  const file = useRef<HTMLInputElement>(null);

  // operator verdicts on the camera's doubtful calls
  const all = inspection.units.flatMap((u) => u.results.filter((r) => r.reviewed).map((r) => ({ u, r })));
  const timedOut = all.filter((v) => /time-?out/i.test(v.r.reviewed!.by)).length;
  const verdicts = all.filter((v) => !/time-?out/i.test(v.r.reviewed!.by));
  const released = verdicts.filter((v) => v.r.reviewed!.outcome === 'release').length;
  const confirmed = verdicts.length - released;
  const precision = verdicts.length ? (confirmed / verdicts.length) * 100 : 0;
  const calls = GATE_IDS.reduce((a, g) => a + stats[g].inspected, 0);
  const recent = [...all].sort((x, y) => (y.r.reviewed!.atIndex ?? 0) - (x.r.reviewed!.atIndex ?? 0)).slice(0, 6);

  const advice = (g: GateId) => {
    const vs = verdicts.filter((v) => v.r.gate === g);
    if (vs.length < 3) return 'Too few verdicts';
    const rel = vs.filter((v) => v.r.reviewed!.outcome === 'release').length / vs.length;
    if (rel > 0.5) return 'Raise threshold';
    if (rel < 0.2) return 'Lower threshold';
    return 'Keep';
  };

  const defects = DEFECTS.filter((d) => d.gate === library);

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Inspect"
        title="AI model"
        description="What the AI is, how its calls hold up against your operators’ verdicts, and how it keeps learning from them. Nothing here leaves the plant."
      />
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Stat label="Gate calls this shift" value={calls.toLocaleString('en-IN')} sub={`${GATE_IDS.length} gates, every battery, every gate`} prov="plc" />
        <Stat label="Operator verdicts" value={verdicts.length} sub={`${confirmed} confirmed, ${released} released${timedOut ? `, ${timedOut} timed out` : ''}`} prov="computed" />
        <Stat label="Doubtful calls, real" value={verdicts.length ? `${precision.toFixed(0)}%` : 'No verdicts yet'} sub="Share of reviewed calls the operator confirmed" prov="computed" tone="teal" />
        <Stat label="Sent to review below" value={`${Math.round(REVIEW_CONFIDENCE * 100)}%`} sub="Camera confidence, set in Settings" prov="config" />
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel flush className="h-full" title="The camera against the operators" description="Live from this shift: every doubtful call a person has decided" actions={<Prov k="computed" compact />}>
          <table className="w-full">
            <thead><tr>{['Gate', 'Seen', 'Passed', 'In review', 'Confirmed', 'Released', 'Threshold'].map((h, i) => <th key={h} className={`${TH} ${i > 0 && i < 6 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
            <tbody>
              {GATE_IDS.map((g) => {
                const vs = verdicts.filter((v) => v.r.gate === g);
                const rel = vs.filter((v) => v.r.reviewed!.outcome === 'release').length;
                return (
                  <tr key={g}>
                    <td className={`${TD} font-semibold whitespace-nowrap`}>{g} <span className="font-normal text-slate-400">{GATES[g].short}</span></td>
                    <td className={`${TD} text-right tabular-nums`}>{stats[g].inspected}</td>
                    <td className={`${TD} text-right tabular-nums`}>{stats[g].passed}</td>
                    <td className={`${TD} text-right tabular-nums`}>{stats[g].review}</td>
                    <td className={`${TD} text-right tabular-nums`}>{vs.length - rel}</td>
                    <td className={`${TD} text-right tabular-nums`}>{rel}</td>
                    <td className={`${TD} whitespace-nowrap text-[12.5px] text-slate-500`}>{advice(g)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <Panel className="h-full" title="What it is" description="Model card">
          <KeyValues w={130} rows={[
            ['Model', 'BatteryIQ Vision v1 (demo)'],
            ['Task', 'Defect detection and measurement, one model per gate'],
            ['Runs on', 'An edge box at each gate, offline'],
            ['Input', 'A frame per battery, at the gate’s camera'],
            ['Output', 'Defect, location, confidence and measurements'],
            ['Decides', `Pass, rework, reject, or review below ${Math.round(REVIEW_CONFIDENCE * 100)}%`],
            ['Learns from', 'Operator verdicts and the plant’s labelled images'],
          ]} />
        </Panel>
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-2">
        <Panel flush className="h-full" title="The learning loop" description="Operator verdicts become the next training set"
          actions={<Button size="sm" variant="primary" disabled={!verdicts.length} onClick={() => { setQueued(verdicts.length); toast({ title: 'Added to the retraining set', detail: `${confirmed} confirmed defects and ${released} false alarms, kept with their frames on the plant server.`, tone: 'teal' }); }}>Add to retraining set</Button>}>
          {recent.length ? recent.map(({ u, r }) => (
            <div key={`${u.index}-${r.gate}`} className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-2.5 last:border-b-0">
              <Code>{shortSerial(u.serial)}</Code>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-white">{r.detections[0] ? DEFECT_BY_ID[r.detections[0].defectId]?.label : 'Doubtful call'}</div>
                <div className="text-[12.5px] text-slate-500">{r.gate} · {Math.round(r.confidence * 100)}% confident · {clockAt(r.reviewed!.atIndex)} · {r.reviewed!.by}</div>
              </div>
              {/time-?out/i.test(r.reviewed!.by) ? <Status s="pending">Timed out</Status> : r.reviewed!.outcome === 'confirm' ? <Status s="fail">Real defect</Status> : <Status s="pass">False alarm</Status>}
            </div>
          )) : <div className="px-5 py-6 text-[13.5px] text-slate-500">No verdicts yet. Open Quality gates, then Review and hold bay, and release or confirm a doubtful battery. It shows here and joins the retraining set.</div>}
          {queued > 0 && <div className="border-t border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/20 px-5 py-2.5 text-[13px] text-emerald-800 dark:text-emerald-300">{queued} labelled frames queued for the next retraining. A person approves every new model before it goes live.</div>}
        </Panel>

        <Panel flush className="h-full" title="What a pilot must prove" description="Targets, measured on your own labelled images before go-live" actions={<Prov k="config" compact />}>
          <table className="w-full">
            <tbody>
              {TARGETS.map(([k, v, hint]) => (
                <tr key={k}>
                  <td className={TD}><div className="font-semibold text-slate-900 dark:text-white">{k}</div><div className="text-[12.5px] text-slate-500">{hint}</div></td>
                  <td className={`${TD} whitespace-nowrap text-right font-semibold`}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Reference images" description="What each gate’s camera sees for each defect. The frames below are drawn for the demo; add photos from your own line next to them."
        actions={<><input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { const fs = Array.from(e.target.files ?? []); setPhotos((p) => [...p, ...fs.map((f) => ({ url: URL.createObjectURL(f), name: f.name }))]); e.target.value = ''; }} /><Button size="sm" onClick={() => file.current?.click()}><Upload size={13} />Add photos from the line</Button></>}>
        {photos.length > 0 && (
          <div className="mb-5">
            <div className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Your photos, kept in this browser only</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {photos.map((p) => (
                <figure key={p.url} className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <img src={p.url} alt={p.name} className="aspect-[4/3] w-full object-cover" />
                  <button type="button" aria-label="Remove" onClick={() => setPhotos((x) => x.filter((y) => y.url !== p.url))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-slate-900/70 text-white"><X size={13} /></button>
                  <figcaption className="truncate px-2 py-1 text-[11.5px] text-slate-500">{p.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
        <div className="mb-4 flex flex-wrap gap-2">
          {GATE_IDS.map((g) => (
            <button key={g} type="button" onClick={() => setLibrary(g)} className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold ${library === g ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{g} {GATES[g].short}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {defects.map((d) => {
            const unit = inspection.units[inspection.units.length - 1];
            const res = { gate: d.gate, detections: [{ defectId: d.id, confidence: 0.96 }], measures: {}, decision: d.action, confidence: 0.96, firstPass: false } as never;
            return (
              <figure key={d.id} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <BatteryRender gate={d.gate} unit={unit} result={res} className="h-auto w-full bg-slate-950" />
                <figcaption className="px-3 py-2">
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{d.label}</div>
                  <div className="text-[12px] text-slate-500">{d.action === 'reject' ? 'Reject' : 'Rework'} · {d.severity} · look at {d.suspect}</div>
                </figcaption>
              </figure>
            );
          })}
        </div>
        {!photos.length && <div className="mt-4 flex items-center gap-2 text-[12.5px] text-slate-500"><ImagePlus size={14} />No plant photos yet. In a pilot the gate cameras collect them and your team labels them here.</div>}
      </Panel>
      <Note>Accuracy figures are not claimed here. The camera frames in this demo are drawn, not photographed, so they prove the flow and not the model. The pilot measures the targets above on your own labelled images.</Note>
      <ConnectedStrip ids={['CN-VIS', 'CN-GW', 'CN-QMS']} />
    </div>
  );
};
