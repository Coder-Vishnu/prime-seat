// apps/web/src/app/api/events/stream/route.ts
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showtimeId = searchParams.get('showtime_id') || 'amc-tysons-dolby-current';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation snapshot
      const initMessage = JSON.stringify({
        event: 'SNAPSHOT_INIT',
        data: {
          showtime_id: showtimeId,
          seats: [],
        },
      });
      controller.enqueue(encoder.encode(`data: ${initMessage}\n\n`));

      // Periodic keep-alive ping every 15 seconds
      const intervalId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(intervalId);
        }
      }, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
