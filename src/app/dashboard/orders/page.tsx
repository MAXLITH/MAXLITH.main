'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Search,
  X,
  Plus,
  Copy,
  Check,
  Eye,
  Edit3,
  Clock,
  CheckCircle2,
  Ban,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { OrderStatusBadge } from './components/OrderStatusBadge';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { OrderModifyModal } from './components/OrderModifyModal';
import { OrderCancelModal } from './components/OrderCancelModal';
import { TradeDetailsModal } from './components/TradeDetailsModal';

type TabKey = 'ALL' | 'OPEN' | 'EXECUTED' | 'CANCELLED_REJECTED' | 'TRADES';

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [orders, setOrders] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [instrumentMap, setInstrumentMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSide, setFilterSide] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterProduct, setFilterProduct] = useState<'ALL' | 'CNC' | 'MIS'>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterDateRange, setFilterDateRange] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [selectedOrderModify, setSelectedOrderModify] = useState<any | null>(null);
  const [selectedOrderCancel, setSelectedOrderCancel] = useState<any | null>(null);
  const [selectedTradeDetails, setSelectedTradeDetails] = useState<any | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Fetch Orders, Trades, and Instrument Metadata
  const fetchAllData = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    Promise.all([
      fetch('/api/paper-trading/orders').then((res) => res.json()).catch(() => ({ orders: [] })),
      fetch('/api/paper-trading/trades').then((res) => res.json()).catch(() => ({ trades: [] })),
      fetch('/api/markets').then((res) => res.json()).catch(() => ({ instruments: [] })),
    ])
      .then(([ordersData, tradesData, marketsData]) => {
        if (ordersData.orders) setOrders(ordersData.orders);
        if (tradesData.trades) setTrades(tradesData.trades);
        if (marketsData.instruments && Array.isArray(marketsData.instruments)) {
          const map: Record<string, any> = {};
          marketsData.instruments.forEach((inst: any) => {
            if (inst.symbol) map[inst.symbol.toUpperCase()] = inst;
          });
          setInstrumentMap(map);
        }
      })
      .catch((err) => console.error('Failed to load orders data', err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Copy helper
  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  // Reset pagination on filter or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterSide, filterStatus, filterProduct, filterType, filterDateRange, pageSize]);

  // Tab Counts
  const counts = useMemo(() => {
    const totalOrders = orders.length;
    const openOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'AMO').length;
    const executedOrders = orders.filter((o) => o.status === 'EXECUTED').length;
    const cancelledRejectedOrders = orders.filter((o) => o.status === 'CANCELLED' || o.status === 'REJECTED').length;
    const tradeBookCount = trades.length;

    const totalTurnover = trades.reduce((acc, tr) => acc + (Number(tr.quantity || 0) * Number(tr.price || 0)), 0);

    return {
      totalOrders,
      openOrders,
      executedOrders,
      cancelledRejectedOrders,
      tradeBookCount,
      totalTurnover,
    };
  }, [orders, trades]);

  // Check if any filter is actively applied
  const isFilterActive = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      filterSide !== 'ALL' ||
      filterStatus !== 'ALL' ||
      filterProduct !== 'ALL' ||
      filterType !== 'ALL' ||
      filterDateRange !== 'ALL'
    );
  }, [searchQuery, filterSide, filterStatus, filterProduct, filterType, filterDateRange]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterSide('ALL');
    setFilterStatus('ALL');
    setFilterProduct('ALL');
    setFilterType('ALL');
    setFilterDateRange('ALL');
  };

  // Date filter helper
  const matchesDateRange = useCallback((dateStr?: string) => {
    if (filterDateRange === 'ALL' || !dateStr) return true;
    try {
      const itemDate = new Date(dateStr);
      const now = new Date();
      if (filterDateRange === 'TODAY') {
        return itemDate.toDateString() === now.toDateString();
      }
      if (filterDateRange === '7D') {
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (filterDateRange === '30D') {
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
    } catch {
      return true;
    }
    return true;
  }, [filterDateRange]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // 1. Tab category filter
      if (activeTab === 'OPEN') {
        if (ord.status !== 'PENDING' && ord.status !== 'AMO') return false;
      } else if (activeTab === 'EXECUTED') {
        if (ord.status !== 'EXECUTED') return false;
      } else if (activeTab === 'CANCELLED_REJECTED') {
        if (ord.status !== 'CANCELLED' && ord.status !== 'REJECTED') return false;
      }

      // 2. Search query (symbol or company name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const sym = (ord.symbol || '').toLowerCase();
        const inst = instrumentMap[ord.symbol?.toUpperCase()] || {};
        const name = (inst.name || '').toLowerCase();
        const orderId = (ord.id || '').toLowerCase();
        if (!sym.includes(q) && !name.includes(q) && !orderId.includes(q)) return false;
      }

      // 3. Side filter
      if (filterSide !== 'ALL' && ord.side !== filterSide) return false;

      // 4. Status filter
      if (filterStatus !== 'ALL' && ord.status !== filterStatus) return false;

      // 5. Product filter
      if (filterProduct !== 'ALL' && (ord.product_type || 'CNC') !== filterProduct) return false;

      // 6. Type filter
      if (filterType !== 'ALL' && ord.order_type !== filterType) return false;

      // 7. Date range filter
      if (!matchesDateRange(ord.created_at)) return false;

      return true;
    });
  }, [orders, activeTab, searchQuery, filterSide, filterStatus, filterProduct, filterType, matchesDateRange, instrumentMap]);

  // Filtered Trades List
  const filteredTrades = useMemo(() => {
    return trades.filter((tr) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const sym = (tr.symbol || '').toLowerCase();
        const inst = instrumentMap[tr.symbol?.toUpperCase()] || {};
        const name = (inst.name || '').toLowerCase();
        const tradeId = (tr.id || '').toLowerCase();
        if (!sym.includes(q) && !name.includes(q) && !tradeId.includes(q)) return false;
      }

      if (filterSide !== 'ALL' && tr.side !== filterSide) return false;
      if (filterProduct !== 'ALL' && (tr.product_type || 'CNC') !== filterProduct) return false;
      if (filterType !== 'ALL' && (tr.order_type || 'MARKET') !== filterType) return false;
      if (!matchesDateRange(tr.created_at || tr.executed_at)) return false;

      return true;
    });
  }, [trades, searchQuery, filterSide, filterProduct, filterType, matchesDateRange, instrumentMap]);

  // Active records to display and paginate
  const activeRecords = activeTab === 'TRADES' ? filteredTrades : filteredOrders;
  const totalRecords = activeRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeRecords.slice(start, start + pageSize);
  }, [activeRecords, currentPage, pageSize]);

  // Date Formatter Helper
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return { time: '—', date: '—' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { time: dateStr, date: '' };
      return {
        time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      };
    } catch {
      return { time: dateStr, date: '' };
    }
  };

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* 1. PAGE HEADER (CLEAN GROWW-STYLE WITH MAXLITH THEME) */}
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 rounded-lg border border-max-border bg-[#0d131b] px-4 py-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-slate-100 tracking-wide">Orders</h1>
            <span className="rounded border border-blue-900/60 bg-blue-950/30 px-2 py-0.5 text-[9px] font-semibold text-blue-300 uppercase tracking-wider">
              Live Paper Engine
            </span>
          </div>
          <p className="text-[11px] text-max-text-muted mt-0.5">
            Track, manage and review all your trading activity in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing || loading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-max-border bg-[#101723] hover:bg-max-surface text-max-text-secondary hover:text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
            title="Refresh order history"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${refreshing || loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/dashboard/paper-trading"
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Place Order</span>
          </Link>
        </div>
      </div>

      {/* 2. STATS / OVERVIEW KPI CHIPS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="rounded-lg border border-max-border bg-[#0d131b] p-3 transition-colors hover:border-max-border-strong">
          <div className="flex items-center justify-between text-max-text-muted mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-max-text-muted">Total Orders</span>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-800/60 text-slate-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-slate-100 tabular-nums">{counts.totalOrders}</div>
          <span className="text-[9px] text-max-text-muted mt-1 block">Audit log</span>
        </div>

        <div className="rounded-lg border border-max-border bg-[#0d131b] p-3 transition-colors hover:border-max-border-strong">
          <div className="flex items-center justify-between text-max-text-muted mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-max-text-muted">Open / Pending</span>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/15 text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-amber-400 tabular-nums">{counts.openOrders}</div>
          <span className="text-[9px] text-max-text-muted mt-1 block">Queued &amp; AMO</span>
        </div>

        <div className="rounded-lg border border-max-border bg-[#0d131b] p-3 transition-colors hover:border-max-border-strong">
          <div className="flex items-center justify-between text-max-text-muted mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-max-text-muted">Executed</span>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-emerald-400 tabular-nums">{counts.executedOrders}</div>
          <span className="text-[9px] text-max-text-muted mt-1 block">Completed fills</span>
        </div>

        <div className="rounded-lg border border-max-border bg-[#0d131b] p-3 transition-colors hover:border-max-border-strong">
          <div className="flex items-center justify-between text-max-text-muted mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-max-text-muted">Cancelled / Rejected</span>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-rose-500/15 text-rose-400">
              <Ban className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-rose-400 tabular-nums">{counts.cancelledRejectedOrders}</div>
          <span className="text-[9px] text-max-text-muted mt-1 block">Unfilled orders</span>
        </div>

        <div className="rounded-lg border border-max-border bg-[#0d131b] p-3 transition-colors hover:border-max-border-strong col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between text-max-text-muted mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-max-text-muted">Traded Turnover</span>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/15 text-blue-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-blue-300 tabular-nums truncate">
            ₹{counts.totalTurnover.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[9px] text-max-text-muted mt-1 block">{counts.tradeBookCount} executions</span>
        </div>
      </div>

      {/* ACTION BANNER NOTIFICATION */}
      {actionMsg && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between animate-in fade-in transition-all ${
            actionMsg.success
              ? 'bg-emerald-950/40 border border-emerald-900/60 text-emerald-300'
              : 'bg-rose-950/40 border border-rose-900/60 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionMsg.message}</span>
          </div>
          <button
            onClick={() => setActionMsg(null)}
            className="p-1 rounded text-max-text-muted hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. ORDER CATEGORY TABS */}
      <div className="rounded-lg border border-max-border bg-[#0d131b] p-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-medium" role="tablist">
          {[
            { key: 'ALL' as TabKey, label: 'All Orders', count: counts.totalOrders },
            { key: 'OPEN' as TabKey, label: 'Open / Pending', count: counts.openOrders },
            { key: 'EXECUTED' as TabKey, label: 'Executed', count: counts.executedOrders },
            { key: 'CANCELLED_REJECTED' as TabKey, label: 'Cancelled / Rejected', count: counts.cancelledRejectedOrders },
            { key: 'TRADES' as TabKey, label: 'Trade Book', count: counts.tradeBookCount },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border border-blue-500/40 bg-blue-950/40 text-blue-300 font-semibold'
                    : 'border border-transparent text-max-text-muted hover:bg-[#101723] hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                    isActive
                      ? 'border border-blue-800/60 bg-blue-900/40 text-blue-200'
                      : 'border border-max-border bg-[#101723] text-max-text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. FILTERS AND SEARCH TOOLBAR */}
      <div className="rounded-lg border border-max-border bg-[#0d131b] p-3 space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-max-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by stock symbol, company name, or ID..."
              className="w-full bg-[#101723] border border-max-border focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 rounded-md pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder:text-max-text-muted outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-max-text-muted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* COMPACT FILTER DROPDOWNS */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* SIDE FILTER */}
            <select
              value={filterSide}
              onChange={(e) => setFilterSide(e.target.value as any)}
              className="bg-[#101723] border border-max-border text-max-text-secondary text-xs rounded-md px-2.5 py-1.5 outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
            >
              <option value="ALL">All Sides</option>
              <option value="BUY">BUY Only</option>
              <option value="SELL">SELL Only</option>
            </select>

            {/* STATUS FILTER (WHEN NOT IN TRADES TAB) */}
            {activeTab === 'ALL' && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#101723] border border-max-border text-max-text-secondary text-xs rounded-md px-2.5 py-1.5 outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="EXECUTED">Executed</option>
                <option value="PENDING">Pending</option>
                <option value="AMO">AMO (Queued)</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REJECTED">Rejected</option>
              </select>
            )}

            {/* PRODUCT TYPE FILTER */}
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value as any)}
              className="bg-[#101723] border border-max-border text-max-text-secondary text-xs rounded-md px-2.5 py-1.5 outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
            >
              <option value="ALL">All Products</option>
              <option value="CNC">CNC (Delivery)</option>
              <option value="MIS">MIS (Intraday)</option>
            </select>

            {/* ORDER TYPE FILTER */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#101723] border border-max-border text-max-text-secondary text-xs rounded-md px-2.5 py-1.5 outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="MARKET">Market</option>
              <option value="LIMIT">Limit</option>
              <option value="SL">Stop Loss (SL)</option>
              <option value="SL-M">SL-Market</option>
            </select>

            {/* DATE RANGE FILTER */}
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value as any)}
              className="bg-[#101723] border border-max-border text-max-text-secondary text-xs rounded-md px-2.5 py-1.5 outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>

            {/* CLEAR FILTERS BUTTON */}
            {isFilterActive && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-rose-900/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/30 text-xs transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* ACTIVE FILTER SUMMARY COUNTER */}
        <div className="flex items-center justify-between text-[11px] text-max-text-muted pt-2 border-t border-max-border">
          <div>
            Showing <span className="font-semibold text-slate-200 font-mono">{activeRecords.length}</span> {activeTab === 'TRADES' ? 'trades' : 'orders'}
            {isFilterActive && <span className="text-blue-400 ml-1">(filtered)</span>}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-max-text-muted">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-[#101723] border border-max-border text-max-text-secondary text-[11px] rounded px-2 py-0.5 outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. MAIN ORDERS / TRADES TABLE */}
      <div className="rounded-lg border border-max-border bg-[#0d131b] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-max-text-muted space-y-3">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
            <p className="text-xs font-mono">Loading orders from trading engine...</p>
          </div>
        ) : activeRecords.length === 0 ? (
          <div className="p-14 text-center space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#101723] text-max-text-muted border border-max-border flex items-center justify-center mx-auto">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">No records found</h3>
              <p className="text-xs text-max-text-muted max-w-sm mx-auto mt-1">
                {isFilterActive
                  ? 'No orders or executions match your active filter criteria. Try clearing filters.'
                  : activeTab === 'TRADES'
                  ? 'No executed trades recorded in your ledger yet.'
                  : 'You have not placed any paper trading orders in this category yet.'}
              </p>
            </div>
            {isFilterActive ? (
              <button
                onClick={clearAllFilters}
                className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-sm"
              >
                Clear all filters
              </button>
            ) : (
              <Link
                href="/dashboard/paper-trading"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Place your first order</span>
              </Link>
            )}
          </div>
        ) : activeTab === 'TRADES' ? (
          /* TRADE BOOK TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#101723] text-max-text-muted text-[10px] font-semibold uppercase tracking-wider border-b border-max-border">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Instrument</th>
                  <th className="py-2.5 px-3.5 font-medium">Trade ID</th>
                  <th className="py-2.5 px-3 font-medium">Side</th>
                  <th className="py-2.5 px-3 font-medium">Product</th>
                  <th className="py-2.5 px-3.5 font-medium text-right">Quantity</th>
                  <th className="py-2.5 px-3.5 font-medium text-right">Execution Price</th>
                  <th className="py-2.5 px-3.5 font-medium text-right">Turnover</th>
                  <th className="py-2.5 px-3.5 font-medium">Executed Time</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-max-border/60">
                {paginatedRecords.map((tr: any) => {
                  const inst = instrumentMap[tr.symbol?.toUpperCase()];
                  const isBuy = tr.side === 'BUY';
                  const turnover = Number(tr.quantity || 0) * Number(tr.price || 0);
                  const dateInfo = formatDateDisplay(tr.created_at || tr.executed_at);

                  return (
                    <tr
                      key={tr.id}
                      onClick={() => setSelectedTradeDetails(tr)}
                      className="hover:bg-[#141b24]/60 transition-colors cursor-pointer group text-max-text-primary"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                            isBuy 
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-900/40' 
                              : 'bg-rose-500/15 text-rose-300 border border-rose-900/40'
                          }`}>
                            {tr.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-100 text-xs group-hover:text-blue-300 transition-colors">
                                {tr.symbol}
                              </span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#101723] text-max-text-muted border border-max-border">
                                {inst?.exchange || 'NSE'}
                              </span>
                            </div>
                            <span className="text-[10px] text-max-text-muted block truncate max-w-[150px]">
                              {inst?.name || `${tr.symbol} Equity`}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-mono text-max-text-secondary text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span>{tr.id}</span>
                          <button
                            onClick={(e) => handleCopyId(tr.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-max-text-muted transition-opacity"
                            title="Copy Trade ID"
                          >
                            {copiedOrderId === tr.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center font-semibold text-[10px] px-2 py-0.5 rounded border ${
                          isBuy 
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50' 
                            : 'bg-rose-950/40 text-rose-300 border-rose-900/50'
                        }`}>
                          {tr.side}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-max-text-muted font-medium text-[11px]">
                        {tr.product_type || 'CNC'}
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono font-medium text-slate-100 tabular-nums">
                        {tr.quantity}
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono font-medium text-slate-100 tabular-nums">
                        ₹{Number(tr.price).toFixed(2)}
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono font-medium text-emerald-400 tabular-nums">
                        ₹{turnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3.5 text-max-text-muted">
                        <div className="text-slate-200 text-[11px]">{dateInfo.time}</div>
                        <div className="text-[10px] text-max-text-muted font-mono">{dateInfo.date}</div>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedTradeDetails(tr)}
                          className="px-2.5 py-1 rounded border border-max-border bg-[#101723] hover:bg-max-surface text-max-text-secondary hover:text-white text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ORDERS TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#101723] text-max-text-muted text-[10px] font-semibold uppercase tracking-wider border-b border-max-border">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Instrument</th>
                  <th className="py-2.5 px-3.5 font-medium">Order ID</th>
                  <th className="py-2.5 px-3 font-medium">Type</th>
                  <th className="py-2.5 px-3 font-medium">Side</th>
                  <th className="py-2.5 px-3 font-medium">Product</th>
                  <th className="py-2.5 px-3.5 font-medium text-right">Quantity</th>
                  <th className="py-2.5 px-3.5 font-medium text-right">Order Price</th>
                  <th className="py-2.5 px-3.5 font-medium text-right">Exec Price</th>
                  <th className="py-2.5 px-3.5 font-medium text-center">Status</th>
                  <th className="py-2.5 px-3.5 font-medium">Time</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-max-border/60">
                {paginatedRecords.map((ord: any) => {
                  const inst = instrumentMap[ord.symbol?.toUpperCase()];
                  const isBuy = ord.side === 'BUY';
                  const isPending = ord.status === 'PENDING' || ord.status === 'AMO';
                  const dateInfo = formatDateDisplay(ord.created_at);

                  const orderPriceDisplay = ord.order_type === 'MARKET'
                    ? 'Market'
                    : (ord.price ? `₹${Number(ord.price).toFixed(2)}` : 'Market');

                  const executedPriceDisplay = (ord.executed_price || ord.average_fill_price)
                    ? `₹${Number(ord.executed_price || ord.average_fill_price).toFixed(2)}`
                    : (ord.status === 'EXECUTED' && ord.price ? `₹${Number(ord.price).toFixed(2)}` : '—');

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrderDetails(ord)}
                      className="hover:bg-[#141b24]/60 transition-colors cursor-pointer group text-max-text-primary"
                    >
                      {/* INSTRUMENT */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                            isBuy 
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-900/40' 
                              : 'bg-rose-500/15 text-rose-300 border border-rose-900/40'
                          }`}>
                            {ord.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-100 text-xs group-hover:text-blue-300 transition-colors">
                                {ord.symbol}
                              </span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#101723] text-max-text-muted border border-max-border">
                                {inst?.exchange || 'NSE'}
                              </span>
                            </div>
                            <span className="text-[10px] text-max-text-muted block truncate max-w-[150px]">
                              {inst?.name || `${ord.symbol} Equity`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ORDER ID */}
                      <td className="py-3 px-3.5 font-mono text-max-text-secondary text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span>{ord.id}</span>
                          <button
                            onClick={(e) => handleCopyId(ord.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-max-text-muted transition-opacity"
                            title="Copy Order ID"
                          >
                            {copiedOrderId === ord.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* ORDER TYPE */}
                      <td className="py-3 px-3">
                        <span className="text-slate-300 font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#101723] border border-max-border">
                          {ord.order_type}
                        </span>
                      </td>

                      {/* SIDE */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center font-semibold text-[10px] px-2 py-0.5 rounded border ${
                          isBuy 
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50' 
                            : 'bg-rose-950/40 text-rose-300 border-rose-900/50'
                        }`}>
                          {ord.side}
                        </span>
                      </td>

                      {/* PRODUCT */}
                      <td className="py-3 px-3 text-max-text-muted font-medium text-[11px]">
                        {ord.product_type || 'CNC'}
                      </td>

                      {/* QUANTITY */}
                      <td className="py-3 px-3.5 text-right font-mono font-medium text-slate-100 tabular-nums">
                        {ord.quantity}
                      </td>

                      {/* ORDER PRICE */}
                      <td className="py-3 px-3.5 text-right font-mono text-max-text-secondary tabular-nums">
                        {orderPriceDisplay}
                      </td>

                      {/* EXECUTED PRICE */}
                      <td className="py-3 px-3.5 text-right font-mono font-medium text-slate-100 tabular-nums">
                        {executedPriceDisplay}
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-3 px-3.5 text-center">
                        <OrderStatusBadge status={ord.status} />
                      </td>

                      {/* TIME */}
                      <td className="py-3 px-3.5 text-max-text-muted">
                        <div className="text-slate-200 text-[11px]">{dateInfo.time}</div>
                        <div className="text-[10px] text-max-text-muted font-mono">{dateInfo.date}</div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {isPending && (
                            <>
                              <button
                                onClick={() => setSelectedOrderModify(ord)}
                                className="p-1 rounded border border-blue-900/50 bg-blue-950/30 text-blue-300 hover:bg-blue-900/40 transition-colors"
                                title="Modify Order"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSelectedOrderCancel(ord)}
                                className="p-1 rounded border border-rose-900/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 transition-colors"
                                title="Cancel Order"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedOrderDetails(ord)}
                            className="p-1 rounded border border-max-border bg-[#101723] hover:bg-max-surface text-max-text-secondary hover:text-white transition-colors"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. PROFESSIONAL PAGINATION FOOTER */}
        {activeRecords.length > 0 && (
          <div className="px-4 py-2.5 border-t border-max-border bg-[#101723]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-max-text-muted">
            <div>
              Showing <span className="text-slate-200 font-mono font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="text-slate-200 font-mono font-medium">
                {Math.min(currentPage * pageSize, totalRecords)}
              </span>{' '}
              of <span className="text-slate-200 font-mono font-medium">{totalRecords}</span> entries
            </div>

            <div className="flex items-center gap-1 font-mono">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded border border-max-border bg-[#101723] hover:bg-max-surface text-max-text-secondary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-max-border bg-[#101723] hover:bg-max-surface text-max-text-secondary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2.5 py-0.5 text-max-text-secondary text-xs">
                Page <span className="font-semibold text-slate-100">{currentPage}</span> of{' '}
                <span className="font-semibold text-slate-100">{totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-max-border bg-[#101723] hover:bg-max-surface text-max-text-secondary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-max-border bg-[#101723] hover:bg-max-surface text-max-text-secondary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. CONTEXT-SENSITIVE MODALS */}
      {selectedOrderDetails && (
        <OrderDetailsModal
          order={selectedOrderDetails}
          instrument={instrumentMap[selectedOrderDetails.symbol?.toUpperCase()]}
          onClose={() => setSelectedOrderDetails(null)}
          onModify={(ord) => {
            setSelectedOrderDetails(null);
            setSelectedOrderModify(ord);
          }}
          onCancel={(ord) => {
            setSelectedOrderDetails(null);
            setSelectedOrderCancel(ord);
          }}
        />
      )}

      {selectedOrderModify && (
        <OrderModifyModal
          order={selectedOrderModify}
          onClose={() => setSelectedOrderModify(null)}
          onSuccess={(msg) => {
            setActionMsg({ success: true, message: msg });
            fetchAllData(true);
          }}
        />
      )}

      {selectedOrderCancel && (
        <OrderCancelModal
          order={selectedOrderCancel}
          onClose={() => setSelectedOrderCancel(null)}
          onSuccess={(msg) => {
            setActionMsg({ success: true, message: msg });
            fetchAllData(true);
          }}
        />
      )}

      {selectedTradeDetails && (
        <TradeDetailsModal
          trade={selectedTradeDetails}
          instrument={instrumentMap[selectedTradeDetails.symbol?.toUpperCase()]}
          onClose={() => setSelectedTradeDetails(null)}
        />
      )}
    </div>
  );
}
