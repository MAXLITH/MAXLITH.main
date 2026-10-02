'use client';

import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, Edit3 } from 'lucide-react';

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'EXECUTED' | 'CANCELLED_REJECTED' | 'TRADES'>('ALL');
  const [orders, setOrders] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Edit order modal/state
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editQty, setEditQty] = useState<number>(1);
  const [editPrice, setEditPrice] = useState<string>('');

  const fetchOrdersAndTrades = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/paper-trading/orders').then((res) => res.json()),
      fetch('/api/paper-trading/trades').then((res) => res.json()),
    ])
      .then(([ordersData, tradesData]) => {
        if (ordersData.orders) setOrders(ordersData.orders);
        if (tradesData.trades) setTrades(tradesData.trades);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrdersAndTrades();
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/paper-trading/orders?orderId=${orderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order.');

      setActionMsg({ success: true, message: data.message || `Order ${orderId} cancelled.` });
      fetchOrdersAndTrades();
    } catch (err: any) {
      setActionMsg({ success: false, message: err.message || 'Cancellation failed.' });
    }
  };

  const handleSaveModification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      const res = await fetch('/api/paper-trading/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: editingOrder.id,
          quantity: editQty,
          price: editPrice ? parseFloat(editPrice) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Modification failed.');

      setActionMsg({ success: true, message: `Order ${editingOrder.id} modified successfully.` });
      setEditingOrder(null);
      fetchOrdersAndTrades();
    } catch (err: any) {
      setActionMsg({ success: false, message: err.message || 'Failed to modify order.' });
    }
  };

  const filteredOrders = orders.filter((ord) => {
    if (activeTab === 'OPEN') return ord.status === 'PENDING' || ord.status === 'AMO';
    if (activeTab === 'EXECUTED') return ord.status === 'EXECUTED';
    if (activeTab === 'CANCELLED_REJECTED') return ord.status === 'CANCELLED' || ord.status === 'REJECTED';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Order Book &amp; Trade History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete audit ledger of market, limit, and stop-loss orders with live cancellation and trade executions.
          </p>
        </div>

        <button
          onClick={fetchOrdersAndTrades}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-all border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {actionMsg && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
            actionMsg.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          <span>{actionMsg.message}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FILTER TABS */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'ALL' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('OPEN')}
          className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'OPEN' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
        >
          Open / Pending ({orders.filter((o) => o.status === 'PENDING' || o.status === 'AMO').length})
        </button>
        <button
          onClick={() => setActiveTab('EXECUTED')}
          className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'EXECUTED' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
        >
          Executed ({orders.filter((o) => o.status === 'EXECUTED').length})
        </button>
        <button
          onClick={() => setActiveTab('CANCELLED_REJECTED')}
          className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'CANCELLED_REJECTED' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
        >
          Cancelled / Rejected ({orders.filter((o) => o.status === 'CANCELLED' || o.status === 'REJECTED').length})
        </button>
        <button
          onClick={() => setActiveTab('TRADES')}
          className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'TRADES' ? 'bg-purple-600 text-white font-semibold' : 'text-purple-400 hover:text-white'}`}
        >
          Trade Book ({trades.length})
        </button>
      </div>

      {/* MODAL FOR MODIFYING PENDING ORDER */}
      {editingOrder && (
        <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/40 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">Modify Pending Order ({editingOrder.id})</span>
            <button onClick={() => setEditingOrder(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSaveModification} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={editQty}
                onChange={(e) => setEditQty(parseInt(e.target.value) || 1)}
                className="w-full bg-[#0d121c] border border-slate-800 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Limit Price (₹)</label>
              <input
                type="number"
                step="0.05"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-full bg-[#0d121c] border border-slate-800 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all"
            >
              Update Order
            </button>
          </form>
        </div>
      )}

      {/* MAIN ORDERS OR TRADES TABLE */}
      <div className="fintech-card p-5">
        {activeTab === 'TRADES' ? (
          trades.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs bg-[#0d121c] rounded-lg">
              No trade executions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0d121c] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Trade ID</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Instrument</th>
                    <th className="py-3 px-4">Side</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Exec Price</th>
                    <th className="py-3 px-4 text-right">Turnover</th>
                    <th className="py-3 px-4 text-right">Charges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {trades.map((tr) => {
                    let totalCharges = 0;
                    if (tr.charges_json) {
                      try {
                        totalCharges = JSON.parse(tr.charges_json).totalCharges || 0;
                      } catch {}
                    }
                    return (
                      <tr key={tr.id} className="hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 text-[10px] text-slate-400">{tr.id}</td>
                        <td className="py-3.5 px-4 text-slate-400 text-[10px]">{tr.created_at}</td>
                        <td className="py-3.5 px-4 font-bold text-white">{tr.symbol}</td>
                        <td className={`py-3.5 px-4 font-bold ${tr.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tr.side}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-200">{tr.quantity}</td>
                        <td className="py-3.5 px-4 text-right text-white">₹{Number(tr.price).toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-right text-slate-300">
                          ₹{(tr.quantity * tr.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400">₹{totalCharges.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs bg-[#0d121c] rounded-lg">
            No orders match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0d121c] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Limit Price</th>
                  <th className="py-3 px-4 text-right">Exec Price</th>
                  <th className="py-3 px-4 text-right">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 text-[10px] text-slate-400">{ord.id}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-[10px]">{ord.created_at}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{ord.symbol}</td>
                    <td className={`py-3.5 px-4 font-bold ${ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ord.side}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[10px]">{ord.product_type || 'CNC'}</td>
                    <td className="py-3.5 px-4 text-slate-300">{ord.order_type}</td>
                    <td className="py-3.5 px-4 text-right text-slate-200">{ord.quantity}</td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {ord.price ? `₹${Number(ord.price).toFixed(2)}` : 'Market'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-white">
                      {ord.executed_price ? `₹${Number(ord.executed_price).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          ord.status === 'EXECUTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : ord.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : ord.status === 'CANCELLED'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {(ord.status === 'PENDING' || ord.status === 'AMO') ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingOrder(ord);
                              setEditQty(ord.quantity);
                              setEditPrice(ord.price ? String(ord.price) : '');
                            }}
                            className="p-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white"
                            title="Modify Order"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCancelOrder(ord.id)}
                            className="p-1 rounded bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white"
                            title="Cancel Order"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
