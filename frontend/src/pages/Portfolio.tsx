import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type { Portfolio as PortfolioType, Position } from '@/types';
import { PieChart, Wallet } from 'lucide-react';

const Portfolio = () => {
    const [portfolio, setPortfolio] = useState<PortfolioType | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pfData, posData] = await Promise.all([
                    apiService.getPortfolio(),
                    apiService.getPositions()
                ]);
                setPortfolio(pfData);
                setPositions(posData);
            } catch (error) {
                console.error("Failed to fetch portfolio data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="text-center p-10 text-neutral-500">Loading Portfolio...</div>;

    const totalValue = parseFloat(portfolio?.total_value || '0');

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Portfolio</h1>
                    <p className="text-neutral-500">Asset allocation and performance.</p>
                </div>
            </div>

            {/* Application Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1C1C1E] border border-[#333333] p-6 rounded-xl">
                    <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4">Total Equity</h3>
                    <div className="text-4xl font-mono font-bold text-white mb-2">
                        ${totalValue.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <Wallet className="h-4 w-4" />
                        <span>Cash Balance: <span className="text-white">${parseFloat(portfolio?.cash_balance || '0').toFixed(2)}</span></span>
                    </div>
                </div>

                <div className="bg-[#1C1C1E] border border-[#333333] p-6 rounded-xl flex items-center justify-center text-neutral-500 text-sm">
                    {/* Placeholder for Pie Chart */}
                    <div className="text-center">
                        <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Allocation Chart visualizer coming soon</p>
                    </div>
                </div>
            </div>

            {/* Detailed Holdings */}
            <div className="bg-[#1C1C1E] border border-[#333333] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#333333] flex justify-between items-center">
                    <h2 className="font-bold text-white">Holdings</h2>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-black text-neutral-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Asset</th>
                            <th className="px-6 py-4 text-right">Qty</th>
                            <th className="px-6 py-4 text-right">Price</th>
                            <th className="px-6 py-4 text-right">Value</th>
                            <th className="px-6 py-4 text-right">Allocation</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333333]">
                        {positions.map(pos => {
                            const value = parseFloat(pos.market_value);
                            const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
                            return (
                                <tr key={pos.id} className="hover:bg-[#2C2C2E] transition-colors">
                                    <td className="px-6 py-4 font-bold text-white">{pos.asset_ticker}</td>
                                    <td className="px-6 py-4 text-right font-mono text-neutral-400">{parseFloat(pos.quantity).toFixed(4)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-neutral-400">${parseFloat(pos.current_price).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-white">${value.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-blue-500">{allocation.toFixed(1)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Portfolio;
