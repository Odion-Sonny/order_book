import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries } from 'lightweight-charts';
export var TradingViewChart = function (_a) {
    var data = _a.data, _b = _a.ticker, ticker = _b === void 0 ? 'AAPL' : _b, _c = _a.indicators, indicators = _c === void 0 ? { rsi: true, macd: false, bollinger: false, sma: true } : _c, _d = _a.chartStyle, chartStyle = _d === void 0 ? 'CANDLE' : _d;
    var chartContainerRef = useRef(null);
    var chartRef = useRef(null);
    var mainSeriesRef = useRef(null);
    var volumeSeriesRef = useRef(null);
    var _e = useState(null), hoveredBar = _e[0], setHoveredBar = _e[1];
    // Initialize Chart
    useEffect(function () {
        if (!chartContainerRef.current)
            return;
        var handleResize = function () {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        };
        var chart = createChart(chartContainerRef.current, {
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
        var volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#10b981',
            priceFormat: { type: 'volume' },
            priceScaleId: '', // set as an overlay by setting a blank priceScaleId
            scaleMargins: {
                top: 0.8, // highest point of the series will be at 80% from the top
                bottom: 0,
            },
        });
        volumeSeriesRef.current = volumeSeries;
        chart.subscribeCrosshairMove(function (param) {
            var _a, _b, _c, _d;
            if (!param.time || !param.seriesData || !mainSeriesRef.current) {
                setHoveredBar(null);
                return;
            }
            var candlePrice = param.seriesData.get(mainSeriesRef.current);
            if (candlePrice) {
                setHoveredBar({
                    time: String(param.time),
                    open: (_a = candlePrice.open) !== null && _a !== void 0 ? _a : candlePrice.value,
                    high: (_b = candlePrice.high) !== null && _b !== void 0 ? _b : candlePrice.value,
                    low: (_c = candlePrice.low) !== null && _c !== void 0 ? _c : candlePrice.value,
                    close: (_d = candlePrice.close) !== null && _d !== void 0 ? _d : candlePrice.value,
                    vol: 0,
                });
            }
        });
        window.addEventListener('resize', handleResize);
        return function () {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);
    // Update Data & Styles
    useEffect(function () {
        if (!chartRef.current || data.length === 0)
            return;
        var formattedData = data.map(function (d) { return ({
            time: (new Date(d.time).getTime() / 1000),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            value: d.close // for Line/Area series
        }); });
        var uniqueData = Array.from(new Map(formattedData.map(function (item) { return [item.time, item]; })).values());
        uniqueData.sort(function (a, b) { return a.time - b.time; });
        if (mainSeriesRef.current) {
            chartRef.current.removeSeries(mainSeriesRef.current);
        }
        var newMainSeries;
        if (chartStyle === 'LINE') {
            newMainSeries = chartRef.current.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
        }
        else if (chartStyle === 'AREA') {
            newMainSeries = chartRef.current.addSeries(AreaSeries, {
                lineColor: '#3b82f6',
                topColor: 'rgba(59, 130, 246, 0.4)',
                bottomColor: 'rgba(59, 130, 246, 0.0)',
                lineWidth: 2,
            });
        }
        else {
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
            var volumeData = data.map(function (d) { return ({
                time: (new Date(d.time).getTime() / 1000),
                value: d.volume || Math.random() * 1000,
                color: d.close >= d.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
            }); });
            var uniqueVolData = Array.from(new Map(volumeData.map(function (item) { return [item.time, item]; })).values());
            uniqueVolData.sort(function (a, b) { return a.time - b.time; });
            volumeSeriesRef.current.setData(uniqueVolData);
        }
    }, [data, indicators, chartStyle]);
    return (<div className="chart-wrapper">
            {/* Chart Header Overlay */}
            <div className="chart-legend">
                <span className="glow-text">{ticker}</span>
                {hoveredBar && (<div className="chart-ohlc">
                        <span>O <span className="val">{hoveredBar.open.toFixed(2)}</span></span>
                        <span>H <span className="val">{hoveredBar.high.toFixed(2)}</span></span>
                        <span>L <span className="val">{hoveredBar.low.toFixed(2)}</span></span>
                        <span>C <span className="val">{hoveredBar.close.toFixed(2)}</span></span>
                    </div>)}
            </div>
            
            {/* Chart Container */}
            <div ref={chartContainerRef} className="chart-container"/>
        </div>);
};
