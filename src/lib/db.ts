import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { SCHEMA_SQL } from './db/schema';
import { SEED_INSTRUMENTS } from './seed/instruments';
import { NSE_HOLIDAYS_2026 } from './market-hours';
import { toPaise } from './money';
import './cron';

// Vercel functions can only write to /tmp. Keep the default database beside
// the app for local/Docker deployments, but use the writable temp directory
// when running in a Vercel function.
const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'maxlith.db')
  : process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : path.join(process.cwd(), 'data', 'maxlith.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath, { timeout: 10000 });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function runMigrations() {
  db.exec(SCHEMA_SQL);

  // Safe ALTER TABLE checks for schema upgrades on pre-existing sqlite databases
  const tableColumns: Record<string, string[]> = {
    users: ['initial_capital', 'blocked_margin', 'notify_email', 'notify_inapp'],
    orders: ['product_type', 'amo', 'idempotency_key', 'charges_json', 'filled_qty', 'trigger_price', 'cancelled_at'],
    positions: ['product_type'],
    instruments: ['universe', 'yahoo_symbol', 'tick_size', 'lot_size', 'roe', 'roce', 'debt_equity', 'promoter_holding', 'dividend_yield', 'stale', 'source'],
    news: ['event_type'],
    ai_agent_runs: ['cost_usd'],
    price_history: ['timeframe'],
  };

  for (const [table, cols] of Object.entries(tableColumns)) {
    try {
      const existingCols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
      for (const col of cols) {
        if (!existingCols.includes(col)) {
          let colDef = 'TEXT';
          if (col === 'initial_capital') colDef = 'REAL NOT NULL DEFAULT 1000000.0';
          else if (col === 'blocked_margin') colDef = 'REAL NOT NULL DEFAULT 0.0';
          else if (col === 'notify_email' || col === 'notify_inapp') colDef = 'INTEGER NOT NULL DEFAULT 1';
          else if (col === 'product_type') colDef = "TEXT NOT NULL DEFAULT 'CNC'";
          else if (col === 'amo') colDef = 'INTEGER NOT NULL DEFAULT 0';
          else if (col === 'filled_qty') colDef = 'INTEGER NOT NULL DEFAULT 0';
          else if (col === 'trigger_price') colDef = 'REAL';
          else if (col === 'charges_json' || col === 'idempotency_key' || col === 'cancelled_at') colDef = 'TEXT';
          else if (col === 'tick_size') colDef = 'REAL NOT NULL DEFAULT 0.05';
          else if (col === 'lot_size') colDef = 'INTEGER NOT NULL DEFAULT 1';
          else if (col === 'stale') colDef = 'INTEGER NOT NULL DEFAULT 0';
          else if (['roe', 'roce', 'debt_equity', 'promoter_holding', 'dividend_yield', 'cost_usd'].includes(col)) colDef = 'REAL';
          else if (col === 'universe') colDef = "TEXT DEFAULT 'NIFTY500'";
          else if (col === 'source') colDef = "TEXT DEFAULT 'SEED'";
          else if (col === 'event_type') colDef = "TEXT DEFAULT 'MACRO'";
          else if (col === 'timeframe') colDef = "TEXT NOT NULL DEFAULT '1D'";

          try {
            db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${colDef}`);
          } catch {
            /* Column may already exist or ALTER not allowed */
          }
        }
      }
    } catch {
      /* Table might not exist yet */
    }
  }
}

export function initDb() {
  runMigrations();
  seedInitialData();
}

function seedInitialData() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@maxlith.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'AdminSecurePass2026!';
  const passwordHash = bcrypt.hashSync(adminPass, 10);
  const adminCash = 5000000.0;

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash, initial_capital, blocked_margin)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0.0)
    ON CONFLICT(email) DO UPDATE SET
      password_hash = excluded.password_hash,
      role = 'ADMIN'
  `).run(
    'admin-root-001',
    adminEmail,
    passwordHash,
    'MAXLITH Administrator',
    'ADMIN',
    adminCash,
    adminCash
  );

  // Admin ledger initial capital entry
  const hasAdminLedger = db.prepare("SELECT id FROM ledger_entries WHERE user_id = 'admin-root-001'").get();
  if (!hasAdminLedger) {
    db.prepare(`
      INSERT INTO ledger_entries (id, user_id, direction, account_kind, amount_paise, ref_type, memo, created_at)
      VALUES (?, ?, 'CREDIT', 'CASH', ?, 'INITIAL_CAPITAL', 'Initial paper trading virtual capital', CURRENT_TIMESTAMP)
    `).run('led-admin-init', 'admin-root-001', toPaise(adminCash));
  }

  // Seed Market Holidays
  const holidayStmt = db.prepare(`
    INSERT INTO market_holidays (date, name, exchanges)
    VALUES (?, ?, 'NSE,BSE')
    ON CONFLICT(date) DO NOTHING
  `);
  const holidayNames: Record<string, string> = {
    '2026-01-26': 'Republic Day',
    '2026-03-03': 'Holi',
    '2026-03-31': 'Id-Ul-Fitr',
    '2026-04-03': 'Good Friday',
    '2026-04-14': 'Dr. Baba Saheb Ambedkar Jayanti',
    '2026-05-01': 'Maharashtra Day',
    '2026-08-15': 'Independence Day',
    '2026-10-02': 'Mahatma Gandhi Jayanti',
    '2026-10-20': 'Dussehra',
    '2026-11-08': 'Diwali Laxmi Pujan',
    '2026-11-24': 'Gurunanak Jayanti',
    '2026-12-25': 'Christmas',
  };
  for (const hDate of NSE_HOLIDAYS_2026) {
    holidayStmt.run(hDate, holidayNames[hDate] || 'Market Holiday');
  }

  // Seed Instruments (NIFTY 500 / 50 Bluechips)
  const insertInstruments = db.transaction((items: any[]) => {
    const stmt = db.prepare(`
      INSERT INTO instruments (
        symbol, name, exchange, sector, asset_type, universe, yahoo_symbol,
        current_price, previous_close, open_price, high_price, low_price,
        change, percent_change, volume, high_52w, low_52w, market_cap, pe_ratio, pb_ratio,
        roe, roce, debt_equity, promoter_holding, dividend_yield, updated_at
      )
      VALUES (
        @symbol, @name, @exchange, @sector, @asset_type, @universe, @yahoo_symbol,
        @current_price, @previous_close, @open_price, @high_price, @low_price,
        @change, @percent_change, @volume, @high_52w, @low_52w, @market_cap, @pe_ratio, @pb_ratio,
        @roe, @roce, @debt_equity, @promoter_holding, @dividend_yield, CURRENT_TIMESTAMP
      )
      ON CONFLICT(symbol) DO UPDATE SET
        current_price = excluded.current_price,
        previous_close = excluded.previous_close,
        open_price = excluded.open_price,
        high_price = excluded.high_price,
        low_price = excluded.low_price,
        change = excluded.change,
        percent_change = excluded.percent_change,
        volume = excluded.volume,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const item of items) {
      const prevClose = item.previous_close ?? item.current_price;
      const openPrice = item.open_price ?? Number((prevClose * 1.002).toFixed(2));
      const highPrice = item.high_price ?? Number((Math.max(item.current_price, openPrice) * 1.01).toFixed(2));
      const lowPrice = item.low_price ?? Number((Math.min(item.current_price, openPrice) * 0.99).toFixed(2));
      const change = item.change ?? Number((item.current_price - prevClose).toFixed(2));
      const percentChange = item.percent_change ?? (prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0);

      stmt.run({
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange || 'NSE',
        sector: item.sector || 'General',
        asset_type: item.asset_type || 'EQUITY',
        universe: item.universe || 'NIFTY500',
        yahoo_symbol: item.yahoo_symbol || item.yahoo || `${item.symbol}.NS`,
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
      });
    }
  });

  insertInstruments(SEED_INSTRUMENTS);

  // Seed Historical OHLC Candles for every instrument (at least 30 trading days)
  const historyCount = (db.prepare('SELECT COUNT(*) as count FROM price_history').get() as { count: number }).count;
  if (historyCount < SEED_INSTRUMENTS.length * 10) {
    const historyStmt = db.prepare(`
      INSERT INTO price_history (symbol, timeframe, timestamp, open, high, low, close, volume)
      VALUES (?, '1D', ?, ?, ?, ?, ?, ?)
    `);

    const seedHistory = db.transaction(() => {
      const now = new Date();
      for (const inst of SEED_INSTRUMENTS) {
        let basePrice = inst.current_price * 0.9;
        for (let i = 45; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          // skip weekends
          if (d.getDay() === 0 || d.getDay() === 6) continue;

          const dateStr = d.toISOString().split('T')[0] + ' 15:30:00';
          const dayFactor = 1 + Math.sin(i * 0.7 + inst.symbol.length) * 0.018;
          basePrice = Number((basePrice * dayFactor).toFixed(2));
          const open = Number((basePrice * (1 - 0.004)).toFixed(2));
          const high = Number((basePrice * 1.012).toFixed(2));
          const low = Number((basePrice * 0.988).toFixed(2));
          const close = basePrice;
          const vol = Math.floor((inst.volume || 2000000) * (0.8 + ((i % 7) * 0.08)));

          try {
            historyStmt.run(inst.symbol, dateStr, open, high, low, close, vol);
          } catch {
            /* ignore duplicate timestamp */
          }
        }
      }
    });
    seedHistory();
  }

  // Seed News Items
  const sampleNews = [
    {
      id: 'news-001',
      title: 'RBI Monetary Policy: Benchmark Repo Rate Held Steady at 6.50% Amid Resilient Domestic Growth',
      summary: 'The RBI Monetary Policy Committee voted unanimously to keep the policy repo rate unchanged, citing strong domestic macroeconomic fundamentals balanced against external trade uncertainties.',
      source: 'Moneycontrol / Economic Times',
      url: 'https://moneycontrol.com',
      symbol: 'BANKNIFTY',
      sentiment: 'POSITIVE',
      event_type: 'MACRO',
      published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'news-002',
      title: 'Reliance Industries Commissioning World-Scale New Energy Manufacturing Ecosystem at Jamnagar',
      summary: 'RIL reported significant construction progress on its integrated solar photovoltaic and green hydrogen gigafactories, positioning the conglomerate for sustainable growth in green tech.',
      source: 'LiveMint',
      url: 'https://livemint.com',
      symbol: 'RELIANCE',
      sentiment: 'POSITIVE',
      event_type: 'EARNINGS',
      published_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'news-003',
      title: 'TCS Secures Multi-Million Dollar European Digital Transformation & Cloud Migration Deal',
      summary: 'Tata Consultancy Services announced an expanded enterprise agreement with a major European logistics provider to deploy hybrid cloud modernization and generative AI automation.',
      source: 'Business Standard',
      url: 'https://business-standard.com',
      symbol: 'TCS',
      sentiment: 'POSITIVE',
      event_type: 'M&A',
      published_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
      id: 'news-004',
      title: 'HDFC Bank Sustains Deposit Inflow Momentum; Net Interest Margin Expands Incrementally',
      summary: 'India largest private lender posted solid credit deposit ratio stabilization, with strong retail loan disbursals supporting profitability across rural and semi-urban branch networks.',
      source: 'Economic Times',
      url: 'https://economictimes.indiatimes.com',
      symbol: 'HDFCBANK',
      sentiment: 'POSITIVE',
      event_type: 'EARNINGS',
      published_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'news-005',
      title: 'IT Sector Export Growth Moderates as US Enterprises Tighten Discretionary Technology Budgets',
      summary: 'Indian software services bellwethers including Infosys and Wipro see elongated deal decision cycles, though long-term digital architecture pipeline bookings remain healthy.',
      source: 'Financial Express',
      url: 'https://financialexpress.com',
      symbol: 'INFY',
      sentiment: 'NEUTRAL',
      event_type: 'MACRO',
      published_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
  ];

  const newsStmt = db.prepare(`
    INSERT INTO news (id, title, summary, source, url, symbol, sentiment, event_type, published_at)
    VALUES (@id, @title, @summary, @source, @url, @symbol, @sentiment, @event_type, @published_at)
    ON CONFLICT(id) DO NOTHING
  `);
  for (const n of sampleNews) {
    newsStmt.run(n);
  }

  // Seed default admin watchlist
  const adminWl = db.prepare("SELECT id FROM watchlists WHERE user_id = 'admin-root-001'").get();
  if (!adminWl) {
    db.prepare("INSERT INTO watchlists (id, user_id, name) VALUES ('wl-admin-main', 'admin-root-001', 'NIFTY Bluechips')").run();
    const addWlItem = db.prepare("INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, 'wl-admin-main', ?)");
    addWlItem.run('wli-adm-1', 'RELIANCE');
    addWlItem.run('wli-adm-2', 'TCS');
    addWlItem.run('wli-adm-3', 'HDFCBANK');
    addWlItem.run('wli-adm-4', 'INFY');
    addWlItem.run('wli-adm-5', 'ICICIBANK');
  }
}

initDb();

export default db;
