'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Bell, ChevronDown, CircleDollarSign, Maximize2, PanelBottomClose, PanelLeftClose, PanelRightClose, RefreshCw } from 'lucide-react';
import type { MarketBar } from '@/lib/tradingview/datafeed';
import { normalizeSymbol, toTradingSymbol, type TradingSymbol } from '@/lib/tradingview/symbols';
import type { Resolution } from '@/lib/tradingview/resolutions';
import { RESOLUTIONS } from '@/lib/tradingview/resolutions';
import type { ChartType } from '@/lib/tradingview/chartConfig';
import type { OverlayIndicator } from './TradingChart';
import TradingChart from './TradingChart';
import ChartToolbar from './ChartToolbar';
import SymbolSearch from './SymbolSearch';
import Watchlist from './Watchlist';
import OrderPanel from './OrderPanel';
import PositionsPanel, { type PositionRow } from './PositionsPanel';
import OrdersPanel, { type OrderRow } from './OrdersPanel';
import TradeHistory, { type TradeRow } from './TradeHistory';
import AlertsPanel, { type AlertRow } from './AlertsPanel';
import MarketDepth from './MarketDepth';
import NewsPanel from './NewsPanel';
import FundamentalsPanel from './FundamentalsPanel';
import AIAnalysisPanel from './AIAnalysisPanel';
import { formatRupees } from './terminalTypes';
import type { MarketQuote, WatchlistEntry, WatchlistSummary } from './terminalTypes';
import { MarketRealtimeClient, type RealtimeStatus } from '@/lib/tradingview/realtime';

type ProviderStatus = { configured: boolean; provider: string | null; streamingAvailable: boolean; source: string };
type TerminalTab = 'POSITIONS' | 'ORDERS' | 'TRADES' | 'ALERTS' | 'DEPTH' | 'NEWS' | 'FUNDAMENTALS' | 'AI';

const TABS: { id: TerminalTab; label: string }[] = [
  { id: 'POSITIONS', label: 'Positions' }, { id: 'ORDERS', label: 'Orders' }, { id: 'TRADES', label: 'Trade history' },
  { id: 'ALERTS', label: 'Alerts' }, { id: 'DEPTH', label: 'Market depth' }, { id: 'NEWS', label: 'News' },
  { id: 'FUNDAMENTALS', label: 'Fundamentals' }, { id: 'AI', label: 'AI analysis' },
];

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload as T;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Market data unavailable.';
}

function getResolutionSeconds(res: Resolution): number {
  switch (res) {
    case '1': return 60;
    case '3': return 180;
    case '5': return 300;
    case '15': return 900;
    case '30': return 1800;
    case '60': return 3600;
    case '120': return 7200;
    case '240': return 14400;
    case '1D': return 86400;
    case '1W': return 604800;
    case '1M': return 2592000;
    default: return 86400;
  }
}

export default function TradingTerminal() {
  const [instrument, setInstrument] = useState<TradingSymbol | null>(null);
  const [exchange, setExchange] = useState<'NSE' | 'BSE'>('NSE');
  const [quoteBySymbol, setQuoteBySymbol] = useState<Record<string, MarketQuote | undefined>>({});
  const [bars, setBars] = useState<MarketBar[]>([]);
  const [provider, setProvider] = useState<ProviderStatus>({ configured: false, provider: null, streamingAvailable: false, source: 'UNAVAILABLE' });
  const [marketSession, setMarketSession] = useState<{ session?: string; isOpen?: boolean } | null>(null);
  const [feedMessage, setFeedMessage] = useState('Checking market-data connection…');
  const [chartMessage, setChartMessage] = useState('');
  const [resolution, setResolution] = useState<Resolution>('1D');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [indicators, setIndicators] = useState<OverlayIndicator[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('OFFLINE');
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [activeTab, setActiveTab] = useState<TerminalTab>('POSITIONS');
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [showOrderPanel, setShowOrderPanel] = useState(true);
  const [showAccountPanel, setShowAccountPanel] = useState(true);
  const [maxChart, setMaxChart] = useState(false);
  const [watchlists, setWatchlists] = useState<WatchlistSummary[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState('');
  const [watchlistEntries, setWatchlistEntries] = useState<WatchlistEntry[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [availableCash, setAvailableCash] = useState<number | null>(null);
  const [portfolioError, setPortfolioError] = useState('');
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  const selectedId = instrument?.id || '';
  const quote = selectedId ? quoteBySymbol[selectedId] || null : null;
  const isPositive = (quote?.change ?? 0) >= 0;

  const loadWatchlist = useCallback(async (watchlistId?: string) => {
    const suffix = watchlistId ? `?watchlistId=${encodeURIComponent(watchlistId)}` : '';
    const payload = await jsonRequest<{ watchlists: WatchlistSummary[]; watchlist: WatchlistSummary; items: { item_id: string; symbol: string; name: string; exchange: string }[] }>(`/api/watchlist${suffix}`);
    const lists = payload.watchlists || [];
    const active = payload.watchlist || lists[0];
    setWatchlists(lists);
    setActiveWatchlistId(active?.id || '');
    setWatchlistEntries((payload.items || []).map((item) => {
      let id: string;
      try { id = normalizeSymbol(item.symbol); } catch { id = normalizeSymbol(item.symbol, item.exchange === 'BSE' ? 'BSE' : 'NSE'); }
      const [listedExchange, ticker] = id.split(':') as ['NSE' | 'BSE', string];
      return { ...toTradingSymbol({ symbol: ticker, exchange: listedExchange, name: item.name }), id, itemId: item.item_id };
    }));
  }, []);

  const loadAccountData = useCallback(async () => {
    const [portfolio, orderData, tradeData, alertData] = await Promise.allSettled([
      jsonRequest<{ data?: { summary?: { availableCash?: number }; positions?: PositionRow[] } }>('/api/paper-trading/portfolio'),
      jsonRequest<{ orders?: OrderRow[] }>('/api/paper-trading/orders'),
      jsonRequest<{ trades?: TradeRow[] }>('/api/paper-trading/trades'),
      jsonRequest<{ alerts?: AlertRow[] }>('/api/alerts'),
    ]);
    if (portfolio.status === 'fulfilled') {
      const summary = portfolio.value.data?.summary;
      setAvailableCash(Number.isFinite(summary?.availableCash) ? summary!.availableCash! : null);
      setPositions(portfolio.value.data?.positions || []);
      setPortfolioError('');
    } else setPortfolioError(errorText(portfolio.reason));
    if (orderData.status === 'fulfilled') setOrders(orderData.value.orders || []);
    if (tradeData.status === 'fulfilled') setTrades(tradeData.value.trades || []);
    if (alertData.status === 'fulfilled') setAlerts(alertData.value.alerts || []);
  }, []);

  const loadMarketData = useCallback(async (target: TradingSymbol, targetResolution: Resolution, signal?: AbortSignal) => {
    if (!provider.configured) {
      setQuoteBySymbol((current) => ({ ...current, [target.id]: undefined }));
      setBars([]);
      setFeedMessage('Market data unavailable · configure a licensed NSE/BSE provider to view prices.');
      setChartMessage('Historical bars are unavailable because no market-data provider is configured.');
      return;
    }

    setLoadingMarket(true);
    setFeedMessage('Fetching provider quote…');
    setChartMessage('');
    const quoteRequest = fetch(`/api/market/quote?symbol=${encodeURIComponent(target.id)}`, { signal, cache: 'no-store' }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Quote unavailable (${response.status})`);
      return payload.data as MarketQuote;
    });
    const resolutionRequest = fetch(`/api/market/history?symbol=${encodeURIComponent(target.id)}&resolution=${targetResolution}&countback=500`, { signal, cache: 'no-store' }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Historical bars unavailable (${response.status})`);
      return Array.isArray(payload.data) ? payload.data as MarketBar[] : [];
    });
    const [quoteResult, barsResult] = await Promise.allSettled([quoteRequest, resolutionRequest]);
    if (signal?.aborted) return;
    if (quoteResult.status === 'fulfilled') {
      setQuoteBySymbol((current) => ({ ...current, [target.id]: quoteResult.value }));
      const delay = quoteResult.value.delaySeconds > 0 ? ` · ${quoteResult.value.delaySeconds}s delayed` : '';
      setFeedMessage(`${quoteResult.value.source} · snapshot ${new Date(quoteResult.value.asOf).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}${delay}`);
    } else {
      setQuoteBySymbol((current) => ({ ...current, [target.id]: undefined }));
      setFeedMessage(errorText(quoteResult.reason));
    }
    if (barsResult.status === 'fulfilled') {
      setBars(barsResult.value);
      if (!barsResult.value.length) setChartMessage('No historical bars were returned for this symbol and timeframe.');
    } else {
      setBars([]);
      setChartMessage(errorText(barsResult.reason));
    }
    setLoadingMarket(false);
  }, [provider.configured]);

  useEffect(() => {
    jsonRequest<{ data?: { provider?: ProviderStatus; marketStatus?: { session?: string; isOpen?: boolean } | null } }>('/api/market/config')
      .then((payload) => {
        const status = payload.data?.provider || { configured: false, provider: null, streamingAvailable: false, source: 'UNAVAILABLE' };
        setProvider(status);
        setMarketSession(payload.data?.marketStatus || null);
        if (!status.configured) setFeedMessage('Market data unavailable · no licensed provider configured.');
      })
      .catch((error) => setFeedMessage(errorText(error)));
    loadWatchlist().catch((error) => console.error('Watchlist load failed', error));
    loadAccountData();
    try {
      const saved = localStorage.getItem('maxlith-terminal-layout-v1');
      if (saved) {
        const layout = JSON.parse(saved) as { symbol?: string; resolution?: Resolution; chartType?: ChartType; indicators?: OverlayIndicator[]; showWatchlist?: boolean; showOrderPanel?: boolean; showAccountPanel?: boolean };
        if (layout.symbol) setInstrument(toTradingSymbol({ symbol: layout.symbol.split(':')[1], exchange: layout.symbol.split(':')[0] }));
        if (RESOLUTIONS.some((item) => item.value === layout.resolution)) setResolution(layout.resolution!);
        if (layout.chartType) setChartType(layout.chartType);
        if (layout.indicators) setIndicators(layout.indicators);
        if (layout.showWatchlist !== undefined) setShowWatchlist(layout.showWatchlist);
        if (layout.showOrderPanel !== undefined) setShowOrderPanel(layout.showOrderPanel);
        if (layout.showAccountPanel !== undefined) setShowAccountPanel(layout.showAccountPanel);
      }
      const initialSymbol = new URLSearchParams(window.location.search).get('symbol');
      if (initialSymbol) {
        const normalized = normalizeSymbol(initialSymbol);
        const [listedExchange, ticker] = normalized.split(':') as ['NSE' | 'BSE', string];
        setExchange(listedExchange);
        setInstrument(toTradingSymbol({ symbol: ticker, exchange: listedExchange }));
      }
    } catch {
      // Invalid browser preferences are ignored.
    }
    setLayoutLoaded(true);
  }, [loadAccountData, loadWatchlist]);

  useEffect(() => {
    if (!instrument) return;
    const controller = new AbortController();
    loadMarketData(instrument, resolution, controller.signal).catch((error) => {
      if (!controller.signal.aborted) setFeedMessage(errorText(error));
    });
    return () => controller.abort();
  }, [instrument, resolution, loadMarketData]);

  useEffect(() => {
    if (!provider.configured || !watchlistEntries.length) return;
    const controller = new AbortController();
    Promise.all(watchlistEntries.map(async (entry) => {
      try {
        const response = await fetch(`/api/market/quote?symbol=${encodeURIComponent(entry.id)}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) return null;
        const payload = await response.json();
        return [entry.id, payload.data as MarketQuote] as const;
      } catch { return null; }
    })).then((rows) => {
      if (controller.signal.aborted) return;
      setQuoteBySymbol((current) => ({ ...current, ...Object.fromEntries(rows.filter((row): row is NonNullable<typeof row> => row !== null)) }));
    });
    return () => controller.abort();
  }, [provider.configured, watchlistEntries]);

  useEffect(() => {
    if (!provider.configured) {
      setRealtimeStatus('OFFLINE');
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_MARKET_WS_URL;
    let socketClient: MarketRealtimeClient | null = null;
    let eventSource: EventSource | null = null;
    let unsubWs = () => {};

    const activeSymbols = Array.from(
      new Set([
        selectedId,
        ...watchlistEntries.map((e) => e.id),
        ...positions.map((p) => `NSE:${p.symbol}`),
      ].filter(Boolean))
    );

    if (wsUrl && selectedId) {
      const tokenProvider = async () => {
        const response = await fetch('/api/market/stream-token', { cache: 'no-store' });
        if (!response.ok) return null;
        const payload = await response.json();
        return typeof payload.token === 'string' ? payload.token : null;
      };

      socketClient = new MarketRealtimeClient(wsUrl, setRealtimeStatus, tokenProvider);
      unsubWs = socketClient.subscribe(
        selectedId,
        (message) => {
          if (message.type === 'quote_update') {
            const liveQuote = message.data as unknown as MarketQuote;
            setQuoteBySymbol((current) => ({ ...current, [selectedId]: liveQuote }));
            setFeedMessage(`Upstox Live Stream · ${new Date(liveQuote.asOf || Date.now()).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
          }
          if (message.type === 'bar_update') {
            setBars((current) => {
              const next = message.data;
              const last = current[current.length - 1];
              if (!last) return [next];
              if (next.time === last.time) return [...current.slice(0, -1), next];
              if (next.time > last.time) return [...current, next];
              return current;
            });
          }
        },
        resolution
      );
    } else if (activeSymbols.length > 0) {
      const querySymbols = activeSymbols.join(',');
      const sseUrl = `/api/stream/quotes?symbols=${encodeURIComponent(querySymbols)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setRealtimeStatus('LIVE');
      };

      eventSource.onerror = () => {
        setRealtimeStatus('RECONNECTING');
      };

      eventSource.addEventListener('quotes', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          const quotesList: MarketQuote[] = payload.quotes || [];
          if (!quotesList.length) return;

          setRealtimeStatus('LIVE');

          const updateMap: Record<string, MarketQuote> = {};
          let selectedQuote: MarketQuote | null = null;

          for (const q of quotesList) {
            const symKey = q.symbol.includes(':') ? q.symbol : `NSE:${q.symbol}`;
            updateMap[symKey] = q;
            updateMap[q.symbol] = q;
            if (symKey === selectedId || q.symbol === selectedId || q.symbol === instrument?.symbol) {
              selectedQuote = q;
            }
          }

          setQuoteBySymbol((current) => ({ ...current, ...updateMap }));

          if (selectedQuote) {
            const ltp = selectedQuote.last;
            const quoteTime = new Date(selectedQuote.asOf || payload.timestamp || Date.now()).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
            setFeedMessage(`Upstox Live Stream · Updated ${quoteTime} IST`);

            if (ltp && ltp > 0) {
              setBars((currentBars) => {
                if (!currentBars || currentBars.length === 0) return currentBars;
                const lastBar = currentBars[currentBars.length - 1];
                const nowSec = Math.floor(Date.now() / 1000);
                const intervalSec = getResolutionSeconds(resolution);
                const candleTime = Math.floor(nowSec / intervalSec) * intervalSec;

                if (lastBar.time === candleTime) {
                  const updatedBar: MarketBar = {
                    ...lastBar,
                    high: Math.max(lastBar.high, ltp),
                    low: Math.min(lastBar.low, ltp),
                    close: ltp,
                    volume: Math.max(lastBar.volume, selectedQuote!.volume || lastBar.volume),
                  };
                  return [...currentBars.slice(0, -1), updatedBar];
                } else if (candleTime > lastBar.time) {
                  const newBar: MarketBar = {
                    time: candleTime,
                    open: ltp,
                    high: ltp,
                    low: ltp,
                    close: ltp,
                    volume: selectedQuote!.volume || 0,
                  };
                  return [...currentBars, newBar];
                }
                return currentBars;
              });
            }
          }
        } catch {
          /* Parse error ignored */
        }
      });
    }

    return () => {
      unsubWs();
      socketClient?.disconnect();
      if (eventSource) eventSource.close();
    };
  }, [provider.configured, selectedId, watchlistEntries, positions, resolution, instrument?.symbol]);

  useEffect(() => {
    if (!layoutLoaded) return;
    try {
      localStorage.setItem('maxlith-terminal-layout-v1', JSON.stringify({
        symbol: selectedId, resolution, chartType, indicators, showWatchlist, showOrderPanel, showAccountPanel,
      }));
    } catch { /* Browser storage may be disabled. */ }
  }, [layoutLoaded, selectedId, resolution, chartType, indicators, showWatchlist, showOrderPanel, showAccountPanel]);

  useEffect(() => {
    if (!provider.configured || !positions.length) return;
    const controller = new AbortController();
    Promise.all(positions.map(async (position) => {
      const id = `NSE:${position.symbol}`;
      try {
        const response = await fetch(`/api/market/quote?symbol=${encodeURIComponent(id)}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) return null;
        const payload = await response.json();
        return [id, payload.data as MarketQuote] as const;
      } catch { return null; }
    })).then((rows) => {
      if (!controller.signal.aborted) setQuoteBySymbol((current) => ({ ...current, ...Object.fromEntries(rows.filter((row): row is NonNullable<typeof row> => row !== null)) }));
    });
    return () => controller.abort();
  }, [provider.configured, positions]);

  const marketStatusLabel = marketSession?.session?.replaceAll('_', ' ') || 'SESSION UNKNOWN';
  const connectionLabel = realtimeStatus === 'LIVE' ? 'LIVE' : realtimeStatus === 'RECONNECTING' ? 'RECONNECTING' : 'OFFLINE';
  const changeLabel = quote ? `${quote.change > 0 ? '+' : ''}${quote.change.toFixed(2)} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)` : '—';

  const handleSelect = (selected: TradingSymbol) => {
    setInstrument(selected);
    setExchange(selected.exchange);
    setBars([]);
    setActiveTab('POSITIONS');
  };

  const activeQuoteAge = quote ? Date.now() - Date.parse(quote.asOf) : Infinity;
  const quoteLive = Boolean(quote && quote.delaySeconds === 0 && activeQuoteAge >= -5_000 && activeQuoteAge <= 60_000);

  const addSelected = async () => {
    if (!instrument || !activeWatchlistId) throw new Error('Select an instrument and watchlist first.');
    await jsonRequest('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: instrument.id, watchlistId: activeWatchlistId }) });
    await loadWatchlist(activeWatchlistId);
  };
  const removeFromWatchlist = async (symbol: string) => {
    await jsonRequest(`/api/watchlist?symbol=${encodeURIComponent(symbol)}&watchlistId=${encodeURIComponent(activeWatchlistId)}`, { method: 'DELETE' });
    await loadWatchlist(activeWatchlistId);
  };
  const createWatchlist = async (name: string) => {
    const result = await jsonRequest<{ watchlist: WatchlistSummary }>('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    await loadWatchlist(result.watchlist.id);
  };
  const renameWatchlist = async (name: string) => {
    await jsonRequest('/api/watchlist', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ watchlistId: activeWatchlistId, name }) });
    await loadWatchlist(activeWatchlistId);
  };
  const deleteWatchlist = async () => {
    if (!activeWatchlistId) return;
    await jsonRequest(`/api/watchlist?deleteList=true&watchlistId=${encodeURIComponent(activeWatchlistId)}`, { method: 'DELETE' });
    await loadWatchlist();
  };
  const reorderWatchlist = async (symbols: string[]) => {
    await jsonRequest('/api/watchlist', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ watchlistId: activeWatchlistId, symbols }) });
    await loadWatchlist(activeWatchlistId);
  };

  return (
    <div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#090d12] p-3 text-slate-100 sm:p-4">
      <div className="mx-auto max-w-[1800px] space-y-3">
        <header className="flex flex-wrap items-center gap-3 rounded border border-max-border bg-[#0d131b] px-3 py-2.5">
          <div className="flex items-center gap-2 pr-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/15 text-blue-300"><Activity className="h-4 w-4" /></div>
            <div><p className="text-[11px] font-bold tracking-[0.12em] text-slate-100">MAXLITH</p><p className="text-[8px] uppercase tracking-[0.16em] text-max-text-muted">Market terminal</p></div>
          </div>
          <div className="flex h-8 items-center rounded border border-max-border bg-[#101723] px-2">
            <select value={exchange} onChange={(event) => setExchange(event.target.value as 'NSE' | 'BSE')} aria-label="Exchange selector" className="bg-transparent text-[10px] font-semibold text-max-text-primary outline-none"><option>NSE</option><option>BSE</option></select><ChevronDown className="ml-1 h-3 w-3 text-slate-600" />
          </div>
          <SymbolSearch exchange={exchange} onSelect={handleSelect} />
          <div className="flex flex-wrap items-center gap-2 text-[9px]">
            <span className="inline-flex items-center gap-1.5 rounded border border-max-border px-2 py-1.5 text-max-text-secondary"><span className={`h-1.5 w-1.5 rounded ${connectionLabel === 'LIVE' ? 'bg-emerald-400' : connectionLabel === 'RECONNECTING' ? 'bg-amber-400' : 'bg-slate-600'}`} />{connectionLabel}</span>
            <span className="rounded border border-max-border px-2 py-1.5 text-max-text-secondary">{marketStatusLabel}</span>
            <span className="rounded border border-blue-900/60 bg-blue-950/30 px-2 py-1.5 font-semibold text-blue-300">PAPER</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block"><p className="text-[8px] uppercase tracking-wide text-max-text-muted">Available cash</p><p className="mt-0.5 text-[10px] tabular-nums text-slate-200">{availableCash === null ? '—' : formatRupees(availableCash)}</p></div>
            <button type="button" onClick={() => { void loadMarketData(instrument || toTradingSymbol({ symbol: 'RELIANCE', exchange }), resolution); void loadAccountData(); }} title="Refresh market and account data" className="rounded border border-max-border p-2 text-max-text-muted hover:bg-max-surface hover:text-white"><RefreshCw className={`h-3.5 w-3.5 ${loadingMarket ? 'animate-spin' : ''}`} /></button>
            <button type="button" title="Alerts" onClick={() => setActiveTab('ALERTS')} className="rounded border border-max-border p-2 text-max-text-muted hover:bg-max-surface hover:text-white"><Bell className="h-3.5 w-3.5" /></button>
          </div>
        </header>

        <div className="flex items-center justify-between px-0.5">
          <div><h1 className="text-sm font-semibold tracking-wide text-slate-100">Professional trading terminal</h1><p className="mt-0.5 text-[9px] text-max-text-muted">NSE · BSE · verified provider data only · orders route to MAXLITH paper trading</p></div>
          <div className="hidden items-center gap-1 md:flex">
            <button onClick={() => setShowWatchlist((value) => !value)} aria-label="Toggle watchlist" className="rounded border border-max-border p-1.5 text-max-text-muted hover:text-slate-200"><PanelLeftClose className="h-3.5 w-3.5" /></button>
            <button onClick={() => setShowOrderPanel((value) => !value)} aria-label="Toggle order panel" className="rounded border border-max-border p-1.5 text-max-text-muted hover:text-slate-200"><PanelRightClose className="h-3.5 w-3.5" /></button>
            <button onClick={() => setShowAccountPanel((value) => !value)} aria-label="Toggle account panel" className="rounded border border-max-border p-1.5 text-max-text-muted hover:text-slate-200"><PanelBottomClose className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        <div className={`grid items-start gap-3 ${showWatchlist && showOrderPanel ? 'xl:grid-cols-[245px_minmax(0,1fr)_290px]' : showWatchlist ? 'xl:grid-cols-[245px_minmax(0,1fr)]' : showOrderPanel ? 'xl:grid-cols-[minmax(0,1fr)_290px]' : 'xl:grid-cols-1'}`}>
          {showWatchlist && <Watchlist
            lists={watchlists} activeListId={activeWatchlistId} entries={watchlistEntries} selectedSymbol={selectedId} quotes={quoteBySymbol}
            onListChange={(id) => { setActiveWatchlistId(id); void loadWatchlist(id); }} onSelect={handleSelect}
            onAddSelected={addSelected} onRemove={removeFromWatchlist} onCreateList={createWatchlist}
            onRenameList={renameWatchlist} onDeleteList={deleteWatchlist} onReorder={reorderWatchlist}
          />}

          <main className="min-w-0 space-y-3">
            <section className="rounded border border-max-border bg-[#0d131b]">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-max-border px-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h2 className="text-sm font-bold text-white">{instrument?.symbol || 'Select instrument'}</h2>{instrument && <span className="rounded border border-max-border px-1.5 py-0.5 text-[8px] text-max-text-muted">{instrument.exchange}</span>}<span className="truncate text-[10px] text-max-text-muted">{instrument?.name || 'Search NSE or BSE symbols above'}</span></div>
                  <div className="mt-1.5 flex items-baseline gap-2"><span className="text-xl font-semibold tabular-nums tracking-tight">{quote ? formatRupees(quote.last) : '—'}</span><span className={`text-[10px] tabular-nums ${quote ? isPositive ? 'text-max-market-positive' : 'text-rose-400' : 'text-slate-600'}`}>{changeLabel}</span>{quote && <span className="text-[8px] text-slate-600">{quote.delaySeconds > 0 ? `${quote.delaySeconds}s delayed` : 'provider snapshot'}</span>}</div>
                </div>
                <div className="flex items-center gap-1.5"><span className={`rounded px-2 py-1 text-[8px] font-semibold ${quoteLive ? 'bg-emerald-950/50 text-emerald-300' : 'bg-max-surface text-max-text-muted'}`}>{quoteLive ? 'QUOTE CURRENT' : 'NO VERIFIED QUOTE'}</span><button type="button" onClick={() => setMaxChart((value) => !value)} title="Toggle chart focus" className="rounded border border-max-border p-1.5 text-max-text-muted hover:text-white"><Maximize2 className="h-3.5 w-3.5" /></button></div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-max-border px-2.5 py-2"><ChartToolbar chartType={chartType} resolution={resolution} indicators={indicators} onChartTypeChange={setChartType} onResolutionChange={setResolution} onIndicatorsChange={setIndicators} /><div className="flex gap-1"><button disabled title="Drawing tools are not enabled until chart drawing persistence is available" className="h-8 rounded border border-max-border px-2 text-[10px] text-slate-600">Draw</button><button disabled title="Compare requires provider-backed symbol series" className="h-8 rounded border border-max-border px-2 text-[10px] text-slate-600">Compare</button></div></div>
              <div className={`${maxChart ? 'h-[70vh]' : 'h-[390px] sm:h-[470px]'}`}><TradingChart bars={bars} chartType={chartType} indicators={indicators} symbol={instrument?.id || 'NSE'} height="100%" /></div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-max-border px-3 py-2 text-[9px]">
                <span className={quote || bars.length ? 'text-max-text-muted' : 'text-amber-300/80'}>{loadingMarket ? 'Loading provider data…' : chartMessage || feedMessage}</span>
                <span className="text-slate-600">{quote?.asOf ? `As of ${new Date(quote.asOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'medium' })}` : 'Times shown in Asia/Kolkata'}</span>
              </div>
            </section>

            {showAccountPanel && <section className="overflow-hidden rounded border border-max-border bg-[#0d131b]">
              <div className="flex items-center gap-1 overflow-x-auto border-b border-max-border px-2 pt-1.5" role="tablist" aria-label="Account and market panels">
                {TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 border-b-2 px-2.5 py-2 text-[9px] font-medium ${activeTab === tab.id ? 'border-blue-400 text-blue-300' : 'border-transparent text-max-text-muted hover:text-slate-200'}`}>{tab.label}</button>)}
                <span className="ml-auto hidden pr-2 text-[8px] text-slate-600 sm:inline-flex sm:items-center sm:gap-1"><CircleDollarSign className="h-3 w-3" />Virtual account</span>
              </div>
              {activeTab === 'POSITIONS' && <PositionsPanel positions={positions} quotes={quoteBySymbol} onSelect={(symbol) => handleSelect(toTradingSymbol({ symbol: symbol.split(':')[1], exchange: 'NSE' }))} />}
              {activeTab === 'ORDERS' && <OrdersPanel orders={orders} />}
              {activeTab === 'TRADES' && <TradeHistory trades={trades} />}
              {activeTab === 'ALERTS' && <AlertsPanel alerts={alerts} />}
              {activeTab === 'DEPTH' && <MarketDepth symbol={selectedId || 'NSE:RELIANCE'} />}
              {activeTab === 'NEWS' && <NewsPanel symbol={selectedId || 'NSE'} />}
              {activeTab === 'FUNDAMENTALS' && <FundamentalsPanel symbol={selectedId || 'NSE'} />}
              {activeTab === 'AI' && <AIAnalysisPanel quote={quote} bars={bars} />}
              {portfolioError && <div className="border-t border-max-border px-3 py-1.5 text-[9px] text-slate-600">Account data: {portfolioError}</div>}
            </section>}
          </main>

          {showOrderPanel && <aside className="xl:sticky xl:top-3"><OrderPanel instrument={instrument} quote={quote} availableCash={availableCash} onSubmitted={() => { void loadAccountData(); setActiveTab('ORDERS'); }} /></aside>}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 text-[8px] text-slate-600"><span>Market prices, candles, and depth come from the configured provider; no demo quotes are shown here.</span><span>Layout preferences are stored in this browser.</span></footer>
      </div>
    </div>
  );
}
