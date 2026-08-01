'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { ChartPanel } from '@/components/chart/ChartPanel';
import { BottomDock } from '@/components/layout/BottomDock';
import { TopBar } from '@/components/layout/TopBar';
import { WatchlistSidebar } from '@/components/layout/WatchlistSidebar';
import { OrderBookPanel } from '@/components/market/OrderBookPanel';
import { TimeAndSales } from '@/components/market/TimeAndSales';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { LoginModal } from '@/components/ui/LoginModal';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStream } from '@/hooks/useStream';
import { clamp } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { log } from '@/store/logStore';
import { useLayoutStore } from '@/store/layoutStore';
import { useMarketStore } from '@/store/marketStore';
import { useSymbolStore } from '@/store/symbolStore';

/** Market snapshot refresh cadence while the socket carries ticks. */
const SNAPSHOT_POLL_MS = 30_000;
const LAYOUT_KEY = 'te.layout';

interface StreamBar {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

interface StreamTrade {
  symbol: string;
  price: number;
  size: number;
  timestamp: string;
}

export function Terminal() {
  const layout = useLayoutStore();
  const symbol = useSymbolStore((s) => s.symbol);
  const loadSnapshots = useMarketStore((s) => s.loadSnapshots);
  const addPrint = useMarketStore((s) => s.addPrint);
  const applyBar = useMarketStore((s) => s.applyBar);

  const [mounted, setMounted] = useState(false);
  const [feedSource, setFeedSource] = useState<'live' | 'sim' | null>(null);

  useKeyboardShortcuts();

  /* Persisted layout is read on the client only — render after hydration. */
  useEffect(() => {
    setMounted(true);
    useAuthStore.getState().hydrate();
    // First visit: size the columns so the chart occupies ~65% of the viewport.
    if (typeof window !== 'undefined' && !window.localStorage.getItem(LAYOUT_KEY)) {
      const vw = window.innerWidth;
      useLayoutStore.getState().setSidebarWidth(clamp(vw * 0.2, 200, 460));
      useLayoutStore.getState().setRightWidth(clamp(vw * 0.15, 260, 620));
    }
    log('info', 'terminal', 'Session started');
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = layout.theme;
  }, [layout.theme]);

  useEffect(() => {
    void loadSnapshots();
    const id = window.setInterval(() => void loadSnapshots(), SNAPSHOT_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadSnapshots]);

  const onStreamMessage = useCallback(
    (msg: { type: string; data: unknown; source?: string }) => {
      if (msg.source) setFeedSource(msg.source === 'sim' ? 'sim' : 'live');
      if (msg.type === 'trade') {
        const trade = msg.data as StreamTrade;
        addPrint({
          ticker: trade.symbol,
          price: trade.price,
          size: trade.size,
          ts: Date.parse(trade.timestamp) || Date.now(),
        });
      } else if (msg.type === 'bar') {
        const bar = msg.data as StreamBar;
        applyBar(bar.symbol, {
          time: Math.floor((Date.parse(bar.timestamp) || Date.now()) / 1000),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        });
      }
    },
    [addPrint, applyBar],
  );

  const streamStatus = useStream('ws/stream/', onStreamMessage);

  const chartMaximized = layout.maximized === 'chart';
  const bottomMaximized = layout.maximized === 'bottom';
  const rightMaximized = layout.maximized === 'right';

  const showSidebar = layout.sidebarOpen && !layout.maximized;
  const showRight = (layout.rightOpen && !layout.maximized) || rightMaximized;
  const showBottom = (layout.bottomOpen && !layout.maximized) || bottomMaximized;
  const showChart = !bottomMaximized && !rightMaximized;

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-xs text-faint">
        Loading terminal…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-bg text-fg">
      <TopBar streamStatus={streamStatus} feedSource={feedSource} />

      <div className="flex min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {showSidebar && (
            <motion.div
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: layout.sidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="shrink-0 overflow-hidden border-r border-line"
            >
              {/* Fixed inner width keeps content from reflowing during the width animation. */}
              <div style={{ width: layout.sidebarWidth }} className="h-full">
                <WatchlistSidebar />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showSidebar && (
          <ResizeHandle
            orientation="vertical"
            aria-label="Resize watchlist"
            onResize={(delta) => layout.setSidebarWidth(layout.sidebarWidth + delta)}
            onDoubleClick={() => layout.toggleDock('watchlist')}
          />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1">
            {showChart && (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <ChartPanel />
              </div>
            )}

            {showChart && showRight && (
              <ResizeHandle
                orientation="vertical"
                aria-label="Resize market data column"
                onResize={(delta) => layout.setRightWidth(layout.rightWidth - delta)}
                onDoubleClick={() => layout.toggleDock('right')}
              />
            )}

            <AnimatePresence initial={false}>
              {showRight && (
                <motion.div
                  key="right"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{
                    width: rightMaximized ? '100%' : layout.rightWidth,
                    opacity: 1,
                  }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                  className="flex shrink-0 flex-col overflow-hidden border-l border-line"
                >
                  <div
                    className="min-h-0 overflow-hidden"
                    style={{ flex: `${layout.rightSplit} 1 0%` }}
                  >
                    <OrderBookPanel />
                  </div>

                  <ResizeHandle
                    orientation="horizontal"
                    aria-label="Resize order book and tape"
                    onResize={(delta) => {
                      const height = window.innerHeight - 44;
                      layout.setRightSplit(layout.rightSplit + delta / height);
                    }}
                  />

                  <div
                    className="min-h-0 overflow-hidden"
                    style={{ flex: `${1 - layout.rightSplit} 1 0%` }}
                  >
                    <TimeAndSales />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {showBottom && !chartMaximized && (
            <ResizeHandle
              orientation="horizontal"
              aria-label="Resize bottom dock"
              onResize={(delta) => layout.setBottomHeight(layout.bottomHeight - delta)}
              onDoubleClick={() => layout.toggleDock('bottom')}
            />
          )}

          <AnimatePresence initial={false}>
            {showBottom && !chartMaximized && (
              <motion.div
                key="bottom"
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: bottomMaximized ? '100%' : layout.bottomHeight,
                  opacity: 1,
                }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                className="flex shrink-0 overflow-hidden"
              >
                <BottomDock />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <footer className="flex h-6 shrink-0 items-center gap-3 border-t border-line bg-surface px-2 text-[10px] text-faint">
        <span>{symbol}</span>
        <span>stream: {streamStatus}</span>
        <div className="flex-1" />
        <span>Ctrl K search · Ctrl B/I/J panels · F chart · Ctrl Shift R reset layout</span>
      </footer>

      <CommandPalette />
      <LoginModal />
    </div>
  );
}
