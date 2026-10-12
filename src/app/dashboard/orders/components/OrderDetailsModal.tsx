'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Info, AlertTriangle, ShieldCheck, Clock, ArrowUpRight, ArrowDownRight, Edit3 } from 'lucide-react';
import { OrderStatusBadge } from './OrderStatusBadge';

interface OrderDetailsModalProps {
  order: any;
  instrument?: any;
  onClose: () => void;
  onModify?: (order: any) => void;
  onCancel?: (order: any) => void;
}

export function OrderDetailsModal({
  order,
  instrument,
  onClose,
  onModify,
  onCancel,
}: OrderDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let charges: any = null;
  if (order.charges_json) {
    try {
      charges = typeof order.charges_json === 'string' ? JSON.parse(order.charges_json) : order.charges_json;
    } catch {}
  }

  const isBuy = order.side === 'BUY';
  const isPending = order.status === 'PENDING' || order.status === 'AMO';
  const isExecuted = order.status === 'EXECUTED';

  const orderPriceDisplay = order.order_type === 'MARKET' 
    ? 'Market Order' 
    : (order.price ? `₹${Number(order.price).toFixed(2)}` : '—');

  const executedPriceDisplay = (order.executed_price || order.average_fill_price)
    ? `₹${Number(order.executed_price || order.average_fill_price).toFixed(2)}`
    : (isExecuted && order.price ? `₹${Number(order.price).toFixed(2)}` : '—');

  const totalTurnover = isExecuted && (order.executed_price || order.price)
    ? Number(order.quantity) * Number(order.executed_price || order.price)
    : (order.price ? Number(order.quantity) * Number(order.price) : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-[#0f1523] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-slate-800/80 bg-[#131b2e]/60 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm tracking-wider shadow-inner ${
              isBuy 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {isBuy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">{order.symbol}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                  {instrument?.exchange || 'NSE'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {order.side}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                {instrument?.name || `${order.symbol} Equity`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} size="md" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* ORDER IDENTIFIER CHIP */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#141c2e] border border-slate-800/90 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Order ID:</span>
              <span className="text-slate-200 font-semibold">{order.id}</span>
            </div>
            <button
              onClick={() => handleCopy(order.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/60"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* REJECTION REASON CALLOUT */}
          {order.rejection_reason && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-400 text-xs">Order Rejected by Engine</p>
                <p className="text-xs mt-0.5 text-rose-300/90">{order.rejection_reason}</p>
              </div>
            </div>
          )}

          {/* CORE SPECS GRID */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Order Parameters</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#141c2e]/70 border border-slate-800/70">
                <span className="text-[11px] text-slate-400 block mb-1">Product</span>
                <span className="font-bold text-white text-sm">{order.product_type || 'CNC'}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {order.product_type === 'MIS' ? 'Intraday (Margin)' : 'Delivery'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#141c2e]/70 border border-slate-800/70">
                <span className="text-[11px] text-slate-400 block mb-1">Order Type</span>
                <span className="font-bold text-white text-sm">{order.order_type}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {order.order_type === 'MARKET' ? 'Immediate Fill' : 'Conditional'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#141c2e]/70 border border-slate-800/70">
                <span className="text-[11px] text-slate-400 block mb-1">Quantity</span>
                <span className="font-bold text-white text-sm tabular-nums">
                  {order.filled_qty !== undefined ? `${order.filled_qty} / ${order.quantity}` : order.quantity}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Shares</span>
              </div>

              <div className="p-3 rounded-xl bg-[#141c2e]/70 border border-slate-800/70">
                <span className="text-[11px] text-slate-400 block mb-1">Order Price</span>
                <span className="font-bold text-white text-sm tabular-nums">{orderPriceDisplay}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {order.order_type === 'MARKET' ? 'At Market' : 'Limit'}
                </span>
              </div>
            </div>
          </div>

          {/* EXECUTION DETAILS */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Execution &amp; Audit</h4>
            <div className="divide-y divide-slate-800/80 rounded-xl bg-[#141c2e]/70 border border-slate-800/70 overflow-hidden">
              <div className="flex items-center justify-between p-3">
                <span className="text-slate-400">Execution Status</span>
                <span className="font-medium text-white">{order.status}</span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-slate-400">Average Executed Price</span>
                <span className="font-bold text-white tabular-nums">{executedPriceDisplay}</span>
              </div>
              {totalTurnover > 0 && (
                <div className="flex items-center justify-between p-3">
                  <span className="text-slate-400">Gross Traded Turnover</span>
                  <span className="font-bold text-emerald-400 tabular-nums">
                    ₹{totalTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {order.trigger_price ? (
                <div className="flex items-center justify-between p-3">
                  <span className="text-slate-400">Stop-Loss Trigger Price</span>
                  <span className="font-bold text-amber-400 tabular-nums">₹{Number(order.trigger_price).toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between p-3">
                <span className="text-slate-400">Order Placed At</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {order.created_at ? new Date(order.created_at).toLocaleString('en-IN') : '—'}
                </span>
              </div>
              {order.executed_at && (
                <div className="flex items-center justify-between p-3">
                  <span className="text-slate-400">Executed At</span>
                  <span className="font-mono text-slate-300 text-[11px]">
                    {new Date(order.executed_at).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              {order.cancelled_at && (
                <div className="flex items-center justify-between p-3">
                  <span className="text-slate-400">Cancelled At</span>
                  <span className="font-mono text-slate-300 text-[11px]">
                    {new Date(order.cancelled_at).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CHARGES BREAKDOWN (IF AVAILABLE) */}
          {charges && charges.breakdown && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Indian Regulatory &amp; Brokerage Charges</span>
                </h4>
                <span className="text-[11px] font-bold text-slate-300">
                  Total: ₹{Number(charges.totalCharges || 0).toFixed(2)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141c2e]/60 border border-slate-800/70 space-y-2 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Brokerage (Capped at ₹20)</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.brokerage || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Securities Transaction Tax (STT/CTT)</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.stt || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Exchange Transaction Charges (NSE/BSE)</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.exchangeTxn || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST (18% on Brokerage &amp; Charges)</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.gst || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>SEBI Turnover Fees</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.sebi || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Stamp Duty</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.stampDuty || 0).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white">
                  <span>Net Estimated Total Required</span>
                  <span className="font-mono text-emerald-400">
                    ₹{Number(charges.netAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-[#131b2e]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPending && onModify && (
              <button
                onClick={() => onModify(order)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modify Order</span>
              </button>
            )}
            {isPending && onCancel && (
              <button
                onClick={() => onCancel(order)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Order</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-all border border-slate-700/60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

