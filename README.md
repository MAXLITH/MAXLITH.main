# MAXLITH.main
# MAXLITH — AI-Powered Indian Equities Paper Trading Platform

MAXLITH is an institutional-grade paper trading platform designed for Indian Equities (NSE/BSE). It delivers real-time market data quotes, authentic Indian regulatory charge calculations, a double-entry ledger financial accounting model, and a decoupled 5-agent AI ecosystem powered by Anthropic Claude.

---

## 🏛 System Architecture

```
                          ┌───────────────────────────┐
                          │   Next.js 15 App Router   │
                          │   (Tailwind, React 19)    │
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
│  & Ledger    │        │  (5 Agents)  │ │  (Providers) │       │   Workers    │
└───────┬──────┘        └───────┬──────┘ └───────┬──────┘       └───────┬──────┘
        │                       │                │                      │
        └───────────────────────┼────────────────┼──────────────────────┘
                                ▼                ▼
                    ┌──────────────────────────────────────┐
                    │    ACID Database (SQLite WAL Mode)   │
                    │   + Redis / In-Memory Cache Layer    │
                    └──────────────────────────────────────┘
```

---

## 🌟 Key Features & Capabilities

### A. Top Bar
- **Debounced Autocomplete Search:** Instant symbol search across NIFTY 500 equities with real-time prices and sector badges (`GET /api/search?q=`).
- **Live Market Status:** Deterministic IST clock displaying real-time session status (`OPEN`, `PRE_MARKET`, `POST_MARKET`, `CLOSED`), automated NSE 2026 holiday calendar checks, and countdown to next session open/close (`GET /api/market/status`).
- **Virtual Cash Balance:** Live wallet balance automatically updating via account balance events.

### B. Paper Trading Engine & Regulatory Financials
- **Zero-Money Simulation:** Realistic Indian trading with zero financial exposure.
- **Indian Regulatory Charges Model:** Configurable accurate statutory charges:
  - **Securities Transaction Tax (STT):** 0.1% on delivery (BUY/SELL), 0.025% on intraday SELL.
  - **Exchange Transaction Charges:** 0.00297% on turnover.
  - **SEBI Turnover Charges:** ₹10 per crore (0.0001%).
  - **Stamp Duty:** 0.015% on delivery BUY, 0.003% on intraday BUY.
  - **Goods and Services Tax (GST):** 18% on (brokerage + exchange txn + SEBI charges).
  - **Brokerage:** Configurable discount brokerage capped at ₹20 per trade.
- **Double-Entry Ledger Accounting:** Every cash debit and credit is recorded in `ledger_entries` with integer paise precision, ensuring 100% wallet reconcilability.
- **Order Types & Execution:**
  - `MARKET`, `LIMIT`, `SL`, `SL-M` orders.
  - Product types: `CNC` (Cash & Carry / Delivery) and `MIS` (Margin Intraday Square-off with 5x leverage).
  - Slippage simulation (configurable, default 5 bps / 0.05%).
  - After Market Orders (AMO) queueing when session is closed.
  - Idempotent order placement via `Idempotency-Key` header.
- **Automated Background Workers:**
  - Order matching engine evaluating limit/SL triggers every 3 seconds.
  - Intraday (MIS) auto square-off scheduled daily at 15:15 IST.
  - Daily portfolio equity curve snapshots taken at 15:45 IST.

### C. Multi-Agent AI Ecosystem
MAXLITH eliminates LLM hallucinations by calculating mathematical indicators in code, having specialized agents interpret deterministic data, and enforcing strict Zod JSON schemas:

1. **TECH AGENT:** Mathematical computation of RSI (14), SMA (20/50/200), EMA (20/50), MACD, Bollinger Bands, ATR (14), ADX, support/resistance pivot levels, and candlestick pattern recognition.
2. **NEWS AGENT:** Real-time Indian financial news aggregation (ET, Moneycontrol, Livemint) with sentiment analysis (`POSITIVE`, `NEUTRAL`, `NEGATIVE`) and event classification.
3. **RISK AGENT:** Portfolio concentration by stock & sector, annualized volatility, historical 95% Value-at-Risk (VaR), max drawdown, and pre-trade ticket risk checks.
4. **FUNDAMENTAL AGENT:** Balance sheet multiples (P/E, P/B, ROE, ROCE, Debt/Equity, Promoter Holding, Dividend Yield) and sector valuation ranking.
5. **INFO AGENT:** Static company metadata, index inclusion lists, and conversational routing.
6. **MAXLITH AI ORCHESTRATOR:** Runs agents in parallel, synthesizes their findings with agent citations, produces confidence scores, logs telemetry/token costs, and appends mandatory educational disclaimers.

### D. Sidebar Navigation & Views
- **Dashboard (`/dashboard`):** Total portfolio value, virtual cash, invested value, today's P&L, overall P&L, market movers, and index summaries.
- **Markets (`/dashboard/markets`):** Index overview, sector heatmap, gainers/losers/most active, and instrument explorer table.
- **Stock Detail (`/dashboard/markets/[symbol]`):** OHLC chart with timeframe filters (`1D`, `1W`, `1M`, `6M`, `1Y`, `5Y`), technical matrix, fundamentals, news, and risk tabs.
- **Watchlists (`/dashboard/watchlist`):** Multiple named watchlists with real-time SSE quote updates.
- **Paper Trading (`/dashboard/paper-trading`):** Interactive order ticket with live margin and charges preview.
- **Orders (`/dashboard/orders`):** Order book (all, open, executed, cancelled) and trade book with cancellation and modification support.
- **AI Copilot (`/dashboard/ai-copilot`):** Conversational AI agent orchestrator with conversation persistence.
- **AI Agents (`/dashboard/ai-agents`):** On-demand agent execution runner with live telemetry, token tracking, and output inspector.
- **Price Alerts (`/dashboard/alerts`):** Threshold alert creation, deletion, and in-app breakout notifications.
- **Settings (`/dashboard/settings`):** Profile details, password change, notification toggles, and account reset with custom starting capital.
- **Admin Telemetry (`/admin`):** RBAC-protected system diagnostics, LLM token and cost per agent, provider health, job queue status, and audit logs.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22.21.1 (pinned in `.nvmrc`; the project requires Node.js 22.3.0 or newer)
- npm or pnpm

### Quick Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/maxlith/maxlith.git
   cd maxlith
   ```

2. **Select the project Node.js version and install dependencies:**
   ```bash
   nvm install
   nvm use
   node --version # v22.21.1
   npm ci
   ```
   Use the Node version from `.nvmrc` before installing or rebuilding native modules such as `better-sqlite3`. If you change Node versions, run `npm rebuild better-sqlite3` under the selected Node version.

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   *Edit `.env.local` to specify optional API keys such as `ANTHROPIC_API_KEY` for live Claude inference.*

4. **Initialize & Seed Database:**
   The database automatically initializes and seeds on server start:
   - Development admin account: `admin@maxlith.com` (password from `.env.local` or development default `AdminSecurePass2026!`)
   - NIFTY 500 equity instruments
   - 45 days of historical OHLC daily candles
   - 2026 NSE holiday calendar
   - Market news disclosures

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker Deployment

To launch the complete MAXLITH stack with Redis:

```bash
docker-compose up --build -d
```

Access the application at `http://localhost:3000`.

---

## 🧪 Testing Suite

MAXLITH includes 20 comprehensive unit tests covering financial math, statutory charges, market hours, paper order execution, and technical indicators:

```bash
npm test
```

### Verified Test Suites:
- `tests/money.test.ts`: Integer paise precision, roundToTick, slippage calculations, INR formatting.
- `tests/charges.test.ts`: Delivery vs Intraday Indian statutory charge calculations (STT, SEBI, GST, stamp duty).
- `tests/market-hours.test.ts`: IST conversion, NSE holiday checks, session status logic.
- `tests/paper-engine.test.ts`: Order execution, AMO queuing, double-entry ledger reconciliation, portfolio summary, account reset.
- `tests/tech-agent.test.ts`: RSI, SMA, MACD, Bollinger Bands, and Zod output schema validation.

---

## 🔌 Extending the Platform

### Adding a New Market Data Provider
Implement the `MarketDataProvider` interface located at `src/lib/market-data/types.ts`:

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
Register your provider in `src/lib/market-data/service.ts`.

### Adding a New AI Agent
Extend the `BaseAgent` class located at `src/lib/agents/base.ts`:

```typescript
import { BaseAgent, BaseAgentRunParams } from './base';
import { z } from 'zod';

const CustomOutputSchema = z.object({
  agentName: z.literal('CUSTOM'),
  verdict: z.string(),
  disclaimer: z.string(),
});

export class CustomAgent extends BaseAgent<BaseAgentRunParams, z.infer<typeof CustomOutputSchema>> {
  readonly name = 'CUSTOM';
  readonly systemPrompt = 'Your specialized role prompt...';
  readonly outputSchema = CustomOutputSchema;

  protected async execute(input: BaseAgentRunParams) {
    // Deterministic calculation or tool call + LLM synthesis
  }
}
```

---

## 📄 License & Disclaimer

**MAXLITH is a simulated paper trading platform designed for educational and algorithmic research purposes only. No real money or broker integration is involved. None of the AI agent outputs constitute financial or investment advice.**
