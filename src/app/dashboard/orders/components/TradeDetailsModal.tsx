'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';

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
        className="w-full max-w-lg bg-[#0d131b] border border-max-border rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-max-border bg-[#101723] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded flex items-center justify-center font-bold text-xs ${
              isBuy 
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-900/40' 
                : 'bg-rose-500/15 text-rose-300 border border-rose-900/40'
            }`}>
              {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 tracking-tight">{trade.symbol}</h3>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#101723] text-max-text-muted border border-max-border">
                  {instrument?.exchange || 'NSE'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                  isBuy ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50' : 'bg-rose-950/40 text-rose-300 border-rose-900/50'
                }`}>
                  {trade.side}
                </span>
              </div>
              <p className="text-[11px] text-max-text-muted truncate max-w-xs mt-0.5">
                {instrument?.name || `${trade.symbol} Equity`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded border border-max-border bg-[#101723] hover:bg-max-surface text-max-text-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* IDS BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono">
            <div className="flex items-center justify-between p-2.5 rounded border border-max-border bg-[#101723]">
              <span className="text-max-text-muted text-[10px]">Trade ID:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-100 text-[11px] font-semibold">{trade.id}</span>
                <button
                  onClick={() => handleCopy(trade.id, 'trade')}
                  className="p-1 hover:text-white text-max-text-muted"
                  title="Copy Trade ID"
                >
                  {copiedId === 'trade' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded border border-max-border bg-[#101723]">
              <span className="text-max-text-muted text-[10px]">Order ID:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-100 text-[11px] font-semibold">{trade.order_id}</span>
                <button
                  onClick={() => handleCopy(trade.order_id, 'order')}
                  className="p-1 hover:text-white text-max-text-muted"
                  title="Copy Order ID"
                >
                  {copiedId === 'order' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* TRADE OVERVIEW */}
          <div>
            <h4 className="text-[10px] font-semibold text-max-text-muted uppercase tracking-wider mb-2.5">Execution Details</h4>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded border border-max-border bg-[#101723]">
                <span className="text-[10px] text-max-text-muted block mb-0.5">Quantity</span>
                <span className="font-semibold text-slate-100 text-sm tabular-nums">{trade.quantity}</span>
                <span className="text-[10px] text-max-text-muted block mt-0.5">Shares</span>
              </div>
              <div className="p-2.5 rounded border border-max-border bg-[#101723]">
                <span className="text-[10px] text-max-text-muted block mb-0.5">Execution Price</span>
                <span className="font-semibold text-slate-100 text-sm tabular-nums">₹{Number(trade.price).toFixed(2)}</span>
                <span className="text-[10px] text-max-text-muted block mt-0.5">Per share</span>
              </div>
              <div className="p-2.5 rounded border border-max-border bg-[#101723]">
                <span className="text-[10px] text-max-text-muted block mb-0.5">Gross Turnover</span>
                <span className="font-semibold text-emerald-400 text-sm tabular-nums">
                  ₹{turnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-max-text-muted block mt-0.5">Qty × Price</span>
              </div>
            </div>
          </div>

          <div className="divide-y divide-max-border/60 rounded border border-max-border bg-[#101723] overflow-hidden text-xs">
            <div className="flex items-center justify-between p-2.5">
              <span className="text-max-text-muted">Execution Time</span>
              <span className="font-mono text-slate-200">
                {trade.created_at ? new Date(trade.created_at).toLocaleString('en-IN') : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5">
              <span className="text-max-text-muted">Product / Type</span>
              <span className="font-semibold text-slate-100">{trade.product_type || 'CNC'} • {trade.order_type || 'MARKET'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5">
              <span className="text-max-text-muted">Total Statutory Charges</span>
              <span className="font-mono text-slate-200">₹{Number(totalCharges).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-[#141b24]/60">
              <span className="text-slate-200 font-semibold">{isBuy ? 'Net Cash Debited' : 'Net Cash Credited'}</span>
              <span className="font-bold font-mono text-white text-sm">
                ₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* CHARGES BREAKDOWN */}
          {charges && charges.breakdown && (
            <div>
              <h4 className="text-[10px] font-semibold text-max-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Regulatory Fees Breakdown</span>
              </h4>
              <div className="p-3 rounded border border-max-border bg-[#101723] space-y-1.5 text-[11px]">
                <div className="flex justify-between text-max-text-muted">
                  <span>Brokerage</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.brokerage || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-max-text-muted">
                  <span>STT / CTT</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.stt || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-max-text-muted">
                  <span>Exchange Txn</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.exchangeTxn || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-max-text-muted">
                  <span>GST (18%)</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.gst || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-max-text-muted">
                  <span>Stamp Duty</span>
                  <span className="font-mono text-slate-200">₹{Number(charges.breakdown.stampDuty || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-max-border bg-[#101723] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded border border-max-border bg-[#101723] hover:bg-max-surface text-max-text-secondary hover:text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

