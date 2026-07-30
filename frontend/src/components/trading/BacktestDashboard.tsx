import React, { useState } from 'react';
import { Play, Calendar, DollarSign, TrendingUp, BarChart2 } from 'lucide-react';

interface BacktestDashboardProps {
    ticker?: string;
}

export const BacktestDashboard: React.FC<BacktestDashboardProps> = ({ ticker = 'AAPL' }) => {
    const [isBacktesting, setIsBacktesting] = useState(false);
    const [hasResults, setHasResults] = useState(true);
    const [strategy, setStrategy] = useState('Dual SMA Crossover');
    const [startDate, setStartDate] = useState('2026-01-01');
    const [endDate, setEndDate] = useState('2026-07-30');
    const [initialCapital, setInitialCapital] = useState(100000);

    const stats = {
        netProfit: 18450.25,
        netProfitPct: 18.45,
        winRate: 64.2,
        sharpeRatio: 2.15,
        sortinoRatio: 3.04,
        maxDrawdown: -4.85,
        profitFactor: 1.92,
        totalTrades: 126,
        winningTrades: 81,
        losingTrades: 45,
        avgTradeDuration: '3h 45m'
    };

    const handleRunBacktest = () => {
        setIsBacktesting(true);
        setTimeout(() => {
            setIsBacktesting(false);
            setHasResults(true);
        }, 1200);
    };

    return (
        <div className="backtest-container">
            {/* Configuration Header */}
            <div className="backtest-config">
                <div className="config-group">
                    <label><Calendar size={14} /> Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>

                <div className="config-group">
                    <label><Calendar size={14} /> End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>

                <div className="config-group">
                    <label><DollarSign size={14} /> Initial Capital</label>
                    <input
                        type="number"
                        value={initialCapital}
                        onChange={e => setInitialCapital(Number(e.target.value))}
                    />
                </div>

                <div className="config-group">
                    <label><BarChart2 size={14} /> Strategy</label>
                    <select value={strategy} onChange={e => setStrategy(e.target.value)}>
                        <option value="Dual SMA Crossover">Dual SMA Crossover</option>
                        <option value="RSI Mean Reversion">RSI Mean Reversion</option>
                        <option value="MACD Momentum">MACD Momentum</option>
                        <option value="Bollinger Breakout">Bollinger Breakout</option>
                    </select>
                </div>

                <button
                    className={`run-backtest-btn ${isBacktesting ? 'loading' : ''}`}
                    onClick={handleRunBacktest}
                    disabled={isBacktesting}
                >
                    {isBacktesting ? 'Running Backtest...' : <><Play size={14} /> Run Backtest</>}
                </button>
            </div>

            {/* Results Overview */}
            {hasResults && (
                <div className="backtest-results">
                    <div className="kpi-grid">
                        <div className="kpi-card profit">
                            <span className="kpi-title">Net Profit</span>
                            <span className="kpi-value">${stats.netProfit.toLocaleString()}</span>
                            <span className="kpi-sub positive">+{stats.netProfitPct}% Return</span>
                        </div>

                        <div className="kpi-card">
                            <span className="kpi-title">Win Rate</span>
                            <span className="kpi-value">{stats.winRate}%</span>
                            <span className="kpi-sub">{stats.winningTrades} W / {stats.losingTrades} L</span>
                        </div>

                        <div className="kpi-card">
                            <span className="kpi-title">Sharpe Ratio</span>
                            <span className="kpi-value">{stats.sharpeRatio}</span>
                            <span className="kpi-sub positive">Risk-Adjusted Alpha</span>
                        </div>

                        <div className="kpi-card">
                            <span className="kpi-title">Sortino Ratio</span>
                            <span className="kpi-value">{stats.sortinoRatio}</span>
                            <span className="kpi-sub positive">Downside Deviation</span>
                        </div>

                        <div className="kpi-card drawdown">
                            <span className="kpi-title">Max Drawdown</span>
                            <span className="kpi-value negative">{stats.maxDrawdown}%</span>
                            <span className="kpi-sub negative">Peak to Trough</span>
                        </div>

                        <div className="kpi-card">
                            <span className="kpi-title">Profit Factor</span>
                            <span className="kpi-value">{stats.profitFactor}</span>
                            <span className="kpi-sub">Gross Win / Gross Loss</span>
                        </div>
                    </div>

                    {/* Simulated Equity Curve Visualization */}
                    <div className="equity-curve-card">
                        <div className="card-header">
                            <TrendingUp size={16} />
                            <span>Equity Curve & Drawdown Analytics ({ticker})</span>
                        </div>

                        <div className="equity-chart-placeholder">
                            <div className="equity-line-simulation">
                                <svg width="100%" height="180" viewBox="0 0 800 180" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d="M0,150 L50,140 L100,145 L150,120 L200,125 L250,100 L300,105 L350,85 L400,90 L450,65 L500,70 L550,45 L600,50 L650,30 L700,35 L750,15 L800,20 L800,180 L0,180 Z"
                                        fill="url(#equityGrad)"
                                    />
                                    <path
                                        d="M0,150 L50,140 L100,145 L150,120 L200,125 L250,100 L300,105 L350,85 L400,90 L450,65 L500,70 L550,45 L600,50 L650,30 L700,35 L750,15 L800,20"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="3"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
