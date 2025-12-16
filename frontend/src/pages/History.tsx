import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type { Order, Trade } from '@/types';
import { cn } from '@/lib/utils';


const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        'FILLED': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        'PENDING': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        'CANCELED': 'bg-red-500/10 text-red-500 border-red-500/20',
        'REJECTED': 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return (
        <span className={cn("px-2 py-0.5 rounded text-xs font-bold border uppercase", styles[status] || styles['PENDING'])}>
            {status}
        </span>
    );
};

const History = () => {
    const [view, setView] = useState<'ORDERS' | 'TRADES'>('ORDERS');
    const [orders, setOrders] = useState<Order[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    // const [loading, setLoading] = useState(true); // Unused currently in render, keeping fetch effect simple

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const [currOrders, currTrades] = await Promise.all([
                    apiService.getOrders(),
                    apiService.getTrades()
                ]);
                setOrders(currOrders);
                setTrades(currTrades);
            } catch (error) {
                console.error("Failed to history", error);
            } finally {
                // setLoading(false); 
            }
        };
        fetchHistory();
    }, []);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">History</h1>
                    <p className="text-neutral-500">Record of all your market activity.</p>
                </div>

                <div className="bg-[#1C1C1E] border border-[#333333] p-1 rounded-lg flex">
                    <button
                        onClick={() => setView('ORDERS')}
                        className={cn("px-4 py-1.5 rounded text-sm font-bold transition-all", view === 'ORDERS' ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white")}
                    >
                        Orders
                    </button>
                    <button
                        onClick={() => setView('TRADES')}
                        className={cn("px-4 py-1.5 rounded text-sm font-bold transition-all", view === 'TRADES' ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white")}
                    >
                        Trades
                    </button>
                </div>
            </div>

            <div className="bg-[#1C1C1E] border border-[#333333] rounded-xl overflow-hidden min-h-[400px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-black text-neutral-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">{view === 'ORDERS' ? 'Symbol' : 'Symbol'}</th>
                            <th className="px-6 py-4">{view === 'ORDERS' ? 'Side' : 'Side'}</th>
                            {view === 'ORDERS' && <th className="px-6 py-4">Type</th>}
                            <th className="px-6 py-4 text-right">Qty</th>
                            <th className="px-6 py-4 text-right">Price</th>
                            {view === 'TRADES' && <th className="px-6 py-4 text-right">Total</th>}
                            {view === 'ORDERS' && <th className="px-6 py-4 text-right">Status</th>}
                            <th className="px-6 py-4 text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333333]">
                        {view === 'ORDERS' ? (
                            orders.map(order => (
                                <tr key={order.id} className="hover:bg-[#2C2C2E]">
                                    <td className="px-6 py-4 font-mono text-neutral-500">{String(order.id).slice(0, 8)}</td>
                                    <td className="px-6 py-4 font-bold text-white">{order.asset_ticker}</td>
                                    <td className={cn("px-6 py-4 font-bold", order.side === 'BUY' ? "text-emerald-500" : "text-red-500")}>{order.side}</td>
                                    <td className="px-6 py-4 text-neutral-400">{order.order_type}</td>
                                    <td className="px-6 py-4 text-right font-mono text-white">{order.quantity}</td>
                                    <td className="px-6 py-4 text-right font-mono text-white">{order.price ? `$${order.price}` : 'MKT'}</td>
                                    <td className="px-6 py-4 text-right"><StatusBadge status={order.status} /></td>
                                    <td className="px-6 py-4 text-right text-neutral-500">{new Date(order.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))
                        ) : (
                            trades.map(trade => (
                                <tr key={trade.id} className="hover:bg-[#2C2C2E]">
                                    <td className="px-6 py-4 font-mono text-neutral-500">{trade.id.slice(0, 8)}</td>
                                    <td className="px-6 py-4 font-bold text-white">{trade.order_id?.slice(0, 8) || 'N/A'}</td>
                                    {/* Note: Trade type usually inferred from order, but for now assuming logic matches */}
                                    <td className="px-6 py-4 text-white">EXECUTED</td>
                                    <td className="px-6 py-4 text-right font-mono text-white">{trade.quantity}</td>
                                    <td className="px-6 py-4 text-right font-mono text-white">${parseFloat(trade.price).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-white">${(parseFloat(trade.price) * parseFloat(trade.quantity)).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right text-neutral-500">{new Date(trade.timestamp).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                        {((view === 'ORDERS' && orders.length === 0) || (view === 'TRADES' && trades.length === 0)) && (
                            <tr><td colSpan={8} className="px-6 py-12 text-center text-neutral-500">No records found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default History;
