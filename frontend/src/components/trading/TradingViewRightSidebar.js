import React, { useState } from 'react';
export var TradingViewRightSidebar = function (_a) {
    var assets = _a.assets, selectedTicker = _a.selectedTicker, onSelectTicker = _a.onSelectTicker, orderBook = _a.orderBook, trades = _a.trades, portfolio = _a.portfolio, positions = _a.positions, onPlaceOrder = _a.onPlaceOrder;
    var _b = useState('ORDER'), activeTab = _b[0], setActiveTab = _b[1];
    var _c = useState('LIMIT'), orderType = _c[0], setOrderType = _c[1];
    var _d = useState(''), orderPrice = _d[0], setOrderPrice = _d[1];
    var _e = useState('1'), orderSize = _e[0], setOrderSize = _e[1];
    var selectedAsset = assets.find(function (a) { return a.ticker === selectedTicker; });
    var position = positions.find(function (p) { return p.asset.ticker === selectedTicker; });
    var currentPrice = parseFloat(selectedAsset === null || selectedAsset === void 0 ? void 0 : selectedAsset.current_price) || (orderBook === null || orderBook === void 0 ? void 0 : orderBook.last_price) || 0;
    var handleOrderSubmit = function (side) {
        onPlaceOrder(side, orderType, parseFloat(orderPrice) || currentPrice, parseFloat(orderSize));
    };
    return (<div className="sidebar">
            {/* Watchlist Section */}
            <div className="sidebar-section watchlist-section">
                <div className="section-header">
                    <h3>Watchlist</h3>
                </div>
                <div className="watchlist-list">
                    {assets.map(function (asset) { return (<div key={asset.ticker} className={"watchlist-item ".concat(selectedTicker === asset.ticker ? 'active' : '')} onClick={function () { return onSelectTicker(asset.ticker); }}>
                            <div className="wl-left">
                                <span className="wl-ticker">{asset.ticker}</span>
                                <span className="wl-vol">{asset.volume_24h ? (Number(asset.volume_24h) / 1000).toFixed(1) + 'K' : ''}</span>
                            </div>
                            <div className="wl-right">
                                <span className="wl-price">{parseFloat(asset.current_price || '0').toFixed(2)}</span>
                                <span className={"wl-change ".concat(Number(asset.change_24h) >= 0 ? 'text-green' : 'text-red')}>
                                    {Number(asset.change_24h) >= 0 ? '+' : ''}{Number(asset.change_24h || 0).toFixed(2)}%
                                </span>
                            </div>
                        </div>); })}
                </div>
            </div>

            {/* Trading Widget Tabs */}
            <div className="sidebar-tabs">
                <button className={"tab-btn ".concat(activeTab === 'ORDER' ? 'active' : '')} onClick={function () { return setActiveTab('ORDER'); }}>Order</button>
                <button className={"tab-btn ".concat(activeTab === 'BOOK' ? 'active' : '')} onClick={function () { return setActiveTab('BOOK'); }}>Book</button>
                <button className={"tab-btn ".concat(activeTab === 'TRADES' ? 'active' : '')} onClick={function () { return setActiveTab('TRADES'); }}>Trades</button>
            </div>

            <div className="sidebar-content">
                {activeTab === 'ORDER' && (<div className="order-ticket animate-fade-in">
                        <div className="ticket-type">
                            <button className={"type-btn ".concat(orderType === 'LIMIT' ? 'active' : '')} onClick={function () { return setOrderType('LIMIT'); }}>Limit</button>
                            <button className={"type-btn ".concat(orderType === 'MARKET' ? 'active' : '')} onClick={function () { return setOrderType('MARKET'); }}>Market</button>
                        </div>

                        <div className="ticket-input">
                            <label>Price</label>
                            <div className="input-group">
                                <span className="currency">$</span>
                                <input type="number" value={orderPrice} onChange={function (e) { return setOrderPrice(e.target.value); }} placeholder={currentPrice.toFixed(2)} disabled={orderType === 'MARKET'}/>
                            </div>
                        </div>

                        <div className="ticket-input">
                            <label>Quantity</label>
                            <input type="number" value={orderSize} onChange={function (e) { return setOrderSize(e.target.value); }} min="1"/>
                        </div>

                        <div className="ticket-summary">
                            <div className="summary-row">
                                <span>Buying Power</span>
                                <span>${parseFloat((portfolio === null || portfolio === void 0 ? void 0 : portfolio.buying_power) || '0').toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Estimated Cost</span>
                                <span>${((parseFloat(orderPrice) || currentPrice) * (parseFloat(orderSize) || 0)).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="ticket-actions">
                            <button className="buy-btn" onClick={function () { return handleOrderSubmit('BUY'); }}>
                                Buy {selectedTicker}
                            </button>
                            <button className="sell-btn" onClick={function () { return handleOrderSubmit('SELL'); }}>
                                Sell {selectedTicker}
                            </button>
                        </div>

                        {position && (<div className="position-summary">
                                <span>Current Position: {position.quantity} shares @ ${parseFloat(position.average_price).toFixed(2)}</span>
                            </div>)}
                    </div>)}

                {activeTab === 'BOOK' && (<div className="order-book animate-fade-in">
                        <div className="book-header">
                            <span>Price</span>
                            <span>Size</span>
                            <span>Total</span>
                        </div>
                        <div className="book-asks">
                            {orderBook === null || orderBook === void 0 ? void 0 : orderBook.asks.slice().reverse().map(function (ask, i) { return (<div key={"ask-".concat(i)} className="book-row ask">
                                    <div className="bg-bar" style={{ width: "".concat(Math.min((ask.total / 50000) * 100, 100), "%") }}/>
                                    <span className="price text-red">{ask.price.toFixed(2)}</span>
                                    <span>{ask.size}</span>
                                    <span>{ask.total}</span>
                                </div>); })}
                        </div>
                        <div className="book-spread">
                            <span className="last-price">${orderBook === null || orderBook === void 0 ? void 0 : orderBook.last_price.toFixed(2)}</span>
                        </div>
                        <div className="book-bids">
                            {orderBook === null || orderBook === void 0 ? void 0 : orderBook.bids.map(function (bid, i) { return (<div key={"bid-".concat(i)} className="book-row bid">
                                    <div className="bg-bar" style={{ width: "".concat(Math.min((bid.total / 50000) * 100, 100), "%") }}/>
                                    <span className="price text-green">{bid.price.toFixed(2)}</span>
                                    <span>{bid.size}</span>
                                    <span>{bid.total}</span>
                                </div>); })}
                        </div>
                    </div>)}

                {activeTab === 'TRADES' && (<div className="recent-trades animate-fade-in">
                        <div className="book-header">
                            <span>Time</span>
                            <span>Price</span>
                            <span>Size</span>
                        </div>
                        <div className="trades-list">
                            {trades.slice(0, 50).map(function (t, i) { return (<div key={i} className="book-row">
                                    <span>{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    <span className={t.side === 'BUY' ? 'text-green' : 'text-red'}>{parseFloat(t.price).toFixed(2)}</span>
                                    <span>{t.quantity}</span>
                                </div>); })}
                        </div>
                    </div>)}
            </div>
        </div>);
};
