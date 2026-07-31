'use client';

import { create } from 'zustand';
import type { LogEntry } from '@/types';

const MAX_LOGS = 500;

interface LogState {
  logs: LogEntry[];
  push: (entry: Omit<LogEntry, 'id' | 'ts'> & { ts?: number }) => void;
  clear: () => void;
}

let seq = 0;

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  push: (entry) =>
    set((s) => ({
      logs: [
        ...s.logs.slice(-(MAX_LOGS - 1)),
        { id: `log-${++seq}`, ts: entry.ts ?? Date.now(), ...entry },
      ],
    })),
  clear: () => set({ logs: [] }),
}));

export const log = (
  level: LogEntry['level'],
  source: string,
  message: string,
): void => useLogStore.getState().push({ level, source, message });
