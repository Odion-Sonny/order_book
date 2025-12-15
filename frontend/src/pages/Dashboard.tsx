import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type { Portfolio, Position } from '@/types';
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        const interval = setInterval(fetchData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-96 text-muted-foreground animate-pulse">Loading market data...</div>;
    }

    const totalPnL = positions.reduce((acc, pos) => acc + parseFloat(pos.unrealized_pnl || '0'), 0);
    const isProfitable = totalPnL >= 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Portfolio Overview</h1>
                <p className="text-muted-foreground">Real-time asset performance across all markets.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative overflow-hidden rounded-xl bg-card border border-white/5 p-6 shadow-xl glass-card group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet className="h-24 w-24 -mr-8 -mt-8" />
                    </div>
                    <h3 className="text-muted-foreground text-sm font-medium uppercase tracking-wider">Total Liquidity</h3>
                    <div className="text-3xl font-bold mt-2 text-white font-mono">
                        ${portfolio ? parseFloat(portfolio.total_value).toFixed(2) : '0.00'}
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                        Cash: <span className="text-foreground">${portfolio ? parseFloat(portfolio.cash_balance).toFixed(2) : '0.00'}</span>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-card border border-white/5 p-6 shadow-xl glass-card group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="h-24 w-24 -mr-8 -mt-8" />
                    </div>
                    <h3 className="text-muted-foreground text-sm font-medium uppercase tracking-wider">Net P&L</h3>
                    <div className={cn("text-3xl font-bold mt-2 font-mono flex items-center gap-2", isProfitable ? "text-emerald-400" : "text-red-400")}>
                        {isProfitable ? "+" : ""}${Math.abs(totalPnL).toFixed(2)}
                        {isProfitable ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                        Unrealized Gains
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-card border border-white/5 p-6 shadow-xl glass-card group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="h-24 w-24 -mr-8 -mt-8" />
                    </div>
                    <h3 className="text-muted-foreground text-sm font-medium uppercase tracking-wider">Buying Power</h3>
                    <div className="text-3xl font-bold mt-2 text-white font-mono">
                        ${portfolio ? parseFloat(portfolio.buying_power).toFixed(2) : '0.00'}
                    </div>
                    <div className="mt-4 text-xs text-emerald-400">
                        Ready to trade
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="font-semibold text-lg">Active Positions</h3>
                </div>
                <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-muted-foreground uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-medium">Asset</th>
                                <th className="px-6 py-4 font-medium text-right">Qty</th>
                                <th className="px-6 py-4 font-medium text-right">Avg Price</th>
                                <th className="px-6 py-4 font-medium text-right">Market Price</th>
                                <th className="px-6 py-4 font-medium text-right">Market Value</th>
                                <th className="px-6 py-4 font-medium text-right">P&L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {positions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        No active positions
                                    </td>
                                </tr>
                            ) : (
                                positions.map((pos) => {
                                    const pnl = parseFloat(pos.unrealized_pnl);
                                    const isPosProfitable = pnl >= 0;
                                    return (
                                        <tr key={pos.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-white group-hover:text-primary transition-colors">{pos.asset_ticker}</td>
                                            <td className="px-6 py-4 text-right font-mono text-muted-foreground">{parseFloat(pos.quantity).toFixed(4)}</td>
                                            <td className="px-6 py-4 text-right font-mono text-muted-foreground">${parseFloat(pos.average_cost).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-mono text-white">${parseFloat(pos.current_price).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-mono text-white">${parseFloat(pos.market_value).toFixed(2)}</td>
                                            <td className={cn("px-6 py-4 text-right font-mono font-bold", isPosProfitable ? "text-emerald-400" : "text-red-400")}>
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
