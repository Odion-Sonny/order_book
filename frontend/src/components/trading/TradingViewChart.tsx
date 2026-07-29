import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { SMA, RSI, MACD, BollingerBands } from 'technicalindicators';

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
}

type Indicator = 'None' | 'SMA' | 'RSI' | 'MACD' | 'BB';

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ data }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    
    // Indicator Series Refs
    const indicatorSeries1Ref = useRef<ISeriesApi<"Line"> | null>(null);
    const indicatorSeries2Ref = useRef<ISeriesApi<"Line"> | null>(null);
    const indicatorSeries3Ref = useRef<ISeriesApi<"Line"> | null>(null);

    const [activeIndicator, setActiveIndicator] = useState<Indicator>('SMA');

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
                background: { color: 'transparent' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
            },
            crosshair: {
                mode: 1, // Magnet mode
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
                secondsVisible: false,
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
        });

        chartRef.current = chart;

        // Create main Candlestick series
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
        candlestickSeriesRef.current = candlestickSeries;

        // Create Volume series overlay
        const volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '', // Set as an overlay
            scaleMargins: {
                top: 0.8, // volume takes bottom 20%
                bottom: 0,
            },
        });
        volumeSeriesRef.current = volumeSeries;

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
        
        // Remove duplicates/sort if needed (lightweight-charts requires strictly ascending time)
        const uniqueData = Array.from(new Map(formattedData.map(item => [item.time, item])).values());
        uniqueData.sort((a, b) => a.time - b.time);

        candlestickSeriesRef.current.setData(uniqueData);

        if (volumeSeriesRef.current) {
            const volumeData = data.map(d => ({
                time: (new Date(d.time).getTime() / 1000) as any,
                value: d.volume || 0,
                color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
            }));
            const uniqueVol = Array.from(new Map(volumeData.map(item => [item.time, item])).values());
            uniqueVol.sort((a, b) => a.time - b.time);
            volumeSeriesRef.current.setData(uniqueVol);
        }

        // --- Calculate and Draw Indicators ---
        const closes = uniqueData.map(d => d.close);
        const times = uniqueData.map(d => d.time);

        // Remove old indicator series if they exist
        if (indicatorSeries1Ref.current) { chartRef.current.removeSeries(indicatorSeries1Ref.current); indicatorSeries1Ref.current = null; }
        if (indicatorSeries2Ref.current) { chartRef.current.removeSeries(indicatorSeries2Ref.current); indicatorSeries2Ref.current = null; }
        if (indicatorSeries3Ref.current) { chartRef.current.removeSeries(indicatorSeries3Ref.current); indicatorSeries3Ref.current = null; }

        if (activeIndicator === 'SMA' && closes.length >= 20) {
            const period = 20;
            const sma = SMA.calculate({ period, values: closes });
            const smaData = sma.map((val, idx) => ({
                time: times[idx + period - 1],
                value: val
            }));
            
            indicatorSeries1Ref.current = chartRef.current.addLineSeries({
                color: '#2962FF',
                lineWidth: 2,
                title: 'SMA (20)'
            });
            indicatorSeries1Ref.current.setData(smaData);
        }
        else if (activeIndicator === 'RSI' && closes.length >= 14) {
            const period = 14;
            const rsi = RSI.calculate({ period, values: closes });
            const rsiData = rsi.map((val, idx) => ({
                time: times[idx + period],
                value: val
            }));

            // Create a separate pane for RSI
            indicatorSeries1Ref.current = chartRef.current.addLineSeries({
                color: '#9C27B0',
                lineWidth: 2,
                title: 'RSI (14)',
                priceScaleId: 'rsi',
            });
            chartRef.current.priceScale('rsi').applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 },
            });
            indicatorSeries1Ref.current.setData(rsiData);
        }
        else if (activeIndicator === 'MACD' && closes.length >= 26) {
            const macdInput = {
                values: closes,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                SimpleMAOscillator: false,
                SimpleMASignal: false
            };
            const macdResult = MACD.calculate(macdInput);
            
            const macdLine = macdResult.map((val, idx) => ({ time: times[idx + 25], value: val.MACD || 0 }));
            const signalLine = macdResult.map((val, idx) => ({ time: times[idx + 25], value: val.signal || 0 }));
            // Note: Histogram could be added as well

            indicatorSeries1Ref.current = chartRef.current.addLineSeries({ color: '#2962FF', lineWidth: 2, title: 'MACD', priceScaleId: 'macd' });
            indicatorSeries2Ref.current = chartRef.current.addLineSeries({ color: '#FF6D00', lineWidth: 2, title: 'Signal', priceScaleId: 'macd' });
            
            chartRef.current.priceScale('macd').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
            
            indicatorSeries1Ref.current.setData(macdLine);
            indicatorSeries2Ref.current.setData(signalLine);
        }
        else if (activeIndicator === 'BB' && closes.length >= 20) {
            const bbInput = { period: 20, values: closes, stdDev: 2 };
            const bbResult = BollingerBands.calculate(bbInput);

            const upper = bbResult.map((val, idx) => ({ time: times[idx + 19], value: val.upper }));
            const middle = bbResult.map((val, idx) => ({ time: times[idx + 19], value: val.middle }));
            const lower = bbResult.map((val, idx) => ({ time: times[idx + 19], value: val.lower }));

            indicatorSeries1Ref.current = chartRef.current.addLineSeries({ color: 'rgba(41, 98, 255, 0.5)', lineWidth: 1 });
            indicatorSeries2Ref.current = chartRef.current.addLineSeries({ color: 'rgba(255, 109, 0, 0.8)', lineWidth: 1, title: 'BB (20, 2)' });
            indicatorSeries3Ref.current = chartRef.current.addLineSeries({ color: 'rgba(41, 98, 255, 0.5)', lineWidth: 1 });

            indicatorSeries1Ref.current.setData(upper);
            indicatorSeries2Ref.current.setData(middle);
            indicatorSeries3Ref.current.setData(lower);
        }

    }, [data, activeIndicator]);

    return (
        <div className="w-full h-full flex flex-col relative group">
            {/* Indicator Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                {(['None', 'SMA', 'RSI', 'MACD', 'BB'] as Indicator[]).map((ind) => (
                    <button
                        key={ind}
                        onClick={() => setActiveIndicator(ind)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md backdrop-blur-md transition-all ${
                            activeIndicator === ind 
                                ? 'bg-blue-500/80 text-white border border-blue-400' 
                                : 'bg-black/50 text-gray-400 border border-white/10 hover:bg-black/80 hover:text-white'
                        }`}
                    >
                        {ind}
                    </button>
                ))}
            </div>
            {/* Chart Container */}
            <div ref={chartContainerRef} className="flex-1 w-full" />
        </div>
    );
};
