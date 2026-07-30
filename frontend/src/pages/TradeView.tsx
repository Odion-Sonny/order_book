import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type { Asset, Portfolio, Trade } from '@/types';
import { TradingViewTopBar } from '@/components/trading/TradingViewTopBar';
import { TradingViewDrawingBar } from '@/components/trading/TradingViewDrawingBar';
import { TradingViewRightSidebar } from '@/components/trading/TradingViewRightSidebar';
import { TradingViewBottomPanel } from '@/components/trading/TradingViewBottomPanel';
import { TradingViewChart } from '@/components/trading/TradingViewChart';

interface ChartData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

const TradeView = () => {
    // Assets & Selection
    const [assets, setAssets] = useState<Asset[]>([]);
    const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');

    // Controls State
    const [timeframe, setTimeframe] = useState<string>('1D');
    const [chartStyle, setChartStyle] = useState<'CANDLE' | 'LINE' | 'AREA'>('CANDLE');
    const [activeIndicators, setActiveIndicators] = useState({
        rsi: true,
        macd: false,
        bollinger: false,
        sma: true
    });

    // Market & User Data
    const [trades, setTrades] = useState<Trade[]>([]);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [bids, setBids] = useState<any[]>([]);
    const [asks, setAsks] = useState<any[]>([]);
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

    // Order Submission State
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [orderStatus, setOrderStatus] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Selected Asset Details
    const selectedAsset = assets.find(a => a.ticker === selectedTicker);
    const currentPrice = parseFloat(selectedAsset?.current_price || '0');
    const priceChange = parseFloat(selectedAsset?.price_change || '0');
    const priceChangePercent = parseFloat(selectedAsset?.price_change_percent || '0');

    // Toggle indicator
    const handleToggleIndicator = (key: 'rsi' | 'macd' | 'bollinger' | 'sma') => {
        setActiveIndicators(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Load assets on mount
    useEffect(() => {
        const loadAssets = async () => {
            try {
                const data = await apiService.getAssets();
                setAssets(data);
                if (data.length > 0 && !selectedTicker) {
                    setSelectedTicker(data[0].ticker);
                }
            } catch (e) {
                console.error("Failed to load assets", e);
            }
        };
        loadAssets();
    }, []);

    // Polling Market Data
    useEffect(() => {
        if (!selectedTicker) return;

        const fetchData = async () => {
            try {
                // 1. Fetch Trades
                const allTrades = await apiService.getTrades();
                const assetTrades = allTrades
                    .filter(t => t.asset_ticker === selectedTicker)
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                setTrades(assetTrades);

                // 2. Fetch Portfolio
                try {
                    const p = await apiService.getPortfolio();
                    setPortfolio(p);
                } catch (pe) {
                    console.error("Failed to load portfolio", pe);
                }

                // 3. Fetch Order Book
                const bookData: any = await apiService.getOrderBook(selectedTicker);
                if (bookData.bids && bookData.asks) {
                    setBids(bookData.bids.map((b: any) => ({ price: parseFloat(b.price), size: parseFloat(b.size), total: parseFloat(b.total) })));
                    setAsks(bookData.asks.map((a: any) => ({ price: parseFloat(a.price), size: parseFloat(a.size), total: parseFloat(a.total) })));
                }
            } catch (e) {
                console.error("Error polling market data", e);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [selectedTicker]);

    // Build Candlestick Data from Trades or Asset Base Price
    useEffect(() => {
        if (!selectedTicker) return;

        if (trades.length > 0) {
            // Group trades into daily candles
            const candleMap = new Map<string, { time: string; open: number; high: number; low: number; close: number; volume: number }>();
            trades.forEach(t => {
                const dateStr = t.timestamp.split('T')[0];
                const price = parseFloat(t.price);
                const size = parseFloat(t.quantity || '0');

                if (!candleMap.has(dateStr)) {
                    candleMap.set(dateStr, { time: dateStr, open: price, high: price, low: price, close: price, volume: size });
                } else {
                    const c = candleMap.get(dateStr)!;
                    c.high = Math.max(c.high, price);
                    c.low = Math.min(c.low, price);
                    c.close = price;
                    c.volume += size;
                }
            });
            const candles = Array.from(candleMap.values());
            candles.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
            setChartData(candles);
        } else {
            // Generate 30 days of realistic historical candles based on asset price
            const basePrice = parseFloat(selectedAsset?.current_price || '185.50') || 185.50;
            const simulatedCandles: ChartData[] = [];
            let currentClose = basePrice - 12.0;
            const now = new Date();

            for (let i = 30; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const timeStr = d.toISOString().split('T')[0];
                
                const dayVolatility = basePrice * 0.015;
                const open = currentClose;
                const change = (Math.sin(i * 0.5) * 2 + (Math.random() - 0.48) * 3);
                const close = Math.max(1.0, open + change);
                const high = Math.max(open, close) + Math.random() * dayVolatility;
                const low = Math.min(open, close) - Math.random() * dayVolatility;
                const volume = Math.floor(50000 + Math.random() * 150000);

                simulatedCandles.push({
                    time: timeStr,
                    open: parseFloat(open.toFixed(2)),
                    high: parseFloat(high.toFixed(2)),
                    low: parseFloat(low.toFixed(2)),
                    close: parseFloat(close.toFixed(2)),
                    volume
                });
                currentClose = close;
            }
            setChartData(simulatedCandles);
        }
    }, [trades, selectedTicker, selectedAsset]);

    // WebSocket Live Ticks Stream
    useEffect(() => {
        if (!selectedTicker) return;

        const wsUrl = `ws://${window.location.hostname}:8000/ws/stream/`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'bar' && data.data.symbol === selectedTicker) {
                    const bar = data.data;
                    setChartData(prev => {
                        const newBar = {
                            time: bar.timestamp.split('T')[0],
                            open: parseFloat(bar.open),
                            high: parseFloat(bar.high),
                            low: parseFloat(bar.low),
                            close: parseFloat(bar.close),
                            volume: parseFloat(bar.volume || 0)
                        };
                        const last = prev[prev.length - 1];
                        if (last && last.time === newBar.time) {
                            return [...prev.slice(0, -1), newBar];
                        }
                        return [...prev, newBar];
                    });
                }
            } catch (e) {
                console.error("WS error parsing message", e);
            }
        };

        return () => {
            if (ws.readyState === 1) ws.close();
        };
    }, [selectedTicker]);

    // Place Order Handler
    const handlePlaceOrder = async (orderData: { asset: string; side: 'BUY' | 'SELL'; order_type: 'MARKET' | 'LIMIT'; quantity: string; price?: string }) => {
        setIsSubmittingOrder(true);
        setOrderStatus(null);
        try {
            await apiService.createOrder(orderData);
            setOrderStatus({ msg: 'Order Placed Successfully', type: 'success' });
        } catch (error: any) {
            console.error("Order failed", error);
            setOrderStatus({ msg: 'Order Failed: ' + (error.response?.data?.detail || 'Unknown error'), type: 'error' });
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    const handleToggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    return (
        <div className="w-full h-[calc(100vh-4rem)] flex flex-col bg-[#131722] text-[#d1d4dc] font-sans overflow-hidden">
            {/* 1. TradingView Top Control Bar */}
            <TradingViewTopBar
                assets={assets}
                selectedTicker={selectedTicker}
                onSelectTicker={setSelectedTicker}
                timeframe={timeframe}
                onSelectTimeframe={setTimeframe}
                chartStyle={chartStyle}
                onSelectChartStyle={setChartStyle}
                activeIndicators={activeIndicators}
                onToggleIndicator={handleToggleIndicator}
                currentPrice={currentPrice}
                priceChange={priceChange}
                priceChangePercent={priceChangePercent}
                onToggleFullscreen={handleToggleFullscreen}
            />

            {/* 2. Main Workstation Body (Left Toolbar + Chart + Right Sidebar) */}
            <div className="flex-1 flex w-full overflow-hidden">
                {/* Left Drawing Tools Bar */}
                <TradingViewDrawingBar />

                {/* Center Canvas Area */}
                <div className="flex-1 h-full relative bg-[#131722]">
                    <TradingViewChart 
                        data={chartData} 
                        ticker={selectedTicker}
                        indicators={activeIndicators}
                    />
                </div>

                {/* Right Sidebar Tool Window */}
                <TradingViewRightSidebar
                    assets={assets}
                    selectedTicker={selectedTicker}
                    onSelectTicker={setSelectedTicker}
                    bids={bids}
                    asks={asks}
                    trades={trades}
                    portfolio={portfolio}
                    onPlaceOrder={handlePlaceOrder}
                    orderStatus={orderStatus}
                    isSubmittingOrder={isSubmittingOrder}
                />
            </div>

            {/* 3. Collapsible Bottom Dock (Pine/Python Code Editor, Strategy Tester, Positions) */}
            <TradingViewBottomPanel portfolio={portfolio} />
        </div>
    );
};

export default TradeView;
