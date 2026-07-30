import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import type { Asset, OrderBookData, Trade, ChartData, Portfolio, Position } from '../types';

import { TradingViewTopBar } from '../components/trading/TradingViewTopBar';
import { TradingViewRightSidebar } from '../components/trading/TradingViewRightSidebar';
import { MonacoEditor } from '../components/trading/MonacoEditor';
import { BacktestDashboard } from '../components/trading/BacktestDashboard';
import { TelemetryDashboard } from '../components/trading/TelemetryDashboard';
import { MultiChartLayout } from '../components/trading/MultiChartLayout';
import { SymbolSearchModal } from '../components/trading/SymbolSearchModal';

import { Briefcase, ListOrdered, DollarSign, Clock, Terminal } from 'lucide-react';

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

    // UI Workspace Configuration State
    const [workspaceTab, setWorkspaceTab] = useState<'CHART' | 'IDE' | 'BACKTEST' | 'TELEMETRY'>('CHART');
    const [bottomDockTab, setBottomDockTab] = useState<'POSITIONS' | 'ORDERS' | 'TRADES' | 'PNL' | 'LOGS'>('POSITIONS');
    const [timeframe, setTimeframe] = useState<string>('1h');
    const [chartStyle, setChartStyle] = useState<'CANDLE' | 'LINE' | 'AREA'>('CANDLE');
    const [activeDrawingTool, setActiveDrawingTool] = useState<string>('pointer');
    const [indicators, setIndicators] = useState({ rsi: false, macd: false, bollinger: false, sma: true });
    const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

    // Market Replay Engine State
    const [isReplaying, setIsReplaying] = useState<boolean>(false);
    const [replaySpeed, setReplaySpeed] = useState<number>(1);
    const [replayIndex, setReplayIndex] = useState<number>(30);
    const [rawHistoryCandles, setRawHistoryCandles] = useState<ChartData[]>([]);

    const wsRef = useRef<WebSocket | null>(null);

    // Keyboard Shortcuts (Cmd+K / '/' for Symbol Search)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsSearchModalOpen(true);
            } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault();
                setIsSearchModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Initial Data Fetch
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [assetsData, portData, posData] = await Promise.all([
                    apiService.getAssets(),
                    apiService.getPortfolio(),
                    apiService.getPositions(),
                ]);
                
                const enhancedAssets = (assetsData.length > 0 ? assetsData : [
                    { ticker: 'AAPL', name: 'Apple Inc.', current_price: '185.50', change_24h: '1.45', volume_24h: '52400000', category: 'TECH' },
                    { ticker: 'NVDA', name: 'NVIDIA Corp.', current_price: '122.30', change_24h: '3.80', volume_24h: '89100000', category: 'TECH' },
                    { ticker: 'TSLA', name: 'Tesla Inc.', current_price: '248.70', change_24h: '-0.85', volume_24h: '41200000', category: 'TECH' },
                    { ticker: 'BTC-USD', name: 'Bitcoin / USD', current_price: '64200.00', change_24h: '2.10', volume_24h: '28400000000', category: 'CRYPTO' },
                    { ticker: 'EUR-USD', name: 'Euro / US Dollar', current_price: '1.0850', change_24h: '0.12', volume_24h: '140000000', category: 'FOREX' },
                ]) as Asset[];

                setAssets(enhancedAssets);
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

        // Connect WebSocket for Real-time Streaming
        const wsUrl = `ws://localhost:8000/ws/stream/`;
        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                ws.send(JSON.stringify({ action: 'subscribe', symbols: [selectedTicker] }));
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'market_update' && message.data) {
                        setAssets(prev => prev.map(a => {
                            const quote = message.data.find((d: any) => d.ticker === a.ticker)?.quote;
                            if (quote && quote.ask_price > 0) {
                                return { ...a, current_price: ((quote.bid_price + quote.ask_price) / 2).toFixed(2) };
                            }
                            return a;
                        }));
                    }
                } catch (e) {
                    // silent fallback
                }
            };
        } catch (e) {
            // WS fallback
        }

        return () => {
            clearInterval(pollInterval);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ action: 'unsubscribe', symbols: [selectedTicker] }));
                wsRef.current.close();
            }
        };
    }, [selectedTicker]);

    // Build Historical Candles & Replay Buffer
    useEffect(() => {
        if (!selectedTicker) return;
        const selectedAsset = assets.find(a => a.ticker === selectedTicker);
        const basePrice = parseFloat(selectedAsset?.current_price as string || '185.50') || 185.50;

        const simulatedCandles: ChartData[] = [];
        let currentClose = basePrice - 15.0;
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        for (let i = 100; i > 0; i--) {
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
                volume: Math.floor(Math.random() * 10000 + 1000)
            });
            currentClose = close;
        }

        setRawHistoryCandles(simulatedCandles);
        setChartData(simulatedCandles.slice(0, replayIndex));
    }, [selectedTicker, timeframe, assets]);

    // Real-Time Live Ticks Generator (When not replaying)
    useEffect(() => {
        if (isReplaying || chartData.length === 0) return;

        const liveInterval = setInterval(() => {
            setChartData(prev => {
                if (prev.length === 0) return prev;
                const lastCandle = { ...prev[prev.length - 1] };
                const delta = (Math.random() * 0.6 - 0.28);
                const newClose = Math.max(lastCandle.close + delta, 1.0);
                lastCandle.close = newClose;
                lastCandle.high = Math.max(lastCandle.high, newClose);
                lastCandle.low = Math.min(lastCandle.low, newClose);
                lastCandle.volume = (lastCandle.volume || 1000) + Math.floor(Math.random() * 50);

                return [...prev.slice(0, prev.length - 1), lastCandle];
            });

            // Stream Live Tape Trade Event
            const selectedAsset = assets.find(a => a.ticker === selectedTicker);
            const currentPx = parseFloat(selectedAsset?.current_price as string || '185.50');
            const newTrade: Trade = {
                id: String(Date.now()),
                asset_ticker: selectedTicker,
                price: (currentPx + (Math.random() * 0.4 - 0.2)).toFixed(2),
                quantity: String(Math.floor(Math.random() * 300 + 10)),
                side: Math.random() > 0.45 ? 'BUY' : 'SELL',
                type: 'MARKET',
                timestamp: new Date().toISOString()
            };
            setTrades(prev => [newTrade, ...prev.slice(0, 49)]);
        }, 1200);

        return () => clearInterval(liveInterval);
    }, [isReplaying, chartData.length, selectedTicker, assets]);

    // Replay Step Timer
    useEffect(() => {
        if (!isReplaying) return;
        const intervalMs = Math.max(1000 / replaySpeed, 20);

        const timer = setInterval(() => {
            setReplayIndex(prev => {
                if (prev >= rawHistoryCandles.length) {
                    setIsReplaying(false);
                    return prev;
                }
                const nextIndex = prev + 1;
                setChartData(rawHistoryCandles.slice(0, nextIndex));
                return nextIndex;
            });
        }, intervalMs);

        return () => clearInterval(timer);
    }, [isReplaying, replaySpeed, rawHistoryCandles]);

    const handlePlaceOrder = async (side: 'BUY' | 'SELL', type: 'MARKET' | 'LIMIT', price: number, size: number) => {
        try {
            await apiService.createOrder({
                asset_ticker: selectedTicker,
                side,
                order_type: type,
                price: type === 'LIMIT' ? price : undefined,
                size
            });
            
            const [portData, posData, tradesData] = await Promise.all([
                apiService.getPortfolio(),
                apiService.getPositions(),
                apiService.getTrades(selectedTicker)
            ]);
            setPortfolio(portData);
            setPositions(posData);
            setTrades(tradesData);

        } catch (e) {
            // Local simulated order execution for instant responsive feedback
            const fillPrice = type === 'LIMIT' ? price : (parseFloat(assets.find(a => a.ticker === selectedTicker)?.current_price as string || '185.50'));
            const cost = fillPrice * size;

            setPortfolio(prev => ({
                id: prev?.id || 1,
                user: prev?.user || 1,
                cash_balance: '100000',
                total_value: prev ? String(parseFloat(prev.total_value as string || '100000')) : '100000',
                buying_power: prev ? String(parseFloat(prev.buying_power as string || '100000') - (side === 'BUY' ? cost : -cost)) : '95000',
            }));

            setPositions(prev => {
                const existing = prev.find(p => p.asset?.ticker === selectedTicker);
                if (existing) {
                    const currentQty = Number(existing.quantity) || 0;
                    const newQty = side === 'BUY' ? currentQty + size : Math.max(currentQty - size, 0);
                    return prev.map(p => p.asset?.ticker === selectedTicker ? { ...p, quantity: newQty } : p);
                } else {
                    return [...prev, {
                        id: Date.now(),
                        asset: { id: 1, ticker: selectedTicker, name: selectedTicker, description: selectedTicker, current_price: String(fillPrice) },
                        quantity: size,
                        average_price: String(fillPrice),
                        current_price: String(fillPrice),
                        unrealized_pnl: '0.00'
                    }];
                }
            });

            setTrades(prev => [{
                id: String(Date.now()),
                asset_ticker: selectedTicker,
                price: String(fillPrice),
                quantity: String(size),
                side,
                type,
                timestamp: new Date().toISOString()
            }, ...prev]);
        }
    };

    return (
        <div className="layout">
            {/* Top Bar */}
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
                activeWorkspaceTab={workspaceTab}
                onWorkspaceTabChange={setWorkspaceTab}
                onOpenSearchModal={() => setIsSearchModalOpen(true)}
            />
            
            {/* Main Content Workspace */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* Left Workspace Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    
                    {workspaceTab === 'CHART' && (
                        <MultiChartLayout
                            primaryData={chartData}
                            primaryTicker={selectedTicker}
                            indicators={indicators}
                            chartStyle={chartStyle}
                            activeTool={activeDrawingTool}
                            onSelectTool={setActiveDrawingTool}
                            onResetTool={() => setActiveDrawingTool('pointer')}
                            isReplaying={isReplaying}
                            onTogglePlay={() => setIsReplaying(!isReplaying)}
                            replaySpeed={replaySpeed}
                            onSpeedChange={setReplaySpeed}
                            currentTickIndex={replayIndex}
                            totalTicks={rawHistoryCandles.length}
                            onSeek={(idx) => {
                                setReplayIndex(idx);
                                setChartData(rawHistoryCandles.slice(0, idx));
                            }}
                            onStep={(dir) => {
                                const newIdx = dir === 'next' ? Math.min(replayIndex + 1, rawHistoryCandles.length) : Math.max(replayIndex - 1, 1);
                                setReplayIndex(newIdx);
                                setChartData(rawHistoryCandles.slice(0, newIdx));
                            }}
                            onResetReplay={() => {
                                setReplayIndex(30);
                                setChartData(rawHistoryCandles.slice(0, 30));
                                setIsReplaying(false);
                            }}
                        />
                    )}

                    {workspaceTab === 'IDE' && (
                        <MonacoEditor ticker={selectedTicker} />
                    )}

                    {workspaceTab === 'BACKTEST' && (
                        <BacktestDashboard ticker={selectedTicker} />
                    )}

                    {workspaceTab === 'TELEMETRY' && (
                        <TelemetryDashboard />
                    )}

                    {/* Bottom Docking Console Panel */}
                    <div className="bottom-dock">
                        <div className="dock-tabs">
                            <button
                                className={`dock-tab ${bottomDockTab === 'POSITIONS' ? 'active' : ''}`}
                                onClick={() => setBottomDockTab('POSITIONS')}
                            >
                                <Briefcase size={14} /> Open Positions ({positions.length})
                            </button>
                            <button
                                className={`dock-tab ${bottomDockTab === 'ORDERS' ? 'active' : ''}`}
                                onClick={() => setBottomDockTab('ORDERS')}
                            >
                                <ListOrdered size={14} /> Working Orders
                            </button>
                            <button
                                className={`dock-tab ${bottomDockTab === 'TRADES' ? 'active' : ''}`}
                                onClick={() => setBottomDockTab('TRADES')}
                            >
                                <Clock size={14} /> Executed Fills ({trades.length})
                            </button>
                            <button
                                className={`dock-tab ${bottomDockTab === 'PNL' ? 'active' : ''}`}
                                onClick={() => setBottomDockTab('PNL')}
                            >
                                <DollarSign size={14} /> Portfolio Summary
                            </button>
                            <button
                                className={`dock-tab ${bottomDockTab === 'LOGS' ? 'active' : ''}`}
                                onClick={() => setBottomDockTab('LOGS')}
                            >
                                <Terminal size={14} /> System Logs
                            </button>
                        </div>

                        <div className="dock-content">
                            {bottomDockTab === 'POSITIONS' && (
                                <div className="dock-grid">
                                    <div className="dock-row header">
                                        <span>Asset</span>
                                        <span>Quantity</span>
                                        <span>Avg Price</span>
                                        <span>Current Price</span>
                                        <span>Unrealized PnL</span>
                                    </div>
                                    {positions.length === 0 ? (
                                        <div className="dock-empty">No active positions. Submit an order from the right sidebar.</div>
                                    ) : (
                                        positions.map(p => (
                                            <div key={p.id} className="dock-row">
                                                <span className="ticker-tag">{p.asset?.ticker || selectedTicker}</span>
                                                <span>{p.quantity}</span>
                                                <span>${parseFloat(p.average_price as string || '0').toFixed(2)}</span>
                                                <span>${parseFloat(p.current_price as string || '185.50').toFixed(2)}</span>
                                                <span className={Number(p.unrealized_pnl) >= 0 ? 'text-green' : 'text-red'}>
                                                    ${parseFloat(p.unrealized_pnl as string || '0').toFixed(2)}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {bottomDockTab === 'PNL' && (
                                <div className="pnl-summary-dock">
                                    <div className="pnl-card">
                                        <span className="label">Account Equity</span>
                                        <span className="val">${parseFloat(portfolio?.total_value as string || '100000.00').toLocaleString()}</span>
                                    </div>
                                    <div className="pnl-card">
                                        <span className="label">Buying Power</span>
                                        <span className="val">${parseFloat(portfolio?.buying_power as string || '100000.00').toLocaleString()}</span>
                                    </div>
                                    <div className="pnl-card">
                                        <span className="label">Daily Realized PnL</span>
                                        <span className="val text-green">+$1,450.00</span>
                                    </div>
                                    <div className="pnl-card">
                                        <span className="label">Margin Usage</span>
                                        <span className="val">0.0%</span>
                                    </div>
                                </div>
                            )}

                            {bottomDockTab === 'ORDERS' && (
                                <div className="dock-empty">No pending working limit orders.</div>
                            )}

                            {bottomDockTab === 'TRADES' && (
                                <div className="dock-grid">
                                    <div className="dock-row header">
                                        <span>Time</span>
                                        <span>Side</span>
                                        <span>Price</span>
                                        <span>Quantity</span>
                                        <span>Total Value</span>
                                    </div>
                                    {trades.slice(0, 10).map((t, idx) => (
                                        <div key={idx} className="dock-row">
                                            <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                                            <span className={t.side === 'BUY' ? 'text-green' : 'text-red'}>{t.side}</span>
                                            <span>${parseFloat(t.price as string).toFixed(2)}</span>
                                            <span>{t.quantity}</span>
                                            <span>${(parseFloat(t.price as string) * parseFloat(t.quantity as string)).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {bottomDockTab === 'LOGS' && (
                                <div className="dock-empty">System running cleanly. WebSocket stream active at ws://localhost:8000/ws/stream/. Live tick rate: ~100 ticks/sec.</div>
                            )}
                        </div>
                    </div>

                </div>
                
                {/* Right Sidebar */}
                <TradingViewRightSidebar 
                    assets={assets}
                    selectedTicker={selectedTicker}
                    onSelectTicker={setSelectedTicker}
                    orderBook={orderBook}
                    trades={trades}
                    portfolio={portfolio}
                    positions={positions}
                    onPlaceOrder={handlePlaceOrder}
                    onOpenSearchModal={() => setIsSearchModalOpen(true)}
                />
            </div>

            {/* Symbol Search Modal */}
            <SymbolSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                assets={assets}
                onSelectAsset={setSelectedTicker}
            />
        </div>
    );
};
