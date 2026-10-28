/**
 * The conversation, kept outside React so the side drawer and the full page show the same one.
 * An answer is revealed block by block, after a short "thinking" step, like LineIQ's copilot.
 */

import { useSyncExternalStore } from 'react';
import { answerRich, type CopilotBlock, type CopilotContext } from './brain';

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  text?: string;
  blocks?: CopilotBlock[];
  followUps?: string[];
  /** How many blocks are showing so far. */
  shown: number;
  thinking?: boolean;
}

let messages: Message[] = [];
let seq = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (next: Message[]) => {
  messages = next;
  emit();
};

export const useMessages = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => messages,
  );

export const clearConversation = () => set([]);

/** Sends a question. The context is read when the answer is built, so it reflects the line at that moment. */
export function ask(question: string, getCtx: () => CopilotContext) {
  const id = seq++;
  const aid = seq++;
  set([...messages, { id, role: 'user', text: question, shown: 1 }, { id: aid, role: 'assistant', shown: 0, thinking: true }]);
  const patch = (p: Partial<Message>) => set(messages.map((m) => (m.id === aid ? { ...m, ...p } : m)));
  setTimeout(() => {
    const a = answerRich(question, getCtx());
    patch({ thinking: false, blocks: a.blocks, followUps: a.followUps, shown: 1 });
    a.blocks.forEach((_, i) => setTimeout(() => patch({ shown: i + 2 }), 260 * (i + 1)));
  }, 1000);
}
