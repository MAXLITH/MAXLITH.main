'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ArrowUpRight, ArrowDownRight, ShieldCheck, FileText } from 'lucide-react';

interface TradeDetailsModalProps {
  trade: any;
  instrument?: any;
  onClose: () => void;
}

export function TradeDetailsModal({ trade, instrument, onClose }: TradeDetailsModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!trade) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  let charges: any = null;
  if (trade.charges_json) {
    try {
      charges = typeof trade.charges_json === 'string' ? JSON.parse(trade.charges_json) : trade.charges_json;
    } catch {}
  }

  const isBuy = trade.side === 'BUY';
  const turnover = Number(trade.quantity) * Number(trade.price);
  const totalCharges = charges?.totalCharges || 0;
  const netAmount = isBuy ? turnover + totalCharges : turnover - totalCharges;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#0f1523] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
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
                <h3 className="text-lg font-bold text-white tracking-tight">{trade.symbol}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                  {instrument?.exchange || 'NSE'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {trade.side}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                {instrument?.name || `${trade.symbol} Equity`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* IDS BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141c2e] border border-slate-800">
              <span className="text-slate-400 text-[10px]">Trade ID:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-[11px] font-semibold">{trade.id}</span>
                <button
                  onClick={() => handleCopy(trade.id, 'trade')}
                  className="p-1 hover:text-white text-slate-400"
                  title="Copy Trade ID"
                >
                  {copiedId === 'trade' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141c2e] border border-slate-800">
              <span className="text-slate-400 text-[10px]">Order ID:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-[11px] font-semibold">{trade.order_id}</span>
                <button
                  onClick={() => handleCopy(trade.order_id, 'order')}
                  className="p-1 hover:text-white text-slate-400"
                  title="Copy Order ID"
                >
                  {copiedId === 'order' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* TRADE OVERVIEW */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Execution Details</h4>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-[#141c2e]/70 border border-slate-800/70">
                <span className="text-[10px] text-slate-400 block mb-1">Quantity</span>
                <span className="font-bold text-white text-base tabular-nums">{trade.quantity}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Shares</span>
              </div>
              <div className="p-3 rounded-xl bg-[#141c2e]/70 border border-slate-800/70">
                <span className="text-[10px] text-slate-400 block mb-1">Execution Price</span>
                <span className="font-bold text-white text-base tabular-nums">₹{Number(trade.price).toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Per share</span>
              </div>
              <div className="p-3 rounded-xl bg-[#141c2e]/70 border border-slate-800/70">
                <span className="text-[10px] text-slate-400 block mb-1">Gross Turnover</span>
                <span className="font-bold text-emerald-400 text-base tabular-nums">
                  ₹{turnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Qty × Price</span>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-800/80 rounded-xl bg-[#141c2e]/70 border border-slate-800/70 overflow-hidden text-xs">
            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Execution Time</span>
              <span className="font-mono text-slate-200">
                {trade.created_at ? new Date(trade.created_at).toLocaleString('en-IN') : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Product / Type</span>
              <span className="font-semibold text-white">{trade.product_type || 'CNC'} • {trade.order_type || 'MARKET'}</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Total Statutory Charges</span>
              <span className="font-mono text-slate-200">₹{Number(totalCharges).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#101726]/70">
              <span className="text-slate-300 font-semibold">{isBuy ? 'Net Cash Debited' : 'Net Cash Credited'}</span>
              <span className="font-bold font-mono text-white text-sm">
                ₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* CHARGES BREAKDOWN */}
          {charges && charges.breakdown && (
            <div>
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Regulatory Fees Breakdown</span>
              </h4>
              <div className="p-3 rounded-xl bg-[#141c2e]/50 border border-slate-800/60 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Brokerage</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.brokerage || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>STT / CTT</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.stt || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Exchange Txn</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.exchangeTxn || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST (18%)</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.gst || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Stamp Duty</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.stampDuty || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-[#131b2e]/60 flex items-center justify-end">
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

