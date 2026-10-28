/**
 * Small confirmation messages ("PDF ready", "Handover signed off"), shown bottom right for a few seconds.
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';

export interface Toast { id: number; title: string; detail?: string; tone: 'teal' | 'amber' | 'neutral'; at: number }

let list: Toast[] = [];
let seq = 1;
const subs = new Set<(t: Toast[]) => void>();

export function toast(t: Omit<Toast, 'id' | 'tone' | 'at'> & { tone?: Toast['tone'] }) {
  if (list.some((x) => x.title === t.title && x.detail === t.detail && Date.now() - x.at < 1500)) return;
  const item: Toast = { id: seq++, tone: 'neutral', at: Date.now(), ...t };
  list = [...list, item];
  subs.forEach((s) => s(list));
  setTimeout(() => {
    list = list.filter((x) => x.id !== item.id);
    subs.forEach((s) => s(list));
  }, 4500);
}

export const Toaster: React.FC = () => {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    subs.add(setItems);
    return () => { subs.delete(setItems); };
  }, []);
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto flex w-80 items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {t.tone === 'teal' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : t.tone === 'amber' ? <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" /> : <Info size={18} className="mt-0.5 shrink-0 text-slate-500" />}
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{t.title}</div>
            {t.detail && <div className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">{t.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};
