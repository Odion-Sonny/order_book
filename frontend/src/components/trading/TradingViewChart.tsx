import React, { useEffect, useRef, useState } from 'react';
import { 
    createChart, 
    ColorType, 
    CandlestickSeries, 
    HistogramSeries, 
    LineSeries, 
    AreaSeries,
    type IChartApi, 
    type ISeriesApi 
} from 'lightweight-charts';
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

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
    data, 
    ticker = 'AAPL',
    indicators = { rsi: true, macd: false, bollinger: false, sma: true },
    chartStyle = 'CANDLE'
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const [hoveredBar, setHoveredBar] = useState<{
        time: string;
        open: number;
        high: number;
        low: number;
        close: number;
        vol: number;
    } | null>(null);

    // Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ 
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight 
                });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0a0e17' },
                textColor: '#9ca3af',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            crosshair: {
                mode: 0,
                vertLine: { width: 1, color: '#4b5563', style: 3 },
                horzLine: { width: 1, color: '#4b5563', style: 3 },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        chartRef.current = chart;

        // Create Volume series overlay
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#10b981',
            priceFormat: { type: 'volume' },
            priceScaleId: '', // set as an overlay by setting a blank priceScaleId
            scaleMargins: {
                top: 0.8, // highest point of the series will be at 80% from the top
                bottom: 0,
            },
        });
        volumeSeriesRef.current = volumeSeries;

        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.seriesData || !mainSeriesRef.current) {
                setHoveredBar(null);
                return;
            }
            const candlePrice = param.seriesData.get(mainSeriesRef.current) as any;
            if (candlePrice) {
                setHoveredBar({
                    time: String(param.time),
                    open: candlePrice.open ?? candlePrice.value,
                    high: candlePrice.high ?? candlePrice.value,
                    low: candlePrice.low ?? candlePrice.value,
                    close: candlePrice.close ?? candlePrice.value,
                    vol: 0,
                });
            }
        });

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Update Data & Styles
    useEffect(() => {
        if (!chartRef.current || data.length === 0) return;

        const formattedData = data.map(d => ({
            time: (new Date(d.time).getTime() / 1000) as any,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            value: d.close // for Line/Area series
        }));
        
        const uniqueData = Array.from(new Map(formattedData.map(item => [item.time, item])).values());
        uniqueData.sort((a, b) => a.time - b.time);

        if (mainSeriesRef.current) {
            chartRef.current.removeSeries(mainSeriesRef.current);
        }

        let newMainSeries: ISeriesApi<any>;
        if (chartStyle === 'LINE') {
            newMainSeries = chartRef.current.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
        } else if (chartStyle === 'AREA') {
            newMainSeries = chartRef.current.addSeries(AreaSeries, {
                lineColor: '#3b82f6',
                topColor: 'rgba(59, 130, 246, 0.4)',
                bottomColor: 'rgba(59, 130, 246, 0.0)',
                lineWidth: 2,
            });
        } else {
            newMainSeries = chartRef.current.addSeries(CandlestickSeries, {
                upColor: '#10b981',
                downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
            });
        }
        
        newMainSeries.setData(uniqueData);
        mainSeriesRef.current = newMainSeries;

        if (volumeSeriesRef.current) {
            const volumeData = data.map(d => ({
                time: (new Date(d.time).getTime() / 1000) as any,
                value: d.volume || Math.random() * 1000,
                color: d.close >= d.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
            }));
            const uniqueVolData = Array.from(new Map(volumeData.map(item => [item.time, item])).values());
            uniqueVolData.sort((a, b) => a.time - b.time);
            volumeSeriesRef.current.setData(uniqueVolData);
        }

    }, [data, indicators, chartStyle]);

    return (
        <div className="chart-wrapper">
            {/* Chart Header Overlay */}
            <div className="chart-legend">
                <span className="glow-text">{ticker}</span>
                {hoveredBar && (
                    <div className="chart-ohlc">
                        <span>O <span className="val">{hoveredBar.open.toFixed(2)}</span></span>
                        <span>H <span className="val">{hoveredBar.high.toFixed(2)}</span></span>
                        <span>L <span className="val">{hoveredBar.low.toFixed(2)}</span></span>
                        <span>C <span className="val">{hoveredBar.close.toFixed(2)}</span></span>
                    </div>
                )}
            </div>
            
            {/* Chart Container */}
            <div ref={chartContainerRef} className="chart-container" />
        </div>
    );
};
