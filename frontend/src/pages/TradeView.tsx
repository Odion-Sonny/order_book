import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type { Asset, Order } from '@/types';
import { ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const TradeView = () => {
    const navigate = useNavigate();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');
    const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    const [quantity, setQuantity] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [statusData, setStatusData] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // Fetch assets on mount
    useEffect(() => {
        const loadAssets = async () => {
            const data = await apiService.getAssets();
            setAssets(data);
            if (data.length > 0 && !selectedTicker) setSelectedTicker(data[0].ticker);
        };
        loadAssets();
    }, []);

    const selectedAsset = assets.find(a => a.ticker === selectedTicker);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatusData(null);

        try {
            await apiService.createOrder({
                asset_ticker: selectedTicker,
                side,
                order_type: orderType,
                quantity,
                price: orderType === 'LIMIT' ? price : undefined
            });
            setStatusData({ msg: 'Order Placed Successfully', type: 'success' });
            // Reset form
            setQuantity('');
            // Optional: navigate or refresh
        } catch (error: any) {
            console.error("Order failed", error);
            setStatusData({ msg: 'Order Failed: ' + (error.response?.data?.detail || 'Unknown error'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-12 gap-8 max-w-7xl mx-auto h-[calc(100vh-8rem)]">

            {/* Left Column: Chart & Asset Info (Main) */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

                {/* Header */}
                <div className="bg-card border border-border rounded-xl p-6 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4">
                        <select
                            value={selectedTicker}
                            onChange={(e) => setSelectedTicker(e.target.value)}
                            className="bg-[#2C2C2E] border border-border text-white text-lg font-bold rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {assets.map(a => <option key={a.id} value={a.ticker}>{a.ticker}</option>)}
                        </select>
                        <div>
                            <h2 className="text-sm font-medium text-muted-foreground">{selectedAsset?.name || 'Loading...'}</h2>
                            <div className="text-2xl font-mono font-bold text-white mt-1">${parseFloat(selectedAsset?.current_price || '0').toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                {/* Chart Area (Placeholder) */}
                <div className="bg-card border border-border rounded-xl flex-1 p-6 relative flex items-center justify-center shadow-sm">
                    <div className="text-center">
                        <div className="text-6xl mb-4 opacity-10">📈</div>
                        <h3 className="text-xl font-bold text-neutral-500">Chart Visualization</h3>
                        <p className="text-sm text-neutral-600">TradingView Chart Integration Coming Soon</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Order Entry */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full flex flex-col">
                    <h3 className="font-semibold text-lg text-white mb-6 border-b border-border pb-4">Place Order</h3>

                    <form onSubmit={handleSubmit} className="space-y-6 flex-1">
                        {/* Side Toggle */}
                        <div className="grid grid-cols-2 bg-[#2C2C2E] p-1 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setSide('BUY')}
                                className={cn("py-2 rounded-md text-sm font-bold transition-all", side === 'BUY' ? "bg-emerald-600 text-white shadow-md" : "text-neutral-400 hover:text-white")}
                            >
                                BUY
                            </button>
                            <button
                                type="button"
                                onClick={() => setSide('SELL')}
                                className={cn("py-2 rounded-md text-sm font-bold transition-all", side === 'SELL' ? "bg-red-600 text-white shadow-md" : "text-neutral-400 hover:text-white")}
                            >
                                SELL
                            </button>
                        </div>

                        {/* Order Type */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-neutral-500 uppercase">Order Type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={orderType === 'MARKET'} onChange={() => setOrderType('MARKET')} className="accent-blue-500" />
                                    <span className="text-sm">Market</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={orderType === 'LIMIT'} onChange={() => setOrderType('LIMIT')} className="accent-blue-500" />
                                    <span className="text-sm">Limit</span>
                                </label>
                            </div>
                        </div>

                        {/* Quantity */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-neutral-500 uppercase">Quantity (Shares)</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full bg-[#151516] border border-border rounded-md px-4 py-3 text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        {/* Price (Limit Only) */}
                        {orderType === 'LIMIT' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-xs font-semibold text-neutral-500 uppercase">Limit Price</label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full bg-[#151516] border border-border rounded-md px-4 py-3 text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        )}

                        {/* Status Message */}
                        {statusData && (
                            <div className={cn("p-3 rounded-md text-sm text-center font-medium", statusData.type === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                                {statusData.msg}
                            </div>
                        )}

                        <div className="mt-auto pt-6">
                            <button
                                disabled={loading}
                                className={cn(
                                    "w-full py-4 rounded-lg font-bold text-lg transition-all shadow-lg active:scale-95",
                                    loading ? "opacity-50 cursor-not-allowed bg-neutral-700" :
                                        side === 'BUY' ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20" :
                                            "bg-red-600 hover:bg-red-500 text-white shadow-red-900/20"
                                )}>
                                {loading ? 'Processing...' : `${side} ${selectedTicker}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TradeView;
