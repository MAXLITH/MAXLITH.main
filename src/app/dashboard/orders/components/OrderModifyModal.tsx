'use client';

import React, { useState } from 'react';
import { X, Edit3, Loader2, AlertCircle } from 'lucide-react';

interface OrderModifyModalProps {
  order: any;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function OrderModifyModal({ order, onClose, onSuccess }: OrderModifyModalProps) {
  const [quantity, setQuantity] = useState<number>(order.quantity || 1);
  const [price, setPrice] = useState<string>(order.price ? String(order.price) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      setError('Quantity must be a positive integer.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/paper-trading/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          quantity: Number(quantity),
          price: price.trim() !== '' ? parseFloat(price) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to modify order.');

      onSuccess(data.message || `Order ${order.id} modified successfully.`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error while updating order.');
    } finally {
      setLoading(false);
    }
  };

  const estPrice = price ? parseFloat(price) : (order.price || 0);
  const estTurnover = estPrice > 0 ? quantity * estPrice : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0f1523] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#131b2e]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Modify Order</h3>
              <p className="text-[11px] text-slate-400 font-mono">{order.id} • {order.symbol}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-[#141c2e] border border-slate-800 flex justify-between items-center font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Product / Side</span>
              <span className="font-bold text-white text-xs">{order.product_type || 'CNC'} • {order.side}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block">Current Qty</span>
              <span className="font-bold text-white text-xs">{order.quantity} Shares</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              New Quantity <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-[#141c2e] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              Limit Price (₹) {order.order_type === 'MARKET' ? <span className="text-slate-500 font-normal">(Optional for Market)</span> : <span className="text-rose-400">*</span>}
            </label>
            <input
              type="number"
              step="0.05"
              min="0.05"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={order.order_type === 'MARKET' ? 'Leave empty to keep Market' : 'Enter new limit price'}
              className="w-full bg-[#141c2e] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm outline-none transition-all"
            />
          </div>

          {estTurnover > 0 && (
            <div className="p-3 rounded-xl bg-[#141c2e]/60 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Estimated Turnover</span>
              <span className="font-bold font-mono text-emerald-400">
                ₹{estTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-all border border-slate-700/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md disabled:opacity-60"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Updating...' : 'Update Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

