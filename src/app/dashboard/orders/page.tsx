'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Search,
  Filter,
  X,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Eye,
  Edit3,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  Layers,
  Calendar,
  AlertCircle,
  ArrowUpDown,
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
  const matchesDateRange = (dateStr?: string) => {
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
  };

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
  }, [orders, activeTab, searchQuery, filterSide, filterStatus, filterProduct, filterType, filterDateRange, instrumentMap]);

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
  }, [trades, searchQuery, filterSide, filterProduct, filterType, filterDateRange, instrumentMap]);

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Orders</h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Live Paper Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track, manage and review all your trading activity in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch md:self-auto">
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing || loading}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#141b2a] hover:bg-[#1a2337] active:bg-[#131b2e] text-slate-200 hover:text-white text-xs font-medium transition-all border border-slate-800 shadow-sm disabled:opacity-50"
            title="Refresh order history"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${refreshing || loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/dashboard/paper-trading"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Place Order</span>
          </Link>
        </div>
      </div>

      {/* 2. STATS / OVERVIEW KPI CHIPS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#0f1523] border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Total Orders</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-bold text-white tabular-nums font-mono">{counts.totalOrders}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Audit log</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0f1523] border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Open / Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 tabular-nums font-mono">{counts.openOrders}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Queued &amp; AMO</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0f1523] border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Executed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tabular-nums font-mono">{counts.executedOrders}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Completed fills</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0f1523] border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Cancelled / Rejected</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 tabular-nums font-mono">{counts.cancelledRejectedOrders}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Unfilled orders</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0f1523] border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Traded Turnover</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-indigo-400 tabular-nums font-mono truncate">
            ₹{counts.totalTurnover.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{counts.tradeBookCount} executions</span>
        </div>
      </div>

      {/* ACTION BANNER NOTIFICATION */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between animate-in fade-in transition-all ${
            actionMsg.success
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
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
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. ORDER CATEGORY TABS (HORIZONTAL GROWW-STYLE) */}
      <div className="border-b border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'ALL'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>All Orders</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full ${
              activeTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {counts.totalOrders}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('OPEN')}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'OPEN'
                ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Open / Pending</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full ${
              activeTab === 'OPEN' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {counts.openOrders}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('EXECUTED')}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'EXECUTED'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Executed</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full ${
              activeTab === 'EXECUTED' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {counts.executedOrders}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CANCELLED_REJECTED')}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'CANCELLED_REJECTED'
                ? 'bg-slate-700 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Cancelled / Rejected</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full ${
              activeTab === 'CANCELLED_REJECTED' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {counts.cancelledRejectedOrders}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('TRADES')}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'TRADES'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Trade Book</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full ${
              activeTab === 'TRADES' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {counts.tradeBookCount}
            </span>
          </button>
        </div>
      </div>

      {/* 4. FILTERS AND SEARCH TOOLBAR */}
      <div className="p-3.5 rounded-2xl bg-[#0f1523] border border-slate-800/80 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by stock symbol, company name, or ID..."
              className="w-full bg-[#141b2a] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
              className="bg-[#141b2a] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
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
                className="bg-[#141b2a] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
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
              className="bg-[#141b2a] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="ALL">All Products</option>
              <option value="CNC">CNC (Delivery)</option>
              <option value="MIS">MIS (Intraday)</option>
            </select>

            {/* ORDER TYPE FILTER */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#141b2a] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
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
              className="bg-[#141b2a] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-rose-300 hover:text-white transition-all border border-slate-700/60"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* ACTIVE FILTER SUMMARY COUNTER */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
          <div>
            Showing <span className="font-bold text-white font-mono">{activeRecords.length}</span> {activeTab === 'TRADES' ? 'trades' : 'orders'}
            {isFilterActive && <span className="text-indigo-400 ml-1">(filtered)</span>}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-[#141b2a] border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-0.5 outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. MAIN ORDERS / TRADES TABLE (GROWW-INSPIRED CLEAN TABLE) */}
      <div className="rounded-2xl bg-[#0f1523] border border-slate-800/80 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs font-mono">Loading orders from trading engine...</p>
          </div>
        ) : activeRecords.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/70 text-slate-400 border border-slate-700/60 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No records found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
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
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-sm"
              >
                Clear all filters
              </button>
            ) : (
              <Link
                href="/dashboard/paper-trading"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Place your first order</span>
              </Link>
            )}
          </div>
        ) : activeTab === 'TRADES' ? (
          /* TRADE BOOK TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#131b2e] text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">Instrument</th>
                  <th className="py-3.5 px-4">Trade ID</th>
                  <th className="py-3.5 px-4">Side</th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-right">Execution Price</th>
                  <th className="py-3.5 px-4 text-right">Turnover</th>
                  <th className="py-3.5 px-4">Executed Time</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {paginatedRecords.map((tr: any) => {
                  const inst = instrumentMap[tr.symbol?.toUpperCase()];
                  const isBuy = tr.side === 'BUY';
                  const turnover = Number(tr.quantity || 0) * Number(tr.price || 0);
                  const dateInfo = formatDateDisplay(tr.created_at || tr.executed_at);

                  return (
                    <tr
                      key={tr.id}
                      onClick={() => setSelectedTradeDetails(tr)}
                      className="hover:bg-[#141d30]/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isBuy 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {tr.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">
                                {tr.symbol}
                              </span>
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                                {inst?.exchange || 'NSE'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                              {inst?.name || `${tr.symbol} Equity`}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-300 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span>{tr.id}</span>
                          <button
                            onClick={(e) => handleCopyId(tr.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-slate-400 transition-opacity"
                            title="Copy Trade ID"
                          >
                            {copiedOrderId === tr.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center font-bold text-[11px] px-2 py-0.5 rounded-full ${
                          isBuy 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {tr.side}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-300 font-medium">
                        {tr.product_type || 'CNC'}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-semibold text-white tabular-nums">
                        {tr.quantity}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-white tabular-nums">
                        ₹{Number(tr.price).toFixed(2)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums">
                        ₹{turnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-4 px-4 text-slate-400">
                        <div className="text-white text-[11px]">{dateInfo.time}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{dateInfo.date}</div>
                      </td>

                      <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedTradeDetails(tr)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-all border border-slate-700/60 inline-flex items-center gap-1"
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
          /* ORDERS TABLE (GROWW REFERENCE COMPLIANT) */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#131b2e] text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">Instrument</th>
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Side</th>
                  <th className="py-3.5 px-3">Product</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-right">Order Price</th>
                  <th className="py-3.5 px-4 text-right">Exec Price</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {paginatedRecords.map((ord: any) => {
                  const inst = instrumentMap[ord.symbol?.toUpperCase()];
                  const isBuy = ord.side === 'BUY';
                  const isPending = ord.status === 'PENDING' || ord.status === 'AMO';
                  const dateInfo = formatDateDisplay(ord.created_at);

                  // Order price formatting
                  const orderPriceDisplay = ord.order_type === 'MARKET'
                    ? 'Market'
                    : (ord.price ? `₹${Number(ord.price).toFixed(2)}` : 'Market');

                  // Executed price formatting: only when genuine executed price exists
                  const executedPriceDisplay = (ord.executed_price || ord.average_fill_price)
                    ? `₹${Number(ord.executed_price || ord.average_fill_price).toFixed(2)}`
                    : (ord.status === 'EXECUTED' && ord.price ? `₹${Number(ord.price).toFixed(2)}` : '—');

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrderDetails(ord)}
                      className="hover:bg-[#141d30]/60 transition-colors cursor-pointer group"
                    >
                      {/* INSTRUMENT */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isBuy 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {ord.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">
                                {ord.symbol}
                              </span>
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                                {inst?.exchange || 'NSE'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                              {inst?.name || `${ord.symbol} Equity`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ORDER ID */}
                      <td className="py-4 px-4 font-mono text-slate-300 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span>{ord.id}</span>
                          <button
                            onClick={(e) => handleCopyId(ord.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-slate-400 transition-opacity"
                            title="Copy Order ID"
                          >
                            {copiedOrderId === ord.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* ORDER TYPE */}
                      <td className="py-4 px-3">
                        <span className="text-slate-300 font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                          {ord.order_type}
                        </span>
                      </td>

                      {/* SIDE */}
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center font-bold text-[11px] px-2 py-0.5 rounded-full ${
                          isBuy 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {ord.side}
                        </span>
                      </td>

                      {/* PRODUCT */}
                      <td className="py-4 px-3 text-slate-300 font-medium text-[11px]">
                        {ord.product_type || 'CNC'}
                      </td>

                      {/* QUANTITY */}
                      <td className="py-4 px-4 text-right font-mono font-semibold text-white tabular-nums">
                        {ord.quantity}
                      </td>

                      {/* ORDER PRICE */}
                      <td className="py-4 px-4 text-right font-mono text-slate-300 tabular-nums">
                        {orderPriceDisplay}
                      </td>

                      {/* EXECUTED PRICE */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-white tabular-nums">
                        {executedPriceDisplay}
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-4 px-4 text-center">
                        <OrderStatusBadge status={ord.status} />
                      </td>

                      {/* TIME */}
                      <td className="py-4 px-4 text-slate-400">
                        <div className="text-white text-[11px]">{dateInfo.time}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{dateInfo.date}</div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => setSelectedOrderModify(ord)}
                                className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all"
                                title="Modify Order"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSelectedOrderCancel(ord)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                                title="Cancel Order"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedOrderDetails(ord)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all"
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
          <div className="px-5 py-3.5 border-t border-slate-800 bg-[#131b2e]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-mono font-semibold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="text-white font-mono font-semibold">
                {Math.min(currentPage * pageSize, totalRecords)}
              </span>{' '}
              of <span className="text-white font-mono font-semibold">{totalRecords}</span> entries
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/60 transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/60 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 text-slate-300 text-xs">
                Page <span className="font-bold text-white">{currentPage}</span> of{' '}
                <span className="font-bold text-white">{totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/60 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/60 transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
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
