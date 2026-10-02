import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'MAXLITH Paper Trading & AI Market Intelligence API',
      version: '1.0.0',
      description: 'Production-grade paper trading platform for Indian Equities (NSE/BSE) with multi-agent financial intelligence.',
    },
    servers: [
      { url: 'http://localhost:3000/api', description: 'Local Development Server' },
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health Check',
          responses: { '200': { description: 'System health status' } },
        },
      },
      '/market/status': {
        get: {
          summary: 'NSE/BSE Market Session Status & IST Clock',
          responses: { '200': { description: 'Current trading session status' } },
        },
      },
      '/search': {
        get: {
          summary: 'Autocomplete stock search across NSE/BSE master instrument universe',
          parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Search results' } },
        },
      },
      '/quotes': {
        get: {
          summary: 'Batch live quotes with Redis caching',
          parameters: [{ name: 'symbols', in: 'query', required: false, schema: { type: 'string' } }],
          responses: { '200': { description: 'List of live equity quotes' } },
        },
      },
      '/indices': {
        get: {
          summary: 'Core benchmark indices (NIFTY 50, BANK NIFTY, SENSEX)',
          responses: { '200': { description: 'Index quotes' } },
        },
      },
      '/history': {
        get: {
          summary: 'OHLC Historical Candle Series',
          parameters: [
            { name: 'symbol', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'timeframe', in: 'query', required: false, schema: { type: 'string', enum: ['1D', '1W', '1M', '6M', '1Y', '5Y'] } },
          ],
          responses: { '200': { description: 'OHLC candles list' } },
        },
      },
      '/paper-trading/order': {
        get: {
          summary: 'Live order preview with estimated Indian charges breakdown',
          responses: { '200': { description: 'Order preview calculation' } },
        },
        post: {
          summary: 'Submit paper trading order (MARKET, LIMIT, SL, SL-M)',
          responses: { '200': { description: 'Order execution status' } },
        },
      },
      '/paper-trading/orders': {
        get: {
          summary: 'Order book and order history',
          responses: { '200': { description: 'List of user orders' } },
        },
        delete: {
          summary: 'Cancel pending order',
          responses: { '200': { description: 'Cancellation result' } },
        },
        put: {
          summary: 'Modify pending order quantity or price',
          responses: { '200': { description: 'Modification result' } },
        },
      },
      '/paper-trading/portfolio': {
        get: {
          summary: 'Portfolio summary, open positions, and sector allocations',
          responses: { '200': { description: 'Portfolio data' } },
        },
      },
      '/ai/copilot': {
        post: {
          summary: 'Conversational multi-agent AI copilot orchestration',
          responses: { '200': { description: 'Synthesized market intelligence report' } },
        },
      },
      '/ai/agent': {
        get: { summary: 'Query status of 5 specialized agents' },
        post: { summary: 'Execute single agent (TECH, NEWS, RISK, FUNDAMENTAL, INFO) on demand' },
      },
      '/alerts': {
        get: { summary: 'Get user price alerts and notifications' },
        post: { summary: 'Create new price alert' },
        delete: { summary: 'Delete price alert' },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
