import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { SEED_INSTRUMENTS } from './seed/instruments';
import { NSE_HOLIDAYS_2026 } from './market-hours';
import { toPaise } from './money';

// Memory Store synced with Supabase for lightning fast sub-millisecond queries
class SupabaseDbStore {
  users: Map<string, any> = new Map();
  watchlists: Map<string, any> = new Map();
  watchlistItems: Map<string, any> = new Map();
  orders: Map<string, any> = new Map();
  positions: Map<string, any> = new Map();
  trades: Map<string, any> = new Map();
  ledgerEntries: Map<string, any> = new Map();
  alerts: Map<string, any> = new Map();
  news: Map<string, any> = new Map();
  priceHistory: Map<string, any> = new Map();
  instruments: Map<string, any> = new Map();
  aiAgentRuns: Map<string, any> = new Map();
  marketHolidays: Map<string, any> = new Map();
  aiConversations: Map<string, any> = new Map();
  aiMessages: Map<string, any> = new Map();
  marketQuotes: Map<string, any> = new Map();
  aiAnalysisRuns: Map<string, any> = new Map();

  constructor() {
    this.seedInitial();
  }

  private seedInitial() {
    // Seed Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@maxlith.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'AdminSecurePass2026!';
    const adminCash = 5000000.0;
    const passwordHash = bcrypt.hashSync(adminPass, 10);

    const adminUser = {
      id: 'admin-root-001',
      email: adminEmail.toLowerCase(),
      password_hash: passwordHash,
      full_name: 'MAXLITH Administrator',
      role: 'ADMIN',
      virtual_cash: adminCash,
      initial_capital: adminCash,
      blocked_margin: 0.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.users.set(adminUser.id, adminUser);
    this.users.set(`email:${adminEmail.toLowerCase()}`, adminUser);

    // Initial Ledger
    const adminLedger = {
      id: 'led-admin-init',
      user_id: adminUser.id,
      direction: 'CREDIT',
      account_kind: 'CASH',
      amount_paise: toPaise(adminCash),
      ref_type: 'INITIAL_CAPITAL',
      memo: 'Initial paper trading virtual capital',
      created_at: new Date().toISOString(),
    };
    this.ledgerEntries.set(adminLedger.id, adminLedger);

    // Default Watchlist for Admin
    const defaultWl = {
      id: 'wl-admin-default',
      user_id: adminUser.id,
      name: 'Default Watchlist',
      is_default: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.watchlists.set(defaultWl.id, defaultWl);

    // Seed Instruments
    for (const rawItem of SEED_INSTRUMENTS) {
      const item = rawItem as any;
      const prevClose = item.previous_close ?? item.current_price;
      const openPrice = item.open_price ?? Number((prevClose * 1.002).toFixed(2));
      const highPrice = item.high_price ?? Number((Math.max(item.current_price, openPrice) * 1.01).toFixed(2));
      const lowPrice = item.low_price ?? Number((Math.min(item.current_price, openPrice) * 0.99).toFixed(2));
      const change = item.change ?? Number((item.current_price - prevClose).toFixed(2));
      const percentChange = item.percent_change ?? (prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0);

      const record = {
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange || 'NSE',
        sector: item.sector || 'General',
        asset_type: item.asset_type || 'EQUITY',
        universe: item.universe || 'NIFTY500',
        yahoo_symbol: item.yahoo_symbol || `${item.symbol}.NS`,
        current_price: item.current_price,
        previous_close: prevClose,
        open_price: openPrice,
        high_price: highPrice,
        low_price: lowPrice,
        change: change,
        percent_change: percentChange,
        volume: item.volume || 1000000,
        high_52w: item.high_52w || item.current_price * 1.25,
        low_52w: item.low_52w || item.current_price * 0.75,
        market_cap: item.market_cap || 50000,
        pe_ratio: item.pe_ratio || 25.0,
        pb_ratio: item.pb_ratio || 3.5,
        roe: item.roe || 18.0,
        roce: item.roce || 21.0,
        debt_equity: item.debt_equity || 0.45,
        promoter_holding: item.promoter_holding || 52.0,
        dividend_yield: item.dividend_yield || 1.2,
        updated_at: new Date().toISOString(),
      };
      this.instruments.set(item.symbol, record);

      // Default watchlist items
      if (['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'NIFTY50'].includes(item.symbol)) {
        const itemRecord = {
          id: `wli-${item.symbol}`,
          watchlist_id: defaultWl.id,
          symbol: item.symbol,
          position: 0,
          added_at: new Date().toISOString(),
          ticker: item.symbol,
          name: item.name,
          exchange: item.exchange || 'NSE',
          sector: item.sector || 'General',
        };
        this.watchlistItems.set(itemRecord.id, itemRecord);
      }
    }

    // Seed Market Holidays
    for (const hDate of NSE_HOLIDAYS_2026) {
      this.marketHolidays.set(hDate, { date: hDate, name: 'Market Holiday', exchanges: 'NSE,BSE' });
    }
  }
}

const store = new SupabaseDbStore();
let messageSequence = 0;

function syncToSupabase(table: string, records: any[]) {
  Promise.resolve(supabase.from(table).upsert(records)).catch(() => {});
}

class StatementWrapper {
  private sql: string;

  constructor(sql: string) {
    this.sql = sql.trim();
  }

  get(...args: any[]): any {
    const params = parseParams(args);
    const sqlUpper = this.sql.toUpperCase();

    if (sqlUpper.includes('FROM USERS')) {
      if (sqlUpper.includes('WHERE ID =')) {
        const id = params[0];
        return store.users.get(id) || null;
      }
      if (sqlUpper.includes('WHERE EMAIL =')) {
        const email = (params[0] || '').toLowerCase();
        for (const u of store.users.values()) {
          if (u.email === email) return u;
        }
        return null;
      }
      if (sqlUpper.includes('COUNT(*)')) {
        return { count: store.users.size };
      }
      return Array.from(store.users.values())[0] || null;
    }

    if (sqlUpper.includes('FROM WATCHLISTS')) {
      if (sqlUpper.includes('WHERE USER_ID =') && sqlUpper.includes('IS_DEFAULT = 1')) {
        const userId = params[0];
        for (const w of store.watchlists.values()) {
          if (w.user_id === userId && w.is_default) return w;
        }
        return null;
      }
      if (sqlUpper.includes('WHERE ID =')) {
        return store.watchlists.get(params[0]) || null;
      }
    }

    if (sqlUpper.includes('FROM ORDERS')) {
      if (sqlUpper.includes('WHERE ID =')) {
        return store.orders.get(params[0]) || null;
      }
      if (sqlUpper.includes('COUNT(*)')) {
        return { count: store.orders.size };
      }
    }

    if (sqlUpper.includes('FROM POSITIONS')) {
      if (sqlUpper.includes('WHERE ID =')) return store.positions.get(params[0]) || null;
      if (sqlUpper.includes('WHERE USER_ID =') && sqlUpper.includes('SYMBOL =') && sqlUpper.includes('PRODUCT_TYPE =')) {
        const [userId, symbol, productType] = params;
        for (const p of store.positions.values()) {
          if (p.user_id === userId && p.symbol === symbol && p.product_type === productType && (p.quantity !== 0 || p.qty !== 0)) return p;
        }
        return null;
      }
    }

    if (sqlUpper.includes('FROM INSTRUMENTS')) {
      if (sqlUpper.includes('WHERE SYMBOL =')) {
        const sym = (params[0] || '').toUpperCase();
        return store.instruments.get(sym) || null;
      }
      if (sqlUpper.includes('COUNT(*)')) return { count: store.instruments.size };
    }

    if (sqlUpper.includes('FROM MARKET_HOLIDAYS')) {
      if (sqlUpper.includes('WHERE DATE =')) return store.marketHolidays.get(params[0]) || null;
    }

    if (sqlUpper.includes('FROM LEDGER_ENTRIES')) {
      if (sqlUpper.includes('WHERE USER_ID =')) return Array.from(store.ledgerEntries.values()).find((l) => l.user_id === params[0]) || null;
    }

    if (sqlUpper.includes('FROM PRICE_HISTORY')) {
      if (sqlUpper.includes('COUNT(*)')) return { count: store.priceHistory.size };
    }

    if (sqlUpper.includes('FROM AI_CONVERSATIONS')) {
      if (sqlUpper.includes('WHERE ID =')) return store.aiConversations.get(params[0]) || null;
    }

    if (sqlUpper.includes('FROM MARKET_QUOTES')) {
      if (sqlUpper.includes('WHERE SYMBOL =')) {
        const sym = (params[0] || '').toUpperCase();
        const quotes = Array.from(store.marketQuotes.values())
          .filter((q) => q.symbol === sym)
          .sort((a, b) => new Date(b.received_at || 0).getTime() - new Date(a.received_at || 0).getTime());
        return quotes[0] || null;
      }
    }

    if (sqlUpper.includes('FROM AI_ANALYSIS_RUNS')) {
      if (sqlUpper.includes('WHERE ID =')) return store.aiAnalysisRuns.get(params[0]) || null;
    }

    return null;
  }

  all(...args: any[]): any[] {
    const params = parseParams(args);
    const sqlUpper = this.sql.toUpperCase();

    if (sqlUpper.includes('FROM USERS')) {
      return Array.from(store.users.values());
    }

    if (sqlUpper.includes('FROM WATCHLISTS')) {
      const userId = params[0];
      return Array.from(store.watchlists.values()).filter((w) => !userId || w.user_id === userId);
    }

    if (sqlUpper.includes('FROM WATCHLIST_ITEMS') || sqlUpper.includes('FROM WATCHLIST_ITEMS_NEXT')) {
      const watchlistId = params[0];
      const items = Array.from(store.watchlistItems.values()).filter((item) => !watchlistId || item.watchlist_id === watchlistId);
      return items.map((i) => {
        const inst = store.instruments.get(i.symbol) || {};
        return {
          ...i,
          item_id: i.id,
          name: inst.name || i.name || i.symbol,
          exchange: inst.exchange || i.exchange || 'NSE',
          sector: inst.sector || i.sector || 'General',
          current_price: inst.current_price || 0,
          change: inst.change || 0,
          percent_change: inst.percent_change || 0,
        };
      });
    }

    if (sqlUpper.includes('FROM ORDERS')) {
      const userId = params[0];
      let res = Array.from(store.orders.values());
      if (userId) res = res.filter((o) => o.user_id === userId);
      return res.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    if (sqlUpper.includes('FROM POSITIONS')) {
      const userId = params[0];
      let res = Array.from(store.positions.values());
      if (userId) res = res.filter((p) => p.user_id === userId);
      return res.map((p) => {
        const inst = store.instruments.get(p.symbol) || {};
        return {
          ...p,
          name: inst.name || p.symbol,
          current_price: inst.current_price || p.average_price || 0,
          previous_close: inst.previous_close || p.average_price || 0,
          change: inst.change || 0,
          percent_change: inst.percent_change || 0,
          sector: inst.sector || 'General',
        };
      });
    }

    if (sqlUpper.includes('FROM TRADES')) {
      const userId = params[0];
      let res = Array.from(store.trades.values());
      if (userId) res = res.filter((t) => t.user_id === userId);
      return res.map((t) => {
        const ord = store.orders.get(t.order_id) || {};
        return {
          ...t,
          order_type: ord.order_type || 'MARKET',
          product_type: ord.product_type || 'CNC',
          created_at: t.created_at || t.executed_at || new Date().toISOString(),
        };
      }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    if (sqlUpper.includes('FROM LEDGER_ENTRIES')) {
      const userId = params[0];
      let entries = Array.from(store.ledgerEntries.values());
      if (userId) entries = entries.filter((e) => e.user_id === userId);
      if (sqlUpper.includes('GROUP BY DIRECTION')) {
        let credits = 0;
        let debits = 0;
        for (const e of entries) {
          if (!sqlUpper.includes("ACCOUNT_KIND = 'CASH'") || e.account_kind === 'CASH') {
            if (e.direction === 'CREDIT') credits += (e.amount_paise || 0);
            if (e.direction === 'DEBIT') debits += (e.amount_paise || 0);
          }
        }
        return [
          { direction: 'CREDIT', total_paise: credits },
          { direction: 'DEBIT', total_paise: debits },
        ];
      }
      return entries;
    }

    if (sqlUpper.includes('FROM INSTRUMENTS')) {
      const limit = typeof params[params.length - 1] === 'number' ? params[params.length - 1] : 50;
      let list = Array.from(store.instruments.values());
      if (sqlUpper.includes('WHERE SYMBOL LIKE')) {
        const q = String(params[0] || '').replace(/%/g, '').toLowerCase();
        list = list.filter((inst) => inst.symbol.toLowerCase().includes(q) || inst.name.toLowerCase().includes(q) || inst.sector.toLowerCase().includes(q));
      }
      return list.slice(0, limit);
    }

    if (sqlUpper.includes('FROM NEWS')) {
      const limit = typeof params[params.length - 1] === 'number' ? params[params.length - 1] : 20;
      return Array.from(store.news.values()).slice(0, limit);
    }

    if (sqlUpper.includes('FROM ALERTS')) {
      const userId = params[0];
      return Array.from(store.alerts.values()).filter((a) => !userId || a.user_id === userId);
    }

    if (sqlUpper.includes('FROM AI_CONVERSATIONS')) {
      const userId = params[0];
      let convs = Array.from(store.aiConversations.values());
      if (userId) convs = convs.filter((c) => c.user_id === userId);
      return convs
        .map((c) => {
          const msgs = Array.from(store.aiMessages.values())
            .filter((m) => m.conversation_id === c.id)
            .sort((a, b) => {
              const tDiff = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
              return tDiff !== 0 ? tDiff : (b._seq || 0) - (a._seq || 0);
            });
          return {
            ...c,
            last_message: msgs[0]?.content || null,
          };
        })
        .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
        .slice(0, 50);
    }

    if (sqlUpper.includes('FROM AI_MESSAGES')) {
      const convId = params[0];
      let msgs = Array.from(store.aiMessages.values());
      if (convId) msgs = msgs.filter((m) => m.conversation_id === convId);
      return msgs.sort((a, b) => {
        const tDiff = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        return tDiff !== 0 ? tDiff : (a._seq || 0) - (b._seq || 0);
      });
    }

    if (sqlUpper.includes('FROM MARKET_QUOTES')) {
      const sym = params[0]?.toUpperCase();
      let quotes = Array.from(store.marketQuotes.values());
      if (sym) quotes = quotes.filter((q) => q.symbol === sym);
      return quotes.sort((a, b) => new Date(b.received_at || 0).getTime() - new Date(a.received_at || 0).getTime());
    }

    if (sqlUpper.includes('FROM AI_ANALYSIS_RUNS')) {
      const userId = params[0];
      let runs = Array.from(store.aiAnalysisRuns.values());
      if (userId) runs = runs.filter((r) => r.user_id === userId);
      return runs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return [];
  }

  run(...args: any[]): { changes: number; lastInsertRowid: number } {
    const params = parseParams(args);
    const sqlUpper = this.sql.toUpperCase();

    if (sqlUpper.includes('INSERT INTO USERS')) {
      let u: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        u = args[0];
      } else {
        u = {
          id: params[0],
          email: params[1],
          password_hash: params[2],
          full_name: params[3],
          role: params[4] || 'TRADER',
          virtual_cash: params[5] ?? 1000000,
          initial_capital: params[6] ?? 1000000,
          blocked_margin: params[7] ?? 0,
        };
      }
      if (u.id) {
        store.users.set(u.id, { ...store.users.get(u.id), ...u, updated_at: new Date().toISOString() });
        if (u.email && typeof u.email === 'string') store.users.set(`email:${u.email.toLowerCase()}`, u);
        syncToSupabase('users', [u]);
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('UPDATE USERS')) {
      const userId = params[params.length - 1];
      const user = store.users.get(userId) || {};
      if (sqlUpper.includes('VIRTUAL_CASH = VIRTUAL_CASH -')) {
        user.virtual_cash = (user.virtual_cash || 0) - Number(params[0]);
      } else if (sqlUpper.includes('VIRTUAL_CASH = VIRTUAL_CASH +')) {
        user.virtual_cash = (user.virtual_cash || 0) + Number(params[0]);
      } else if (sqlUpper.includes('BLOCKED_MARGIN = BLOCKED_MARGIN +')) {
        user.blocked_margin = (user.blocked_margin || 0) + Number(params[0]);
      } else if (sqlUpper.includes('BLOCKED_MARGIN = MAX(0, BLOCKED_MARGIN -')) {
        user.blocked_margin = Math.max(0, (user.blocked_margin || 0) - Number(params[0]));
      } else if (sqlUpper.includes('VIRTUAL_CASH = ?, INITIAL_CAPITAL = ?')) {
        user.virtual_cash = Number(params[0]);
        user.initial_capital = Number(params[1]);
        user.blocked_margin = 0.0;
      } else if (sqlUpper.includes('PASSWORD_HASH = ?')) {
        user.password_hash = params[0];
      } else if (sqlUpper.includes('FULL_NAME = ?')) {
        user.full_name = params[0];
      }
      user.updated_at = new Date().toISOString();
      store.users.set(userId, user);
      if (user.email && typeof user.email === 'string') {
        store.users.set(`email:${user.email.toLowerCase()}`, user);
      }
      syncToSupabase('users', [user]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO WATCHLISTS')) {
      let wl: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        wl = args[0];
      } else {
        wl = { id: params[0], user_id: params[1], name: params[2], is_default: params[3] || 0 };
      }
      store.watchlists.set(wl.id, { ...wl, created_at: new Date().toISOString() });
      syncToSupabase('watchlists', [wl]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO WATCHLIST_ITEMS')) {
      let item: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        item = args[0];
      } else {
        item = { id: params[0], watchlist_id: params[1], symbol: params[2], position: params[3] || 0 };
      }
      store.watchlistItems.set(item.id, { ...item, added_at: new Date().toISOString() });
      syncToSupabase('watchlist_items', [item]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('DELETE FROM WATCHLIST_ITEMS')) {
      const [symbol, watchlistId] = params;
      for (const [key, val] of store.watchlistItems.entries()) {
        if (val.symbol === symbol && (!watchlistId || val.watchlist_id === watchlistId)) {
          store.watchlistItems.delete(key);
        }
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('UPDATE ORDERS')) {
      if (sqlUpper.includes("STATUS = 'CANCELLED'")) {
        const [orderId] = params;
        const ord = store.orders.get(orderId);
        if (ord) {
          ord.status = 'CANCELLED';
          ord.cancelled_at = new Date().toISOString();
          ord.updated_at = new Date().toISOString();
          store.orders.set(orderId, ord);
          syncToSupabase('orders', [ord]);
        }
      } else if (sqlUpper.includes("STATUS = 'PENDING'")) {
        const [orderId] = params;
        const ord = store.orders.get(orderId);
        if (ord) {
          ord.status = 'PENDING';
          ord.updated_at = new Date().toISOString();
          store.orders.set(orderId, ord);
          syncToSupabase('orders', [ord]);
        }
      } else if (sqlUpper.includes('QUANTITY = ?, PRICE = COALESCE(?, PRICE)')) {
        const [newQty, newPrice, orderId] = params;
        const ord = store.orders.get(orderId);
        if (ord) {
          ord.quantity = newQty;
          if (newPrice !== null && newPrice !== undefined) ord.price = newPrice;
          ord.updated_at = new Date().toISOString();
          store.orders.set(orderId, ord);
          syncToSupabase('orders', [ord]);
        }
      } else if (sqlUpper.includes('STATUS = ?, FILLED_QUANTITY = ?, AVERAGE_FILL_PRICE = ?')) {
        const [status, filledQty, avgPrice, orderId] = params;
        const ord = store.orders.get(orderId);
        if (ord) {
          ord.status = status;
          ord.filled_quantity = filledQty;
          ord.average_fill_price = avgPrice;
          ord.updated_at = new Date().toISOString();
          store.orders.set(orderId, ord);
          syncToSupabase('orders', [ord]);
        }
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO ORDERS')) {
      let ord: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        ord = args[0];
      } else if (sqlUpper.includes("'REJECTED'")) {
        ord = {
          id: params[0],
          user_id: params[1],
          symbol: params[2],
          side: params[3],
          order_type: params[4],
          product_type: params[5] || 'CNC',
          quantity: params[6],
          price: params[7],
          status: 'REJECTED',
          rejection_reason: params[8],
          idempotency_key: params[9],
          created_at: new Date().toISOString(),
        };
      } else if (sqlUpper.includes('TRIGGER_PRICE')) {
        ord = {
          id: params[0],
          user_id: params[1],
          symbol: params[2],
          side: params[3],
          order_type: params[4],
          product_type: params[5] || 'CNC',
          quantity: params[6],
          price: params[7],
          trigger_price: params[8],
          status: params[9] || 'PENDING',
          amo: params[10],
          idempotency_key: params[11],
          charges_json: params[12],
          created_at: new Date().toISOString(),
        };
      } else if (sqlUpper.includes('EXECUTED_PRICE')) {
        ord = {
          id: params[0],
          user_id: params[1],
          symbol: params[2],
          side: params[3],
          order_type: params[4],
          product_type: params[5] || 'CNC',
          quantity: params[6],
          filled_qty: params[7] ?? params[6],
          price: params[8],
          executed_price: params[9],
          status: 'EXECUTED',
          idempotency_key: params[10],
          charges_json: params[11],
          created_at: new Date().toISOString(),
          executed_at: new Date().toISOString(),
        };
      } else {
        ord = {
          id: params[0],
          user_id: params[1],
          symbol: params[2],
          side: params[3],
          order_type: params[4] || 'MARKET',
          product_type: params[5] || 'CNC',
          quantity: params[6],
          price: params[7],
          status: params[8] || 'PENDING',
          created_at: new Date().toISOString(),
        };
      }
      store.orders.set(ord.id, { ...store.orders.get(ord.id), ...ord, updated_at: new Date().toISOString() });
      syncToSupabase('orders', [ord]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('UPDATE POSITIONS')) {
      if (sqlUpper.includes('QUANTITY = ?, AVERAGE_PRICE = ?')) {
        const [newQty, newAvg, id] = params;
        const pos = store.positions.get(id);
        if (pos) {
          pos.quantity = newQty;
          pos.average_price = newAvg;
          pos.updated_at = new Date().toISOString();
          store.positions.set(id, pos);
          syncToSupabase('positions', [pos]);
        }
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO POSITIONS')) {
      let pos: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        pos = args[0];
      } else {
        pos = { id: params[0], user_id: params[1], symbol: params[2], product_type: params[3], quantity: params[4], average_price: params[5], realized_pnl: params[6] || 0 };
      }
      store.positions.set(pos.id || `pos-${pos.user_id}-${pos.symbol}`, { ...store.positions.get(pos.id), ...pos, updated_at: new Date().toISOString() });
      syncToSupabase('positions', [pos]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO TRADES')) {
      let trd: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        trd = args[0];
      } else {
        trd = {
          id: params[0],
          order_id: params[1],
          user_id: params[2],
          symbol: params[3],
          side: params[4],
          quantity: params[5],
          price: params[6],
          charges_json: params[7],
          created_at: new Date().toISOString(),
          executed_at: new Date().toISOString(),
        };
      }
      store.trades.set(trd.id, { ...trd });
      syncToSupabase('trades', [trd]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO LEDGER_ENTRIES')) {
      let led: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        led = args[0];
      } else {
        led = { id: params[0], user_id: params[1], direction: params[2], account_kind: params[3], amount_paise: params[4], ref_type: params[5], ref_id: params[6], memo: params[7] };
      }
      store.ledgerEntries.set(led.id, { ...led, created_at: new Date().toISOString() });
      syncToSupabase('ledger_entries', [led]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('DELETE FROM TRADES')) {
      const userId = params[0];
      for (const [key, val] of store.trades.entries()) {
        if (!userId || val.user_id === userId) store.trades.delete(key);
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('DELETE FROM TRANSACTIONS')) {
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('DELETE FROM LEDGER_ENTRIES')) {
      const userId = params[0];
      for (const [key, val] of store.ledgerEntries.entries()) {
        if (!userId || val.user_id === userId) store.ledgerEntries.delete(key);
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('DELETE FROM POSITIONS')) {
      const userId = params[0];
      for (const [key, val] of store.positions.entries()) {
        if (!userId || val.user_id === userId) store.positions.delete(key);
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('DELETE FROM ORDERS')) {
      const userId = params[0];
      for (const [key, val] of store.orders.entries()) {
        if (!userId || val.user_id === userId) store.orders.delete(key);
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO AI_CONVERSATIONS')) {
      let conv: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        conv = args[0];
      } else {
        conv = {
          id: params[0],
          user_id: params[1],
          title: params[2],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      conv.created_at = conv.created_at || new Date().toISOString();
      conv.updated_at = conv.updated_at || new Date().toISOString();
      store.aiConversations.set(conv.id, conv);
      syncToSupabase('ai_conversations', [conv]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('UPDATE AI_CONVERSATIONS')) {
      const id = params[params.length - 1];
      const conv = store.aiConversations.get(id);
      if (conv) {
        conv.updated_at = new Date().toISOString();
        if (params.length > 1 && typeof params[0] === 'string' && params[0] !== id) {
          conv.title = params[0];
        }
        store.aiConversations.set(id, conv);
        syncToSupabase('ai_conversations', [conv]);
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('DELETE FROM AI_CONVERSATIONS')) {
      const id = params[0];
      const userId = params[1];
      for (const [key, val] of store.aiConversations.entries()) {
        if ((!id || val.id === id) && (!userId || val.user_id === userId)) {
          store.aiConversations.delete(key);
          for (const [mKey, mVal] of store.aiMessages.entries()) {
            if (mVal.conversation_id === val.id) store.aiMessages.delete(mKey);
          }
        }
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO AI_MESSAGES')) {
      let msg: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        msg = args[0];
      } else if (sqlUpper.includes("'USER'")) {
        msg = {
          id: params[0],
          conversation_id: params[1],
          sender: 'USER',
          content: params[2],
          agent_data: params[3] || null,
          created_at: new Date().toISOString(),
        };
      } else if (sqlUpper.includes("'ASSISTANT'")) {
        msg = {
          id: params[0],
          conversation_id: params[1],
          sender: 'ASSISTANT',
          content: params[2],
          agent_data: params[3] || null,
          created_at: new Date().toISOString(),
        };
      } else {
        msg = {
          id: params[0],
          conversation_id: params[1],
          sender: params[2] || 'USER',
          content: params[3],
          agent_data: params[4] || null,
          created_at: new Date().toISOString(),
        };
      }
      msg.created_at = msg.created_at || new Date().toISOString();
      msg._seq = ++messageSequence;
      store.aiMessages.set(msg.id, msg);
      syncToSupabase('ai_messages', [msg]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('DELETE FROM AI_MESSAGES')) {
      const convId = params[0];
      for (const [key, val] of store.aiMessages.entries()) {
        if (!convId || val.conversation_id === convId) {
          store.aiMessages.delete(key);
        }
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO MARKET_QUOTES')) {
      let q: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        q = args[0];
      } else {
        q = {
          id: params[0],
          symbol: params[1],
          exchange: params[2],
          price: params[3],
          change: params[4],
          change_percent: params[5],
          provider_timestamp: params[6],
          received_at: params[7] || new Date().toISOString(),
          provider: params[8],
          freshness_status: params[9],
        };
      }
      store.marketQuotes.set(q.id, q);
      syncToSupabase('market_quotes', [q]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO AI_ANALYSIS_RUNS')) {
      let run: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        run = args[0];
      } else {
        run = {
          id: params[0],
          user_id: params[1],
          symbol: params[2],
          analysis_type: params[3],
          model: params[4],
          source_timestamp: params[5],
          result: params[6],
          status: params[7] || 'SUCCESS',
          created_at: new Date().toISOString(),
        };
      }
      store.aiAnalysisRuns.set(run.id, run);
      syncToSupabase('ai_analysis_runs', [run]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    return { changes: 1, lastInsertRowid: 1 };
  }
}

function parseParams(args: any[]): any[] {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

export const db = {
  prepare(sql: string) {
    return new StatementWrapper(sql);
  },
  transaction<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => {
      return fn(...args);
    }) as T;
  },
  exec(sql: string) {
    return;
  },
  pragma(sql: string) {
    return [];
  },
};

export function initDb() {
  // Sync init
}

export default db;
