import React, { useState } from 'react';
import type { Asset, OrderBookData, Trade, Position, Portfolio } from '../../types';
import { Level2OrderBook } from './Level2OrderBook';
import { TimeAndSales } from './TimeAndSales';
import { Search } from 'lucide-react';

interface SidebarProps {
    assets: Asset[];
    selectedTicker: string;
    onSelectTicker: (ticker: string) => void;
    orderBook: OrderBookData | null;
    trades: Trade[];
    portfolio: Portfolio | null;
    positions: Position[];
    onPlaceOrder: (side: 'BUY' | 'SELL', type: 'MARKET' | 'LIMIT', price: number, size: number) => Promise<void>;
    onOpenSearchModal: () => void;
}

export const TradingViewRightSidebar: React.FC<SidebarProps> = ({
    assets,
    selectedTicker,
    onSelectTicker,
    orderBook,
    trades,
    portfolio,
    positions,
    onPlaceOrder,
    onOpenSearchModal
}) => {
    const [activeTab, setActiveTab] = useState<'ORDER' | 'BOOK' | 'TRADES'>('ORDER');
    const [watchlistCategory, setWatchlistCategory] = useState<string>('ALL');
    const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
    const [orderPrice, setOrderPrice] = useState<string>('');
    const [orderSize, setOrderSize] = useState<string>('10');

    const selectedAsset = assets.find(a => a.ticker === selectedTicker);
    const position = positions.find(p => p.asset.ticker === selectedTicker);
    const currentPrice = parseFloat(selectedAsset?.current_price as string) || orderBook?.last_price || 185.50;

    const handleOrderSubmit = (side: 'BUY' | 'SELL') => {
        onPlaceOrder(side, orderType, parseFloat(orderPrice) || currentPrice, parseFloat(orderSize));
    };

    const categories = ['ALL', 'TECH', 'ENERGY', 'CRYPTO', 'FOREX'];
    const filteredWatchlist = assets.filter(a => {
        if (watchlistCategory === 'ALL') return true;
        return (a as any).category?.toUpperCase() === watchlistCategory;
    });

    return (
        <div className="sidebar">
            {/* Watchlist Header */}
            <div className="sidebar-section watchlist-section">
                <div className="section-header">
                    <h3>Watchlists</h3>
                    <button className="search-trigger-btn" onClick={onOpenSearchModal} title="Search Symbols">
                        <Search size={14} /> Symbol Search
                    </button>
                </div>

                <div className="wl-categories">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`wl-cat-btn ${watchlistCategory === cat ? 'active' : ''}`}
                            onClick={() => setWatchlistCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="watchlist-list">
                    {filteredWatchlist.map(asset => {
                        const priceNum = parseFloat(asset.current_price as string || '0');
                        const changeNum = Number(asset.change_24h || 0);
                        return (
                            <div 
                                key={asset.ticker} 
                                className={`watchlist-item ${selectedTicker === asset.ticker ? 'active' : ''}`}
                                onClick={() => onSelectTicker(asset.ticker)}
                            >
                                <div className="wl-left">
                                    <span className="wl-ticker">{asset.ticker}</span>
                                    <span className="wl-name">{asset.name}</span>
                                </div>
                                <div className="wl-right">
                                    <span className="wl-price">${priceNum.toFixed(2)}</span>
                                    <span className={`wl-change ${changeNum >= 0 ? 'text-green' : 'text-red'}`}>
                                        {changeNum >= 0 ? '+' : ''}{changeNum.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Trading Widget Tabs */}
            <div className="sidebar-tabs">
                <button className={`tab-btn ${activeTab === 'ORDER' ? 'active' : ''}`} onClick={() => setActiveTab('ORDER')}>Trade Order</button>
                <button className={`tab-btn ${activeTab === 'BOOK' ? 'active' : ''}`} onClick={() => setActiveTab('BOOK')}>Level II Book</button>
                <button className={`tab-btn ${activeTab === 'TRADES' ? 'active' : ''}`} onClick={() => setActiveTab('TRADES')}>Tape</button>
            </div>

            <div className="sidebar-content">
                {activeTab === 'ORDER' && (
                    <div className="order-ticket animate-fade-in">
                        <div className="ticket-type">
                            <button className={`type-btn ${orderType === 'LIMIT' ? 'active' : ''}`} onClick={() => setOrderType('LIMIT')}>Limit</button>
                            <button className={`type-btn ${orderType === 'MARKET' ? 'active' : ''}`} onClick={() => setOrderType('MARKET')}>Market</button>
                        </div>

                        <div className="ticket-input">
                            <label>Limit Price</label>
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
                            <label>Quantity / Shares</label>
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
                                <span>${parseFloat(portfolio?.buying_power as string || '100000').toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Est. Order Value</span>
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
                                <span>Position: {position.quantity} shares @ ${parseFloat(position.average_price as string).toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'BOOK' && (
                    <Level2OrderBook orderBook={orderBook} currentPrice={currentPrice} />
                )}

                {activeTab === 'TRADES' && (
                    <TimeAndSales trades={trades} />
                )}
            </div>
        </div>
    );
};
