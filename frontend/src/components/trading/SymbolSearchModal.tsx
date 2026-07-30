import React, { useState, useEffect } from 'react';
import { Search, X, TrendingUp, Layers } from 'lucide-react';
import type { Asset } from '../../types';

interface SymbolSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    assets: Asset[];
    onSelectAsset: (ticker: string) => void;
}

export const SymbolSearchModal: React.FC<SymbolSearchModalProps> = ({
    isOpen,
    onClose,
    assets,
    onSelectAsset
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const filteredAssets = assets.filter(asset => {
        const matchesSearch = asset.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              asset.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'ALL' || (asset as any).category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="symbol-search-modal" onClick={e => e.stopPropagation()}>
                <div className="search-header">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search symbols (e.g. AAPL, NVDA, BTC-USD, EUR/USD)..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="category-tabs">
                    {['ALL', 'STOCKS', 'CRYPTO', 'FOREX', 'INDEX'].map(cat => (
                        <button
                            key={cat}
                            className={`cat-tab ${filterCategory === cat ? 'active' : ''}`}
                            onClick={() => setFilterCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="symbol-list">
                    {filteredAssets.length === 0 ? (
                        <div className="empty-search">
                            <Layers size={32} className="muted-icon" />
                            <p>No symbols match "{searchTerm}"</p>
                        </div>
                    ) : (
                        filteredAssets.map(asset => (
                            <div
                                key={asset.ticker}
                                className="symbol-item"
                                onClick={() => {
                                    onSelectAsset(asset.ticker);
                                    onClose();
                                }}
                            >
                                <div className="symbol-info">
                                    <span className="ticker-badge">{asset.ticker}</span>
                                    <span className="asset-full-name">{asset.name}</span>
                                </div>
                                <div className="symbol-meta">
                                    <span className="asset-price">${asset.current_price || '0.00'}</span>
                                    <span className="asset-exchange">NASDAQ</span>
                                    <TrendingUp size={14} className="trend-icon" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
