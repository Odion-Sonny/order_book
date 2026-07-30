import React from 'react';
import type { Asset } from '../../types';
interface TradingViewTopBarProps {
    ticker: string;
    onTickerChange: (ticker: string) => void;
    availableAssets: Asset[];
    selectedAsset: Asset | null;
    timeframe: string;
    onTimeframeChange: (tf: string) => void;
    indicators: {
        rsi: boolean;
        macd: boolean;
        bollinger: boolean;
        sma: boolean;
    };
    onIndicatorsChange: (indicators: any) => void;
    chartStyle: 'CANDLE' | 'LINE' | 'AREA';
    onChartStyleChange: (style: 'CANDLE' | 'LINE' | 'AREA') => void;
}
export declare const TradingViewTopBar: React.FC<TradingViewTopBarProps>;
export {};
