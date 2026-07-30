import React, { useState } from 'react';
import type { Asset, OrderBookData, Trade, Position, Portfolio } from '../../types';

interface SidebarProps {
    assets: Asset[];
    selectedTicker: string;
    onSelectTicker: (ticker: string) => void;
    orderBook: OrderBookData | null;
    trades: Trade[];
    portfolio: Portfolio | null;
    positions: Position[];
    onPlaceOrder: (side: 'BUY' | 'SELL', type: 'MARKET' | 'LIMIT', price: number, size: number) => Promise<void>;
}

export const TradingViewRightSidebar: React.FC<SidebarProps> = ({
    assets,
    selectedTicker,
    onSelectTicker,
    orderBook,
    trades,
    portfolio,
    positions,
    onPlaceOrder
}) => {
    const [activeTab, setActiveTab] = useState<'ORDER' | 'BOOK' | 'TRADES'>('ORDER');
    const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
    const [orderPrice, setOrderPrice] = useState<string>('');
    const [orderSize, setOrderSize] = useState<string>('1');

    const selectedAsset = assets.find(a => a.ticker === selectedTicker);
    const position = positions.find(p => p.asset.ticker === selectedTicker);
    const currentPrice = parseFloat(selectedAsset?.current_price as string) || orderBook?.last_price || 0;

    const handleOrderSubmit = (side: 'BUY' | 'SELL') => {
        onPlaceOrder(side, orderType, parseFloat(orderPrice) || currentPrice, parseFloat(orderSize));
    };

    return (
        <div className="sidebar">
            {/* Watchlist Section */}
            <div className="sidebar-section watchlist-section">
                <div className="section-header">
                    <h3>Watchlist</h3>
                </div>
                <div className="watchlist-list">
                    {assets.map(asset => (
                        <div 
                            key={asset.ticker} 
                            className={`watchlist-item ${selectedTicker === asset.ticker ? 'active' : ''}`}
                            onClick={() => onSelectTicker(asset.ticker)}
                        >
                            <div className="wl-left">
                                <span className="wl-ticker">{asset.ticker}</span>
                                <span className="wl-vol">{asset.volume_24h ? (Number(asset.volume_24h)/1000).toFixed(1)+'K' : ''}</span>
                            </div>
                            <div className="wl-right">
                                <span className="wl-price">{parseFloat(asset.current_price as string || '0').toFixed(2)}</span>
                                <span className={`wl-change ${Number(asset.change_24h) >= 0 ? 'text-green' : 'text-red'}`}>
                                    {Number(asset.change_24h) >= 0 ? '+' : ''}{Number(asset.change_24h || 0).toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trading Widget Tabs */}
            <div className="sidebar-tabs">
                <button className={`tab-btn ${activeTab === 'ORDER' ? 'active' : ''}`} onClick={() => setActiveTab('ORDER')}>Order</button>
                <button className={`tab-btn ${activeTab === 'BOOK' ? 'active' : ''}`} onClick={() => setActiveTab('BOOK')}>Book</button>
                <button className={`tab-btn ${activeTab === 'TRADES' ? 'active' : ''}`} onClick={() => setActiveTab('TRADES')}>Trades</button>
            </div>

            <div className="sidebar-content">
                {activeTab === 'ORDER' && (
                    <div className="order-ticket animate-fade-in">
                        <div className="ticket-type">
                            <button className={`type-btn ${orderType === 'LIMIT' ? 'active' : ''}`} onClick={() => setOrderType('LIMIT')}>Limit</button>
                            <button className={`type-btn ${orderType === 'MARKET' ? 'active' : ''}`} onClick={() => setOrderType('MARKET')}>Market</button>
                        </div>

                        <div className="ticket-input">
                            <label>Price</label>
                            <div className="input-group">
                                <span className="currency">$</span>
                                <input 
                                    type="number" 
                                    value={orderPrice} 
                                    onChange={e => setOrderPrice(e.target.value)} 
                                    placeholder={currentPrice.toFixed(2)}
                                    disabled={orderType === 'MARKET'} 
                                />
                            </div>
                        </div>

                        <div className="ticket-input">
                            <label>Quantity</label>
                            <input 
                                type="number" 
                                value={orderSize} 
                                onChange={e => setOrderSize(e.target.value)} 
                                min="1"
                            />
                        </div>

                        <div className="ticket-summary">
                            <div className="summary-row">
                                <span>Buying Power</span>
                                <span>${parseFloat(portfolio?.buying_power as string || '0').toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Estimated Cost</span>
                                <span>${((parseFloat(orderPrice) || currentPrice) * (parseFloat(orderSize) || 0)).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="ticket-actions">
                            <button className="buy-btn" onClick={() => handleOrderSubmit('BUY')}>
                                Buy {selectedTicker}
                            </button>
                            <button className="sell-btn" onClick={() => handleOrderSubmit('SELL')}>
                                Sell {selectedTicker}
                            </button>
                        </div>

                        {position && (
                            <div className="position-summary">
                                <span>Current Position: {position.quantity} shares @ ${parseFloat(position.average_price as string).toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'BOOK' && (
                    <div className="order-book animate-fade-in">
                        <div className="book-header">
                            <span>Price</span>
                            <span>Size</span>
                            <span>Total</span>
                        </div>
                        <div className="book-asks">
                            {orderBook?.asks.slice().reverse().map((ask, i) => (
                                <div key={`ask-${i}`} className="book-row ask">
                                    <div className="bg-bar" style={{ width: `${Math.min((ask.total / 50000) * 100, 100)}%` }} />
                                    <span className="price text-red">{ask.price.toFixed(2)}</span>
                                    <span>{ask.size}</span>
                                    <span>{ask.total}</span>
                                </div>
                            ))}
                        </div>
                        <div className="book-spread">
                            <span className="last-price">${orderBook?.last_price.toFixed(2)}</span>
                        </div>
                        <div className="book-bids">
                            {orderBook?.bids.map((bid, i) => (
                                <div key={`bid-${i}`} className="book-row bid">
                                    <div className="bg-bar" style={{ width: `${Math.min((bid.total / 50000) * 100, 100)}%` }} />
                                    <span className="price text-green">{bid.price.toFixed(2)}</span>
                                    <span>{bid.size}</span>
                                    <span>{bid.total}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'TRADES' && (
                    <div className="recent-trades animate-fade-in">
                        <div className="book-header">
                            <span>Time</span>
                            <span>Price</span>
                            <span>Size</span>
                        </div>
                        <div className="trades-list">
                            {trades.slice(0, 50).map((t, i) => (
                                <div key={i} className="book-row">
                                    <span>{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    <span className={t.side === 'BUY' ? 'text-green' : 'text-red'}>{parseFloat(t.price as string).toFixed(2)}</span>
                                    <span>{t.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
