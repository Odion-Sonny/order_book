import React, { useState } from 'react';
import { Filter, X, TrendingUp, TrendingDown } from 'lucide-react';
import type { Asset } from '../../types';

interface StockScreenerModalProps {
    isOpen: boolean;
    onClose: () => void;
    assets: Asset[];
    onSelectAsset: (ticker: string) => void;
}

export const StockScreenerModal: React.FC<StockScreenerModalProps> = ({
    isOpen,
    onClose,
    assets,
    onSelectAsset
}) => {
    const [minPrice, setMinPrice] = useState<string>('0');
    const [maxPrice, setMaxPrice] = useState<string>('100000');
    const [sector, setSector] = useState<string>('ALL');
    const [filterTrend, setFilterTrend] = useState<'ALL' | 'GAINERS' | 'LOSERS'>('ALL');

    if (!isOpen) return null;

    const filtered = assets.filter(a => {
        const price = parseFloat(a.current_price as string || '0');
        const change = Number(a.change_24h || 0);

        const matchesPrice = price >= Number(minPrice) && price <= Number(maxPrice);
        const matchesSector = sector === 'ALL' || (a as any).category?.toUpperCase() === sector;
        const matchesTrend = filterTrend === 'ALL' || (filterTrend === 'GAINERS' ? change > 0 : change < 0);

        return matchesPrice && matchesSector && matchesTrend;
    });

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="symbol-search-modal" style={{ width: 680 }} onClick={e => e.stopPropagation()}>
                <div className="search-header">
                    <Filter size={20} className="glow-cyan" />
                    <span style={{ fontWeight: 800, fontSize: 16 }}>Quantitative Stock & Asset Screener</span>
                    <button className="close-btn" onClick={onClose} style={{ marginLeft: 'auto' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Filters Controls */}
                <div style={{ padding: 12, borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 12, background: 'var(--bg-panel-hover)' }}>
                    <div className="config-group" style={{ flex: 1 }}>
                        <label>Sector / Category</label>
                        <select value={sector} onChange={e => setSector(e.target.value)}>
                            <option value="ALL">All Sectors</option>
                            <option value="TECH">Technology</option>
                            <option value="CRYPTO">Cryptocurrency</option>
                            <option value="FOREX">Forex Currencies</option>
                            <option value="ENERGY">Energy & Commodities</option>
                        </select>
                    </div>

                    <div className="config-group" style={{ flex: 1 }}>
                        <label>24h Performance</label>
                        <select value={filterTrend} onChange={e => setFilterTrend(e.target.value as any)}>
                            <option value="ALL">All Assets</option>
                            <option value="GAINERS">🚀 Top Gainers (+%)</option>
                            <option value="LOSERS">🔻 Top Losers (-%)</option>
                        </select>
                    </div>

                    <div className="config-group" style={{ width: 100 }}>
                        <label>Min Price ($)</label>
                        <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                    </div>

                    <div className="config-group" style={{ width: 100 }}>
                        <label>Max Price ($)</label>
                        <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                    </div>
                </div>

                {/* Screener Results Table */}
                <div className="symbol-list" style={{ maxHeight: 380, padding: 8 }}>
                    <div className="dock-row header" style={{ padding: '8px 12px' }}>
                        <span>Ticker</span>
                        <span>Name</span>
                        <span>Price ($)</span>
                        <span>24h Change (%)</span>
                        <span>24h Volume</span>
                    </div>

                    {filtered.map(a => {
                        const priceNum = parseFloat(a.current_price as string || '0');
                        const changeNum = Number(a.change_24h || 0);
                        return (
                            <div
                                key={a.ticker}
                                className="dock-row"
                                style={{ padding: '8px 12px', cursor: 'pointer' }}
                                onClick={() => {
                                    onSelectAsset(a.ticker);
                                    onClose();
                                }}
                            >
                                <span className="ticker-badge">{a.ticker}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{a.name}</span>
                                <span style={{ fontWeight: 700 }}>${priceNum.toFixed(2)}</span>
                                <span className={changeNum >= 0 ? 'text-green' : 'text-red'} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {changeNum >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {changeNum >= 0 ? '+' : ''}{changeNum.toFixed(2)}%
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>
                                    {a.volume_24h ? (Number(a.volume_24h) / 1000000).toFixed(1) + 'M' : 'N/A'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
