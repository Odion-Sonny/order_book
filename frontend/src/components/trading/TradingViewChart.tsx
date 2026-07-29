import React, { useEffect, useRef, useState } from 'react';
import { 
    createChart, 
    CandlestickSeries, 
    HistogramSeries, 
    LineSeries, 
    type IChartApi, 
    type ISeriesApi 
} from 'lightweight-charts';
import { SMA, RSI, MACD, BollingerBands } from 'technicalindicators';
import { cn } from '@/lib/utils';

interface ChartData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

interface TradingViewChartProps {
    data: ChartData[];
    ticker?: string;
    indicators?: {
        rsi: boolean;
        macd: boolean;
        bollinger: boolean;
        sma: boolean;
    };
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
    data, 
    ticker = 'AAPL',
    indicators = { rsi: true, macd: false, bollinger: false, sma: true }
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    
    // Indicator Series Refs
    const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const macdLineRef = useRef<ISeriesApi<"Line"> | null>(null);
    const macdSignalRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbMiddleRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);

    // Crosshair / Hovered Bar readout state
    const [hoveredBar, setHoveredBar] = useState<ChartData | null>(null);

    const latestBar = data.length > 0 ? data[data.length - 1] : null;
    const activeBar = hoveredBar || latestBar;
    
    const barChange = activeBar ? activeBar.close - activeBar.open : 0;
    const barChangePercent = activeBar && activeBar.open > 0 ? (barChange / activeBar.open) * 100 : 0;

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#1e222d' },
                horzLines: { color: '#1e222d' },
            },
            crosshair: {
                mode: 1, // Magnet mode
                vertLine: {
                    color: '#787b86',
                    width: 1,
                    style: 3, // Dashed
                },
                horzLine: {
                    color: '#787b86',
                    width: 1,
                    style: 3,
                }
            },
            timeScale: {
                borderColor: '#2a2e39',
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: '#2a2e39',
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
        });

        chartRef.current = chart;

        // Create main Candlestick series with TradingView standard greens/reds
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#089981',
            downColor: '#f23645',
            borderVisible: false,
            wickUpColor: '#089981',
            wickDownColor: '#f23645',
        });
        candlestickSeriesRef.current = candlestickSeries;

        // Create Volume series overlay
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#089981',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume', 
        });
        chart.priceScale('volume').applyOptions({
            scaleMargins: {
                top: 0.82,
                bottom: 0,
            },
        });
        volumeSeriesRef.current = volumeSeries;

        // Crosshair hover listener for OHLC readout
        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.seriesData) {
                setHoveredBar(null);
                return;
            }
            const candlePrice = param.seriesData.get(candlestickSeries) as any;
            if (candlePrice) {
                setHoveredBar({
                    time: String(param.time),
                    open: candlePrice.open,
                    high: candlePrice.high,
                    low: candlePrice.low,
                    close: candlePrice.close,
                });
            }
        });

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (!chartRef.current || !candlestickSeriesRef.current || data.length === 0) return;

        const formattedData = data.map(d => ({
            time: (new Date(d.time).getTime() / 1000) as any,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }));
        
        const uniqueData = Array.from(new Map(formattedData.map(item => [item.time, item])).values());
        uniqueData.sort((a, b) => a.time - b.time);

        candlestickSeriesRef.current.setData(uniqueData);

        if (volumeSeriesRef.current) {
            const volumeData = data.map(d => ({
                time: (new Date(d.time).getTime() / 1000) as any,
                value: d.volume || 0,
                color: d.close >= d.open ? 'rgba(8, 153, 129, 0.4)' : 'rgba(242, 54, 69, 0.4)',
            }));
            const uniqueVol = Array.from(new Map(volumeData.map(item => [item.time, item])).values());
            uniqueVol.sort((a, b) => a.time - b.time);
            volumeSeriesRef.current.setData(uniqueVol);
        }

        // --- Indicators Calculation ---
        const closes = uniqueData.map(d => d.close);
        const times = uniqueData.map(d => d.time);

        // Remove previous indicator series
        if (smaSeriesRef.current && chartRef.current) { chartRef.current.removeSeries(smaSeriesRef.current); smaSeriesRef.current = null; }
        if (rsiSeriesRef.current && chartRef.current) { chartRef.current.removeSeries(rsiSeriesRef.current); rsiSeriesRef.current = null; }
        if (macdLineRef.current && chartRef.current) { chartRef.current.removeSeries(macdLineRef.current); macdLineRef.current = null; }
        if (macdSignalRef.current && chartRef.current) { chartRef.current.removeSeries(macdSignalRef.current); macdSignalRef.current = null; }
        if (bbUpperRef.current && chartRef.current) { chartRef.current.removeSeries(bbUpperRef.current); bbUpperRef.current = null; }
        if (bbMiddleRef.current && chartRef.current) { chartRef.current.removeSeries(bbMiddleRef.current); bbMiddleRef.current = null; }
        if (bbLowerRef.current && chartRef.current) { chartRef.current.removeSeries(bbLowerRef.current); bbLowerRef.current = null; }

        // SMA
        if (indicators.sma && closes.length >= 20 && chartRef.current) {
            const period = 20;
            const sma = SMA.calculate({ period, values: closes });
            const smaData = sma.map((val, idx) => ({ time: times[idx + period - 1], value: val }));
            const smaSeries = chartRef.current.addSeries(LineSeries, { color: '#2962FF', lineWidth: 2, title: 'SMA 20' });
            smaSeries.setData(smaData);
            smaSeriesRef.current = smaSeries;
        }

        // RSI
        if (indicators.rsi && closes.length >= 14 && chartRef.current) {
            const period = 14;
            const rsi = RSI.calculate({ period, values: closes });
            const rsiData = rsi.map((val, idx) => ({ time: times[idx + period], value: val }));
            const rsiSeries = chartRef.current.addSeries(LineSeries, { color: '#e040fb', lineWidth: 2, title: 'RSI 14', priceScaleId: 'rsi' });
            chartRef.current.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
            rsiSeries.setData(rsiData);
            rsiSeriesRef.current = rsiSeries;
        }

        // MACD
        if (indicators.macd && closes.length >= 26 && chartRef.current) {
            const macdResult = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
            const macdLine = macdResult.map((val, idx) => ({ time: times[idx + 25], value: val.MACD || 0 }));
            const signalLine = macdResult.map((val, idx) => ({ time: times[idx + 25], value: val.signal || 0 }));

            const mLine = chartRef.current.addSeries(LineSeries, { color: '#2962FF', lineWidth: 2, priceScaleId: 'macd' });
            const sLine = chartRef.current.addSeries(LineSeries, { color: '#ff6d00', lineWidth: 2, priceScaleId: 'macd' });
            chartRef.current.priceScale('macd').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
            mLine.setData(macdLine);
            sLine.setData(signalLine);
            macdLineRef.current = mLine;
            macdSignalRef.current = sLine;
        }

        // Bollinger Bands
        if (indicators.bollinger && closes.length >= 20 && chartRef.current) {
            const bbResult = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 });
            const upper = bbResult.map((val, idx) => ({ time: times[idx + 19], value: val.upper }));
            const middle = bbResult.map((val, idx) => ({ time: times[idx + 19], value: val.middle }));
            const lower = bbResult.map((val, idx) => ({ time: times[idx + 19], value: val.lower }));

            const bUpper = chartRef.current.addSeries(LineSeries, { color: 'rgba(41, 98, 255, 0.6)', lineWidth: 1 });
            const bMiddle = chartRef.current.addSeries(LineSeries, { color: 'rgba(255, 109, 0, 0.8)', lineWidth: 1 });
            const bLower = chartRef.current.addSeries(LineSeries, { color: 'rgba(41, 98, 255, 0.6)', lineWidth: 1 });

            bUpper.setData(upper);
            bMiddle.setData(middle);
            bLower.setData(lower);
            bbUpperRef.current = bUpper;
            bbMiddleRef.current = bMiddle;
            bbLowerRef.current = bLower;
        }

    }, [data, indicators]);

    return (
        <div className="w-full h-full flex flex-col relative select-none bg-[#131722]">
            {/* TradingView Top-Left Legend Overlay */}
            <div className="absolute top-3 left-4 z-10 font-mono text-xs flex flex-col space-y-1 pointer-events-none">
                {/* Symbol & Bar Readout */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-white font-sans text-sm">{ticker}</span>
                    <span className="text-[10px] text-[#787b86] font-sans">1D · NASDAQ</span>
                    
                    {activeBar && (
                        <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-[#787b86]">O<strong className="text-white ml-0.5">${activeBar.open.toFixed(2)}</strong></span>
                            <span className="text-[#787b86]">H<strong className="text-white ml-0.5">${activeBar.high.toFixed(2)}</strong></span>
                            <span className="text-[#787b86]">L<strong className="text-white ml-0.5">${activeBar.low.toFixed(2)}</strong></span>
                            <span className="text-[#787b86]">C<strong className="text-white ml-0.5">${activeBar.close.toFixed(2)}</strong></span>
                            
                            <span className={cn("font-bold ml-1", barChange >= 0 ? "text-[#089981]" : "text-[#f23645]")}>
                                {barChange >= 0 ? '+' : ''}{barChange.toFixed(2)} ({barChangePercent.toFixed(2)}%)
                            </span>
                        </div>
                    )}
                </div>

                {/* Active Indicators Legend Labels */}
                <div className="flex items-center gap-3 text-[10px] font-sans text-[#787b86]">
                    {indicators.sma && (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#2962FF]" />
                            <strong className="text-[#2962FF]">SMA 20</strong> close
                        </span>
                    )}
                    {indicators.rsi && (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#e040fb]" />
                            <strong className="text-[#e040fb]">RSI 14</strong> close
                        </span>
                    )}
                    {indicators.macd && (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#ff6d00]" />
                            <strong className="text-[#ff6d00]">MACD 12 26 9</strong>
                        </span>
                    )}
                    {indicators.bollinger && (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#2962FF]" />
                            <strong className="text-white">BB 20 2</strong>
                        </span>
                    )}
                </div>
            </div>

            {/* Main Canvas */}
            <div ref={chartContainerRef} className="flex-1 w-full h-full" />
        </div>
    );
};
