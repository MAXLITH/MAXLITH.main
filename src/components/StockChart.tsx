'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function StockChart({
  data,
  symbol,
  isPositive = true
}: {
  data: CandleData[];
  symbol: string;
  isPositive?: boolean;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-max-text-muted text-xs font-mono border border-max-border rounded">
        No historical chart candles available for {symbol}
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    time: d.timestamp.split(' ')[0],
    price: d.close,
    open: d.open,
    high: d.high,
    low: d.low,
    volume: d.volume
  }));

  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const fillColor = isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';

  const prices = formattedData.map((d) => d.price);
  const minPrice = Math.floor(Math.min(...prices) * 0.98);
  const maxPrice = Math.ceil(Math.max(...prices) * 1.02);

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`colorPrice-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#1e293b' }}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `₹${val}`}
            orientation="right"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#121824',
              borderColor: '#1e293b',
              borderRadius: '0.5rem',
              color: '#f8fafc',
              fontSize: '0.75rem',
              fontFamily: 'monospace'
            }}
            formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Close Price']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#colorPrice-${symbol})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
