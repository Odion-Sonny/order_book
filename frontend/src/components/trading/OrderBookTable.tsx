import React from 'react';
import { cn } from '@/lib/utils';

interface OrderBookLevel {
    price: number;
    size: number;
    total: number;
}

interface OrderBookTableProps {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    lastPrice?: number;
}

export const OrderBookTable: React.FC<OrderBookTableProps> = ({ bids, asks, lastPrice }) => {
    // Sort asks descending for the top-down view (highest ask at top)
    const sortedAsks = [...asks].sort((a, b) => b.price - a.price);

    return (
        <div className="flex flex-col h-full bg-slate-950/50 rounded-lg border border-slate-800 overflow-hidden text-xs">
            <div className="p-2 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <span className="font-semibold text-slate-400">Order Book</span>
                {lastPrice && (
                    <span className="text-lg font-bold text-white">
                        ${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-3 p-2 bg-slate-900/30 text-slate-500 font-medium uppercase tracking-wider">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Total</span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* Asks (Sell Orders) */}
                <div className="flex flex-col-reverse">
                    {sortedAsks.map((ask, i) => (
                        <div key={`ask-${i}`} className="relative group hover:bg-red-500/10 transition-colors">
                            {/* Depth bar background */}
                            <div
                                className="absolute right-0 top-0 bottom-0 bg-red-500/10 pointer-events-none"
                                style={{ width: `${Math.min((ask.total / (asks[asks.length - 1]?.total || 1)) * 100, 100)}%` }}
                            />
                            <div className="grid grid-cols-3 p-1 px-2 relative z-10">
                                <span className="text-red-400 font-mono">{ask.price.toFixed(2)}</span>
                                <span className="text-right text-slate-300 font-mono">{ask.size.toLocaleString()}</span>
                                <span className="text-right text-slate-400 font-mono">{ask.total.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Spread Info */}
                {bids.length > 0 && asks.length > 0 && (
                    <div className="py-2 px-2 bg-slate-900/80 border-y border-slate-800 flex justify-between text-[10px] text-slate-500">
                        <span>Spread</span>
                        <span>{(asks[0].price - bids[0].price).toFixed(2)} ({(((asks[0].price - bids[0].price) / bids[0].price) * 100).toFixed(2)}%)</span>
                    </div>
                )}

                {/* Bids (Buy Orders) */}
                <div className="flex flex-col">
                    {bids.map((bid, i) => (
                        <div key={`bid-${i}`} className="relative group hover:bg-green-500/10 transition-colors">
                            {/* Depth bar background */}
                            <div
                                className="absolute right-0 top-0 bottom-0 bg-green-500/10 pointer-events-none"
                                style={{ width: `${Math.min((bid.total / (bids[bids.length - 1]?.total || 1)) * 100, 100)}%` }}
                            />
                            <div className="grid grid-cols-3 p-1 px-2 relative z-10">
                                <span className="text-green-400 font-mono">{bid.price.toFixed(2)}</span>
                                <span className="text-right text-slate-300 font-mono">{bid.size.toLocaleString()}</span>
                                <span className="text-right text-slate-400 font-mono">{bid.total.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
