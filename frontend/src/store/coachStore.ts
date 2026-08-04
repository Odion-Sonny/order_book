'use client';

import { create } from 'zustand';
import { analyzeMarket, answerQuestion, type CoachInput } from '@/lib/coach';

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
}

interface CoachState {
  messages: CoachMessage[];
  thinking: boolean;
  /** Symbol the last answer was written against, so a switch is announced once. */
  contextSymbol: string | null;

  ask: (question: string, ctx: CoachInput) => void;
  noteSymbol: (symbol: string) => void;
  reset: () => void;
}

let seq = 0;
const message = (role: CoachMessage['role'], content: string): CoachMessage => ({
  id: `c-${++seq}`,
  role,
  content,
  ts: Date.now(),
});

const WELCOME = message(
  'assistant',
  'I read the bars this chart has loaded and explain what they say — structure, momentum, ' +
    'volatility, risk. Ask "Analyze this chart" for a full readout.',
);

/**
 * Chat state lives outside the panel because the bottom dock unmounts inactive
 * tabs; a conversation should survive switching to Logs and back.
 */
export const useCoachStore = create<CoachState>((set, get) => ({
  messages: [WELCOME],
  thinking: false,
  contextSymbol: null,

  ask: (question, ctx) => {
    const text = question.trim();
    if (!text || get().thinking) return;

    set((s) => ({ messages: [...s.messages, message('user', text)], thinking: true }));

    // The answer is computed synchronously; the beat is purely so the reply
    // does not appear before the question has finished rendering.
    window.setTimeout(() => {
      const lower = text.toLowerCase();
      const reply = lower.includes('analyze') ? analyzeMarket(ctx) : answerQuestion(text, ctx);
      set((s) => ({ messages: [...s.messages, message('assistant', reply)], thinking: false }));
    }, 220);
  },

  noteSymbol: (symbol) =>
    set((s) =>
      s.contextSymbol === null
        ? { contextSymbol: symbol }
        : s.contextSymbol === symbol
          ? s
          : {
              contextSymbol: symbol,
              messages: [...s.messages, message('system', `Context switched to **${symbol}**.`)],
            },
    ),

  reset: () => set({ messages: [WELCOME], thinking: false }),
}));
