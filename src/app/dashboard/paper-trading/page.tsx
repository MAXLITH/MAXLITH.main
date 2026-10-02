'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Wallet,
  AlertTriangle
} from 'lucide-react';

function PaperTradingContent() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get('symbol') || 'RELIANCE';

  const [symbol, setSymbol] = useState(initialSymbol);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'SL' | 'SL-M'>('MARKET');
  const [productType, setProductType] = useState<'CNC' | 'MIS'>('CNC');
  const [quantity, setQuantity] = useState<number>(10);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [triggerPrice, setTriggerPrice] = useState<string>('');
  
  const [instruments, setInstruments] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const [orderPreview, setOrderPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const fetchTradingData = () => {
    fetch('/api/markets')
      .then((res) => res.json())
      .then((data) => {
        if (data.instruments) setInstruments(data.instruments);
      })
      .catch(() => {});

    fetch('/api/paper-trading/portfolio')
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) setPortfolio(data.summary);
        if (data.positions) setPositions(data.positions);
      })
      .catch(() => {});

    fetch('/api/paper-trading/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchTradingData();
  }, []);

  const selectedInst = instruments.find((i) => i.symbol === symbol) || instruments[0];
  const currentPrice = selectedInst ? Number(selectedInst.current_price) : 0;
  const effectivePrice = (orderType === 'LIMIT' || orderType === 'SL') && limitPrice ? parseFloat(limitPrice) : currentPrice;

  // Fetch live order preview & charges breakdown
  useEffect(() => {
    if (!symbol || !quantity) return;
    const url = `/api/paper-trading/order?symbol=${symbol}&side=${side}&orderType=${orderType}&productType=${productType}&quantity=${quantity}&price=${effectivePrice}`;
    fetch(url)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.preview) setOrderPreview(resData.preview);
      })
      .catch(() => {});
  }, [symbol, side, orderType, productType, quantity, effectivePrice]);

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
          productType,
          quantity,
          price: (orderType === 'LIMIT' || orderType === 'SL') && limitPrice ? parseFloat(limitPrice) : undefined,
          triggerPrice: (orderType === 'SL' || orderType === 'SL-M') && triggerPrice ? parseFloat(triggerPrice) : undefined,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Order execution failed.');
      }

      setFeedback({
        success: data.success,
        message: data.message || 'Order submitted successfully.'
      });

      // Dispatch wallet refresh event for header
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('maxlith:wallet_updated'));
      }

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
              ₹{portfolio ? (portfolio.availableCash ?? portfolio.virtualCash).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '10,00,000.00'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          {orderPreview?.warning && (
            <div className="mb-4 p-3 rounded-lg text-xs flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{orderPreview.warning}</span>
            </div>
          )}

          <form onSubmit={handleExecuteOrder} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Product Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setProductType('CNC')}
                    className={`py-1.5 rounded-lg text-xs font-mono transition-all ${
                      productType === 'CNC' ? 'bg-blue-600 text-white font-semibold' : 'bg-[#0d121c] text-slate-400 border border-slate-800'
                    }`}
                  >
                    CNC
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType('MIS')}
                    className={`py-1.5 rounded-lg text-xs font-mono transition-all ${
                      productType === 'MIS' ? 'bg-blue-600 text-white font-semibold' : 'bg-[#0d121c] text-slate-400 border border-slate-800'
                    }`}
                  >
                    MIS
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Order Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-2.5 py-1.5 outline-none font-mono"
                >
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                  <option value="SL">SL (Stop-Loss)</option>
                  <option value="SL-M">SL-M (SL Market)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Instrument Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3.5 py-2 outline-none font-mono"
              >
                {instruments.map((inst) => (
                  <option key={inst.symbol} value={inst.symbol}>
                    {inst.symbol} - {inst.name} (₹{Number(inst.current_price).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Share Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3 py-2 outline-none font-mono"
                />
              </div>

              {(orderType === 'LIMIT' || orderType === 'SL') && (
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Limit Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={limitPrice}
                    placeholder={`Current: ₹${currentPrice.toFixed(2)}`}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3 py-2 outline-none font-mono"
                  />
                </div>
              )}

              {(orderType === 'SL' || orderType === 'SL-M') && (
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Trigger Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={triggerPrice}
                    placeholder={`Trigger (e.g. ₹${(currentPrice * 0.98).toFixed(2)})`}
                    onChange={(e) => setTriggerPrice(e.target.value)}
                    className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3 py-2 outline-none font-mono"
                  />
                </div>
              )}
            </div>

            {/* REALISTIC CHARGES & MARGIN PREVIEW BOX */}
            <div className="p-3.5 rounded-lg bg-[#0d121c] border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>LTP:</span>
                <span className="text-white font-bold">₹{currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Turnover:</span>
                <span className="text-white">₹{(quantity * effectivePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Margin Required ({productType}):</span>
                <span className="text-blue-400 font-bold">
                  ₹{orderPreview ? orderPreview.marginRequired.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (quantity * effectivePrice).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                <span>Est. Charges (STT/Exch/GST/SEBI):</span>
                <span>₹{orderPreview ? orderPreview.charges.totalCharges.toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-bold pt-1 border-t border-slate-800">
                <span>Total Net Est:</span>
                <span className="text-emerald-400">
                  ₹{orderPreview ? orderPreview.netEstimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (quantity * effectivePrice).toFixed(2)}
                </span>
              </div>
            </div>

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

        <div className="lg:col-span-2 space-y-6">
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
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Avg Price</th>
                      <th className="py-2.5 px-3 text-right">Current</th>
                      <th className="py-2.5 px-3 text-right">Unrealized P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {positions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-bold text-white">{pos.symbol}</td>
                        <td className="py-3 px-3 text-slate-400 text-[10px]">{pos.product_type || 'CNC'}</td>
                        <td className="py-3 px-3 text-right text-slate-300">{pos.quantity}</td>
                        <td className="py-3 px-3 text-right text-slate-300">₹{Number(pos.average_price).toFixed(2)}</td>
                        <td className="py-3 px-3 text-right text-white">₹{Number(pos.current_price).toFixed(2)}</td>
                        <td className={`py-3 px-3 text-right font-bold ${pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pos.unrealized_pnl >= 0 ? '+' : ''}₹{Number(pos.unrealized_pnl).toFixed(2)} ({pos.unrealized_pnl_percent >= 0 ? '+' : ''}{Number(pos.unrealized_pnl_percent).toFixed(2)}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

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
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders.slice(0, 6).map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-[10px] text-slate-400">{ord.id}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{ord.symbol}</td>
                        <td className={`py-2.5 px-3 font-bold ${ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ord.side}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{ord.order_type}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">{ord.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-white">
                          ₹{ord.executed_price ? Number(ord.executed_price).toFixed(2) : Number(ord.price || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              ord.status === 'EXECUTED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : ord.status === 'REJECTED'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
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
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-mono text-xs">Loading Paper Trading Console...</div>}>
      <PaperTradingContent />
    </Suspense>
  );
}
