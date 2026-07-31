'use client';

import { Maximize2, Minimize2, X } from 'lucide-react';
import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  onMaximize?: () => void;
  maximized?: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({
  title,
  subtitle,
  actions,
  onMaximize,
  maximized,
  onClose,
  children,
  className = '',
  bodyClassName = '',
}: PanelProps) {
  return (
    <section className={`flex min-h-0 min-w-0 flex-col bg-surface ${className}`}>
      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-line px-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-dim">{title}</h2>
        {subtitle ? <div className="min-w-0 flex-1 truncate text-[11px] text-faint">{subtitle}</div> : <div className="flex-1" />}
        <div className="flex items-center gap-0.5">
          {actions}
          {onMaximize && (
            <button
              type="button"
              onClick={onMaximize}
              aria-label={maximized ? `Restore ${title}` : `Maximize ${title}`}
              className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-fg"
            >
              {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title}`}
              className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-down"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </header>
      <div className={`min-h-0 flex-1 overflow-hidden ${bodyClassName}`}>{children}</div>
    </section>
  );
}
