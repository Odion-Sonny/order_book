import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type { Asset, Portfolio, Trade } from '@/types';
import { cn } from '@/lib/utils';
import { CandleStickChart } from '@/components/trading/CandleStickChart';
import { MarketDepthChart } from '@/components/trading/MarketDepthChart';
import { OrderBookTable } from '@/components/trading/OrderBookTable';
import { RecentTrades } from '@/components/trading/RecentTrades';
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
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

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

                // 1b. Get Portfolio
                try {
                    const p = await apiService.getPortfolio();
                    setPortfolio(p);
                } catch (pe) {
                    console.error("Failed to load portfolio", pe);
                }

                // 2. Get Order Book for Depth Chart
                // Assuming backend returns { bids: [], asks: [] } or list of orders to aggregate
                // If API returns raw orders, we aggregate here. If it returns depth structure, we use it.
                // Let's assume for now it returns a list of orders (since OrderBookViewSet might be simple)
                // We'll aggregate manually if needed, or check structure.
                // Safest bet: Fetch raw orders for this asset and build the book if getOrderBook returns simple list.
                const bookData: any = await apiService.getOrderBook(selectedTicker);

                if (bookData.bids && bookData.asks) {
                    // Backend already provides aggregated {price, size, total}
                    setBids(bookData.bids.map((b: any) => ({
                        price: parseFloat(b.price),
                        size: parseFloat(b.size),
                        total: parseFloat(b.total)
                    })));
                    setAsks(bookData.asks.map((a: any) => ({
                        price: parseFloat(a.price),
                        size: parseFloat(a.size),
                        total: parseFloat(a.total)
                    })));
                } else if (Array.isArray(bookData)) {
                    // Fallback for raw order list
                    const rawBids = bookData.filter((o: any) => o.side === 'BUY').sort((a: any, b: any) => parseFloat(b.price) - parseFloat(a.price));
                    const rawAsks = bookData.filter((o: any) => o.side === 'SELL').sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));

                    let bidSum = 0;
                    setBids(rawBids.map((b: any) => {
                        const s = parseFloat(b.size || b.quantity || '0');
                        bidSum += s;
                        return { price: parseFloat(b.price), size: s, total: bidSum };
                    }));

                    let askSum = 0;
                    setAsks(rawAsks.map((a: any) => {
                        const s = parseFloat(a.size || a.quantity || '0');
                        askSum += s;
                        return { price: parseFloat(a.price), size: s, total: askSum };
                    }));
                }

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
                asset: selectedTicker,
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
        <div className="max-w-[1600px] mx-auto p-4 lg:p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-10rem)] min-h-[800px]">

                {/* 1. Live Order Book (Col 1-3) */}
                <div className="lg:col-span-3 h-full flex flex-col">
                    <OrderBookTable
                        bids={bids}
                        asks={asks}
                        lastPrice={parseFloat(selectedAsset?.current_price || '0')}
                    />
                </div>

                {/* 2. Main Charting Area (Col 4-9) */}
                <div className="lg:col-span-6 flex flex-col gap-6 h-full">
                    {/* Asset Info & Toggles */}
                    <div className="bg-card border border-border rounded-xl p-4 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-4">
                            <select
                                value={selectedTicker}
                                onChange={(e) => setSelectedTicker(e.target.value)}
                                className="bg-[#2C2C2E] border border-border text-white text-lg font-bold rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {assets.map(a => <option key={a.id} value={a.ticker}>{a.ticker}</option>)}
                            </select>
                            <div className="hidden sm:block">
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{selectedAsset?.name || 'Loading...'}</h2>
                                <div className={cn(
                                    "text-xs font-bold font-mono mt-0.5",
                                    parseFloat(selectedAsset?.price_change || '0') >= 0 ? "text-green-400" : "text-red-400"
                                )}>
                                    {parseFloat(selectedAsset?.price_change || '0') >= 0 ? '+' : ''}
                                    {parseFloat(selectedAsset?.price_change || '0').toFixed(2)} ({parseFloat(selectedAsset?.price_change_percent || '0').toFixed(2)}%)
                                </div>
                            </div>
                        </div>

                        <div className="flex bg-[#2C2C2E] rounded-lg p-1 border border-border">
                            <button
                                onClick={() => setChartMode('PRICE')}
                                className={cn("p-2 px-3 rounded flex items-center gap-2 text-xs font-bold transition-all", chartMode === 'PRICE' ? "bg-neutral-600 text-white shadow" : "text-neutral-400 hover:text-white")}
                            >
                                <BarChart3 className="w-4 h-4" /> Price
                            </button>
                            <button
                                onClick={() => setChartMode('DEPTH')}
                                className={cn("p-2 px-3 rounded flex items-center gap-2 text-xs font-bold transition-all", chartMode === 'DEPTH' ? "bg-neutral-600 text-white shadow" : "text-neutral-400 hover:text-white")}
                            >
                                <Layers className="w-4 h-4" /> Depth
                            </button>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="bg-card border border-border rounded-xl flex-1 relative flex flex-col shadow-sm overflow-hidden bg-black/40">
                        <div className="flex-1 w-full relative p-2">
                            {chartMode === 'PRICE' ? (
                                <CandleStickChart data={chartData} />
                            ) : (
                                <MarketDepthChart bids={bids} asks={asks} />
                            )}
                        </div>
                    </div>

                    {/* Portfolio Summary */}
                    <div className="bg-card border border-border rounded-xl p-4 shadow-sm grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block mb-1">Buying Power</span>
                            <span className="text-xl font-bold font-mono text-white">${portfolio?.buying_power}</span>
                        </div>
                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block mb-1">Portfolio Value</span>
                            <span className="text-xl font-bold font-mono text-white">${portfolio?.cash_balance}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Right: Order Entry & Trades (Col 10-12) */}
                <div className="lg:col-span-3 flex flex-col gap-6 h-full">
                    {/* Order Entry */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
                        <h3 className="font-bold text-sm text-neutral-400 uppercase tracking-widest mb-6 border-b border-border pb-3">Place Order</h3>

                        <form onSubmit={handleSubmit} className="space-y-6 flex-1">
                            <div className="grid grid-cols-2 bg-[#2C2C2E] p-1 rounded-lg border border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setSide('BUY')}
                                    className={cn("py-2 rounded-md text-xs font-black transition-all", side === 'BUY' ? "bg-emerald-600 text-white shadow-md" : "text-neutral-500 hover:text-neutral-300")}
                                >
                                    BUY
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSide('SELL')}
                                    className={cn("py-2 rounded-md text-xs font-black transition-all", side === 'SELL' ? "bg-red-600 text-white shadow-md" : "text-neutral-500 hover:text-neutral-300")}
                                >
                                    SELL
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">Order Type</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input type="radio" checked={orderType === 'MARKET'} onChange={() => setOrderType('MARKET')} className="accent-blue-500 w-3 h-3" />
                                            <span className="text-xs text-neutral-400 group-hover:text-white transition-colors">Market</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input type="radio" checked={orderType === 'LIMIT'} onChange={() => setOrderType('LIMIT')} className="accent-blue-500 w-3 h-3" />
                                            <span className="text-xs text-neutral-400 group-hover:text-white transition-colors">Limit</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Quantity</label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        className="w-full bg-black/40 border border-border rounded-md px-3 py-2 text-sm text-white font-mono focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                {orderType === 'LIMIT' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Limit Price</label>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            className="w-full bg-black/40 border border-border rounded-md px-3 py-2 text-sm text-white font-mono focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            {statusData && (
                                <div className={cn("p-2 rounded border text-[10px] text-center font-bold uppercase tracking-tight", statusData.type === 'success' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" : "bg-red-500/5 border-red-500/20 text-red-500")}>
                                    {statusData.msg}
                                </div>
                            )}

                            <button
                                disabled={loading}
                                className={cn(
                                    "w-full py-4 rounded-lg font-black text-sm transition-all shadow-xl active:scale-[0.97] mt-4 uppercase tracking-[0.2em]",
                                    loading ? "opacity-50 cursor-not-allowed bg-neutral-700" :
                                        side === 'BUY' ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30" :
                                            "bg-red-600 hover:bg-red-500 text-white shadow-red-900/30"
                                )}>
                                {loading ? 'Sending...' : `${side} ${selectedTicker}`}
                            </button>
                        </form>
                    </div>

                    {/* Recent Trades */}
                    <div className="flex-1 min-h-[200px]">
                        <RecentTrades trades={trades} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TradeView;
