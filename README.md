# MAXLITH — AI-Powered Indian Equities Paper Trading Platform

MAXLITH is an institutional-grade algorithmic paper trading and market intelligence platform engineered for Indian Equities (NSE/BSE). It delivers sub-millisecond market data quotes, authentic Indian regulatory charge calculations, a double-entry ledger financial accounting model, and a decoupled 5-agent AI ecosystem.

🌐 **Production Terminal:** [https://maxlith-main.vercel.app](https://maxlith-main.vercel.app)

---

## 🏛 System Architecture

```
                                  ┌───────────────────────────┐
                                  │   Next.js 15 App Router   │
                                  │   (Tailwind v4, React 19) │
                                  └─────────────┬─────────────┘
                                                │
                            ┌───────────────────┴───────────────────┐
                            ▼                                       ▼
              ┌───────────────────────────┐           ┌───────────────────────────┐
              │     API Route Handlers    │           │    Real-Time SSE Streams  │
              │   (/app/api/v1 & REST)    │           │  (/stream/quotes, alerts) │
              └─────────────┬─────────────┘           └─────────────┬─────────────┘
                            │                                       │
                ┌───────────┴───────────┐               ┌───────────┴───────────┐
                ▼                       ▼               ▼                       ▼
        ┌──────────────┐        ┌──────────────┐ ┌──────────────┐       ┌──────────────┐
        │ Paper Engine │        │ AI Ecosystem │ │ Market Data  │       │  Background  │
        │  & Ledger    │        │  (5 Agents)  │ │ (Upstox/NSE) │       │   Workers    │
        └───────┬──────┘        └───────┬──────┘ └───────┬──────┘       └───────┬──────┘
                │                       │                │                      │
                └───────────────────────┼────────────────┼──────────────────────┘
                                        ▼                ▼
                            ┌──────────────────────────────────────┐
                            │    Stateless Serverless Store / DB   │
                            │      + Supabase SSR Hybrid Auth      │
                            └──────────────────────────────────────┘
```

---

## 🌟 Key Features & Capabilities

### A. Institutional Design & Theming
- **Global Institutional Purple Palette:** Standardized on `#7C6FF2` primary brand accent, `#080B10` ultra-dark background, and graphite card surfaces (`#111720`).
- **Institutional Authentication Terminal (`/login`, `/signup`):** Split-screen visual terminal showcasing live NIFTY 50 candlestick graphics, moving averages, session VWAP, and bull/bear momentum meters.
- **Micro-Animations & Responsive Data Views:** High-density, latency-optimized layouts built with Tailwind CSS v4 and custom glassmorphism.

### B. High-Reliability Authentication Architecture
- **Self-Contained Stateless JWT Sessions:** Signed HS256 tokens embed complete profile information (`id`, `email`, `fullName`, `role`, `virtualCash`, `initialCapital`, `blockedMargin`). Eliminates serverless lambda state fragmentation and cold-start database latency.
- **Zero-Deadlock Account Resolution:** Entering existing credentials on the "Create Account" tab automatically authenticates and routes directly to `/dashboard` without duplicate-email errors.
- **1-Click Access Key Reset (`/api/auth/reset-key`):** Integrated password recovery right inside the authentication terminal.
- **Loop-Safe Middleware:** Route protection with explicit action parameters (`redirect`, `error`, `mode`, `switch`) to prevent `ERR_TOO_MANY_REDIRECTS`.
- **Hybrid Supabase SSR Compatibility:** Native integration supporting both Supabase Auth SSR cookies and standalone cryptographic session tokens.

### C. Top Bar & Telemetry
- **Debounced Autocomplete Search:** Instant symbol search across NIFTY 500 equities with real-time prices and sector badges (`GET /api/market/search?q=`).
- **Live Market Status:** Deterministic IST clock displaying real-time session status (`OPEN`, `PRE_MARKET`, `POST_MARKET`, `CLOSED`), automated NSE 2026 holiday calendar checks, and countdown to next session open/close.
- **Live Virtual Cash Badge:** Real-time wallet tracking with Indian number formatting (`₹10,00,000.00`).

### D. Paper Trading Engine & Regulatory Financials
- **Zero-Money Simulation:** Realistic Indian stock market trading with ₹10,00,000 in starting virtual capital.
- **Indian Regulatory Charges Model:** Configurable statutory charges calculated to integer paise accuracy:
  - **Securities Transaction Tax (STT):** 0.1% on delivery (BUY/SELL), 0.025% on intraday SELL.
  - **Exchange Transaction Charges:** 0.00297% on turnover.
  - **SEBI Turnover Charges:** ₹10 per crore (0.0001%).
  - **Stamp Duty:** 0.015% on delivery BUY, 0.003% on intraday BUY.
  - **Goods and Services Tax (GST):** 18% on (brokerage + exchange txn + SEBI charges).
  - **Brokerage:** Discount brokerage capped at ₹20 per trade.
- **Double-Entry Ledger Accounting:** Cash debits and credits recorded with immutable ledger entries (`ledger_entries`) ensuring 100% wallet reconciliation.
- **Order Types & Execution:**
  - `MARKET`, `LIMIT`, `SL`, `SL-M` orders.
  - Product types: `CNC` (Delivery) and `MIS` (Intraday with 5x leverage).
  - Configurable slippage simulation (default 5 bps / 0.05%).
  - After Market Orders (AMO) queueing during market closed hours.
  - Idempotent order placement via `Idempotency-Key` headers.

### E. Multi-Agent AI Ecosystem
MAXLITH eliminates LLM hallucinations by calculating mathematical indicators in code, having specialized agents interpret deterministic data, and enforcing strict Zod JSON schemas:

1. **TECH AGENT:** Mathematical computation of RSI (14), SMA (20/50/200), EMA (20/50), MACD, Bollinger Bands, ATR (14), ADX, support/resistance pivot levels, and candlestick pattern recognition.
2. **NEWS AGENT:** Real-time Indian financial news aggregation with sentiment analysis (`POSITIVE`, `NEUTRAL`, `NEGATIVE`) and event classification.
3. **RISK AGENT:** Portfolio concentration by stock & sector, annualized volatility, historical 95% Value-at-Risk (VaR), max drawdown, and pre-trade ticket risk checks.
4. **FUNDAMENTAL AGENT:** Valuation multiples (P/E, P/B, ROE, ROCE, Debt/Equity, Promoter Holding, Dividend Yield) and sector valuation ranking.
5. **INFO AGENT:** Static company metadata, index inclusion lists, and conversational routing.
6. **MAXLITH AI ORCHESTRATOR:** Runs agents in parallel, synthesizes their findings with agent citations, produces confidence scores, logs telemetry/token costs, and appends educational disclaimers.

### F. Terminal Navigation & Views
- **Dashboard (`/dashboard`):** Portfolio value, virtual cash, invested value, today's P&L, overall P&L, market movers, and index summaries.
- **Markets (`/dashboard/markets`):** Index overview, sector heatmap, gainers/losers/most active, and instrument explorer table.
- **Stock Detail (`/dashboard/markets/[symbol]`):** Interactive charts with timeframe filters (`1D`, `1W`, `1M`, `6M`, `1Y`, `5Y`), technical matrix, fundamentals, news, and risk tabs.
- **Watchlists (`/dashboard/watchlist`):** Custom watchlists with real-time SSE quote updates.
- **Paper Trading (`/dashboard/paper-trading`):** Interactive order ticket with live margin and charges preview.
- **Orders (`/dashboard/orders`):** Order book (all, open, executed, cancelled) and trade book with cancellation and modification support.
- **AI Copilot (`/dashboard/ai-copilot`):** Conversational AI agent orchestrator with persistent chat history.
- **AI Agents (`/dashboard/ai-agents`):** On-demand agent execution runner with live telemetry, token tracking, and output inspector.
- **Price Alerts (`/dashboard/alerts`):** Threshold alert creation, deletion, and in-app breakout notifications.
- **Settings (`/dashboard/settings`):** Profile management, password reset, notification toggles, and account reset.
- **Admin Telemetry (`/admin`):** RBAC-protected diagnostics, LLM token and cost per agent, provider health, job queue status, and audit logs.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or 22.x
- npm, pnpm, or yarn

### Quick Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MAXLITH/MAXLITH.main.git
   cd MAXLITH.main
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   *Configure keys in `.env.local`:*
   ```env
   NODE_ENV=development
   PORT=3000
   JWT_SECRET=your_secure_jwt_secret_here
   ADMIN_EMAIL=admin@maxlith.com
   ADMIN_PASSWORD=AdminSecurePass2026!
   INITIAL_VIRTUAL_CAPITAL=1000000

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Market Data Provider
   MARKET_DATA_PROVIDER=upstox
   UPSTOX_ACCESS_TOKEN=your_upstox_token_here
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## ☁️ Deployment (Vercel)

MAXLITH is optimized for seamless zero-configuration deployment to **Vercel**:

1. Push your changes to GitHub (`main` branch).
2. Connect your repository to Vercel.
3. Configure the Environment Variables (`JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, etc.).
4. The deployment pipeline will automatically build and deploy the application.

Production URL: **[https://maxlith-main.vercel.app](https://maxlith-main.vercel.app)**

---

## 🧪 Testing Suite

MAXLITH includes comprehensive test coverage for financial math, statutory charges, market hours, and agent validation:

```bash
npm test
```

### Verified Test Suites:
- `tests/money.test.ts`: Integer paise precision, `roundToTick`, slippage calculations, INR formatting.
- `tests/charges.test.ts`: Delivery vs Intraday statutory charge calculations (STT, SEBI, GST, stamp duty).
- `tests/market-hours.test.ts`: IST conversion, NSE holiday checks, session status logic.
- `tests/paper-engine.test.ts`: Order execution, AMO queuing, double-entry ledger reconciliation, portfolio summary, account reset.
- `tests/tech-agent.test.ts`: RSI, SMA, MACD, Bollinger Bands, and Zod output schema validation.

---

## 🔌 Extending Market Data Providers

To connect a new broker or exchange data feed, implement the `MarketDataProvider` interface located at `src/lib/market-data/types.ts`:

```typescript
import { MarketDataProvider, LiveQuote, OHLCV } from './types';

export class CustomProvider implements MarketDataProvider {
  readonly name = 'CUSTOM_BROKER_FEED';

  async getQuotes(symbols: string[]): Promise<Map<string, LiveQuote>> {
    // 1. Fetch live quotes from upstream API
    // 2. Return Map<symbol, LiveQuote>
  }

  async getHistory(symbol: string, timeframe: string): Promise<OHLCV[]> {
    // Return array of historical OHLC candles
  }
}
```

Register the provider in `src/lib/market-data/service.ts`.

---

## 📄 License & Disclaimer

**MAXLITH is an algorithmic research and simulated paper trading platform designed for educational purposes only. No real money or actual broker order execution is involved. None of the AI agent analysis or telemetry constitutes financial or investment advice.**
