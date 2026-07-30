import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
    createChart, 
    ColorType, 
    type IChartApi, 
    type ISeriesApi 
} from 'lightweight-charts';
import type { ChartData } from '../../types';

interface DrawingShape {
    id: string;
    type: string;
    x1: number;
    y1: number;
    x2?: number;
    y2?: number;
    text?: string;
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
    chartStyle?: 'CANDLE' | 'LINE' | 'AREA';
    activeTool?: string;
    onResetTool?: () => void;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
    data, 
    ticker = 'AAPL',
    indicators = { rsi: false, macd: false, bollinger: false, sma: true },
    chartStyle = 'CANDLE',
    activeTool = 'pointer',
    onResetTool
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    
    // Series Refs
    const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bollingerUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bollingerLowerRef = useRef<ISeriesApi<"Line"> | null>(null);
    const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

    const [shapes, setShapes] = useState<DrawingShape[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);

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
                const width = chartContainerRef.current.clientWidth;
                const height = chartContainerRef.current.clientHeight;
                chartRef.current.applyOptions({ width, height });
                if (canvasOverlayRef.current) {
                    canvasOverlayRef.current.width = width;
                    canvasOverlayRef.current.height = height;
                }
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
                vertLine: { width: 1, color: '#00f2fe', style: 3 },
                horzLine: { width: 1, color: '#00f2fe', style: 3 },
            },
            rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)' },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
                secondsVisible: true,
            },
        });

        chartRef.current = chart;

        // Volume Overlay
        const volumeSeries = chart.addHistogramSeries({
            color: '#10b981',
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
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
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Update Main Data, Styles & Technical Indicators
    useEffect(() => {
        if (!chartRef.current || data.length === 0) return;

        const formattedData = data.map(d => ({
            time: (new Date(d.time).getTime() / 1000) as any,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            value: d.close
        }));
        
        const uniqueData = Array.from(new Map(formattedData.map(item => [item.time, item])).values());
        uniqueData.sort((a, b) => a.time - b.time);

        // Remove old main series & indicator series
        if (mainSeriesRef.current) chartRef.current.removeSeries(mainSeriesRef.current);
        if (smaSeriesRef.current) chartRef.current.removeSeries(smaSeriesRef.current);
        if (emaSeriesRef.current) chartRef.current.removeSeries(emaSeriesRef.current);
        if (bollingerUpperRef.current) chartRef.current.removeSeries(bollingerUpperRef.current);
        if (bollingerLowerRef.current) chartRef.current.removeSeries(bollingerLowerRef.current);
        if (rsiSeriesRef.current) chartRef.current.removeSeries(rsiSeriesRef.current);

        let newMainSeries: ISeriesApi<any>;
        if (chartStyle === 'LINE') {
            newMainSeries = chartRef.current.addLineSeries({ color: '#3b82f6', lineWidth: 2 });
        } else if (chartStyle === 'AREA') {
            newMainSeries = chartRef.current.addAreaSeries({
                lineColor: '#00f2fe',
                topColor: 'rgba(0, 242, 254, 0.4)',
                bottomColor: 'rgba(0, 242, 254, 0.0)',
                lineWidth: 2,
            });
        } else {
            newMainSeries = chartRef.current.addCandlestickSeries({
                upColor: '#10b981',
                downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
            });
        }
        
        newMainSeries.setData(uniqueData);
        mainSeriesRef.current = newMainSeries;

        // Volume Data
        if (volumeSeriesRef.current) {
            const volumeData = data.map(d => ({
                time: (new Date(d.time).getTime() / 1000) as any,
                value: d.volume || Math.random() * 5000 + 1000,
                color: d.close >= d.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
            }));
            const uniqueVolData = Array.from(new Map(volumeData.map(item => [item.time, item])).values());
            uniqueVolData.sort((a, b) => a.time - b.time);
            volumeSeriesRef.current.setData(uniqueVolData);
        }

        // Indicator 1: SMA (Simple Moving Average 20)
        if (indicators.sma && uniqueData.length >= 20) {
            const smaLine = chartRef.current.addLineSeries({ color: '#00f2fe', lineWidth: 2, title: 'SMA 20' });
            const smaData = [];
            for (let i = 19; i < uniqueData.length; i++) {
                const slice = uniqueData.slice(i - 19, i + 1);
                const avg = slice.reduce((sum, item) => sum + item.close, 0) / 20;
                smaData.push({ time: uniqueData[i].time, value: avg });
            }
            smaLine.setData(smaData);
            smaSeriesRef.current = smaLine;
        }

        // Indicator 2: EMA / MACD
        if (indicators.macd && uniqueData.length >= 26) {
            const emaLine = chartRef.current.addLineSeries({ color: '#f59e0b', lineWidth: 2, title: 'EMA 50' });
            const emaData = [];
            for (let i = 25; i < uniqueData.length; i++) {
                const slice = uniqueData.slice(i - 25, i + 1);
                const avg = slice.reduce((sum, item) => sum + item.close, 0) / 26;
                emaData.push({ time: uniqueData[i].time, value: avg });
            }
            emaLine.setData(emaData);
            emaSeriesRef.current = emaLine;
        }

        // Indicator 3: Bollinger Bands
        if (indicators.bollinger && uniqueData.length >= 20) {
            const upperLine = chartRef.current.addLineSeries({ color: '#a78bfa', lineWidth: 1, title: 'Bollinger Upper' });
            const lowerLine = chartRef.current.addLineSeries({ color: '#a78bfa', lineWidth: 1, title: 'Bollinger Lower' });
            
            const upperData = [];
            const lowerData = [];
            for (let i = 19; i < uniqueData.length; i++) {
                const slice = uniqueData.slice(i - 19, i + 1);
                const avg = slice.reduce((sum, item) => sum + item.close, 0) / 20;
                const stdDev = Math.sqrt(slice.reduce((sum, item) => sum + Math.pow(item.close - avg, 2), 0) / 20);
                upperData.push({ time: uniqueData[i].time, value: avg + stdDev * 2 });
                lowerData.push({ time: uniqueData[i].time, value: avg - stdDev * 2 });
            }
            upperLine.setData(upperData);
            lowerLine.setData(lowerData);
            bollingerUpperRef.current = upperLine;
            bollingerLowerRef.current = lowerLine;
        }

        // Indicator 4: RSI (Relative Strength Index)
        if (indicators.rsi && uniqueData.length >= 14) {
            const rsiLine = chartRef.current.addLineSeries({ color: '#ec4899', lineWidth: 2, title: 'RSI 14' });
            const rsiData = [];
            for (let i = 14; i < uniqueData.length; i++) {
                let gains = 0, losses = 0;
                for (let j = i - 13; j <= i; j++) {
                    const diff = uniqueData[j].close - uniqueData[j - 1].close;
                    if (diff >= 0) gains += diff;
                    else losses += Math.abs(diff);
                }
                const avgGain = gains / 14;
                const avgLoss = losses / 14 || 0.0001;
                const rs = avgGain / avgLoss;
                const rsi = 100 - (100 / (1 + rs));
                
                // Map RSI (0-100) to price scale range visually
                const minPrice = Math.min(...uniqueData.map(d => d.low));
                const maxPrice = Math.max(...uniqueData.map(d => d.high));
                const range = maxPrice - minPrice || 1;
                const mappedValue = minPrice + (rsi / 100) * (range * 0.3);
                
                rsiData.push({ time: uniqueData[i].time, value: mappedValue });
            }
            rsiLine.setData(rsiData);
            rsiSeriesRef.current = rsiLine;
        }

    }, [data, indicators, chartStyle]);

    // Canvas Overlay Drawing Tools Renderer
    const redrawCanvas = useCallback(() => {
        const canvas = canvasOverlayRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw existing shapes
        shapes.forEach(shape => {
            ctx.beginPath();
            ctx.strokeStyle = '#00f2fe';
            ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
            ctx.lineWidth = 2;

            if (shape.type === 'trendline' || shape.type === 'measure') {
                ctx.moveTo(shape.x1, shape.y1);
                ctx.lineTo(shape.x2 || shape.x1, shape.y2 || shape.y1);
                ctx.stroke();

                if (shape.type === 'measure' && shape.x2 && shape.y2) {
                    const dx = Math.abs(shape.x2 - shape.x1);
                    const dy = Math.abs(shape.y2 - shape.y1);
                    ctx.fillStyle = '#00f2fe';
                    ctx.font = '11px JetBrains Mono, monospace';
                    ctx.fillText(`ΔBar: ${Math.floor(dx / 8)} | ΔPrice: $${(dy / 5).toFixed(2)}`, shape.x2 + 8, shape.y2);
                }
            } else if (shape.type === 'hline') {
                ctx.moveTo(0, shape.y1);
                ctx.lineTo(canvas.width, shape.y1);
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (shape.type === 'vline') {
                ctx.moveTo(shape.x1, 0);
                ctx.lineTo(shape.x1, canvas.height);
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (shape.type === 'rectangle' && shape.x2 && shape.y2) {
                const w = shape.x2 - shape.x1;
                const h = shape.y2 - shape.y1;
                ctx.fillRect(shape.x1, shape.y1, w, h);
                ctx.strokeRect(shape.x1, shape.y1, w, h);
            } else if (shape.type === 'fib' && shape.y2) {
                const levels = [0, 0.236, 0.382, 0.5, 0.618, 1.0];
                const dy = shape.y2 - shape.y1;
                levels.forEach(lvl => {
                    const y = shape.y1 + dy * lvl;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                    ctx.strokeStyle = `hsl(${lvl * 240}, 80%, 60%)`;
                    ctx.stroke();
                    ctx.fillStyle = '#aaa';
                    ctx.font = '10px monospace';
                    ctx.fillText(`Fib ${(lvl * 100).toFixed(1)}%`, 10, y - 4);
                });
            } else if (shape.type === 'label' || shape.type === 'text') {
                ctx.fillStyle = '#00f2fe';
                ctx.font = '12px Inter, sans-serif';
                ctx.fillText(shape.text || '📌 Annotation', shape.x1, shape.y1);
            }
        });

        // Draw active in-progress shape
        if (isDrawing && startPoint && currentPoint && activeTool !== 'pointer') {
            ctx.beginPath();
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;

            if (activeTool === 'trendline' || activeTool === 'measure') {
                ctx.moveTo(startPoint.x, startPoint.y);
                ctx.lineTo(currentPoint.x, currentPoint.y);
                ctx.stroke();
            } else if (activeTool === 'rectangle') {
                ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
                const w = currentPoint.x - startPoint.x;
                const h = currentPoint.y - startPoint.y;
                ctx.fillRect(startPoint.x, startPoint.y, w, h);
                ctx.strokeRect(startPoint.x, startPoint.y, w, h);
            }
        }
    }, [shapes, isDrawing, startPoint, currentPoint, activeTool]);

    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    // Canvas Mouse Handlers for Drawing Tools
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (activeTool === 'pointer') return;
        const rect = canvasOverlayRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (activeTool === 'hline' || activeTool === 'vline' || activeTool === 'label' || activeTool === 'text') {
            const newShape: DrawingShape = {
                id: String(Date.now()),
                type: activeTool,
                x1: x,
                y1: y,
                text: activeTool === 'label' ? `${ticker} Level` : 'Text Note'
            };
            setShapes(prev => [...prev, newShape]);
            if (onResetTool) onResetTool();
            return;
        }

        setIsDrawing(true);
        setStartPoint({ x, y });
        setCurrentPoint({ x, y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || activeTool === 'pointer') return;
        const rect = canvasOverlayRef.current?.getBoundingClientRect();
        if (!rect) return;
        setCurrentPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseUp = () => {
        if (!isDrawing || !startPoint || !currentPoint || activeTool === 'pointer') return;

        const newShape: DrawingShape = {
            id: String(Date.now()),
            type: activeTool,
            x1: startPoint.x,
            y1: startPoint.y,
            x2: currentPoint.x,
            y2: currentPoint.y
        };

        setShapes(prev => [...prev, newShape]);
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
        if (onResetTool) onResetTool();
    };

    return (
        <div className="chart-wrapper">
            {/* Chart Header Legend Overlay */}
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
                {shapes.length > 0 && (
                    <button className="clear-drawings-pill" onClick={() => setShapes([])}>
                        Clear Drawings ({shapes.length})
                    </button>
                )}
            </div>
            
            {/* Chart Container */}
            <div ref={chartContainerRef} className="chart-container" />

            {/* Interactive Drawing Layer Canvas */}
            <canvas
                ref={canvasOverlayRef}
                className={`chart-drawing-canvas ${activeTool !== 'pointer' ? 'active-tool' : ''}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            />
        </div>
    );
};
