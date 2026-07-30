var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { TradingViewTopBar } from '../components/trading/TradingViewTopBar';
import { TradingViewChart } from '../components/trading/TradingViewChart';
import { TradingViewRightSidebar } from '../components/trading/TradingViewRightSidebar';
export var TradeView = function () {
    // Global State
    var _a = useState([]), assets = _a[0], setAssets = _a[1];
    var _b = useState('AAPL'), selectedTicker = _b[0], setSelectedTicker = _b[1];
    var _c = useState(null), portfolio = _c[0], setPortfolio = _c[1];
    var _d = useState([]), positions = _d[0], setPositions = _d[1];
    // Trading Engine State
    var _e = useState(null), orderBook = _e[0], setOrderBook = _e[1];
    var _f = useState([]), trades = _f[0], setTrades = _f[1];
    var _g = useState([]), chartData = _g[0], setChartData = _g[1];
    // UI Configuration State
    var _h = useState('1h'), timeframe = _h[0], setTimeframe = _h[1];
    var _j = useState('CANDLE'), chartStyle = _j[0], setChartStyle = _j[1];
    var _k = useState({ rsi: false, macd: false, bollinger: false, sma: true }), indicators = _k[0], setIndicators = _k[1];
    var wsRef = useRef(null);
    // Initial Data Fetch
    useEffect(function () {
        var fetchInitialData = function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, assetsData, portData, posData, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Promise.all([
                                apiService.getAssets(),
                                apiService.getPortfolio(),
                                apiService.getPositions(),
                            ])];
                    case 1:
                        _a = _b.sent(), assetsData = _a[0], portData = _a[1], posData = _a[2];
                        setAssets(assetsData);
                        setPortfolio(portData);
                        setPositions(posData);
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _b.sent();
                        console.error("Failed to fetch initial data", err_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        fetchInitialData();
    }, []);
    // WebSocket & Polling for Selected Asset
    useEffect(function () {
        if (!selectedTicker)
            return;
        // 1. Fetch historical/local trades & orderbook
        var fetchAssetData = function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, tradesData, obData, err_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Promise.all([
                                apiService.getTrades(selectedTicker),
                                apiService.getOrderBook(selectedTicker)
                            ])];
                    case 1:
                        _a = _b.sent(), tradesData = _a[0], obData = _a[1];
                        setTrades(tradesData);
                        setOrderBook(obData);
                        return [3 /*break*/, 3];
                    case 2:
                        err_2 = _b.sent();
                        console.error("Error fetching asset data:", err_2);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        fetchAssetData();
        var pollInterval = setInterval(fetchAssetData, 3000);
        // 2. Connect WebSocket for Real-time Streaming
        var wsUrl = "ws://localhost:8000/ws/stream/";
        var ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = function () {
            console.log("Connected to Live Market Stream");
            ws.send(JSON.stringify({ action: 'subscribe', symbols: [selectedTicker] }));
        };
        ws.onmessage = function (event) {
            try {
                var message_1 = JSON.parse(event.data);
                if (message_1.type === 'market_update' && message_1.data) {
                    // Update Watchlist Live Prices
                    setAssets(function (prev) { return prev.map(function (a) {
                        var _a;
                        var quote = (_a = message_1.data.find(function (d) { return d.ticker === a.ticker; })) === null || _a === void 0 ? void 0 : _a.quote;
                        if (quote && quote.ask_price > 0) {
                            return __assign(__assign({}, a), { current_price: ((quote.bid_price + quote.ask_price) / 2).toFixed(2) });
                        }
                        return a;
                    }); });
                }
            }
            catch (e) {
                console.error("WS Parse error", e);
            }
        };
        return function () {
            var _a;
            clearInterval(pollInterval);
            if (((_a = wsRef.current) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ action: 'unsubscribe', symbols: [selectedTicker] }));
                wsRef.current.close();
            }
        };
    }, [selectedTicker]);
    // Build Chart Data from Trades or Simulate
    useEffect(function () {
        if (!selectedTicker)
            return;
        var selectedAsset = assets.find(function (a) { return a.ticker === selectedTicker; });
        if (trades.length > 10) {
            // Group trades into candles based on timeframe
            var candleMap_1 = new Map();
            trades.forEach(function (t) {
                var d = new Date(t.timestamp);
                // Simplified grouping
                if (timeframe === '1m')
                    d.setSeconds(0, 0);
                else if (timeframe === '5m') {
                    d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0);
                }
                else if (timeframe === '15m') {
                    d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0);
                }
                else if (timeframe === '1h') {
                    d.setMinutes(0, 0, 0);
                }
                else if (timeframe === '4h') {
                    d.setHours(Math.floor(d.getHours() / 4) * 4, 0, 0, 0);
                }
                else if (timeframe === '1D') {
                    d.setHours(0, 0, 0, 0);
                }
                var timeKey = d.getTime().toString();
                var price = parseFloat(t.price);
                if (candleMap_1.has(timeKey)) {
                    var c = candleMap_1.get(timeKey);
                    c.high = Math.max(c.high, price);
                    c.low = Math.min(c.low, price);
                    c.close = price;
                    c.volume = (c.volume || 0) + parseFloat(t.quantity);
                }
                else {
                    candleMap_1.set(timeKey, {
                        time: d.getTime(),
                        open: price,
                        high: price,
                        low: price,
                        close: price,
                        volume: parseFloat(t.quantity)
                    });
                }
            });
            var grouped = Array.from(candleMap_1.values()).sort(function (a, b) { return a.time - b.time; });
            setChartData(grouped.map(function (c) { return (__assign(__assign({}, c), { time: new Date(c.time).toISOString() })); }));
        }
        else {
            // Simulate Data for empty states
            var basePrice = parseFloat((selectedAsset === null || selectedAsset === void 0 ? void 0 : selectedAsset.current_price) || '185.50') || 185.50;
            var simulatedCandles = [];
            var currentClose = basePrice - 12.0;
            var now = new Date();
            now.setHours(0, 0, 0, 0);
            for (var i = 60; i > 0; i--) {
                var date = new Date(now);
                if (timeframe.includes('m') || timeframe.includes('h')) {
                    date.setHours(now.getHours() - i * (timeframe === '1h' ? 1 : 0));
                    date.setMinutes(now.getMinutes() - i * (timeframe === '15m' ? 15 : timeframe === '5m' ? 5 : 1));
                }
                else {
                    date.setDate(now.getDate() - i);
                }
                var open_1 = currentClose + (Math.random() * 2 - 1);
                var close_1 = open_1 + (Math.random() * 4 - 2);
                var high = Math.max(open_1, close_1) + Math.random() * 2;
                var low = Math.min(open_1, close_1) - Math.random() * 2;
                simulatedCandles.push({
                    time: date.toISOString(),
                    open: open_1,
                    high: high,
                    low: low,
                    close: close_1,
                    volume: Math.floor(Math.random() * 10000)
                });
                currentClose = close_1;
            }
            setChartData(simulatedCandles);
        }
    }, [trades, selectedTicker, timeframe, assets]);
    var handlePlaceOrder = function (side, type, price, size) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, portData, posData, tradesData, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, apiService.createOrder({
                            asset_ticker: selectedTicker,
                            side: side,
                            order_type: type,
                            price: type === 'LIMIT' ? price : undefined,
                            size: size
                        })];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, Promise.all([
                            apiService.getPortfolio(),
                            apiService.getPositions(),
                            apiService.getTrades(selectedTicker)
                        ])];
                case 2:
                    _a = _b.sent(), portData = _a[0], posData = _a[1], tradesData = _a[2];
                    setPortfolio(portData);
                    setPositions(posData);
                    setTrades(tradesData);
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    console.error("Order failed", e_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="layout">
            <TradingViewTopBar ticker={selectedTicker} onTickerChange={setSelectedTicker} availableAssets={assets} selectedAsset={assets.find(function (a) { return a.ticker === selectedTicker; }) || null} timeframe={timeframe} onTimeframeChange={setTimeframe} indicators={indicators} onIndicatorsChange={setIndicators} chartStyle={chartStyle} onChartStyleChange={setChartStyle}/>
            
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <TradingViewChart data={chartData} ticker={selectedTicker} indicators={indicators} chartStyle={chartStyle}/>
                
                <TradingViewRightSidebar assets={assets} selectedTicker={selectedTicker} onSelectTicker={setSelectedTicker} orderBook={orderBook} trades={trades} portfolio={portfolio} positions={positions} onPlaceOrder={handlePlaceOrder}/>
            </div>
        </div>);
};
