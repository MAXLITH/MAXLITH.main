import { getAuthSession } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
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

      const checkAlerts = () => {
        if (isClosed) return;
        try {
          const unreadNotifications = db.prepare(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND is_read = 0 
            ORDER BY created_at DESC 
            LIMIT 10
          `).all(userId);

          const triggeredAlerts = db.prepare(`
            SELECT * FROM alerts 
            WHERE user_id = ? AND is_triggered = 1 
            ORDER BY triggered_at DESC 
            LIMIT 5
          `).all(userId);

          sendEvent('alert_update', {
            unreadCount: unreadNotifications.length,
            notifications: unreadNotifications,
            triggeredAlerts,
            timestamp: new Date().toISOString(),
          });
        } catch {
          /* db error */
        }
      };

      // Check immediately
      checkAlerts();

      const interval = setInterval(checkAlerts, 5000);

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
