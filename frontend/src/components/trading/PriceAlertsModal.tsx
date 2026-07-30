import React, { useState } from 'react';
import { Bell, X, Plus, Trash2, CheckCircle } from 'lucide-react';
import type { Asset } from '../../types';

interface PriceAlert {
    id: string;
    ticker: string;
    condition: 'ABOVE' | 'BELOW';
    targetPrice: number;
    active: boolean;
}

interface PriceAlertsModalProps {
    isOpen: boolean;
    onClose: () => void;
    assets: Asset[];
    currentTicker: string;
}

export const PriceAlertsModal: React.FC<PriceAlertsModalProps> = ({
    isOpen,
    onClose,
    assets,
    currentTicker
}) => {
    const [alerts, setAlerts] = useState<PriceAlert[]>([
        { id: '1', ticker: 'AAPL', condition: 'ABOVE', targetPrice: 190.00, active: true },
        { id: '2', ticker: 'NVDA', condition: 'BELOW', targetPrice: 115.00, active: true },
    ]);

    const [selectedTicker, setSelectedTicker] = useState<string>(currentTicker);
    const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
    const [targetPrice, setTargetPrice] = useState<string>('190.00');
    const [notification, setNotification] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAddAlert = () => {
        if (!targetPrice || isNaN(Number(targetPrice))) return;
        const newAlert: PriceAlert = {
            id: String(Date.now()),
            ticker: selectedTicker,
            condition,
            targetPrice: parseFloat(targetPrice),
            active: true
        };
        setAlerts(prev => [newAlert, ...prev]);
        setNotification(`Alert created for ${selectedTicker} ${condition} $${targetPrice}`);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleDeleteAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="symbol-search-modal" onClick={e => e.stopPropagation()}>
                <div className="search-header">
                    <Bell size={20} className="glow-cyan" />
                    <span style={{ fontWeight: 800, fontSize: 16 }}>Real-Time Price & Indicator Alerts</span>
                    <button className="close-btn" onClick={onClose} style={{ marginLeft: 'auto' }}>
                        <X size={18} />
                    </button>
                </div>

                {notification && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '8px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} /> {notification}
                    </div>
                )}

                {/* Alert Creation Form */}
                <div style={{ padding: 16, borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div className="config-group" style={{ flex: 1 }}>
                        <label>Symbol</label>
                        <select value={selectedTicker} onChange={e => setSelectedTicker(e.target.value)}>
                            {assets.map(a => (
                                <option key={a.ticker} value={a.ticker}>{a.ticker} - {a.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="config-group" style={{ width: 110 }}>
                        <label>Condition</label>
                        <select value={condition} onChange={e => setCondition(e.target.value as any)}>
                            <option value="ABOVE">Price &gt;</option>
                            <option value="BELOW">Price &lt;</option>
                        </select>
                    </div>

                    <div className="config-group" style={{ width: 110 }}>
                        <label>Target Price ($)</label>
                        <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} />
                    </div>

                    <button className="run-backtest-btn" onClick={handleAddAlert}>
                        <Plus size={14} /> Add Alert
                    </button>
                </div>

                {/* Alerts List */}
                <div className="symbol-list" style={{ padding: 16 }}>
                    {alerts.map(a => (
                        <div key={a.id} className="service-row" style={{ alignItems: 'center' }}>
                            <span className="ticker-badge">{a.ticker}</span>
                            <span>When price is <strong>{a.condition}</strong> ${a.targetPrice.toFixed(2)}</span>
                            <span className="svc-status online">● ACTIVE</span>
                            <button className="replay-btn" onClick={() => handleDeleteAlert(a.id)} style={{ border: 'none' }}>
                                <Trash2 size={14} className="text-red" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
