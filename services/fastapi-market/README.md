# MAXLITH V2: High-Performance FastAPI Market Data Backend

Production-quality, asynchronous Python FastAPI backend for **MAXLITH AI Trading Platform**. Connects directly to the official **Upstox Market Data Feed V3**, decodes high-frequency binary Protocol Buffer (`Protobuf`) frames, maintains an ultra-low latency in-memory quote cache, and streams live real-time quotes, 5-level market depth, and OHLC bars to the MAXLITH frontend over persistent authenticated WebSockets.

---

## 1. Architecture & Pipeline

```text
       ┌────────────────────────────────────────────────────────┐
       │             Upstox Market Data Feed V3                 │
       │    (WSS https://api.upstox.com/v3/feed/.../authorize)   │
       └───────────────────────────┬────────────────────────────┘
                                   │ Binary Protobuf Stream
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │         FastAPI Upstox Feed Client (Asynchronous)       │
       │    - Auto-reconnect with exponential backoff & jitter  │
       │    - Official MarketDataFeedV3.proto decoder           │
       │    - Dynamic upstream instrument subscription tracking │
       └───────────────────────────┬────────────────────────────┘
                                   │ Normalized Quotes & Depth
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │        Thread-Safe In-Memory Quote & Depth Cache       │
       │    - Sub-millisecond LTP, OHLC, 5-Level Depth lookup   │
       │    - Stale quote detection (threshold configurable)     │
       │    - Optional Redis Pub/Sub adapter for clustering     │
       └─────────────────────┬───────────────────┬──────────────┘
                             │                   │
         REST API Queries    │                   │ Real-time Stream
                             ▼                   ▼
    ┌───────────────────────────────┐   ┌───────────────────────────────┐
    │       REST API Endpoints      │   │   WebSocket Gateway /ws/market│
    │ - /health, /ready, /live      │   │ - JWT Authenticated (HS256)   │
    │ - /api/v1/market/quotes       │   │ - Fan-out quote broadcast     │
    │ - /api/v1/market/depth        │   │ - Backpressure bounded queues │
    │ - /api/v1/market/candles      │   │ - Immediate cached snapshot   │
    │ - /api/v1/market/validate-ord │   │ - quote_update & bar_update   │
    │ - /api/v1/instruments/search  │   └───────────────┬───────────────┘
    └───────────────────────────────┘                   │
                                                        │ WSS
                                                        ▼
                                        ┌───────────────────────────────┐
                                        │     MAXLITH Next.js Web UI    │
                                        │  (TradingView Charts, Depth,  │
                                        │   Watchlist, Paper Trading)   │
                                        └───────────────────────────────┘
```

---

## 2. Key Features

- **Official Upstox V3 Protocol Buffers**: Decodes native binary frames without third-party scraping.
- **Dual Feed Modes**: Supports `full` (rich 5-level depth, OHLC, average traded price, volume) and `ltpc` (lightweight last-traded price & close).
- **Sub-Millisecond In-Memory Cache**: Fast quote lookups with freshness verification and configurable stale threshold.
- **Zero-Trust Paper Trading Validation**: `POST /api/v1/market/validate-order` verifies execution prices against verified server-side quotes with bid/ask spreads and simulated slippage.
- **JWT Authenticated Streaming**: Compatible with MAXLITH Next.js tokens (`issuer="maxlith-web"`, `audience="market-stream"`).
- **Resilient Upstream Connection**: Supervised lifecycle with automatic re-authorization and exponential backoff with jitter on network interruption.
- **Dynamic Subscription Aggregation**: Multi-client deduplication—subscribes upstream once per instrument, unsubscribes when active subscriber count reaches zero.

---

## 3. Directory Layout

```text
services/fastapi-market/
├── proto/
│   ├── MarketDataFeedV3.proto       # Official Upstox V3 Protobuf definition
│   └── MarketDataFeedV3_pb2.py      # Compiled Python Protobuf classes
├── src/
│   ├── api/
│   │   ├── routes_health.py         # /health, /ready, /live
│   │   ├── routes_instruments.py    # /api/v1/instruments/search, /{key}
│   │   ├── routes_market.py         # /api/v1/market/quotes, depth, candles, validate-order
│   │   └── routes_ws.py             # /ws/market WebSocket endpoint
│   ├── core/
│   │   ├── auth.py                  # JWT authentication validation
│   │   ├── cache.py                 # In-memory quote cache with stale detection
│   │   ├── instrument_master.py     # NSE/BSE instrument metadata and lookup
│   │   └── quote_normalizer.py      # Protobuf to NormalizedQuote converter
│   ├── engine/
│   │   ├── connection_manager.py    # Client WebSocket management and broadcast
│   │   ├── paper_validator.py       # Paper trading order price validator
│   │   └── upstox_client.py         # Upstox V3 WebSocket client
│   ├── models/
│   │   ├── events.py                # WebSocket incoming/outgoing event schemas
│   │   ├── instrument.py            # InstrumentItem models
│   │   └── quote.py                 # NormalizedQuote, Depth, OHLC, MarketStatus
│   ├── config.py                    # Pydantic Settings configuration
│   └── main.py                      # FastAPI application entrypoint and lifespan
├── tests/                           # 22 automated unit and integration tests
├── Dockerfile                       # Multi-stage production container build
├── .dockerignore
├── requirements.txt                 # Frozen Python dependencies
├── pyproject.toml
└── .env.example                     # Environment variables template
```

---

## 4. Setup and Local Development

### Prerequisites
- Python 3.12+
- Upstox Developer Account (`https://developer.upstox.com/`)

### Quickstart

1. **Navigate to the service directory:**
   ```bash
   cd services/fastapi-market
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python3.12 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and provide your `UPSTOX_ACCESS_TOKEN` and `MARKET_STREAM_JWT_SECRET`.

5. **Run the development server:**
   ```bash
   python -m uvicorn src.main:app --host 0.0.0.0 --port 4100 --reload
   ```

6. **Run tests:**
   ```bash
   pytest tests -v
   ```

---

## 5. WebSocket Client Protocol (`/ws/market`)

### Connection URL
```text
ws://localhost:4100/ws/market?token=<JWT_TOKEN>
```
*(In production: `wss://your-backend.example.com/ws/market?token=<JWT_TOKEN>`)*

### Client Request Messages

#### 1. Subscribe to Instrument
```json
{
  "action": "subscribe",
  "symbol": "NSE:RELIANCE",
  "resolution": "1D",
  "mode": "full"
}
```

#### 2. Unsubscribe
```json
{
  "action": "unsubscribe",
  "symbol": "NSE:RELIANCE",
  "resolution": "1D"
}
```

#### 3. Heartbeat Ping
```json
{
  "action": "ping",
  "timestamp": 1718000000000
}
```

### Server Response Messages

#### 1. Connection Status
```json
{
  "type": "connection_status",
  "status": "LIVE",
  "symbol": "NSE:RELIANCE",
  "resolution": "1D"
}
```

#### 2. Quote Update
```json
{
  "type": "quote_update",
  "symbol": "NSE:RELIANCE",
  "data": {
    "last": 2950.50,
    "change": 50.50,
    "changePercent": 1.74,
    "open": 2910.00,
    "high": 2965.00,
    "low": 2905.00,
    "previousClose": 2900.00,
    "volume": 4200000,
    "delaySeconds": 0,
    "asOf": "2026-10-09T10:30:00+00:00",
    "source": "UPSTOX_LIVE"
  }
}
```

#### 3. Order Book (5-Level Depth)
```json
{
  "type": "orderbook_update",
  "symbol": "NSE:RELIANCE",
  "data": {
    "bids": [
      {"price": 2950.00, "quantity": 1250, "orders": 0},
      {"price": 2949.50, "quantity": 3400, "orders": 0}
    ],
    "asks": [
      {"price": 2950.50, "quantity": 800, "orders": 0},
      {"price": 2951.00, "quantity": 1950, "orders": 0}
    ]
  }
}
```

#### 4. Bar Update (Real-time Candle Forming)
```json
{
  "type": "bar_update",
  "symbol": "NSE:RELIANCE",
  "data": {
    "time": 1718000000000,
    "open": 2910.00,
    "high": 2965.00,
    "low": 2905.00,
    "close": 2950.50,
    "volume": 4200000,
    "resolution": "1D"
  }
}
```

---

## 6. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check (upstream status, cache count, tick count) |
| `GET` | `/ready` | Kubernetes/container readiness check |
| `GET` | `/live` | Liveness probe |
| `GET` | `/api/v1/market/status` | Current Indian market session and segment status |
| `GET` | `/api/v1/market/quotes` | Batch quote lookup (`?instruments=NSE:RELIANCE,NSE:TCS`) |
| `GET` | `/api/v1/market/quotes/{key}` | Single instrument quote snapshot |
| `GET` | `/api/v1/market/depth` | 5-level market depth (`?symbol=NSE:RELIANCE`) |
| `GET` | `/api/v1/market/indices` | Benchmark indices (NIFTY 50, BANK NIFTY, SENSEX) |
| `GET` | `/api/v1/market/candles` | Historical OHLC candles proxy with live bar merge |
| `POST` | `/api/v1/market/validate-order` | Server-side paper trading order validation |
| `GET` | `/api/v1/instruments/search` | Search instruments by symbol or company name |
| `GET` | `/api/v1/instruments/{key}` | Get instrument master metadata |

---

## 7. Production Deployment Guide

### Option A: Docker Container
```bash
docker build -t maxlith-fastapi-market .
docker run -d \
  -p 4100:4100 \
  --env-file .env \
  --name maxlith-market \
  maxlith-fastapi-market
```

### Option B: Render / Railway / Fly.io
1. Connect this repository to Render or Railway.
2. Set Root Directory to `services/fastapi-market`.
3. Set Build Command: `pip install -r requirements.txt`
4. Set Start Command: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
5. Configure environment variables in the provider dashboard:
   - `UPSTOX_ACCESS_TOKEN`
   - `MARKET_STREAM_JWT_SECRET`
   - `MAXLITH_ALLOWED_ORIGINS` (e.g. `https://maxlith-main.vercel.app`)
6. In your Vercel deployment of the MAXLITH frontend, configure:
   ```env
   NEXT_PUBLIC_MARKET_WS_URL=wss://<YOUR_DEPLOYED_BACKEND_DOMAIN>/ws/market
   ```

