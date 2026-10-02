import { marketDataService } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || 'RELIANCE,TCS,HDFCBANK,INFY,NIFTY50';
  const symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const sendEvent = (event: string, data: any) => {
        if (isClosed) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          isClosed = true;
        }
      };

      // Send initial quotes immediately
      try {
        const initialQuotes = await marketDataService.getQuotes(symbols);
        sendEvent('quotes', {
          quotes: Array.from(initialQuotes.values()),
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        /* initial error */
      }

      // Interval ticker
      const interval = setInterval(async () => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        try {
          const quotes = await marketDataService.getQuotes(symbols);
          sendEvent('quotes', {
            quotes: Array.from(quotes.values()),
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          sendEvent('heartbeat', { status: 'alive', time: Date.now() });
        }
      }, 3000);

      request.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
