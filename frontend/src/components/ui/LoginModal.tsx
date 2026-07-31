'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTradingStore } from '@/store/tradingStore';

export function LoginModal() {
  const { modalOpen, setModalOpen, login, pending, error } = useAuthStore();
  const refresh = useTradingStore((s) => s.refresh);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalOpen) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
  }, [modalOpen]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await login(username, password)) {
      setPassword('');
      void refresh();
    }
  };

  return (
    <AnimatePresence>
      {modalOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={() => setModalOpen(false)}
        >
          <motion.form
            onSubmit={submit}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="w-80 rounded-lg border border-line-strong bg-surface p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center gap-2">
              <LogIn size={15} className="text-accent" />
              <h2 className="text-sm font-semibold">Sign in</h2>
            </div>

            <p className="mb-3 text-[11px] text-faint">
              Trading endpoints (orders, portfolio, positions) require a Django account.
            </p>

            <label className="mb-2 flex flex-col gap-1 text-[10px] uppercase tracking-wide text-faint">
              Username
              <input
                ref={inputRef}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                className="rounded bg-surface-2 px-2 py-1.5 text-xs text-fg outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            <label className="mb-3 flex flex-col gap-1 text-[10px] uppercase tracking-wide text-faint">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="rounded bg-surface-2 px-2 py-1.5 text-xs text-fg outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            {error && <p className="mb-2 text-[11px] text-down">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded border border-line py-1.5 text-xs text-dim hover:text-fg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !username || !password}
                className="flex-1 rounded bg-accent py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {pending ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
