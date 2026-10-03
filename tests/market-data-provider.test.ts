import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NormalizedRestMarketDataProvider } from '../src/lib/market-data/rest-provider';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('normalized market-data provider', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
  });

  it('uses server-side auth and resolves searched symbols to canonical IDs', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ symbol: 'RELIANCE', exchange: 'NSE', name: 'Reliance Industries Ltd', type: 'stock' }] }));
    const provider = new NormalizedRestMarketDataProvider({ name: 'licensed-test', baseUrl: 'https://data.example/v1/', apiKey: 'server-only-key' });

    const results = await provider.searchSymbols('Reliance', 'NSE', 10);

    expect(results[0]).toMatchObject({ id: 'NSE:RELIANCE', symbol: 'RELIANCE', currency: 'INR', timezone: 'Asia/Kolkata' });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    expect(String(requestUrl)).toBe('https://data.example/v1/symbols/search?q=Reliance&exchange=NSE&limit=10');
    expect(new Headers(requestInit?.headers).get('Authorization')).toBe('Bearer server-only-key');
  });

  it('validates and filters history without inventing bars', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(jsonResponse({ data: [
      { time: 300, open: 10, high: 12, low: 9, close: 11, volume: 200 },
      { time: 100, open: 9, high: 10, low: 8, close: 10, volume: 100 },
      { time: 200, open: 10, high: 11, low: 9, close: 10.5, volume: 150 },
    ] }));
    const provider = new NormalizedRestMarketDataProvider({ name: 'licensed-test', baseUrl: 'https://data.example/v1' });

    const bars = await provider.getHistoricalBars({ symbol: 'NSE:RELIANCE', resolution: '1', from: 150, to: 300, countback: 1 });

    expect(bars).toEqual([{ time: 300, open: 10, high: 12, low: 9, close: 11, volume: 200 }]);
  });

  it('rejects structurally invalid or impossible OHLC bars', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ time: 100, open: 10, high: 10.5, low: 9, close: 12, volume: 20 }] }));
    const provider = new NormalizedRestMarketDataProvider({ name: 'licensed-test', baseUrl: 'https://data.example/v1' });

    await expect(provider.getHistoricalBars({ symbol: 'RELIANCE', resolution: '1D' })).rejects.toThrow();
  });

  it('rejects duplicate timestamps returned by a provider', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(jsonResponse({ data: [
      { time: 100, open: 9, high: 10, low: 8, close: 9.5, volume: 10 },
      { time: 100, open: 9.5, high: 11, low: 9, close: 10, volume: 20 },
    ] }));
    const provider = new NormalizedRestMarketDataProvider({ name: 'licensed-test', baseUrl: 'https://data.example/v1' });

    await expect(provider.getHistoricalBars({ symbol: 'RELIANCE', resolution: '1D' })).rejects.toThrow(/duplicate or unordered/);
  });
});
