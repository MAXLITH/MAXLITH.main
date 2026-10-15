'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface OrderCancelModalProps {
  order: any;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function OrderCancelModal({ order, onClose, onSuccess }: OrderCancelModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/paper-trading/orders?orderId=${encodeURIComponent(order.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order.');

      onSuccess(data.message || `Order ${order.id} cancelled successfully.`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error occurred while cancelling order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0d131b] border border-max-border rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-max-border bg-[#101723] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Cancel Order</h3>
              <p className="text-[11px] text-max-text-muted font-mono">{order.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded border border-max-border bg-[#101723] hover:bg-max-surface text-max-text-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded border border-rose-900/50 bg-rose-950/30 text-rose-300">
              {error}
            </div>
          )}

          <p className="text-max-text-secondary leading-relaxed">
            Are you sure you want to cancel this pending order? Any blocked virtual margin will be immediately refunded to your cash balance.
          </p>

          <div className="p-3 rounded border border-max-border bg-[#101723] space-y-2">
            <div className="flex justify-between">
              <span className="text-max-text-muted">Instrument</span>
              <span className="font-bold text-slate-100">{order.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-max-text-muted">Side / Product</span>
              <span className="font-semibold text-slate-100">{order.side} • {order.product_type || 'CNC'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-max-text-muted">Quantity</span>
              <span className="font-mono text-slate-100">{order.quantity} Shares</span>
            </div>
            <div className="flex justify-between">
              <span className="text-max-text-muted">Order Price</span>
              <span className="font-mono text-slate-100">
                {order.order_type === 'MARKET' ? 'Market' : (order.price ? `₹${Number(order.price).toFixed(2)}` : 'Market')}
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 rounded border border-max-border bg-[#101723] hover:bg-max-surface text-max-text-secondary hover:text-white font-medium text-xs transition-colors"
            >
              Keep Order
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded border border-rose-900/50 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 font-semibold text-xs transition-colors shadow-sm disabled:opacity-60"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Cancelling...' : 'Yes, Cancel Order'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

