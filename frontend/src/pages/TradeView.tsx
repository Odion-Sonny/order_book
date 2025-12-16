import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type { Asset, Trade } from '@/types';
import { cn } from '@/lib/utils';
import { CandleStickChart } from '@/components/trading/CandleStickChart';
import { MarketDepthChart } from '@/components/trading/MarketDepthChart';
import { BarChart3, Layers } from 'lucide-react';

interface ChartData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

const TradeView = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');
    const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    const [quantity, setQuantity] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [statusData, setStatusData] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // View Mode
    const [chartMode, setChartMode] = useState<'PRICE' | 'DEPTH'>('PRICE');

    // Chart Data
    const [trades, setTrades] = useState<Trade[]>([]);
    const [chartData, setChartData] = useState<ChartData[]>([]);

    // Order Book Data
    const [bids, setBids] = useState<any[]>([]);
    const [asks, setAsks] = useState<any[]>([]);

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

    // Fetch Data Poll
    useEffect(() => {
        if (!selectedTicker) return;

        const fetchData = async () => {
            try {
                // 1. Get Trades for Price Chart
                const allTrades = await apiService.getTrades();
                const assetTrades = allTrades
                    .filter(t => t.asset_ticker === selectedTicker)
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                setTrades(assetTrades);

                // 2. Get Order Book for Depth Chart
                // Assuming backend returns { bids: [], asks: [] } or list of orders to aggregate
                // If API returns raw orders, we aggregate here. If it returns depth structure, we use it.
                // Let's assume for now it returns a list of orders (since OrderBookViewSet might be simple)
                // We'll aggregate manually if needed, or check structure.
                // Safest bet: Fetch raw orders for this asset and build the book if getOrderBook returns simple list.
                const bookData: any = await apiService.getOrderBook(selectedTicker);

                // Process Book Data (Generic handler assuming generic list or {bids, asks})
                let rawBids: any[] = [];
                let rawAsks: any[] = [];

                if (bookData.bids && bookData.asks) {
                    rawBids = bookData.bids;
                    rawAsks = bookData.asks;
                } else if (Array.isArray(bookData)) {
                    // It's a list of orders?
                    rawBids = bookData.filter((o: any) => o.side === 'BUY');
                    rawAsks = bookData.filter((o: any) => o.side === 'SELL');
                }

                // Aggregate for Chart (Cumulative Sum)
                // 1. Sort
                rawBids.sort((a: any, b: any) => parseFloat(b.price) - parseFloat(a.price)); // Desc
                rawAsks.sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price)); // Asc

                // 2. Cumulative
                let bidSum = 0;
                const aggBids = rawBids.map((b: any) => {
                    bidSum += parseFloat(b.quantity || b.size || '0');
                    return { price: parseFloat(b.price), quantity: parseFloat(b.quantity || b.size || '0'), total: bidSum };
                });

                let askSum = 0;
                const aggAsks = rawAsks.map((a: any) => {
                    askSum += parseFloat(a.quantity || a.size || '0');
                    return { price: parseFloat(a.price), quantity: parseFloat(a.quantity || a.size || '0'), total: askSum };
                });

                setBids(aggBids);
                setAsks(aggAsks);

            } catch (e) {
                console.error("Failed to load chart data", e);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [selectedTicker]);

    // Aggregate Trades into Candles
    useEffect(() => {
        if (trades.length === 0) {
            if (selectedAsset?.current_price) {
                const price = parseFloat(selectedAsset.current_price);
                const today = new Date().toISOString().split('T')[0];
                setChartData([
                    { time: today, open: price, high: price, low: price, close: price }
                ]);
            }
            return;
        }

        const groups: Record<string, Trade[]> = {};
        trades.forEach(t => {
            const date = t.timestamp.split('T')[0];
            if (!groups[date]) groups[date] = [];
            groups[date].push(t);
        });

        const candles: ChartData[] = Object.keys(groups).map(date => {
            const group = groups[date];
            const prices = group.map(t => parseFloat(t.price));
            return {
                time: date,
                open: prices[0],
                high: Math.max(...prices),
                low: Math.min(...prices),
                close: prices[prices.length - 1]
            };
        });

        candles.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        setChartData(candles);

    }, [trades, selectedAsset]);


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
            setQuantity('');
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

                    {/* Chart Toggles */}
                    <div className="flex bg-[#2C2C2E] rounded-lg p-1 border border-border">
                        <button
                            onClick={() => setChartMode('PRICE')}
                            className={cn("p-2 rounded flex items-center gap-2 text-xs font-bold transition-all", chartMode === 'PRICE' ? "bg-neutral-600 text-white shadow" : "text-neutral-400 hover:text-white")}
                        >
                            <BarChart3 className="w-4 h-4" /> Price
                        </button>
                        <button
                            onClick={() => setChartMode('DEPTH')}
                            className={cn("p-2 rounded flex items-center gap-2 text-xs font-bold transition-all", chartMode === 'DEPTH' ? "bg-neutral-600 text-white shadow" : "text-neutral-400 hover:text-white")}
                        >
                            <Layers className="w-4 h-4" /> Depth
                        </button>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="bg-card border border-border rounded-xl flex-1 p-1 relative flex flex-col shadow-sm overflow-hidden min-h-[400px]">
                    <div className="p-4 border-b border-border flex justify-between items-center">
                        <h3 className="font-bold text-neutral-400 text-sm">
                            {chartMode === 'PRICE' ? 'Price History (from Trades)' : 'Order Book Depth (from Active Orders)'}
                        </h3>
                    </div>
                    <div className="flex-1 w-full bg-black relative p-2">
                        {chartMode === 'PRICE' ? (
                            <CandleStickChart data={chartData} />
                        ) : (
                            <MarketDepthChart bids={bids} asks={asks} />
                        )}

                        {chartMode === 'DEPTH' && bids.length === 0 && asks.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm">
                                Empty Order Book. Place Limit orders to see depth.
                            </div>
                        )}
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
