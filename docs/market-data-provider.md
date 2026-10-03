# MAXLITH market-data adapter contract

MAXLITH accepts a server-side normalized provider adapter. Set `MARKET_DATA_PROVIDER` and `MARKET_DATA_BASE_URL` only after connecting a licensed provider or a MAXLITH-side adapter for one. `MARKET_DATA_API_KEY` is sent as a server-side Bearer token and is never returned by `/api/market/config`.

The configured API root must implement these JSON endpoints:

| Request | Response |
| --- | --- |
| `GET /symbols/search?q=&exchange=&limit=` | `{ "data": [{ "symbol": "RELIANCE", "exchange": "NSE", "name": "Reliance Industries Ltd", "type": "stock", "tradable": true }] }` |
| `GET /symbols/NSE%3ARELIANCE` | `{ "data": { "symbol": "RELIANCE", "exchange": "NSE", "name": "Reliance Industries Ltd", "type": "stock", "tradable": true } }` or `{ "data": null }` |
| `GET /quotes?symbol=NSE%3ARELIANCE` | `{ "data": { "symbol": "RELIANCE", "exchange": "NSE", "name": "Reliance Industries Ltd", "last": 2985.4, "change": 24.1, "changePercent": 0.81, "open": 2970, "high": 2992, "low": 2960, "previousClose": 2961.3, "volume": 1250000, "asOf": "2026-10-05T09:25:00+05:30", "source": "provider-name", "delaySeconds": 0 } }` |
| `GET /history?symbol=&resolution=&from=&to=&countback=` | `{ "data": [{ "time": 1791172500, "open": 2970, "high": 2992, "low": 2960, "close": 2985.4, "volume": 1250000 }] }` |
| `GET /depth?symbol=` | `{ "data": { "available": false, "bids": [], "asks": [], "message": "Market depth unavailable for this data source." } }` or actual provider levels |
| `GET /status` | `{ "data": { "session": "OPEN", "isOpen": true, "timezone": "Asia/Kolkata", "asOf": "...", "source": "provider-name" } }` |

History times are Unix seconds. The adapter validates positive OHLC, candle bounds, nonnegative volume, ordered timestamps, quote timestamps, and depth levels. It rejects malformed values instead of generating replacements.

When `MARKET_DATA_WS_URL` is set, the provider socket uses JSON commands `{ "action": "subscribe", "symbol": "NSE:RELIANCE", "resolution": "1" }`, `{ "action": "unsubscribe", ... }`, and `{ "action": "ping", "timestamp": 0 }`. It should return `bar_update` messages with a canonical exchange-qualified symbol and the same bar shape as `/history`; normalized `quote_update`, `trade_update`, `orderbook_update`, and `market_status` messages are also supported. Heartbeat replies use `{ "type": "pong" }`.

## Public WebSocket gateway

Vercel route handlers do not host long-lived WebSocket servers, so `services/market-stream` is a separate Node 22 service. It keeps one provider socket per canonical symbol and resolution, shares each stream among authenticated browser clients, validates incoming frames, sends heartbeats, reconnects with bounded backoff, and closes unused upstream sockets.

Run it locally with `npm run market-stream` after setting `MARKET_DATA_WS_URL`, `MARKET_DATA_API_KEY` (if required), `MARKET_STREAM_JWT_SECRET` (at least 32 characters), and `MARKET_STREAM_ALLOWED_ORIGINS`. Deploy it as a separate container using `services/market-stream/Dockerfile`; expose `/ws/market` over TLS and `/health` for health checks. Set `NEXT_PUBLIC_MARKET_WS_URL` to the public `wss://…/ws/market` address. The Next.js token endpoint requires an authenticated session and signs short-lived stream tokens with the same `MARKET_STREAM_JWT_SECRET`. Never set the public WebSocket URL to the provider endpoint.

Set `MARKET_STREAM_ALLOWED_ORIGINS` to the MAXLITH site origin(s), comma-separated. The gateway limits each user to five connections and each socket to 24 subscriptions. The app presents streaming as offline until the REST provider, provider WebSocket, public gateway URL, and signing secret are all configured.

Without a configured adapter, market search, quotes, symbol resolution, and historical bars return an explicit unavailable response. No seed data is used by these new routes.
