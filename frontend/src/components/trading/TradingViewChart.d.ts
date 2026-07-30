import React from 'react';
import type { ChartData } from '../../types';
interface TradingViewChartProps {
    data: ChartData[];
    ticker?: string;
    indicators?: {
        rsi: boolean;
        macd: boolean;
        bollinger: boolean;
        sma: boolean;
    };
    chartStyle?: 'CANDLE' | 'LINE' | 'AREA';
}
export declare const TradingViewChart: React.FC<TradingViewChartProps>;
export {};
