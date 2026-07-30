import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import type { Asset, OrderBookData, Trade, ChartData, Portfolio, Position } from '../types';

import { TradingViewTopBar } from '../components/trading/TradingViewTopBar';
import { TradingViewChart } from '../components/trading/TradingViewChart';
import { TradingViewRightSidebar } from '../components/trading/TradingViewRightSidebar';

export const TradeView: React.FC = () => {
    // Global State
    const [assets, setAssets] = useState<Asset[]>([]);
    const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    
    // Trading Engine State
    const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [chartData, setChartData] = useState<ChartData[]>([]);

    // UI Configuration State
    const [timeframe, setTimeframe] = useState<string>('1h');
    const [chartStyle, setChartStyle] = useState<'CANDLE' | 'LINE' | 'AREA'>('CANDLE');
    const [indicators, setIndicators] = useState({ rsi: false, macd: false, bollinger: false, sma: true });

    const wsRef = useRef<WebSocket | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [assetsData, portData, posData] = await Promise.all([
                    apiService.getAssets(),
                    apiService.getPortfolio(),
                    apiService.getPositions(),
                ]);
                setAssets(assetsData);
                setPortfolio(portData);
                setPositions(posData);
            } catch (err) {
                console.error("Failed to fetch initial data", err);
            }
        };
        fetchInitialData();
    }, []);

    // WebSocket & Polling for Selected Asset
    useEffect(() => {
        if (!selectedTicker) return;

        // 1. Fetch historical/local trades & orderbook
        const fetchAssetData = async () => {
            try {
                const [tradesData, obData] = await Promise.all([
                    apiService.getTrades(selectedTicker),
                    apiService.getOrderBook(selectedTicker)
                ]);
                setTrades(tradesData);
                setOrderBook(obData);
            } catch (err) {
                console.error("Error fetching asset data:", err);
            }
        };
        
        fetchAssetData();
        const pollInterval = setInterval(fetchAssetData, 3000);

        // 2. Connect WebSocket for Real-time Streaming
        const wsUrl = `ws://localhost:8000/ws/stream/`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("Connected to Live Market Stream");
            ws.send(JSON.stringify({ action: 'subscribe', symbols: [selectedTicker] }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'market_update' && message.data) {
                    // Update Watchlist Live Prices
                    setAssets(prev => prev.map(a => {
                        const quote = message.data.find((d: any) => d.ticker === a.ticker)?.quote;
                        if (quote && quote.ask_price > 0) {
                            return { ...a, current_price: ((quote.bid_price + quote.ask_price) / 2).toFixed(2) };
                        }
                        return a;
                    }));
                }
            } catch (e) {
                console.error("WS Parse error", e);
            }
        };

        return () => {
            clearInterval(pollInterval);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ action: 'unsubscribe', symbols: [selectedTicker] }));
                wsRef.current.close();
            }
        };
    }, [selectedTicker]);

    // Build Chart Data from Trades or Simulate
    useEffect(() => {
        if (!selectedTicker) return;
        const selectedAsset = assets.find(a => a.ticker === selectedTicker);

        if (trades.length > 10) {
            // Group trades into candles based on timeframe
            const candleMap = new Map<string, ChartData>();
            trades.forEach(t => {
                const d = new Date(t.timestamp);
                
                // Simplified grouping
                if (timeframe === '1m') d.setSeconds(0, 0);
                else if (timeframe === '5m') { d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0); }
                else if (timeframe === '15m') { d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0); }
                else if (timeframe === '1h') { d.setMinutes(0, 0, 0); }
                else if (timeframe === '4h') { d.setHours(Math.floor(d.getHours() / 4) * 4, 0, 0, 0); }
                else if (timeframe === '1D') { d.setHours(0, 0, 0, 0); }
                
                const timeKey = d.getTime().toString();
                const price = parseFloat(t.price as string);
                
                if (candleMap.has(timeKey)) {
                    const c = candleMap.get(timeKey)!;
                    c.high = Math.max(c.high, price);
                    c.low = Math.min(c.low, price);
                    c.close = price;
                    c.volume = (c.volume || 0) + parseFloat(t.quantity as string);
                } else {
                    candleMap.set(timeKey, {
                        time: d.getTime(),
                        open: price,
                        high: price,
                        low: price,
                        close: price,
                        volume: parseFloat(t.quantity as string)
                    });
                }
            });
            
            const grouped = Array.from(candleMap.values()).sort((a, b) => (a.time as number) - (b.time as number));
            setChartData(grouped.map(c => ({ ...c, time: new Date(c.time).toISOString() })));

        } else {
            // Simulate Data for empty states
            const basePrice = parseFloat(selectedAsset?.current_price as string || '185.50') || 185.50;
            const simulatedCandles: ChartData[] = [];
            let currentClose = basePrice - 12.0;
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            for (let i = 60; i > 0; i--) {
                const date = new Date(now);
                
                if (timeframe.includes('m') || timeframe.includes('h')) {
                    date.setHours(now.getHours() - i * (timeframe === '1h' ? 1 : 0));
                    date.setMinutes(now.getMinutes() - i * (timeframe === '15m' ? 15 : timeframe === '5m' ? 5 : 1));
                } else {
                    date.setDate(now.getDate() - i);
                }

                const open = currentClose + (Math.random() * 2 - 1);
                const close = open + (Math.random() * 4 - 2);
                const high = Math.max(open, close) + Math.random() * 2;
                const low = Math.min(open, close) - Math.random() * 2;

                simulatedCandles.push({
                    time: date.toISOString(),
                    open, high, low, close,
                    volume: Math.floor(Math.random() * 10000)
                });
                currentClose = close;
            }
            setChartData(simulatedCandles);
        }
    }, [trades, selectedTicker, timeframe, assets]);

    const handlePlaceOrder = async (side: 'BUY' | 'SELL', type: 'MARKET' | 'LIMIT', price: number, size: number) => {
        try {
            await apiService.createOrder({
                asset_ticker: selectedTicker,
                side,
                order_type: type,
                price: type === 'LIMIT' ? price : undefined,
                size
            });
            
            // Refresh User Data
            const [portData, posData, tradesData] = await Promise.all([
                apiService.getPortfolio(),
                apiService.getPositions(),
                apiService.getTrades(selectedTicker)
            ]);
            setPortfolio(portData);
            setPositions(posData);
            setTrades(tradesData);

        } catch (e) {
            console.error("Order failed", e);
        }
    };

    return (
        <div className="layout">
            <TradingViewTopBar 
                ticker={selectedTicker}
                onTickerChange={setSelectedTicker}
                availableAssets={assets}
                selectedAsset={assets.find(a => a.ticker === selectedTicker) || null}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                indicators={indicators}
                onIndicatorsChange={setIndicators}
                chartStyle={chartStyle}
                onChartStyleChange={setChartStyle}
            />
            
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <TradingViewChart 
                    data={chartData}
                    ticker={selectedTicker}
                    indicators={indicators}
                    chartStyle={chartStyle}
                />
                
                <TradingViewRightSidebar 
                    assets={assets}
                    selectedTicker={selectedTicker}
                    onSelectTicker={setSelectedTicker}
                    orderBook={orderBook}
                    trades={trades}
                    portfolio={portfolio}
                    positions={positions}
                    onPlaceOrder={handlePlaceOrder}
                />
            </div>
        </div>
    );
};
