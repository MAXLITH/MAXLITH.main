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
        const userId = params[0];
        const count = userId ? Array.from(store.orders.values()).filter((o) => o.user_id === userId).length : store.orders.size;
        return { count, cnt: count };
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
      return res.sort((a, b) => new Date(b.executed_at || 0).getTime() - new Date(a.executed_at || 0).getTime());
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

    if (sqlUpper.includes('FROM LEDGER_ENTRIES')) {
      const userId = params[0];
      const entries = Array.from(store.ledgerEntries.values()).filter((l) => !userId || l.user_id === userId);
      if (sqlUpper.includes('GROUP BY DIRECTION')) {
        const cashEntries = entries.filter((l) => l.account_kind === 'CASH');
        const map = new Map<string, number>();
        for (const e of cashEntries) {
          const dir = e.direction;
          map.set(dir, (map.get(dir) || 0) + (e.amount_paise || 0));
        }
        return Array.from(map.entries()).map(([direction, total_paise]) => ({ direction, total_paise }));
      }
      return entries;
    }

    if (sqlUpper.includes('FROM ALERTS')) {
      const userId = params[0];
      return Array.from(store.alerts.values()).filter((a) => !userId || a.user_id === userId);
    }

    return [];
  }

  run(...args: any[]): { changes: number; lastInsertRowid: number } {
    const params = parseParams(args);
    const sqlUpper = this.sql.toUpperCase();

    if (sqlUpper.includes('INSERT INTO USERS') || sqlUpper.includes('UPDATE USERS')) {
      if (sqlUpper.includes('SET VIRTUAL_CASH = VIRTUAL_CASH -')) {
        const [amount, userId] = params;
        const current = store.users.get(userId);
        if (current) {
          current.virtual_cash = Number((current.virtual_cash - amount).toFixed(2));
          current.updated_at = new Date().toISOString();
        }
        return { changes: 1, lastInsertRowid: 1 };
      }
      if (sqlUpper.includes('SET BLOCKED_MARGIN = BLOCKED_MARGIN +')) {
        const [amount, userId] = params;
        const current = store.users.get(userId);
        if (current) {
          current.blocked_margin = Number(((current.blocked_margin || 0) + amount).toFixed(2));
          current.updated_at = new Date().toISOString();
        }
        return { changes: 1, lastInsertRowid: 1 };
      }
      if (sqlUpper.includes('SET VIRTUAL_CASH = ?, INITIAL_CAPITAL = ?')) {
        const [cash, cap, userId] = params;
        const current = store.users.get(userId);
        if (current) {
          current.virtual_cash = cash;
          current.initial_capital = cap;
          current.blocked_margin = 0;
          current.updated_at = new Date().toISOString();
        }
        return { changes: 1, lastInsertRowid: 1 };
      }

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

    if (sqlUpper.includes('DELETE FROM POSITIONS')) {
      const userId = params[0];
      for (const [key, val] of store.positions.entries()) {
        if (val.user_id === userId) store.positions.delete(key);
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('DELETE FROM ORDERS')) {
      const userId = params[0];
      for (const [key, val] of store.orders.entries()) {
        if (val.user_id === userId) store.orders.delete(key);
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('DELETE FROM TRADES')) {
      const userId = params[0];
      for (const [key, val] of store.trades.entries()) {
        if (val.user_id === userId) store.trades.delete(key);
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('DELETE FROM LEDGER_ENTRIES')) {
      const userId = params[0];
      for (const [key, val] of store.ledgerEntries.entries()) {
        if (val.user_id === userId) store.ledgerEntries.delete(key);
      }
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO ORDERS') || sqlUpper.includes('UPDATE ORDERS')) {
      let ord: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        ord = args[0];
      } else {
        ord = { id: params[0], user_id: params[1], symbol: params[2], side: params[3], order_type: params[4], status: params[5], quantity: params[6], price: params[7] };
      }
      store.orders.set(ord.id, { ...store.orders.get(ord.id), ...ord, updated_at: new Date().toISOString() });
      syncToSupabase('orders', [ord]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO POSITIONS') || sqlUpper.includes('UPDATE POSITIONS')) {
      let pos: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        pos = args[0];
      } else {
        pos = { id: params[0], user_id: params[1], symbol: params[2], quantity: params[3], average_price: params[4] };
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
        trd = { id: params[0], order_id: params[1], user_id: params[2], symbol: params[3], side: params[4], price: params[5], quantity: params[6] };
      }
      store.trades.set(trd.id, { ...trd, executed_at: new Date().toISOString() });
      syncToSupabase('trades', [trd]);
      return { changes: 1, lastInsertRowid: 1 };
    }

    if (sqlUpper.includes('INSERT INTO LEDGER_ENTRIES')) {
      let led: any = {};
      if (typeof args[0] === 'object' && args[0] !== null) {
        led = args[0];
      } else {
        led = { id: params[0], user_id: params[1], direction: params[2], account_kind: params[3], amount_paise: params[4] };
      }
      store.ledgerEntries.set(led.id, { ...led, created_at: new Date().toISOString() });
      syncToSupabase('ledger_entries', [led]);
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
