'use client';

import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ShieldAlert } from 'lucide-react';
import type { TradingSymbol } from '@/lib/tradingview/symbols';
import type { MarketQuote } from './terminalTypes';
import { formatRupees } from './terminalTypes';

export default function OrderPanel({
  instrument,
  quote,
  availableCash,
  onSubmitted,
}: {
  instrument: TradingSymbol | null;
  quote: MarketQuote | null;
  availableCash: number | null;
  onSubmitted: () => void;
}) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'SL' | 'SL-M'>('MARKET');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const qty = Number(quantity);
  const referencePrice = orderType === 'LIMIT' ? Number(price) : quote?.last || 0;
  const value = Number.isInteger(qty) && qty > 0 && referencePrice > 0 ? qty * referencePrice : null;
  const supportedSymbol = instrument?.exchange === 'NSE';
  const verifiedQuote = Boolean(quote && quote.delaySeconds === 0 && Date.now() - Date.parse(quote.asOf) <= 60_000);
  const canSubmit = Boolean(instrument?.tradable && supportedSymbol && verifiedQuote && !busy && value !== null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !instrument || !quote) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/paper-trading/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: instrument.id,
          side,
          orderType,
          productType: 'CNC',
          quantity: qty,
          ...(orderType === 'LIMIT' ? { price: Number(price) } : {}),
          ...((orderType === 'SL' || orderType === 'SL-M') ? { triggerPrice: Number(triggerPrice) } : {}),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) throw new Error(payload.error || payload.message || 'Order was rejected.');
      setMessage({ text: payload.message || `Paper ${side.toLowerCase()} order submitted.`, ok: true });
      onSubmitted();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Order could not be submitted.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const reason = !instrument ? 'Select an instrument to prepare an order.'
    : !supportedSymbol ? 'The current paper engine accepts NSE symbols only.'
      : !quote ? 'Order entry requires a verified provider quote.'
        : quote.delaySeconds > 0 ? 'Delayed quotes cannot be used for execution.'
          : !verifiedQuote ? 'Quote is stale. Refresh market data before trading.'
            : null;

  return (
    <section className="rounded-lg border border-slate-800 bg-[#0d131b]">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-3">
        <div><h2 className="text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-200">Paper order</h2><p className="mt-1 text-[9px] text-slate-500">Routes to the existing MAXLITH ledger</p></div>
        <span className="rounded border border-amber-900/70 bg-amber-950/30 px-1.5 py-1 text-[8px] font-semibold tracking-wide text-amber-300">SIMULATED</span>
      </div>
      <form onSubmit={submit} className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-[#090e14] p-1">
          <button type="button" aria-pressed={side === 'BUY'} onClick={() => setSide('BUY')} className={`flex h-8 items-center justify-center gap-1 rounded text-[11px] font-semibold ${side === 'BUY' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-200'}`}><ArrowDownToLine className="h-3.5 w-3.5" />Buy</button>
          <button type="button" aria-pressed={side === 'SELL'} onClick={() => setSide('SELL')} className={`flex h-8 items-center justify-center gap-1 rounded text-[11px] font-semibold ${side === 'SELL' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-slate-200'}`}><ArrowUpFromLine className="h-3.5 w-3.5" />Sell</button>
        </div>
        <div className="flex items-center justify-between rounded-md border border-slate-800 bg-[#101723] px-2.5 py-2">
          <div><p className="text-[9px] uppercase text-slate-500">Instrument</p><p className="mt-0.5 truncate text-[11px] font-semibold text-slate-100">{instrument?.symbol || '—'} <span className="font-normal text-slate-500">{instrument?.exchange || ''}</span></p></div>
          <div className="text-right"><p className="text-[9px] uppercase text-slate-500">Verified LTP</p><p className="mt-0.5 text-[11px] tabular-nums text-slate-100">{quote ? formatRupees(quote.last) : '—'}</p></div>
        </div>
        <label className="block text-[10px] text-slate-400">Order type
          <select value={orderType} onChange={(event) => setOrderType(event.target.value as typeof orderType)} className="mt-1 h-8 w-full rounded border border-slate-800 bg-[#101723] px-2 text-[11px] text-slate-200 outline-none focus:border-blue-500">
            <option value="MARKET">Market</option><option value="LIMIT">Limit</option><option value="SL">Stop market</option><option value="SL-M">Stop loss market</option><option value="STOP_LIMIT" disabled>Stop limit · unavailable</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[10px] text-slate-400">Quantity
            <input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 h-8 w-full rounded border border-slate-800 bg-[#101723] px-2 text-[11px] tabular-nums text-white outline-none focus:border-blue-500" />
          </label>
          {orderType === 'LIMIT' ? <label className="block text-[10px] text-slate-400">Limit price
            <input type="number" min="0.05" step="0.05" value={price} onChange={(event) => setPrice(event.target.value)} placeholder={quote ? quote.last.toFixed(2) : '—'} className="mt-1 h-8 w-full rounded border border-slate-800 bg-[#101723] px-2 text-[11px] tabular-nums text-white outline-none focus:border-blue-500" />
          </label> : (orderType === 'SL' || orderType === 'SL-M') ? <label className="block text-[10px] text-slate-400">Trigger price
            <input type="number" min="0.05" step="0.05" value={triggerPrice} onChange={(event) => setTriggerPrice(event.target.value)} placeholder={quote ? quote.last.toFixed(2) : '—'} className="mt-1 h-8 w-full rounded border border-slate-800 bg-[#101723] px-2 text-[11px] tabular-nums text-white outline-none focus:border-blue-500" />
          </label> : <div className="flex items-end pb-2 text-[9px] text-slate-500">Market execution</div>}
        </div>
        <div className="space-y-1 border-y border-slate-800 py-2 text-[10px]">
          <div className="flex justify-between text-slate-500"><span>Available cash</span><span className="tabular-nums text-slate-300">{availableCash === null ? '—' : formatRupees(availableCash)}</span></div>
          <div className="flex justify-between text-slate-500"><span>Estimated order value</span><span className="tabular-nums text-slate-300">{value === null ? '—' : formatRupees(value)}</span></div>
          {(orderType === 'SL' || orderType === 'SL-M') && quote && Number(triggerPrice) > 0 && <div className="flex justify-between text-slate-500"><span>Trigger distance</span><span className="tabular-nums text-slate-300">{formatRupees(Math.abs(quote.last - Number(triggerPrice)) * qty)}</span></div>}
        </div>
        {reason && <div className="flex gap-2 rounded-md border border-amber-900/50 bg-amber-950/20 p-2 text-[9px] leading-4 text-amber-200"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{reason}</span></div>}
        <button type="submit" disabled={!canSubmit} className={`h-9 w-full rounded text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 ${side === 'BUY' ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-rose-600 text-white hover:bg-rose-500'}`}>
          {busy ? 'Submitting…' : `Place ${side.toLowerCase()} order`}
        </button>
        {message && <p role="status" className={`text-[10px] leading-4 ${message.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{message.text}</p>}
      </form>
    </section>
  );
}
