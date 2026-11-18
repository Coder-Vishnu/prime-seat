// apps/web/src/app/api/notifications/test/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const topic = body.topic || process.env.NTFY_TOPIC || 'prime-seat-tysons-demo';
    const movieTitle = body.movieTitle || 'The Cat in the Hat';
    const row = body.row || 'E';
    const seatNumber = body.seatNumber || 8;
    const auditorium = body.auditorium || 'Auditorium 7 (RealD 3D at AMC)';

    // Dispatch JSON payload to ntfy.sh public relay (full Unicode & Emoji support)
    const ntfyResponse = await fetch(`https://ntfy.sh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        title: `⚡ PRIME SEAT DROP: ${movieTitle}`,
        message: `Row ${row}, Seat ${seatNumber} just vacated in ${auditorium}! Tap to claim on AMC immediately.`,
        priority: 5, // 5 = urgent (vibrates phone & Apple Watch, sounds alarm)
        tags: ['cinema', 'zap', 'bell'],
        click: 'https://www.amctheatres.com',
        actions: [
          {
            action: 'view',
            label: '🎟 Claim on AMC ↗',
            url: 'https://www.amctheatres.com',
          },
        ],
      }),
    });

    if (ntfyResponse.ok) {
      const data = await ntfyResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: true,
        topic,
        ntfyId: data.id,
        message: `Test alert dispatched successfully to ntfy topic '${topic}'!`,
        viewUrl: `https://ntfy.sh/${topic}`,
      });
    } else {
      const errorText = await ntfyResponse.text().catch(() => '');
      return NextResponse.json(
        { success: false, error: `ntfy returned status ${ntfyResponse.status}: ${errorText}` },
        { status: 502 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to dispatch test notification' },
      { status: 500 }
    );
  }
}
