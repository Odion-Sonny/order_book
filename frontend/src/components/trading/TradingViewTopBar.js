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
import React from 'react';
import { LineChart, Settings, SlidersHorizontal, Info, Search } from 'lucide-react';
var timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];
export var TradingViewTopBar = function (_a) {
    var ticker = _a.ticker, availableAssets = _a.availableAssets, selectedAsset = _a.selectedAsset, timeframe = _a.timeframe, onTimeframeChange = _a.onTimeframeChange, indicators = _a.indicators, onIndicatorsChange = _a.onIndicatorsChange, chartStyle = _a.chartStyle, onChartStyleChange = _a.onChartStyleChange;
    return (<div className="topbar">
            {/* Asset Info Section */}
            <div className="topbar-section asset-info">
                <div className="asset-icon">
                    <Search size={18} className="icon-muted"/>
                </div>
                <div className="asset-details">
                    <h2 className="glow-text ticker-title">{ticker}</h2>
                    <span className="asset-name">{(selectedAsset === null || selectedAsset === void 0 ? void 0 : selectedAsset.name) || 'Loading...'}</span>
                </div>
            </div>
            
            <div className="divider"/>
            
            {/* Timeframes */}
            <div className="topbar-section timeframes">
                {timeframes.map(function (tf) { return (<button key={tf} className={"tf-btn ".concat(timeframe === tf ? 'active' : '')} onClick={function () { return onTimeframeChange(tf); }}>
                        {tf}
                    </button>); })}
            </div>

            <div className="divider"/>

            {/* Chart Styles */}
            <div className="topbar-section styles">
                <button className={"icon-btn ".concat(chartStyle === 'CANDLE' ? 'active' : '')} onClick={function () { return onChartStyleChange('CANDLE'); }} title="Candles">
                    <SlidersHorizontal size={18}/>
                </button>
                <button className={"icon-btn ".concat(chartStyle === 'LINE' ? 'active' : '')} onClick={function () { return onChartStyleChange('LINE'); }} title="Line">
                    <LineChart size={18}/>
                </button>
                <button className={"icon-btn ".concat(chartStyle === 'AREA' ? 'active' : '')} onClick={function () { return onChartStyleChange('AREA'); }} title="Area">
                    <LineChart size={18} className="area-icon"/>
                </button>
            </div>

            <div className="divider"/>

            {/* Indicators */}
            <div className="topbar-section indicators">
                {Object.keys(indicators).map(function (key) { return (<button key={key} className={"ind-btn ".concat(indicators[key] ? 'active' : '')} onClick={function () {
            var _a;
            return onIndicatorsChange(__assign(__assign({}, indicators), (_a = {}, _a[key] = !indicators[key], _a)));
        }}>
                        {key.toUpperCase()}
                    </button>); })}
            </div>
            
            <div className="spacer"/>

            {/* Actions */}
            <div className="topbar-section actions">
                <button className="icon-btn"><Settings size={18}/></button>
                <button className="icon-btn"><Info size={18}/></button>
            </div>
        </div>);
};
