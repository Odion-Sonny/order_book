import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface OrderBookLevel {
    price: number;
    quantity: number;
    total: number; // Cumulative sum
}

interface DepthChartProps {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
}

export const MarketDepthChart = ({ bids, asks }: DepthChartProps) => {
    // Process data to single array for Area Chart?
    // Usually depth chart is two distinct areas meeting in the middle.
    // We can use a single X-axis if prices are close.
    // Or we compose them.

    // Strategy: Combine into a sorted array of price points.
    // Bids: Decreasing price. Asks: Increasing price.

    // For visualization:
    // We want Price on X axis.
    // Total Quantity on Y axis.

    // Sort all calls by price
    const data = [
        ...bids.map(b => ({ price: b.price, bidTotal: b.total, askTotal: null })),
        ...asks.map(a => ({ price: a.price, bidTotal: null, askTotal: a.total }))
    ].sort((a, b) => a.price - b.price);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const isBid = payload[0].dataKey === 'bidTotal';
            return (
                <div className="bg-[#1C1C1E] border border-[#333] p-2 rounded shadow-xl text-xs font-mono">
                    <div className="text-gray-400 mb-1">Price: <span className="text-white">${parseFloat(label).toFixed(2)}</span></div>
                    <div>
                        <span className={isBid ? "text-emerald-500" : "text-red-500"}>
                            {isBid ? "Bid Depth" : "Ask Depth"}:
                        </span>
                        <span className="text-white ml-2">{payload[0].value.toFixed(2)}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorBid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAsk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis
                    dataKey="price"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    stroke="#333"
                    tick={{ fill: '#555', fontSize: 10 }}
                    allowDecimals={true}
                    tickFormatter={(val) => val.toFixed(2)}
                />
                <YAxis
                    orientation="right"
                    stroke="#333"
                    tick={{ fill: '#555', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="stepAfter"
                    dataKey="bidTotal"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorBid)"
                    connectNulls
                />
                <Area
                    type="stepBefore"
                    dataKey="askTotal"
                    stroke="#EF4444"
                    fillOpacity={1}
                    fill="url(#colorAsk)"
                    connectNulls // Needed to bridge gaps if any, though sorting handles it
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};
