import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH 
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.join(dbDir, 'maxlith.db');

const db = new Database(dbPath, { timeout: 10000 });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      virtual_cash REAL NOT NULL DEFAULT 1000000.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS instruments (
      symbol TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      exchange TEXT NOT NULL,
      sector TEXT,
      asset_type TEXT NOT NULL DEFAULT 'EQUITY',
      current_price REAL NOT NULL,
      previous_close REAL NOT NULL,
      open_price REAL NOT NULL,
      high_price REAL NOT NULL,
      low_price REAL NOT NULL,
      change REAL NOT NULL,
      percent_change REAL NOT NULL,
      volume INTEGER NOT NULL DEFAULT 0,
      high_52w REAL,
      low_52w REAL,
      market_cap REAL,
      pe_ratio REAL,
      pb_ratio REAL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume INTEGER NOT NULL,
      FOREIGN KEY (symbol) REFERENCES instruments(symbol) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS watchlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS watchlist_items (
      id TEXT PRIMARY KEY,
      watchlist_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
      FOREIGN KEY (symbol) REFERENCES instruments(symbol) ON DELETE CASCADE,
      UNIQUE(watchlist_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      order_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      executed_price REAL,
      status TEXT NOT NULL,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      executed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (symbol) REFERENCES instruments(symbol) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      average_price REAL NOT NULL,
      realized_pnl REAL NOT NULL DEFAULT 0.0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (symbol) REFERENCES instruments(symbol) ON DELETE CASCADE,
      UNIQUE(user_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      order_id TEXT,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      quantity INTEGER DEFAULT 0,
      price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      condition TEXT NOT NULL,
      target_value REAL NOT NULL,
      is_triggered INTEGER DEFAULT 0,
      triggered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (symbol) REFERENCES instruments(symbol) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      source TEXT NOT NULL,
      url TEXT,
      symbol TEXT,
      sentiment TEXT NOT NULL DEFAULT 'NEUTRAL',
      published_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      agent_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_agent_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      output TEXT NOT NULL,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      execution_time_ms INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'SUCCESS',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
    CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol, timestamp);
    CREATE INDEX IF NOT EXISTS idx_news_symbol ON news(symbol);
    CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at);
  `);

  seedInitialData();
}

function seedInitialData() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@maxlith.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'AdminSecurePass2026!';
  const passwordHash = bcrypt.hashSync(adminPass, 10);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO NOTHING
  `).run(
    'admin-root-001',
    adminEmail,
    passwordHash,
    'MAXLITH Administrator',
    'ADMIN',
    5000000.0
  );

  const initialInstruments = [
    {
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      exchange: 'NSE',
      sector: 'Energy & Conglomerate',
      current_price: 2985.40,
      previous_close: 2962.10,
      open_price: 2965.00,
      high_price: 2998.00,
      low_price: 2958.00,
      change: 23.30,
      percent_change: 0.79,
      volume: 4820150,
      high_52w: 3217.90,
      low_52w: 2220.30,
      market_cap: 2019450,
      pe_ratio: 28.4,
      pb_ratio: 2.6
    },
    {
      symbol: 'TCS',
      name: 'Tata Consultancy Services Ltd.',
      exchange: 'NSE',
      sector: 'Information Technology',
      current_price: 4280.15,
      previous_close: 4310.50,
      open_price: 4315.00,
      high_price: 4330.00,
      low_price: 4265.10,
      change: -30.35,
      percent_change: -0.70,
      volume: 2150340,
      high_52w: 4585.90,
      low_52w: 3310.00,
      market_cap: 1548000,
      pe_ratio: 31.8,
      pb_ratio: 13.2
    },
    {
      symbol: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      exchange: 'NSE',
      sector: 'Banking & Financials',
      current_price: 1642.80,
      previous_close: 1628.00,
      open_price: 1630.00,
      high_price: 1650.00,
      low_price: 1625.50,
      change: 14.80,
      percent_change: 0.91,
      volume: 12450800,
      high_52w: 1794.00,
      low_52w: 1363.45,
      market_cap: 1250300,
      pe_ratio: 18.2,
      pb_ratio: 2.7
    },
    {
      symbol: 'INFY',
      name: 'Infosys Ltd.',
      exchange: 'NSE',
      sector: 'Information Technology',
      current_price: 1892.50,
      previous_close: 1875.00,
      open_price: 1878.00,
      high_price: 1905.00,
      low_price: 1872.00,
      change: 17.50,
      percent_change: 0.93,
      volume: 6850120,
      high_52w: 1992.00,
      low_52w: 1358.35,
      market_cap: 785400,
      pe_ratio: 29.5,
      pb_ratio: 8.4
    },
    {
      symbol: 'ICICIBANK',
      name: 'ICICI Bank Ltd.',
      exchange: 'NSE',
      sector: 'Banking & Financials',
      current_price: 1235.60,
      previous_close: 1222.10,
      open_price: 1225.00,
      high_price: 1241.00,
      low_price: 1221.00,
      change: 13.50,
      percent_change: 1.10,
      volume: 8940200,
      high_52w: 1258.00,
      low_52w: 928.00,
      market_cap: 868900,
      pe_ratio: 18.9,
      pb_ratio: 3.1
    },
    {
      symbol: 'BHARTIARTL',
      name: 'Bharti Airtel Ltd.',
      exchange: 'NSE',
      sector: 'Telecommunications',
      current_price: 1560.30,
      previous_close: 1545.00,
      open_price: 1548.00,
      high_price: 1572.00,
      low_price: 1542.10,
      change: 15.30,
      percent_change: 0.99,
      volume: 4120300,
      high_52w: 1610.00,
      low_52w: 902.00,
      market_cap: 890100,
      pe_ratio: 65.4,
      pb_ratio: 8.9
    },
    {
      symbol: 'SBIN',
      name: 'State Bank of India',
      exchange: 'NSE',
      sector: 'Banking & Financials',
      current_price: 815.40,
      previous_close: 808.90,
      open_price: 810.00,
      high_price: 821.50,
      low_price: 806.00,
      change: 6.50,
      percent_change: 0.80,
      volume: 11200450,
      high_52w: 912.00,
      low_52w: 560.00,
      market_cap: 727700,
      pe_ratio: 10.8,
      pb_ratio: 1.8
    },
    {
      symbol: 'LTIM',
      name: 'LTIMindtree Ltd.',
      exchange: 'NSE',
      sector: 'Information Technology',
      current_price: 6140.00,
      previous_close: 6210.00,
      open_price: 6200.00,
      high_price: 6225.00,
      low_price: 6110.00,
      change: -70.00,
      percent_change: -1.13,
      volume: 850120,
      high_52w: 6765.00,
      low_52w: 4500.00,
      market_cap: 181800,
      pe_ratio: 38.6,
      pb_ratio: 9.8
    },
    {
      symbol: 'TATAMOTORS',
      name: 'Tata Motors Ltd.',
      exchange: 'NSE',
      sector: 'Automobile',
      current_price: 982.10,
      previous_close: 971.50,
      open_price: 975.00,
      high_price: 990.00,
      low_price: 970.00,
      change: 10.60,
      percent_change: 1.09,
      volume: 7650300,
      high_52w: 1179.00,
      low_52w: 612.00,
      market_cap: 326000,
      pe_ratio: 10.4,
      pb_ratio: 3.4
    },
    {
      symbol: 'ITC',
      name: 'ITC Ltd.',
      exchange: 'NSE',
      sector: 'FMCG',
      current_price: 512.45,
      previous_close: 508.10,
      open_price: 509.00,
      high_price: 515.00,
      low_price: 507.50,
      change: 4.35,
      percent_change: 0.86,
      volume: 9840100,
      high_52w: 528.50,
      low_52w: 399.30,
      market_cap: 640200,
      pe_ratio: 31.2,
      pb_ratio: 8.1
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO instruments (
      symbol, name, exchange, sector, current_price, previous_close,
      open_price, high_price, low_price, change, percent_change,
      volume, high_52w, low_52w, market_cap, pe_ratio, pb_ratio
    ) VALUES (
      @symbol, @name, @exchange, @sector, @current_price, @previous_close,
      @open_price, @high_price, @low_price, @change, @percent_change,
      @volume, @high_52w, @low_52w, @market_cap, @pe_ratio, @pb_ratio
    ) ON CONFLICT(symbol) DO UPDATE SET
      current_price = excluded.current_price,
      change = excluded.change,
      percent_change = excluded.percent_change,
      volume = excluded.volume,
      updated_at = CURRENT_TIMESTAMP
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) stmt.run(item);
  });
  insertMany(initialInstruments);

  const historyStmt = db.prepare(`
    INSERT INTO price_history (symbol, timestamp, open, high, low, close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const existingHistory = db.prepare('SELECT COUNT(*) as count FROM price_history').get() as { count: number };
  if (existingHistory.count === 0) {
    const seedHistory = db.transaction(() => {
      const now = new Date();
      for (const inst of initialInstruments) {
        let basePrice = inst.current_price * 0.85;
        for (let i = 30; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0] + ' 15:30:00';
          const dayFactor = 1 + (Math.sin(i * 0.8 + inst.symbol.length) * 0.015);
          basePrice = basePrice * dayFactor;
          const open = basePrice * 0.998;
          const high = basePrice * 1.012;
          const low = basePrice * 0.992;
          const close = basePrice;
          const vol = Math.floor(inst.volume * (0.8 + (i % 5) * 0.1));

          historyStmt.run(inst.symbol, dateStr, open, high, low, close, vol);
        }
      }
    });
    seedHistory();
  }

  const sampleNews = [
    {
      id: 'news-001',
      title: 'RBI Monetary Policy: Repo Rate Kept Unchanged at 6.5% with Focus on Inflation Control',
      summary: 'The Reserve Bank of India MPC decided to keep benchmark repo rates steady, maintaining a neutral to hawkish stance amidst global market volatility.',
      source: 'Moneycontrol / Economic Times',
      url: 'https://economic-times.indiatimes.com',
      symbol: 'BANKNIFTY',
      sentiment: 'POSITIVE',
      published_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'news-002',
      title: 'Reliance Industries Expands Clean Energy Capex with New Solar Gigafactory Roadmap',
      summary: 'RIL announced accelerated milestones for its Jamnagar green energy complex, targeting commercial operationalization of solar cell manufacturing by Q4.',
      source: 'LiveMint',
      url: 'https://livemint.com',
      symbol: 'RELIANCE',
      sentiment: 'POSITIVE',
      published_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'news-003',
      title: 'IT Sector Q2 Earnings Outlook: Digital Services Growth Moderates Amid US Enterprise Spending Review',
      summary: 'Leading Tier-1 Indian IT companies including TCS and Infosys report steady deal wins, though client discretionary tech spending remains closely monitored.',
      source: 'Business Standard',
      url: 'https://business-standard.com',
      symbol: 'TCS',
      sentiment: 'NEUTRAL',
      published_at: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ];

  const newsStmt = db.prepare(`
    INSERT INTO news (id, title, summary, source, url, symbol, sentiment, published_at)
    VALUES (@id, @title, @summary, @source, @url, @symbol, @sentiment, @published_at)
    ON CONFLICT(id) DO NOTHING
  `);
  for (const n of sampleNews) {
    newsStmt.run(n);
  }
}

initDb();

export default db;
