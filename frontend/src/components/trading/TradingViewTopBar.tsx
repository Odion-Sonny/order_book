import React, { useState } from 'react';
import type { Asset } from '@/types';
import { cn } from '@/lib/utils';
import { 
    Search, 
    CandlestickChart, 
    LineChart, 
    AreaChart, 
    Maximize2, 
    ChevronDown,
    Activity
} from 'lucide-react';

interface TradingViewTopBarProps {
    assets: Asset[];
    selectedTicker: string;
    onSelectTicker: (ticker: string) => void;
    timeframe: string;
    onSelectTimeframe: (tf: string) => void;
    chartStyle: 'CANDLE' | 'LINE' | 'AREA';
    onSelectChartStyle: (style: 'CANDLE' | 'LINE' | 'AREA') => void;
    activeIndicators: {
        rsi: boolean;
        macd: boolean;
        bollinger: boolean;
        sma: boolean;
    };
    onToggleIndicator: (indicator: 'rsi' | 'macd' | 'bollinger' | 'sma') => void;
    currentPrice?: number;
    priceChange?: number;
    priceChangePercent?: number;
    onToggleFullscreen?: () => void;
}

export const TradingViewTopBar: React.FC<TradingViewTopBarProps> = ({
    assets,
    selectedTicker,
    onSelectTicker,
    timeframe,
    onSelectTimeframe,
    chartStyle,
    onSelectChartStyle,
    activeIndicators,
    onToggleIndicator,
    currentPrice = 0,
    priceChange = 0,
    priceChangePercent = 0,
    onToggleFullscreen
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredAssets = assets.filter(a => 
        a.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];
    const activeIndicatorCount = Object.values(activeIndicators).filter(Boolean).length;

    return (
        <div className="h-12 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between px-3 text-xs text-[#d1d4dc] font-sans select-none shrink-0">
            {/* Left Section: Symbol, Timeframes, Chart Type, Indicators */}
            <div className="flex items-center gap-1 sm:gap-2">
                {/* Symbol Selector Dropdown Trigger */}
                <div className="relative">
                    <button 
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#2a2e39] transition-colors font-bold text-white group border border-transparent hover:border-[#363c4e]"
                    >
                        <div className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-extrabold text-[10px] flex items-center justify-center border border-blue-500/40">
                            {selectedTicker.slice(0, 2)}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm tracking-wide font-extrabold text-white">{selectedTicker}</span>
                            <span className="text-[10px] text-neutral-400 font-normal hidden md:inline">NASDAQ</span>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
                    </button>

                    {/* Symbol Search Modal */}
                    {isSearchOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)} />
                            <div className="absolute top-full left-0 mt-1 w-72 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl z-50 p-2 text-white">
                                <div className="relative mb-2">
                                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-neutral-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search symbol (e.g. AAPL, TSLA)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                        className="w-full bg-[#131722] border border-[#2a2e39] rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#2962ff]"
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto tv-scrollbar space-y-0.5">
                                    {filteredAssets.map(asset => (
                                        <button
                                            key={asset.ticker}
                                            onClick={() => {
                                                onSelectTicker(asset.ticker);
                                                setIsSearchOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors text-xs",
                                                selectedTicker === asset.ticker ? "bg-[#2962ff]/20 text-[#2962ff] font-bold" : "hover:bg-[#2a2e39] text-neutral-200"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-extrabold text-white">{asset.ticker}</span>
                                                <span className="text-[10px] text-neutral-400 truncate max-w-[150px]">{asset.name}</span>
                                            </div>
                                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-black/40 text-neutral-400 border border-neutral-700">Stock</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="h-4 w-[1px] bg-[#2a2e39] mx-1 hidden sm:block" />

                {/* Timeframe Selector */}
                <div className="flex items-center gap-0.5">
                    {timeframes.map(tf => (
                        <button
                            key={tf}
                            onClick={() => onSelectTimeframe(tf)}
                            className={cn(
                                "px-2 py-1 rounded text-xs font-semibold transition-colors",
                                timeframe === tf ? "bg-[#2962ff] text-white font-bold" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                            )}
                        >
                            {tf}
                        </button>
                    ))}
                </div>

                <div className="h-4 w-[1px] bg-[#2a2e39] mx-1 hidden sm:block" />

                {/* Chart Style Selector */}
                <div className="flex items-center bg-[#131722] p-0.5 rounded border border-[#2a2e39]">
                    <button
                        onClick={() => onSelectChartStyle('CANDLE')}
                        title="Candlesticks"
                        className={cn("p-1 rounded transition-colors", chartStyle === 'CANDLE' ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white")}
                    >
                        <CandlestickChart className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onSelectChartStyle('LINE')}
                        title="Line Chart"
                        className={cn("p-1 rounded transition-colors", chartStyle === 'LINE' ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white")}
                    >
                        <LineChart className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onSelectChartStyle('AREA')}
                        title="Area Chart"
                        className={cn("p-1 rounded transition-colors", chartStyle === 'AREA' ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white")}
                    >
                        <AreaChart className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="h-4 w-[1px] bg-[#2a2e39] mx-1 hidden sm:block" />

                {/* Indicators Menu Trigger */}
                <div className="relative">
                    <button
                        onClick={() => setIsIndicatorsOpen(!isIndicatorsOpen)}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all border",
                            activeIndicatorCount > 0 
                                ? "bg-[#2962ff]/10 text-[#2962ff] border-[#2962ff]/40" 
                                : "text-[#d1d4dc] hover:bg-[#2a2e39] border-transparent"
                        )}
                    >
                        <Activity className="w-3.5 h-3.5 text-[#2962ff]" />
                        <span>Indicators</span>
                        {activeIndicatorCount > 0 && (
                            <span className="ml-0.5 bg-[#2962ff] text-white text-[9px] font-black px-1 rounded-full">
                                {activeIndicatorCount}
                            </span>
                        )}
                    </button>

                    {/* Indicators Selection Dropdown */}
                    {isIndicatorsOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsIndicatorsOpen(false)} />
                            <div className="absolute top-full left-0 mt-1 w-64 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl z-50 p-2 text-white">
                                <div className="text-[11px] font-bold text-[#787b86] uppercase tracking-wider px-2 py-1 border-b border-[#2a2e39] mb-1">
                                    Technical Indicators
                                </div>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => onToggleIndicator('rsi')}
                                        className={cn(
                                            "w-full flex items-center justify-between px-2.5 py-2 rounded text-left text-xs transition-colors",
                                            activeIndicators.rsi ? "bg-[#2962ff]/20 text-white font-bold" : "hover:bg-[#2a2e39] text-[#d1d4dc]"
                                        )}
                                    >
                                        <span>RSI (Relative Strength Index)</span>
                                        <span className={cn("w-2 h-2 rounded-full", activeIndicators.rsi ? "bg-[#2962ff]" : "bg-neutral-600")} />
                                    </button>
                                    <button
                                        onClick={() => onToggleIndicator('macd')}
                                        className={cn(
                                            "w-full flex items-center justify-between px-2.5 py-2 rounded text-left text-xs transition-colors",
                                            activeIndicators.macd ? "bg-[#2962ff]/20 text-white font-bold" : "hover:bg-[#2a2e39] text-[#d1d4dc]"
                                        )}
                                    >
                                        <span>MACD (Moving Avg Convergence)</span>
                                        <span className={cn("w-2 h-2 rounded-full", activeIndicators.macd ? "bg-[#2962ff]" : "bg-neutral-600")} />
                                    </button>
                                    <button
                                        onClick={() => onToggleIndicator('sma')}
                                        className={cn(
                                            "w-full flex items-center justify-between px-2.5 py-2 rounded text-left text-xs transition-colors",
                                            activeIndicators.sma ? "bg-[#2962ff]/20 text-white font-bold" : "hover:bg-[#2a2e39] text-[#d1d4dc]"
                                        )}
                                    >
                                        <span>SMA (Simple Moving Average 20)</span>
                                        <span className={cn("w-2 h-2 rounded-full", activeIndicators.sma ? "bg-[#2962ff]" : "bg-neutral-600")} />
                                    </button>
                                    <button
                                        onClick={() => onToggleIndicator('bollinger')}
                                        className={cn(
                                            "w-full flex items-center justify-between px-2.5 py-2 rounded text-left text-xs transition-colors",
                                            activeIndicators.bollinger ? "bg-[#2962ff]/20 text-white font-bold" : "hover:bg-[#2a2e39] text-[#d1d4dc]"
                                        )}
                                    >
                                        <span>Bollinger Bands</span>
                                        <span className={cn("w-2 h-2 rounded-full", activeIndicators.bollinger ? "bg-[#2962ff]" : "bg-neutral-600")} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Right Section: Price Badge, Replay, Fullscreen */}
            <div className="flex items-center gap-3">
                {/* Live Ticker Price Quote Badge */}
                <div className="flex items-center gap-2 bg-[#131722] px-2.5 py-1 rounded border border-[#2a2e39] font-mono text-xs">
                    <span className="font-extrabold text-white">${currentPrice.toFixed(2)}</span>
                    <span className={cn(
                        "font-bold text-[11px]",
                        priceChange >= 0 ? "text-[#089981]" : "text-[#f23645]"
                    )}>
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                    </span>
                </div>

                <div className="h-4 w-[1px] bg-[#2a2e39] hidden sm:block" />

                {/* Fullscreen Button */}
                {onToggleFullscreen && (
                    <button
                        onClick={onToggleFullscreen}
                        title="Toggle Fullscreen"
                        className="p-1.5 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};
