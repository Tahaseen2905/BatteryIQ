/**
 * Small shared pieces for the inspection screens.
 */

import React from 'react';
import type { Decision, Severity } from '../../inspection/types';

export const card = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm';

const DEC: Record<Decision, string> = {
  pass: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40',
  rework: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-500/40',
  reject: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-500/50',
  review: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-500/40',
};

export const DecisionChip: React.FC<{ decision: Decision }> = ({ decision }) => (
  <span className={`text-[12.5px] font-bold px-1.5 py-0.5 rounded border uppercase ${DEC[decision]}`}>{decision}</span>
);

const SEV: Record<Severity, string> = {
  minor: 'text-yellow-700 dark:text-yellow-300',
  major: 'text-amber-700 dark:text-amber-300',
  critical: 'text-rose-700 dark:text-rose-300',
};
export const SeverityText: React.FC<{ severity: Severity }> = ({ severity }) => (
  <span className={`text-[12.5px] font-bold uppercase ${SEV[severity]}`}>{severity}</span>
);

export const Tab: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; badge?: number }> = ({ active, onClick, children, badge }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
      active
        ? 'bg-emerald-600 text-white border-emerald-600'
        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
    }`}
  >
    {children}
    {badge ? <span className="ml-1.5 px-1.5 rounded-full text-[12.5px] bg-rose-500 text-white">{badge}</span> : null}
  </button>
);

/** EXB261028-00544 -> #00544 */
export const shortSerial = (serial: string) => `#${serial.slice(-5)}`;
