import {
    ComposedChart,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Bar
} from 'recharts';


interface ChartData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

const CustomCandle = (props: any) => {
    const { x, y, width, height, low, high, open, close } = props;
    const isUp = close >= open;
    const color = isUp ? '#10B981' : '#EF4444'; // Emerald-500 : Red-500
    // range provided is [min, max]
    const range = high - low;
    const boxTopVal = Math.max(open, close);
    const boxBottomVal = Math.min(open, close);

    // Pixel Calculation relative to the Bar height
    const pixelHeight = height;
    const pixelPerUnit = range === 0 ? 0 : pixelHeight / range;

    // Bar rect 'y' is the top visual coordinate (high value)
    // Bar rect 'height' is visual height (high - low)

    const wickTop = y;
    const wickBottom = y + height;
    const wickX = x + width / 2;

    const bodyTop = y + (high - boxTopVal) * pixelPerUnit;
    const bodyHeight = Math.max(2, (boxTopVal - boxBottomVal) * pixelPerUnit);

    return (
        <g>
            {/* Wick */}
            <line x1={wickX} y1={wickTop} x2={wickX} y2={wickBottom} stroke={color} strokeWidth={1} />
            {/* Body */}
            <rect x={x} y={bodyTop} width={width} height={bodyHeight} fill={color} />
        </g>
    );
};

export const CandleStickChart = ({ data }: { data: ChartData[] }) => {
    // Transform data for Recharts: Bar needs [min, max] to reserve space
    const processedData = data.map(d => ({
        ...d,
        range: [d.low, d.high], // The full range of the candle
    }));

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-[#1C1C1E] border border-[#333] p-3 rounded shadow-xl text-xs font-mono">
                    <div className="text-gray-400 mb-2">{d.time}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-gray-500">O:</span> <span className="text-white">{d.open.toFixed(2)}</span>
                        <span className="text-gray-500">H:</span> <span className="text-white">{d.high.toFixed(2)}</span>
                        <span className="text-gray-500">L:</span> <span className="text-white">{d.low.toFixed(2)}</span>
                        <span className="text-gray-500">C:</span> <span className={(d.close >= d.open ? "text-emerald-500" : "text-red-500")}>{d.close.toFixed(2)}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis
                    dataKey="time"
                    stroke="#555"
                    tick={{ fill: '#666', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    domain={['auto', 'auto']}
                    orientation="right"
                    stroke="#555"
                    tick={{ fill: '#666', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => val.toFixed(2)}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333', strokeDasharray: '4 4' }} />
                <Bar dataKey="range" shape={<CustomCandle />} isAnimationActive={false} />
            </ComposedChart>
        </ResponsiveContainer>
    );
};
