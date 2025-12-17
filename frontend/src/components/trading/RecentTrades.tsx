import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Trade } from '@/types';

interface RecentTradesProps {
    trades: Trade[];
}

export const RecentTrades: React.FC<RecentTradesProps> = ({ trades }) => {
    return (
        <div className="flex flex-col h-full bg-slate-950/50 rounded-lg border border-slate-800 overflow-hidden text-xs">
            <div className="p-2 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <span className="font-semibold text-slate-400">Recent Trades</span>
                <span className="text-[10px] text-slate-500 font-mono uppercase">Live</span>
            </div>

            <div className="grid grid-cols-3 p-2 bg-slate-900/30 text-slate-500 font-medium uppercase tracking-wider">
                <span>Price</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Time</span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {trades.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-slate-600 italic">
                        No recent trades
                    </div>
                ) : (
                    trades.map((trade, i) => (
                        <div
                            key={`${trade.id}-${i}`}
                            className={cn(
                                "grid grid-cols-3 p-1 px-2 border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors font-mono",
                                trade.side === 'BUY' ? "text-green-400" : "text-red-400"
                            )}
                        >
                            <span>{parseFloat(trade.price).toFixed(2)}</span>
                            <span className="text-right text-slate-300">
                                {parseFloat(trade.quantity?.toString() || trade.size?.toString() || '0').toLocaleString()}
                            </span>
                            <span className="text-right text-slate-500">
                                {format(new Date(trade.timestamp), 'HH:mm:ss')}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
