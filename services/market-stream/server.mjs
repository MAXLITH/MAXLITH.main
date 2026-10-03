import { createServer } from 'node:http';
import { jwtVerify } from 'jose';
import { WebSocket, WebSocketServer } from 'ws';

const port = Number(process.env.PORT || 4100);
const secret = process.env.MARKET_STREAM_JWT_SECRET || '';
const providerUrl = process.env.MARKET_DATA_WS_URL || '';
const providerApiKey = process.env.MARKET_DATA_API_KEY || '';
const allowedOrigins = new Set((process.env.MARKET_STREAM_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean));
const resolutions = new Set(['1', '3', '5', '15', '30', '60', '120', '240', '1D', '1W', '1M']);
const streams = new Map();
const connectionsByUser = new Map();
const maxConnectionsPerUser = 5;
const maxSubscriptionsPerClient = 24;

if (secret.length < 32) throw new Error('MARKET_STREAM_JWT_SECRET must contain at least 32 characters.');
if (providerUrl) new URL(providerUrl);

const httpServer = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ status: 'ok', providerConfigured: Boolean(providerUrl), activeStreams: streams.size }));
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024, perMessageDeflate: false });

httpServer.on('upgrade', async (request, socket, head) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname !== '/ws/market') return rejectUpgrade(socket, 404, 'Not found');
    const origin = request.headers.origin;
    if (allowedOrigins.size && (!origin || !allowedOrigins.has(origin))) return rejectUpgrade(socket, 403, 'Origin not allowed');

    const token = url.searchParams.get('token');
    if (!token) return rejectUpgrade(socket, 401, 'Token required');
    const verified = await jwtVerify(token, new TextEncoder().encode(secret), { issuer: 'maxlith-web', audience: 'market-stream' });
    if (verified.payload.scope !== 'market-stream' || typeof verified.payload.sub !== 'string' || !verified.payload.exp) {
      return rejectUpgrade(socket, 401, 'Invalid stream token');
    }

    const userId = verified.payload.sub;
    const connectionCount = connectionsByUser.get(userId) || 0;
    if (connectionCount >= maxConnectionsPerUser) return rejectUpgrade(socket, 429, 'Connection limit reached');

    wss.handleUpgrade(request, socket, head, (client) => {
      client.userId = userId;
      client.subscriptions = new Set();
      client.isAlive = true;
      client.authExpiry = setTimeout(() => client.close(4001, 'Refresh authentication'), Math.max(1, verified.payload.exp * 1000 - Date.now()));
      connectionsByUser.set(userId, connectionCount + 1);
      wss.emit('connection', client, request);
    });
  } catch {
    rejectUpgrade(socket, 401, 'Invalid stream token');
  }
});

wss.on('connection', (client) => {
  client.on('pong', () => { client.isAlive = true; });
  client.on('message', (raw) => handleClientMessage(client, raw));
  client.on('close', () => removeClient(client));
  client.on('error', () => removeClient(client));
  send(client, { type: 'connection_status', status: providerUrl ? 'RECONNECTING' : 'OFFLINE' });
});

const heartbeat = setInterval(() => {
  for (const client of wss.clients) {
    if (!client.isAlive) { client.terminate(); continue; }
    client.isAlive = false;
    client.ping();
  }
}, 25_000);

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`MAXLITH market-stream gateway listening on ${port}; provider ${providerUrl ? 'configured' : 'unavailable'}.`);
});

function rejectUpgrade(socket, status, message) {
  if (socket.destroyed) return;
  socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  socket.destroy();
}

function normalizeSymbol(value) {
  if (typeof value !== 'string') return null;
  const symbol = value.trim().toUpperCase();
  return /^(NSE|BSE):[A-Z0-9][A-Z0-9._&-]{0,31}$/.test(symbol) ? symbol : null;
}

function subscriptionKey(symbol, resolution) {
  return `${symbol}:${resolution}`;
}

function handleClientMessage(client, raw) {
  let message;
  try { message = JSON.parse(String(raw)); } catch { return send(client, { type: 'error', message: 'Invalid JSON message.' }); }
  if (!message || typeof message !== 'object') return;
  if (message.action === 'ping') return send(client, { type: 'pong' });
  if (message.action !== 'subscribe' && message.action !== 'unsubscribe') return;

  const symbol = normalizeSymbol(message.symbol);
  const resolution = typeof message.resolution === 'string' ? message.resolution : '1D';
  if (!symbol || !resolutions.has(resolution)) return send(client, { type: 'error', message: 'Unsupported symbol or resolution.' });
  const key = subscriptionKey(symbol, resolution);
  if (message.action === 'unsubscribe') return unsubscribeClient(client, key);
  if (client.subscriptions.has(key)) return;
  if (client.subscriptions.size >= maxSubscriptionsPerClient) return send(client, { type: 'error', message: 'Subscription limit reached.' });

  client.subscriptions.add(key);
  const stream = getOrCreateStream(symbol, resolution);
  stream.clients.add(client);
  if (!providerUrl) return send(client, { type: 'connection_status', status: 'OFFLINE', symbol, resolution });
  ensureUpstream(stream);
  send(client, { type: 'connection_status', status: stream.socket?.readyState === WebSocket.OPEN ? 'LIVE' : 'RECONNECTING', symbol, resolution });
}

function getOrCreateStream(symbol, resolution) {
  const key = subscriptionKey(symbol, resolution);
  let stream = streams.get(key);
  if (!stream) {
    stream = { key, symbol, resolution, clients: new Set(), socket: null, attempts: 0, reconnectTimer: null, closed: false };
    streams.set(key, stream);
  }
  return stream;
}

function ensureUpstream(stream) {
  if (stream.closed || stream.socket || stream.reconnectTimer || !stream.clients.size || !providerUrl) return;
  const headers = providerApiKey ? { Authorization: `Bearer ${providerApiKey}` } : {};
  const upstream = new WebSocket(providerUrl, { headers, handshakeTimeout: 10_000, maxPayload: 2 * 1024 * 1024 });
  stream.socket = upstream;

  upstream.on('open', () => {
    if (stream.socket !== upstream) return;
    stream.attempts = 0;
    upstream.send(JSON.stringify({ action: 'subscribe', symbol: stream.symbol, resolution: stream.resolution }));
    broadcastStatus(stream, 'LIVE');
  });
  upstream.on('message', (raw) => handleProviderMessage(stream, raw));
  upstream.on('close', () => {
    if (stream.socket === upstream) stream.socket = null;
    if (stream.closed || !stream.clients.size) return cleanupStream(stream);
    broadcastStatus(stream, 'RECONNECTING');
    scheduleUpstreamReconnect(stream);
  });
  upstream.on('error', () => upstream.close());
}

function scheduleUpstreamReconnect(stream) {
  if (stream.closed || stream.reconnectTimer || !stream.clients.size) return;
  const delay = Math.min(30_000, 500 * 2 ** stream.attempts);
  stream.attempts += 1;
  stream.reconnectTimer = setTimeout(() => {
    stream.reconnectTimer = null;
    ensureUpstream(stream);
  }, delay);
}

function handleProviderMessage(stream, raw) {
  let message;
  try { message = JSON.parse(String(raw)); } catch { return; }
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') return;
  if (message.type === 'pong') return;
  if (!['quote_update', 'bar_update', 'trade_update', 'orderbook_update', 'market_status'].includes(message.type)) return;
  const symbol = message.type === 'market_status' && !message.symbol ? stream.symbol : normalizeSymbol(message.symbol);
  if (!symbol || symbol !== stream.symbol || !message.data || typeof message.data !== 'object') return;

  if (message.type === 'bar_update') {
    const data = message.data;
    const values = [data.open, data.high, data.low, data.close, data.volume];
    if (!Number.isSafeInteger(data.time) || data.time <= 0 || !values.every((value) => typeof value === 'number' && Number.isFinite(value))) return;
    if (data.open <= 0 || data.high < Math.max(data.open, data.close) || data.low > Math.min(data.open, data.close) || data.low <= 0 || data.volume < 0 || data.high < data.low) return;
    if (data.resolution && data.resolution !== stream.resolution) return;
    message.data.resolution = stream.resolution;
  } else if (message.type === 'quote_update') {
    const data = message.data;
    const values = [data.last, data.change, data.changePercent, data.open, data.high, data.low, data.previousClose, data.volume, data.delaySeconds];
    if (!values.every((value) => typeof value === 'number' && Number.isFinite(value))) return;
    if (data.last <= 0 || data.open <= 0 || data.previousClose <= 0 || data.high < Math.max(data.open, data.last) || data.low > Math.min(data.open, data.last) || data.low <= 0 || data.volume < 0 || data.delaySeconds < 0) return;
    if (typeof data.asOf !== 'string' || !Number.isFinite(Date.parse(data.asOf)) || typeof data.source !== 'string' || !data.source) return;
  } else if (message.type === 'trade_update') {
    const data = message.data;
    if (typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price <= 0 || typeof data.quantity !== 'number' || !Number.isFinite(data.quantity) || data.quantity < 0) return;
  } else if (message.type === 'orderbook_update') {
    const data = message.data;
    const isSide = (side) => Array.isArray(side) && side.length <= 20 && side.every((level) => level && typeof level.price === 'number' && Number.isFinite(level.price) && level.price > 0 && typeof level.quantity === 'number' && Number.isFinite(level.quantity) && level.quantity >= 0);
    if (!isSide(data.bids) || !isSide(data.asks)) return;
  } else if (message.type === 'market_status') {
    if (!['PRE_MARKET', 'OPEN', 'POST_MARKET', 'CLOSED', 'UNKNOWN'].includes(message.data.session) || typeof message.data.isOpen !== 'boolean' || typeof message.data.timezone !== 'string') return;
  }

  const payload = JSON.stringify({ ...message, symbol: stream.symbol });
  for (const client of stream.clients) if (client.readyState === WebSocket.OPEN) client.send(payload);
}

function broadcastStatus(stream, status) {
  const payload = JSON.stringify({ type: 'connection_status', status, symbol: stream.symbol, resolution: stream.resolution });
  for (const client of stream.clients) if (client.readyState === WebSocket.OPEN) client.send(payload);
}

function unsubscribeClient(client, key) {
  if (!client.subscriptions.delete(key)) return;
  const stream = streams.get(key);
  if (!stream) return;
  stream.clients.delete(client);
  if (stream.clients.size === 0) cleanupStream(stream);
}

function removeClient(client) {
  if (client.removed) return;
  client.removed = true;
  if (client.authExpiry) clearTimeout(client.authExpiry);
  const userId = client.userId;
  const currentCount = connectionsByUser.get(userId) || 0;
  if (currentCount <= 1) connectionsByUser.delete(userId);
  else connectionsByUser.set(userId, currentCount - 1);
  for (const key of [...(client.subscriptions || [])]) unsubscribeClient(client, key);
}

function cleanupStream(stream) {
  if (stream.clients.size) return;
  stream.closed = true;
  if (stream.reconnectTimer) clearTimeout(stream.reconnectTimer);
  stream.reconnectTimer = null;
  const socket = stream.socket;
  stream.socket = null;
  if (socket && socket.readyState < WebSocket.CLOSING) {
    try { socket.send(JSON.stringify({ action: 'unsubscribe', symbol: stream.symbol, resolution: stream.resolution })); } catch { /* closing */ }
    socket.close(1000, 'No active subscribers');
  }
  streams.delete(stream.key);
}

function send(client, value) {
  if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(value));
}

async function shutdown() {
  clearInterval(heartbeat);
  for (const stream of streams.values()) {
    stream.clients.clear();
    cleanupStream(stream);
  }
  for (const client of wss.clients) client.close(1001, 'Gateway shutting down');
  wss.close();
  httpServer.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
