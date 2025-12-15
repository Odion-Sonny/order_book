import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type { Asset } from '@/types';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';

const Markets = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const data = await apiService.getAssets();
                setAssets(data);
            } catch (error) {
                console.error("Failed to fetch assets", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssets();
        const interval = setInterval(fetchAssets, 5000);
        return () => clearInterval(interval);
    }, []);

    const filteredAssets = assets.filter(asset =>
        asset.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="flex items-center justify-center h-96 text-muted-foreground animate-pulse">Loading market data...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Markets</h1>
                    <p className="text-muted-foreground">Live prices and market data.</p>
                </div>
                <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Filter markets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-10 w-64 bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-muted-foreground uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-medium">Ticker</th>
                                <th className="px-6 py-4 font-medium">Name</th>
                                <th className="px-6 py-4 font-medium text-right">Price</th>
                                <th className="px-6 py-4 font-medium text-right">24h Change</th>
                                <th className="px-6 py-4 font-medium text-right">Volume</th>
                                <th className="px-6 py-4 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        No assets found matching "{searchTerm}"
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map((asset) => {
                                    const change = parseFloat(asset.price_change_percent || '0');
                                    const isPositive = change >= 0;
                                    return (
                                        <tr key={asset.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                                            <td className="px-6 py-4 font-bold text-white group-hover:text-primary transition-colors">{asset.ticker}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{asset.name}</td>
                                            <td className="px-6 py-4 text-right font-mono text-white">${parseFloat(asset.current_price).toFixed(2)}</td>
                                            <td className={cn("px-6 py-4 text-right font-mono font-medium flex items-center justify-end gap-1", isPositive ? "text-emerald-400" : "text-red-400")}>
                                                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                {isPositive ? "+" : ""}{change.toFixed(2)}%
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-muted-foreground">{asset.volume || '0'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white text-xs rounded-md border border-white/10 transition-colors">
                                                    Trade
                                                </button>
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

export default Markets;
