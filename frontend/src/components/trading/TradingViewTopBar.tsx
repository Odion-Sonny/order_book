import React from 'react';
import { 
    LineChart, 
    SlidersHorizontal, 
    Search, 
    Code2, 
    BarChart3, 
    Activity, 
    TrendingUp,
    Bell,
    Filter
} from 'lucide-react';
import type { Asset } from '../../types';

interface TradingViewTopBarProps {
    ticker: string;
    onTickerChange: (ticker: string) => void;
    availableAssets: Asset[];
    selectedAsset: Asset | null;
    timeframe: string;
    onTimeframeChange: (tf: string) => void;
    indicators: { rsi: boolean; macd: boolean; bollinger: boolean; sma: boolean };
    onIndicatorsChange: (indicators: any) => void;
    chartStyle: 'CANDLE' | 'LINE' | 'AREA';
    onChartStyleChange: (style: 'CANDLE' | 'LINE' | 'AREA') => void;
    activeWorkspaceTab: 'CHART' | 'IDE' | 'BACKTEST' | 'TELEMETRY';
    onWorkspaceTabChange: (tab: 'CHART' | 'IDE' | 'BACKTEST' | 'TELEMETRY') => void;
    onOpenSearchModal: () => void;
    onOpenAlertsModal?: () => void;
    onOpenScreenerModal?: () => void;
}

const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'];

export const TradingViewTopBar: React.FC<TradingViewTopBarProps> = ({
    ticker,
    selectedAsset,
    timeframe,
    onTimeframeChange,
    indicators,
    onIndicatorsChange,
    chartStyle,
    onChartStyleChange,
    activeWorkspaceTab,
    onWorkspaceTabChange,
    onOpenSearchModal,
    onOpenAlertsModal,
    onOpenScreenerModal,
}) => {
    return (
        <div className="topbar">
            {/* Logo / Brand Title */}
            <div className="brand-logo" onClick={onOpenSearchModal}>
                <TrendingUp size={20} className="brand-icon glow-cyan" />
                <div className="brand-text">
                    <span className="brand-name">QUANT<span className="cyan-text">TRADE</span></span>
                    <span className="brand-sub">PRO SIMULATION</span>
                </div>
            </div>

            <div className="divider" />

            {/* Asset Search & Selector */}
            <button className="topbar-section asset-info-btn" onClick={onOpenSearchModal}>
                <Search size={16} className="icon-muted" />
                <div className="asset-details">
                    <h2 className="glow-text ticker-title">{ticker}</h2>
                    <span className="asset-name">{selectedAsset?.name || 'Search Symbol...'}</span>
                </div>
            </button>
            
            <div className="divider" />

            {/* Main Workspace Workspace Views (Chart / Python IDE / Backtest / Telemetry) */}
            <div className="topbar-section workspace-modes">
                <button
                    className={`mode-btn ${activeWorkspaceTab === 'CHART' ? 'active' : ''}`}
                    onClick={() => onWorkspaceTabChange('CHART')}
                >
                    <LineChart size={15} /> Chart
                </button>
                <button
                    className={`mode-btn ${activeWorkspaceTab === 'IDE' ? 'active' : ''}`}
                    onClick={() => onWorkspaceTabChange('IDE')}
                >
                    <Code2 size={15} /> Python IDE
                </button>
                <button
                    className={`mode-btn ${activeWorkspaceTab === 'BACKTEST' ? 'active' : ''}`}
                    onClick={() => onWorkspaceTabChange('BACKTEST')}
                >
                    <BarChart3 size={15} /> Backtest
                </button>
                <button
                    className={`mode-btn ${activeWorkspaceTab === 'TELEMETRY' ? 'active' : ''}`}
                    onClick={() => onWorkspaceTabChange('TELEMETRY')}
                >
                    <Activity size={15} /> Telemetry
                </button>
            </div>

            <div className="divider" />

            {/* Timeframe Selectors */}
            {activeWorkspaceTab === 'CHART' && (
                <>
                    <div className="topbar-section timeframes">
                        {timeframes.map(tf => (
                            <button 
                                key={tf}
                                className={`tf-btn ${timeframe === tf ? 'active' : ''}`}
                                onClick={() => onTimeframeChange(tf)}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>

                    <div className="divider" />

                    {/* Chart Styles */}
                    <div className="topbar-section styles">
                        <button 
                            className={`icon-btn ${chartStyle === 'CANDLE' ? 'active' : ''}`}
                            onClick={() => onChartStyleChange('CANDLE')}
                            title="Candles"
                        >
                            <SlidersHorizontal size={18} />
                        </button>
                        <button 
                            className={`icon-btn ${chartStyle === 'LINE' ? 'active' : ''}`}
                            onClick={() => onChartStyleChange('LINE')}
                            title="Line"
                        >
                            <LineChart size={18} />
                        </button>
                    </div>

                    <div className="divider" />

                    {/* Technical Indicator Toggles */}
                    <div className="topbar-section indicators">
                        {Object.keys(indicators).map(key => (
                            <button
                                key={key}
                                className={`ind-btn ${indicators[key as keyof typeof indicators] ? 'active' : ''}`}
                                onClick={() => onIndicatorsChange({ ...indicators, [key]: !indicators[key as keyof typeof indicators] })}
                            >
                                {key.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </>
            )}
            
            <div className="spacer" />

            {/* Screener & Alerts Modal Triggers */}
            <div className="topbar-section actions">
                {onOpenScreenerModal && (
                    <button className="mode-btn" onClick={onOpenScreenerModal} title="Open Stock Screener">
                        <Filter size={15} /> Screener
                    </button>
                )}
                {onOpenAlertsModal && (
                    <button className="mode-btn" onClick={onOpenAlertsModal} title="Price Alerts">
                        <Bell size={15} /> Alerts
                    </button>
                )}
            </div>

            <div className="divider" />

            {/* Live Feed Status Indicator */}
            <div className="live-status-pill">
                <span className="live-dot" />
                <span className="live-text">STREAMING 100 Ticks/s</span>
            </div>
        </div>
    );
};
