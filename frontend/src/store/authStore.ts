'use client';

import { create } from 'zustand';
import { api, getToken, setToken } from '@/lib/api';
import { log } from './logStore';

interface AuthState {
  username: string | null;
  authenticated: boolean;
  pending: boolean;
  error: string | null;
  modalOpen: boolean;

  hydrate: () => void;
  setModalOpen: (open: boolean) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const USERNAME_KEY = 'te.username';

export const useAuthStore = create<AuthState>((set) => ({
  username: null,
  authenticated: false,
  pending: false,
  error: null,
  modalOpen: false,

  /** Token lives in localStorage; read it once the client has mounted. */
  hydrate: () =>
    set({
      authenticated: Boolean(getToken()),
      username: typeof window === 'undefined' ? null : window.localStorage.getItem(USERNAME_KEY),
    }),

  setModalOpen: (modalOpen) => set({ modalOpen, error: null }),

  login: async (username, password) => {
    set({ pending: true, error: null });
    try {
      await api.login(username, password);
      window.localStorage.setItem(USERNAME_KEY, username);
      set({ authenticated: true, username, pending: false, modalOpen: false });
      log('success', 'auth', `Signed in as ${username}`);
      return true;
    } catch (err) {
      const message =
        err instanceof Error && 'status' in err && (err as { status: number }).status === 401
          ? 'Invalid username or password'
          : err instanceof Error
            ? err.message
            : 'Sign in failed';
      set({ error: message, pending: false });
      log('error', 'auth', message);
      return false;
    }
  },

  logout: () => {
    setToken(null);
    window.localStorage.removeItem(USERNAME_KEY);
    set({ authenticated: false, username: null });
    log('info', 'auth', 'Signed out');
  },
}));
