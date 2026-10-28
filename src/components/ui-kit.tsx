/**
 * ui-kit.tsx
 * JoulesToWatts House Design System UI Kit (as CreditIQ / BatteryIQ):
 * Cards with a soft lift, state as an icon and a word, figure provenance badges.
 */

import React, { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import {
  CircleCheck,
  CircleX,
  CircleDashed,
  Info,
  TriangleAlert,
  OctagonAlert,
  Unplug,
  Cpu,
  Waves,
  FileText,
  Calculator,
  Settings2,
  Sparkles,
  RadioTower,
  Server,
  Activity,
  type LucideIcon,
} from 'lucide-react';

import { INTEGRATIONS, agoLabel, type IntegrationDef } from '../domain/plant';

/* ------------------------------------------------------------------ cards */

export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = '',
  flush = false,
  style,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
  style?: CSSProperties;
}) {
  return (
    <section
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex min-w-0 flex-col overflow-hidden ${className}`}
      style={style}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            {title && <h2 className="text-[15.5px] font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>}
            {description && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`min-h-0 min-w-0 flex-1 ${!flush ? 'p-5' : ''} ${bodyClassName}`}>{children}</div>
    </section>
  );
}
export const Card = Panel;

/* ---------------------------------------------------------------- buttons */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
  size?: 'sm' | 'md';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className = '', ...rest },
  ref
) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors cursor-pointer select-none shrink-0';
  const sizes = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs font-semibold';
  const variants =
    variant === 'primary'
      ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm'
      : variant === 'danger'
      ? 'bg-rose-700 hover:bg-rose-600 text-white shadow-sm'
      : variant === 'ghost' || variant === 'quiet'
      ? 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-sm';

  return <button ref={ref} type="button" className={`${base} ${sizes} ${variants} ${className}`} {...rest} />;
});

/* ----------------------------------------------------------------- status */

export type StatusKind = 'pass' | 'near' | 'fail' | 'pending' | 'running' | 'info';

const STATUS_ICON: Record<StatusKind, LucideIcon> = {
  pass: CircleCheck,
  near: TriangleAlert,
  fail: CircleX,
  pending: CircleDashed,
  running: CircleDashed,
  info: Info,
};

export function Status({ s, children, icon }: { s: StatusKind; children: ReactNode; icon?: ReactNode }) {
  const Icon = STATUS_ICON[s];
  const tones =
    s === 'pass' || s === 'running'
      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
      : s === 'near'
      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
      : s === 'fail'
      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12.5px] font-medium border ${tones}`}>
      {icon ?? (s === 'running' ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> : <Icon size={12} strokeWidth={2.4} />)}
      {children}
    </span>
  );
}

export type Tone = 'neutral' | 'teal' | 'amber' | 'red';

export function Badge({ tone = 'neutral', children, className = '', icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  const tones =
    tone === 'teal'
      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
      : tone === 'amber'
      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
      : tone === 'red'
      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12.5px] font-medium border ${tones} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

const SEV: Record<'critical' | 'major' | 'minor', { word: string; icon: LucideIcon; tone: string }> = {
  critical: { word: 'Critical', icon: OctagonAlert, tone: 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  major: { word: 'Major', icon: TriangleAlert, tone: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  minor: { word: 'Minor', icon: Info, tone: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
};

export function SeverityBadge({ severity }: { severity: 'critical' | 'major' | 'minor' }) {
  const t = SEV[severity];
  const Icon = t.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12.5px] font-bold border ${t.tone}`}>
      <Icon size={12} strokeWidth={2.4} />
      {t.word}
    </span>
  );
}

export function StateDot({ state, className = '' }: { state: 'running' | 'idle' | 'offline' | 'ok' | 'watch' | 'alert'; className?: string }) {
  if (state === 'running' || state === 'ok') {
    return <span className={`inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse ${className}`} />;
  }
  if (state === 'alert') {
    return <span className={`inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse ${className}`} />;
  }
  if (state === 'watch') {
    return <span className={`inline-block w-2 h-2 rounded-full bg-amber-500 ${className}`} />;
  }
  return <span className={`inline-block w-2 h-2 rounded-full bg-slate-400 ${className}`} />;
}

export function Code({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <code className={`inline-block font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 ${className}`}>
      {children}
    </code>
  );
}

/* ------------------------------------------------------------- provenance */

export type ProvKind = 'metered' | 'plc' | 'bill' | 'computed' | 'config' | 'model' | 'sample';

const PROV: Record<ProvKind, { label: string; short: string; icon: LucideIcon; means: string }> = {
  metered: { label: 'Metered', short: 'Metered', icon: Cpu, means: 'Measured by the IIoT gateway on the machine' },
  plc: { label: 'From the PLC', short: 'PLC', icon: Waves, means: 'Read from machine PLC over OPC UA' },
  bill: { label: 'Utility bill', short: 'Bill', icon: FileText, means: 'From the utility billing system' },
  computed: { label: 'Computed', short: 'Computed', icon: Calculator, means: 'Calculated from live line cycle and stop telemetry' },
  config: { label: 'Configured', short: 'Config', icon: Settings2, means: 'Set in plant line settings and thresholds' },
  model: { label: 'Model', short: 'Model', icon: Sparkles, means: 'Predicted by predictive maintenance ML model' },
  sample: { label: 'Sample data', short: 'Sample', icon: Info, means: 'Deterministic seeded demo data' },
};

export function Prov({ k, label, compact }: { k: ProvKind; label?: string; compact?: boolean }) {
  const t = PROV[k];
  const Icon = t.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400"
      title={t.means}
    >
      <Icon size={11} strokeWidth={2} />
      <span>{label ?? (compact ? t.short : t.label)}</span>
    </span>
  );
}

/* ---------------------------------------------------------------- figures */

export function Stat({
  label,
  value,
  unit,
  sub,
  prov,
  tone,
  icon,
  hint,
  className = '',
  spark,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  prov?: ProvKind;
  tone?: Tone;
  icon?: ReactNode;
  hint?: string;
  className?: string;
  spark?: ReactNode;
}) {
  const toneColor =
    tone === 'red'
      ? 'text-rose-600 dark:text-rose-400'
      : tone === 'amber'
      ? 'text-amber-600 dark:text-amber-400'
      : tone === 'teal'
      ? 'text-emerald-700 dark:text-emerald-400'
      : 'text-slate-900 dark:text-white';

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 shadow-sm flex min-w-0 flex-col justify-between ${className}`}
      title={hint}
    >
      <div className="flex items-center justify-between text-[13px] text-slate-500 dark:text-slate-400">
        <span className="truncate">{label}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
        {prov && <Prov k={prov} compact />}
      </div>

      <div className="mt-1 mb-0.5 flex items-baseline justify-between gap-2">
        <span className={`text-3xl font-semibold tracking-tight tabular-nums ${toneColor}`}>
          {value}
          {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
        </span>
        {spark && <span className="shrink-0">{spark}</span>}
      </div>

      {sub && <div className="text-[12.5px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ meter */

export function Meter({
  value,
  max,
  tone = 'teal',
  marker,
  className = '',
}: {
  value: number;
  max: number;
  tone?: Tone;
  marker?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1e-5, max)) * 100));
  const markerPct = marker !== undefined ? Math.max(0, Math.min(100, (marker / max) * 100)) : undefined;

  const barColor =
    tone === 'red' ? 'bg-rose-500' : tone === 'amber' ? 'bg-amber-500' : tone === 'neutral' ? 'bg-slate-400' : 'bg-emerald-600';

  return (
    <div className={`relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      {markerPct !== undefined && (
        <div className="absolute top-0 bottom-0 w-0.5 bg-slate-700 dark:bg-white z-10" style={{ left: `${markerPct}%` }} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- controls */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  className = '',
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}) {
  return (
    <div className={`flex border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 text-xs ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
            value === o.value
              ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- connection */

export function ConnectedStrip({ ids }: { ids?: string[] }) {
  const all = ids ? ids.map((id) => INTEGRATIONS.find((i) => i.id === id)).filter(Boolean) as IntegrationDef[] : INTEGRATIONS.filter((i) => i.status !== 'planned').slice(0, 5);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-4 text-[12.5px]">
      <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Data sources</span>
      {all.map((i) => (
        <span key={i.id} className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span className={`w-1.5 h-1.5 rounded-full ${i.status === 'connected' ? 'bg-emerald-500' : i.status === 'degraded' ? 'bg-amber-500' : 'bg-slate-300'}`} />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{i.name}</span>
          {i.status === 'planned' ? 'planned' : agoLabel(i.lastSeenSec)}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- page head */

/** The head of every page: eyebrow, title, one line of description, actions and optional tabs. */
export function PageHead({ eyebrow, title, description, actions, tabs }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode; tabs?: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          {eyebrow && <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">{eyebrow}</div>}
          <h1 className="text-2xl font-bold tracking-tight leading-tight text-slate-900 dark:text-white">{title}</h1>
          {description && <p className="mt-0.5 max-w-3xl text-[13px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto" role="tablist">{tabs}</div>}
    </div>
  );
}

export function HeadTab({ on, onClick, count, children }: { on: boolean; onClick: () => void; count?: number; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={`px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors ${on ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
    >
      {children}
      {count !== undefined && <span className="ml-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 text-[11.5px] text-slate-500">{count}</span>}
    </button>
  );
}

/** A quiet note under a page, such as "this is a draft until signed". */
export function Note({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-2.5 text-[13px] text-amber-900 dark:text-amber-200">{children}</div>;
}

export function KeyValues({ rows, w = 150 }: { rows: [string, ReactNode][]; w?: number }) {
  return (
    <dl className="text-[13.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-3 border-b border-slate-100 dark:border-slate-800 py-2 last:border-b-0">
          <dt className="shrink-0 text-slate-500" style={{ width: w }}>{k}</dt>
          <dd className="min-w-0 font-medium text-slate-800 dark:text-slate-200">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Shared table styling: header and body cells. */
export const TH = 'px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800/50';
export const TD = 'px-4 py-2.5 text-[13.5px] text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800';

