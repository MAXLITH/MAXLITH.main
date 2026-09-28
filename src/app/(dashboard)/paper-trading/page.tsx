'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wallet
} from 'lucide-react';

function PaperTradingContent() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get('symbol') || 'RELIANCE';

  const [symbol, setSymbol] = useState(initialSymbol);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState<number>(10);
  const [limitPrice, setLimitPrice] = useState<string>('');
  
  const [instruments, setInstruments] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const fetchTradingData = () => {
    fetch('/api/markets')
      .then((res) => res.json())
      .then((data) => {
        if (data.instruments) setInstruments(data.instruments);
      });

    fetch('/api/paper-trading/portfolio')
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) setPortfolio(data.summary);
        if (data.positions) setPositions(data.positions);
      });

    fetch('/api/paper-trading/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
      });
  };

  useEffect(() => {
    fetchTradingData();
  }, []);

  const selectedInst = instruments.find((i) => i.symbol === symbol) || instruments[0];
  const currentPrice = selectedInst ? selectedInst.current_price : 0;
  const targetPrice = orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : currentPrice;
  const estimatedTotal = quantity * (isNaN(targetPrice) ? 0 : targetPrice);

  const handleExecuteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);

    try {
      const res = await fetch('/api/paper-trading/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          side,
          orderType,
          quantity,
          limitPrice: orderType === 'LIMIT' ? limitPrice : undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Order execution failed.');
      }

      setFeedback({
        success: data.success,
        message: data.message || 'Order placed successfully.'
      });

      fetchTradingData();
    } catch (err: any) {
      setFeedback({
        success: false,
        message: err.message || 'Failed to place order.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span>Paper Trading Console</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono border border-blue-500/30">
              ENVIRONMENT: PAPER TRADING
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulated order execution engine with real-time Indian NSE/BSE market prices.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="p-2.5 rounded bg-[#121824] border border-slate-800 text-right">
            <span className="text-[9px] uppercase text-slate-500 block">Available Virtual Cash</span>
            <span className="font-bold text-emerald-400 text-sm">
              ₹{portfolio ? portfolio.virtualCash.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '10,00,000.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Order Ticket Form, Right Positions & Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Ticket */}
        <div className="fintech-card p-6 border-t-4 border-t-blue-600">
          <h2 className="text-sm font-bold text-white mb-4">Order Execution Ticket</h2>

          {feedback && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                feedback.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              {feedback.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleExecuteOrder} className="space-y-4">
            {/* BUY / SELL Toggle Buttons */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Trade Action</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide('BUY')}
                  className={`py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                    side === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-[#0d121c] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  BUY (LONG)
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SELL')}
                  className={`py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                    side === 'SELL'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-[#0d121c] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  SELL (SHORT)
                </button>
              </div>
            </div>

            {/* Instrument Selector */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Instrument Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3.5 py-2.5 outline-none font-mono"
              >
                {instruments.map((inst) => (
                  <option key={inst.symbol} value={inst.symbol}>
                    {inst.symbol} - {inst.name} (₹{inst.current_price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* MARKET / LIMIT Order Type Toggle */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Order Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('MARKET')}
                  className={`py-2 rounded-lg text-xs font-mono transition-all ${
                    orderType === 'MARKET'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-[#0d121c] text-slate-400 border border-slate-800'
                  }`}
                >
                  MARKET
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('LIMIT')}
                  className={`py-2 rounded-lg text-xs font-mono transition-all ${
                    orderType === 'LIMIT'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-[#0d121c] text-slate-400 border border-slate-800'
                  }`}
                >
                  LIMIT
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Share Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3.5 py-2.5 outline-none font-mono"
              />
            </div>

            {/* Limit Price Input if LIMIT selected */}
            {orderType === 'LIMIT' && (
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Limit Price (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={limitPrice}
                  placeholder={`Current: ₹${currentPrice.toFixed(2)}`}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3.5 py-2.5 outline-none font-mono"
                />
              </div>
            )}

            {/* Order Summary Calculations */}
            <div className="p-3.5 rounded-lg bg-[#0d121c] border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Execution Price:</span>
                <span className="text-white font-bold">₹{currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Est. Total Cost:</span>
                <span className="text-blue-400 font-bold">₹{estimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-mono font-bold text-xs transition-all shadow-lg text-white disabled:opacity-50 ${
                side === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              {loading ? 'Processing Order...' : `CONFIRM PAPER ${side} ORDER`}
            </button>
          </form>
        </div>

        {/* Right 2-Cols: Active Positions & Order History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Holdings Table */}
          <div className="fintech-card p-5">
            <h2 className="text-sm font-bold text-white mb-3">Open Positions ({positions.length})</h2>
            {positions.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs font-mono bg-[#0d121c] rounded-lg">
                No active holdings. Execute a BUY paper trade to open positions.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0d121c] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Avg Price</th>
                      <th className="py-2.5 px-3 text-right">Current</th>
                      <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {positions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-bold text-white">{pos.symbol}</td>
                        <td className="py-3 px-3 text-right text-slate-300">{pos.quantity}</td>
                        <td className="py-3 px-3 text-right text-slate-300">₹{pos.average_price.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right text-white">₹{pos.current_price.toFixed(2)}</td>
                        <td className={`py-3 px-3 text-right font-bold ${pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pos.unrealized_pnl >= 0 ? '+' : ''}₹{pos.unrealized_pnl.toFixed(2)} ({pos.unrealized_pnl_percent >= 0 ? '+' : ''}{pos.unrealized_pnl_percent.toFixed(2)}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Orders Log Table */}
          <div className="fintech-card p-5">
            <h2 className="text-sm font-bold text-white mb-3">Recent Executions Log</h2>
            {orders.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs font-mono bg-[#0d121c] rounded-lg">
                No orders logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0d121c] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3">Side</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Executed Price</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders.slice(0, 5).map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">{ord.id}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{ord.symbol}</td>
                        <td className={`py-2.5 px-3 font-bold ${ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ord.side}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">{ord.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-white">
                          {ord.executed_price ? `₹${ord.executed_price.toFixed(2)}` : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              ord.status === 'EXECUTED'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : ord.status === 'REJECTED'
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaperTradingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-mono text-xs">Loading trading console...</div>}>
      <PaperTradingContent />
    </Suspense>
  );
}
