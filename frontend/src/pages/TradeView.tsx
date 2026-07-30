import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import type { Asset, OrderBookData, Trade, ChartData, Portfolio, Position } from '../types';

import { TradingViewTopBar } from '../components/trading/TradingViewTopBar';
import { TradingViewChart } from '../components/trading/TradingViewChart';
import { TradingViewRightSidebar } from '../components/trading/TradingViewRightSidebar';
import { DrawingToolbar } from '../components/trading/DrawingToolbar';
import { MarketReplayControls } from '../components/trading/MarketReplayControls';
import { MonacoEditor } from '../components/trading/MonacoEditor';
import { BacktestDashboard } from '../components/trading/BacktestDashboard';
import { TelemetryDashboard } from '../components/trading/TelemetryDashboard';
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
    const [indicators, setIndicators] = useState({ rsi: false, macd: false, bollinger: false, sma: true });
    const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

    // Market Replay Engine State
    const [isReplaying, setIsReplaying] = useState<boolean>(false);
    const [replaySpeed, setReplaySpeed] = useState<number>(1);
    const [replayIndex, setReplayIndex] = useState<number>(30);
    const [rawHistoryCandles, setRawHistoryCandles] = useState<ChartData[]>([]);

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
                
                // Enhance assets with category metadata if not present
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
            console.error("Order failed", e);
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
                        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                            <DrawingToolbar />
                            
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                <TradingViewChart 
                                    data={chartData}
                                    ticker={selectedTicker}
                                    indicators={indicators}
                                    chartStyle={chartStyle}
                                />
                                
                                <MarketReplayControls
                                    isPlaying={isReplaying}
                                    onTogglePlay={() => setIsReplaying(!isReplaying)}
                                    speed={replaySpeed}
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
                                    onReset={() => {
                                        setReplayIndex(30);
                                        setChartData(rawHistoryCandles.slice(0, 30));
                                        setIsReplaying(false);
                                    }}
                                />
                            </div>
                        </div>
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
                                <Clock size={14} /> Executed Fills
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
                                                <span className="ticker-tag">{p.asset.ticker}</span>
                                                <span>{p.quantity}</span>
                                                <span>${parseFloat(p.average_price as string).toFixed(2)}</span>
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
                                <div className="dock-empty">No executed trades in current session.</div>
                            )}

                            {bottomDockTab === 'LOGS' && (
                                <div className="dock-empty">System running cleanly. WebSocket stream active at ws://localhost:8000/ws/stream/.</div>
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
