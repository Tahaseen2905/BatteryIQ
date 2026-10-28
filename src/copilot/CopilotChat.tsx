/**
 * CopilotChat.tsx
 * The operator copilot's conversation, used in the side drawer and on the full page.
 * Answers arrive as blocks (text, bullets, table, bars, sources, buttons), with follow-up questions.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Cpu, Languages, Loader2, Sparkles } from 'lucide-react';
import type { CopilotBlock, CopilotContext } from './brain';
import { ask, clearConversation, useMessages } from './store';

const THINKING = ['Reading the gateways', 'Checking the inspection results', 'Matching the machine sheets', 'Looking up the hold bay'];

const SUGGESTIONS = {
  en: ['Why is the seal gate failing?', 'Which tool is causing the Q3 rejects?', 'How is HS-01?', 'What is waiting in the hold bay?', 'Which parts are due before Sunday shutdown?', 'Show the open alarms'],
  hi: ['कौन सी मशीनें ध्यान आकर्षित कर रही हैं?', 'Q3 गेट में क्या समस्या है?', 'शिफ्ट का सारांश बताइए'],
};

function Block({ block, onNavigate }: { block: CopilotBlock; onNavigate: (to: string) => void }) {
  switch (block.type) {
    case 'text':
      return <p className="text-[14.5px] leading-relaxed text-slate-900 dark:text-slate-100">{block.text}</p>;
    case 'bullets':
      return (
        <ul className="space-y-1.5">
          {block.items.map((i) => (
            <li key={i} className="flex gap-2 text-[14px] leading-snug text-slate-600 dark:text-slate-300">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-emerald-600" />
              {i}
            </li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-[9px] border border-slate-200 dark:border-slate-700">
          <table className="w-full text-[13.5px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-left text-[12px] uppercase tracking-wider text-slate-500">
              <tr>{block.columns.map((c) => <th key={c} className="px-3 py-2 font-semibold">{c}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  {r.map((c, j) => <td key={j} className="px-3 py-2 text-slate-800 dark:text-slate-200 tabular-nums">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'bars': {
      const max = Math.max(...block.rows.map((r) => r.value), 1);
      return (
        <div className="space-y-2 rounded-[9px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3">
          {block.rows.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-[13px] text-slate-700 dark:text-slate-300">
                <span>{r.label}</span>
                <span className="tabular-nums font-semibold">{r.value} {r.unit}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'sources':
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-400 mr-1">Sources</span>
          {block.items.map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-[12px] font-medium text-slate-500 dark:text-slate-400">{s}</span>
          ))}
        </div>
      );
    case 'actions':
      return (
        <div className="flex flex-wrap gap-2">
          {block.items.map((a, i) => (
            <button
              key={a.label}
              type="button"
              onClick={() => onNavigate(a.to)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold border transition-colors ${i === 0 ? 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      );
  }
}

export function CopilotChat({ getContext, onNavigate, compact = false, seed, onSeedUsed }: {
  getContext: () => CopilotContext;
  onNavigate: (to: string) => void;
  compact?: boolean;
  seed?: string | null;
  onSeedUsed?: () => void;
}) {
  const messages = useMessages();
  const [text, setText] = useState('');
  const [hi, setHi] = useState(false);
  const [tick, setTick] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const thinking = messages.some((m) => m.thinking);

  const send = (q: string) => {
    if (!q.trim() || thinking) return;
    ask(q.trim(), getContext);
    setText('');
  };

  useEffect(() => {
    if (seed) {
      ask(seed, getContext);
      onSeedUsed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);
  useEffect(() => {
    if (!thinking) return;
    const iv = setInterval(() => setTick((t) => t + 1), 320);
    return () => clearInterval(iv);
  }, [thinking]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-cyan-200 dark:border-cyan-900 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 text-[12px] font-semibold text-cyan-800 dark:text-cyan-300">
          <Cpu size={12} /> Runs on the plant server, no cloud
        </span>
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-[12.5px] font-semibold" role="radiogroup" aria-label="Answer language">
          <button type="button" role="radio" aria-checked={!hi} onClick={() => setHi(false)} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 ${!hi ? 'bg-emerald-700 text-white' : 'text-slate-600 dark:text-slate-300'}`}><Languages size={13} /> English</button>
          <button type="button" role="radio" aria-checked={hi} onClick={() => setHi(true)} className={`rounded-md px-2.5 py-1 ${hi ? 'bg-emerald-700 text-white' : 'text-slate-600 dark:text-slate-300'}`}>हिन्दी</button>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={clearConversation} className="ml-auto rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">New conversation</button>
        )}
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {!messages.length && (
          <div className={`mx-auto ${compact ? '' : 'max-w-2xl pt-6'}`}>
            <span className="grid place-items-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"><Sparkles size={19} /></span>
            <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">Ask about your line</h2>
            <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">
              Plain language, English or Hindi. Answers come from the four vision gates, the hold bay, the alarms and the machine sheets, and every answer shows its sources. Nothing leaves the site.
            </p>
            <div className="mt-4 grid gap-2">
              {SUGGESTIONS[hi ? 'hi' : 'en'].map((q) => (
                <button key={q} type="button" onClick={() => send(q)} className="text-left rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3.5 py-2.5 text-[14px] text-slate-600 dark:text-slate-300 hover:border-emerald-600 hover:text-slate-900 dark:hover:text-white transition-colors">{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-[12px] rounded-br-[4px] bg-emerald-700 px-3.5 py-2 text-[14.5px] text-white shadow-sm">{m.text}</div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-2.5">
              <span className="grid place-items-center w-7 h-7 mt-0.5 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"><Sparkles className="size-3.5" /></span>
              <div className="min-w-0 flex-1 space-y-3">
                {m.thinking ? (
                  <div className="inline-flex items-center gap-2 text-[13.5px] text-slate-400"><Loader2 className="size-3.5 animate-spin" />{THINKING[tick % THINKING.length]}…</div>
                ) : (
                  <>
                    {m.blocks?.slice(0, m.shown).map((b, i) => (
                      <div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-200"><Block block={b} onNavigate={onNavigate} /></div>
                    ))}
                    {m.shown > (m.blocks?.length ?? 0) && m.followUps && m.followUps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.followUps.map((f) => (
                          <button key={f} type="button" onClick={() => send(f)} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-[13px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">{f}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      <form className="border-t border-slate-200 dark:border-slate-800 p-3" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <div className="flex items-end gap-2 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2 transition-colors focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-900">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }}
            rows={1}
            placeholder={hi ? 'अपना सवाल लिखें…' : 'Ask about a gate (Q1–Q4), a machine like HS-01, the hold bay or alarms'}
            className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-1.5 py-1 text-[14.5px] text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400"
            aria-label="Question"
          />
          <button type="submit" disabled={!text.trim() || thinking} aria-label="Send" className="grid place-items-center size-8 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white"><ArrowUp className="size-4" /></button>
        </div>
      </form>
    </div>
  );
}
