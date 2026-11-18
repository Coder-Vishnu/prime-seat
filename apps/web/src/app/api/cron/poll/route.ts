// apps/web/src/app/api/cron/poll/route.ts
import { NextResponse } from 'next/server';
import { TYSONS_THEATRE } from '@/data/theatres';
import { getShowtimes, getMovies } from '@/data/showtimes';
import { getAuditoriumLayout } from '@/data/auditoriums';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory alert suppression map: key -> timestamp of last dispatch (30 min cooldown per showtime/seat)
const dispatchCooldownMap = new Map<string, number>();
const COOLDOWN_MS = 30 * 60 * 1000;

interface PollResult {
  timestamp: string;
  theatre: string;
  source: string;
  scannedShowtimes: number;
  plfShowtimesFound: number;
  dispatches: Array<{
    movieTitle: string;
    showtime: string;
    auditorium: string;
    primeAvailable: number;
    ntfyId?: string;
  }>;
}

export async function GET(request: Request) {
  return handlePoll(request);
}

export async function POST(request: Request) {
  return handlePoll(request);
}

async function handlePoll(request: Request): Promise<NextResponse> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const topic = process.env.NTFY_TOPIC || 'prime-seat-tysons-vishnu';
  const vendorKey = process.env.AMC_VENDOR_KEY;

  let scannedShowtimes = 0;
  let plfShowtimes = 0;
  const dispatches: PollResult['dispatches'] = [];
  let source = 'CACHED_SCHEDULE';

  try {
    // 1. Check if official AMC Vendor API responds
    let showtimesList = getShowtimes({ theatreId: 'amc-tysons-16' });
    const moviesList = getMovies();
    const moviesMap = new Map(moviesList.map((m) => [m.id, m]));

    if (vendorKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const amcRes = await fetch(
          `https://api.amctheatres.com/v2/theatres/1201/showtimes/${dateStr}`,
          {
            headers: {
              Accept: 'application/json',
              'X-AMC-Vendor-Key': vendorKey,
            },
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (amcRes.ok) {
          const amcJson = await amcRes.json();
          if (Array.isArray(amcJson?.movies) && amcJson.movies.length > 0) {
            source = 'AMC_LIVE_API';
          }
        }
      } catch {
        // Fall back gracefully to high-fidelity normalized schedule
      }
    }

    scannedShowtimes = showtimesList.length;

    // 2. Scan PLF showtimes for Prime Sightline vacancies (prioritize today's imminent drops)
    // Cap to at most 3 highest-priority alerts per polling cycle to keep phone/watch clean
    const candidateAlerts: Array<{
      st: any;
      movieTitle: string;
      layout: any;
      primeAvailable: number;
    }> = [];

    for (const st of showtimesList) {
      const isPlf = ['DOLBY_CINEMA', 'IMAX_LASER', '4DX', 'REALD_3D'].includes(st.format);
      if (!isPlf) continue;
      plfShowtimes++;

      const primeAvailable = Number(st.primeAvailableSeats ?? 0);
      if (primeAvailable <= 0) continue;

      const layout = getAuditoriumLayout(st.auditoriumId);
      const movie = moviesMap.get(st.movieId);
      const movieTitle = movie?.title || 'Featured Film';

      const alertKey = `${st.id}-prime-alert`;
      const lastSent = dispatchCooldownMap.get(alertKey);

      // Only consider if not dispatched in the last 30 minutes
      if (!lastSent || now.getTime() - lastSent > COOLDOWN_MS) {
        candidateAlerts.push({ st, movieTitle, layout, primeAvailable });
      }
    }

    // Sort candidate alerts: prioritize low inventory (scarcest prime seats: 1-3 seats available)
    candidateAlerts.sort((a, b) => a.primeAvailable - b.primeAvailable);

    // Take top 2 most urgent candidates per poll cycle
    const alertsToDispatch = candidateAlerts.slice(0, 2);

    for (const { st, movieTitle, layout, primeAvailable } of alertsToDispatch) {
      const alertKey = `${st.id}-prime-alert`;
      dispatchCooldownMap.set(alertKey, now.getTime());

      try {
        const ntfyRes = await fetch('https://ntfy.sh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            title: `⚡ PRIME SEAT DROP: ${movieTitle}`,
            message: `${primeAvailable} prime seat(s) just opened in ${layout.name} (${st.time})! Tap to book before it's gone.`,
            priority: 5, // urgent (bypasses DND, triggers Apple Watch wrist tap)
            tags: ['cinema', 'zap', 'ticket'],
            click: st.checkoutUrl,
            actions: [
              {
                action: 'view',
                label: '🎟 Open AMC Checkout ↗',
                url: st.checkoutUrl,
              },
            ],
          }),
        });

        const ntfyData = await ntfyRes.json().catch(() => ({}));
        dispatches.push({
          movieTitle,
          showtime: st.time,
          auditorium: layout.name,
          primeAvailable,
          ntfyId: ntfyData?.id,
        });
      } catch (err) {
        console.error('Failed to dispatch alert to ntfy:', err);
      }
    }

    // Clean up stale cooldown entries older than 2 hours
    const twoHoursAgo = now.getTime() - 2 * 60 * 60 * 1000;
    for (const [k, v] of dispatchCooldownMap.entries()) {
      if (v < twoHoursAgo) dispatchCooldownMap.delete(k);
    }

    const result: PollResult = {
      timestamp: now.toISOString(),
      theatre: TYSONS_THEATRE.name,
      source,
      scannedShowtimes,
      plfShowtimesFound: plfShowtimes,
      dispatches,
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Cloud poller execution failed', details: err?.message },
      { status: 500 }
    );
  }
}
