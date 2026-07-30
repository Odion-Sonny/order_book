import React from 'react';
import { LineChart, Settings, SlidersHorizontal, Info, Search } from 'lucide-react';
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
}

const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];

export const TradingViewTopBar: React.FC<TradingViewTopBarProps> = ({
    ticker,
    availableAssets,
    selectedAsset,
    timeframe,
    onTimeframeChange,
    indicators,
    onIndicatorsChange,
    chartStyle,
    onChartStyleChange,
}) => {
    return (
        <div className="topbar">
            {/* Asset Info Section */}
            <div className="topbar-section asset-info">
                <div className="asset-icon">
                    <Search size={18} className="icon-muted" />
                </div>
                <div className="asset-details">
                    <h2 className="glow-text ticker-title">{ticker}</h2>
                    <span className="asset-name">{selectedAsset?.name || 'Loading...'}</span>
                </div>
            </div>
            
            <div className="divider" />
            
            {/* Timeframes */}
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
                <button 
                    className={`icon-btn ${chartStyle === 'AREA' ? 'active' : ''}`}
                    onClick={() => onChartStyleChange('AREA')}
                    title="Area"
                >
                    <LineChart size={18} className="area-icon" />
                </button>
            </div>

            <div className="divider" />

            {/* Indicators */}
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
            
            <div className="spacer" />

            {/* Actions */}
            <div className="topbar-section actions">
                <button className="icon-btn"><Settings size={18} /></button>
                <button className="icon-btn"><Info size={18} /></button>
            </div>
        </div>
    );
};
