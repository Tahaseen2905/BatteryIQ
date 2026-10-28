/**
 * MachineStudio.tsx
 * The machine in 3D (a standalone three.js page in an iframe) with its sensor tags and power tags
 * floating on it, an X-ray view, and a pulsing stack light when it is not running.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Zap, Eye, Tag } from 'lucide-react';
import type { MachineStation } from '../../types';
import { fmtTag, stateOfTag } from '../../domain/machineModel';

export interface Power { kw: number; amps: number; volts: number; pf: number }

interface Props {
  machine: MachineStation;
  power: Power;
  children?: React.ReactNode; // overlay under the 3D view (the step timeline)
}

const toggle = (on: boolean) =>
  `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
    on ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
  }`;

export const MachineStudio: React.FC<Props> = ({ machine, power, children }) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [xray, setXray] = useState(false);
  const [showTags, setShowTags] = useState(true);
  const [showPower, setShowPower] = useState(false);
  const [full, setFull] = useState(false);

  // the studio page tells us when it has built the machine
  useEffect(() => {
    setReady(false);
    const on = (e: MessageEvent) => {
      if (e.data?.type === 'STUDIO_READY') setReady(true);
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [machine.code]);

  const send = (msg: object) => frame.current?.contentWindow?.postMessage({ type: 'STUDIO', ...msg }, '*');

  useEffect(() => {
    if (!ready) return;
    send({
      xray, showTags, showPower, status: machine.status,
      tags: machine.tags.slice(0, 5).map((t) => ({ name: t.name, value: `${fmtTag(t, t.value)} ${t.unit}`, state: stateOfTag(t, t.value) })),
      power: [
        { name: 'Power', value: `${power.kw.toFixed(0)} kW`, state: 'ok' },
        { name: 'Current', value: `${power.amps.toFixed(0)} A`, state: 'ok' },
        { name: 'Voltage', value: `${power.volts.toFixed(0)} V`, state: 'ok' },
        { name: 'Power factor', value: power.pf.toFixed(2), state: 'ok' },
      ],
    });
  });

  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [full]);

  return (
    <div className={full ? 'fixed inset-4 z-50 flex flex-col rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-4 gap-3' : 'flex flex-col gap-3'}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={toggle(xray)} onClick={() => setXray((v) => !v)} aria-pressed={xray}><Eye size={14} /> X-ray</button>
        <button type="button" className={toggle(showTags)} onClick={() => setShowTags((v) => !v)} aria-pressed={showTags}><Tag size={14} /> Sensor tags</button>
        <button type="button" className={toggle(showPower)} onClick={() => setShowPower((v) => !v)} aria-pressed={showPower}><Zap size={14} /> Power tags</button>
        <button type="button" className="ml-auto p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setFull((v) => !v)} aria-label={full ? 'Close full view' : 'Open full view'}>
          {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
      <div className={`relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 ${full ? 'flex-1' : 'h-[380px]'}`}>
        <iframe
          ref={frame}
          key={machine.code}
          title={`${machine.code} 3D view`}
          src={`/assets/aistudio/machine_studio.html?m=${encodeURIComponent(machine.code)}`}
          className="w-full h-full border-0"
        />
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">Loading {machine.code}…</div>}
      </div>
      {children}
    </div>
  );
};
