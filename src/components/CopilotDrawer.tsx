/**
 * CopilotDrawer.tsx
 * The copilot as a side drawer, available on every page. The same conversation opens full page.
 */

import React from 'react';
import { Maximize2, MessageSquareText, X } from 'lucide-react';
import type { CopilotContext } from '../copilot/brain';
import { CopilotChat } from '../copilot/CopilotChat';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullPage: () => void;
  onNavigate: (to: string) => void;
  getContext: () => CopilotContext;
  seed?: string | null;
  onSeedUsed?: () => void;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({ isOpen, onClose, onOpenFullPage, onNavigate, getContext, seed, onSeedUsed }) => (
  <div
    className={`fixed top-0 right-0 bottom-0 z-[70] flex w-[480px] max-w-[100vw] flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    aria-hidden={!isOpen}
  >
    <header className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
      <span className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"><MessageSquareText size={16} /></span>
      <div className="min-w-0">
        <h3 className="text-[15.5px] leading-tight font-semibold text-slate-900 dark:text-white">Operator copilot</h3>
        <div className="text-[12.5px] text-slate-500">Answers from this line’s own data</div>
      </div>
      <button type="button" onClick={onOpenFullPage} aria-label="Open full page" title="Open full page" className="ml-auto p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Maximize2 size={15} /></button>
      <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
    </header>
    <div className="min-h-0 flex-1">
      {isOpen && <CopilotChat compact getContext={getContext} onNavigate={onNavigate} seed={seed} onSeedUsed={onSeedUsed} />}
    </div>
  </div>
);
