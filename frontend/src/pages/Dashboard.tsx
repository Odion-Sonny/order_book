import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type { Portfolio, Position } from '@/types';
import { Wallet, Activity, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

const StatCard = ({ title, value, subtext, icon: Icon, trend }: { title: string, value: string, subtext: string, icon: any, trend?: 'up' | 'down' }) => (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-neutral-600 transition-colors">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                <div className="text-3xl font-bold text-foreground mt-2 font-mono tracking-tight">{value}</div>
                <p className={cn("text-xs mt-2 font-medium flex items-center gap-1",
                    trend === 'up' ? "text-emerald-500" : trend === 'down' ? "text-red-500" : "text-neutral-500"
                )}>
                    {subtext}
                </p>
            </div>
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 text-neutral-400">
                <Icon className="h-6 w-6" />
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [portfolioData, positionsData] = await Promise.all([
                    apiService.getPortfolio(),
                    apiService.getPositions()
                ]);
                setPortfolio(portfolioData);
                setPositions(positionsData);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-full text-neutral-500">Loading Market Data...</div>;
    }

    const totalPnL = positions.reduce((acc, pos) => acc + parseFloat(pos.unrealized_pnl || '0'), 0);
    const isProfitable = totalPnL >= 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Balance"
                    value={`$${portfolio ? parseFloat(portfolio.total_value).toFixed(2) : '0.00'}`}
                    subtext={`Cash: $${portfolio ? parseFloat(portfolio.cash_balance).toFixed(2) : '0.00'}`}
                    icon={Wallet}
                />
                <StatCard
                    title="Net P&L"
                    value={`${isProfitable ? '+' : ''}$${Math.abs(totalPnL).toFixed(2)}`}
                    subtext="Unrealized Gains"
                    icon={Activity}
                    trend={isProfitable ? 'up' : 'down'}
                />
                <StatCard
                    title="Buying Power"
                    value={`$${portfolio ? parseFloat(portfolio.buying_power).toFixed(2) : '0.00'}`}
                    subtext="Available Margin"
                    icon={DollarSign}
                />
            </div>

            {/* Positions Table - High Contrast */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-foreground">Active Positions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#151516] text-neutral-400 uppercase text-xs font-semibold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Asset</th>
                                <th className="px-6 py-4 text-right">Qty</th>
                                <th className="px-6 py-4 text-right">Avg Cost</th>
                                <th className="px-6 py-4 text-right">Current</th>
                                <th className="px-6 py-4 text-right">Value</th>
                                <th className="px-6 py-4 text-right">P&L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333333]">
                            {positions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                                        No active positions
                                    </td>
                                </tr>
                            ) : (
                                positions.map((pos) => {
                                    const pnl = parseFloat(pos.unrealized_pnl);
                                    const isPosProfitable = pnl >= 0;
                                    return (
                                        <tr key={pos.id} className="hover:bg-[#2C2C2E] transition-colors">
                                            <td className="px-6 py-4 font-bold text-white">{pos.asset_ticker}</td>
                                            <td className="px-6 py-4 text-right font-mono text-neutral-300">{parseFloat(pos.quantity).toFixed(4)}</td>
                                            <td className="px-6 py-4 text-right font-mono text-neutral-300">${parseFloat(pos.average_cost).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-mono text-white">${parseFloat(pos.current_price).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-mono text-white">${parseFloat(pos.market_value).toFixed(2)}</td>
                                            <td className={cn("px-6 py-4 text-right font-mono font-bold", isPosProfitable ? "text-emerald-500" : "text-red-500")}>
                                                {isPosProfitable ? "+" : ""}${pnl.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
