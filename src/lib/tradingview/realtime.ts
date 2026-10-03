import type { MarketBar } from './datafeed';
import type { Resolution } from './resolutions';

export type RealtimeStatus = 'LIVE' | 'RECONNECTING' | 'OFFLINE';

export type RealtimeMessage =
  | { type: 'quote_update'; symbol: string; data: Record<string, unknown> }
  | { type: 'bar_update'; symbol: string; data: MarketBar & { resolution?: string } }
  | { type: 'trade_update'; symbol: string; data: Record<string, unknown> }
  | { type: 'orderbook_update'; symbol: string; data: Record<string, unknown> }
  | { type: 'market_status'; symbol?: string; data: Record<string, unknown> }
  | { type: 'connection_status'; status: RealtimeStatus; symbol?: string; resolution?: string }
  | { type: 'pong' };

type Listener = (message: RealtimeMessage) => void;
type Subscription = { symbol: string; resolution: Resolution; listeners: Set<Listener> };

/** One browser socket per terminal; subscriptions share the connection. */
export class MarketRealtimeClient {
  private socket: WebSocket | null = null;
  private subscriptions = new Map<string, Subscription>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private attempts = 0;
  private lastPongAt = 0;
  private intentionallyClosed = false;
  private authPending = false;

  constructor(
    private readonly url: string,
    private readonly onStatus?: (status: RealtimeStatus) => void,
    private readonly tokenProvider?: () => Promise<string | null>,
  ) {}

  subscribe(symbol: string, listener: Listener, resolution: Resolution = '1D'): () => void {
    const ticker = symbol.trim().toUpperCase();
    const key = `${ticker}:${resolution}`;
    let subscription = this.subscriptions.get(key);
    const first = !subscription;
    if (!subscription) {
      subscription = { symbol: ticker, resolution, listeners: new Set() };
      this.subscriptions.set(key, subscription);
    }
    subscription.listeners.add(listener);

    if (first && this.socket?.readyState === WebSocket.OPEN) this.send({ action: 'subscribe', symbol: ticker, resolution });
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) this.connect();

    return () => {
      const current = this.subscriptions.get(key);
      if (!current) return;
      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        this.subscriptions.delete(key);
        this.send({ action: 'unsubscribe', symbol: ticker, resolution });
      }
      if (this.subscriptions.size === 0) this.disconnect();
    };
  }

  disconnect() {
    this.intentionallyClosed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.retryTimer = null;
    this.heartbeatTimer = null;
    this.socket?.close(1000, 'No active market subscriptions');
    this.socket = null;
    this.setStatus('OFFLINE');
  }

  private connect() {
    if (!this.url || this.authPending || this.socket?.readyState === WebSocket.CONNECTING || this.socket?.readyState === WebSocket.OPEN) {
      if (!this.url) this.setStatus('OFFLINE');
      return;
    }
    this.intentionallyClosed = false;
    this.authPending = true;
    this.setStatus('RECONNECTING');
    void this.openSocket();
  }

  private async openSocket() {
    let token: string | null = null;
    try {
      if (this.tokenProvider) token = await this.tokenProvider();
    } catch {
      token = null;
    }
    this.authPending = false;
    if (this.intentionallyClosed || this.subscriptions.size === 0) return;
    if (this.tokenProvider && !token) {
      this.scheduleReconnect();
      return;
    }

    try {
      const url = new URL(this.url);
      if (token) url.searchParams.set('token', token);
      this.socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    const socket = this.socket;
    socket.onopen = () => {
      this.attempts = 0;
      this.lastPongAt = Date.now();
      this.setStatus('LIVE');
      for (const subscription of this.subscriptions.values()) {
        this.send({ action: 'subscribe', symbol: subscription.symbol, resolution: subscription.resolution });
      }
      this.heartbeatTimer = setInterval(() => {
        if (Date.now() - this.lastPongAt > 45_000) {
          socket.close(4000, 'Heartbeat timeout');
          return;
        }
        this.send({ action: 'ping', timestamp: Date.now() });
      }, 20_000);
    };

    socket.onmessage = (event) => {
      let message: RealtimeMessage;
      try { message = JSON.parse(String(event.data)) as RealtimeMessage; } catch { return; }
      if (message.type === 'pong') { this.lastPongAt = Date.now(); return; }
      if (message.type === 'connection_status') { this.setStatus(message.status); return; }
      if (!('symbol' in message) || !message.symbol) return;
      const symbol = message.symbol.toUpperCase();
      if (message.type === 'bar_update') {
        const resolution = message.data.resolution || '1D';
        this.subscriptions.get(`${symbol}:${resolution}`)?.listeners.forEach((listener) => listener(message));
        return;
      }
      for (const subscription of this.subscriptions.values()) {
        if (subscription.symbol === symbol) subscription.listeners.forEach((listener) => listener(message));
      }
    };

    socket.onclose = () => {
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      if (this.socket === socket) this.socket = null;
      if (this.intentionallyClosed || this.subscriptions.size === 0) this.setStatus('OFFLINE');
      else { this.setStatus('RECONNECTING'); this.scheduleReconnect(); }
    };
    socket.onerror = () => socket.close();
  }

  private scheduleReconnect() {
    if (this.intentionallyClosed || this.subscriptions.size === 0 || this.retryTimer) return;
    const delay = Math.min(30_000, 500 * 2 ** this.attempts);
    this.attempts += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  private send(value: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(value));
  }

  private setStatus(status: RealtimeStatus) {
    this.onStatus?.(status);
  }
}
