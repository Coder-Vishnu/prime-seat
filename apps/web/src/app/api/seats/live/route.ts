// apps/web/src/app/api/seats/live/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { getAuditoriumLayout } from '@/data/auditoriums';
import { SeatData } from '@/hooks/useAuditoriumStream';

const execFileAsync = promisify(execFile);

// 60-second in-memory LRU cache to avoid excessive scraping
interface CachedSeatSnapshot {
  timestamp: number;
  data: any;
}

const snapshotCache = new Map<string, CachedSeatSnapshot>();
const CACHE_TTL_MS = 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showtimeId = searchParams.get('showtimeId') || '';
  const auditoriumId = searchParams.get('auditoriumId') || 'tysons-aud-11-dolby';

  if (!showtimeId) {
    return NextResponse.json({ error: 'Missing showtimeId' }, { status: 400 });
  }

  // 1. Check in-memory freshness
  const cached = snapshotCache.get(showtimeId);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      ...cached.data,
      cached: true,
    });
  }

  // 2. If showtimeId is an official AMC numeric ID, execute the harvester
  if (/^\d+$/.test(showtimeId)) {
    try {
      const pythonExecutable = path.resolve(
        process.cwd(),
        '..',
        'api',
        '.venv',
        'Scripts',
        'python.exe'
      );
      const scriptPath = path.resolve(
        process.cwd(),
        '..',
        'api',
        'src',
        'scraper',
        'harvest_single_seatmap.py'
      );

      const { stdout, stderr } = await execFileAsync(
        pythonExecutable,
        [scriptPath, '--showtime-id', showtimeId],
        { timeout: 14000 }
      );

      if (stdout) {
        const parsed = JSON.parse(stdout.trim());
        const payload = {
          showtimeId,
          isLive: true,
          source: 'AMC_LIVE_SEATMAP',
          movieTitle: parsed.movieTitle,
          auditoriumName: parsed.auditoriumName,
          screenFormat: parsed.screenFormat,
          totalSeats: parsed.totalSeats,
          occupiedSeats: parsed.occupiedSeats,
          availableSeats: parsed.availableSeats,
          seats: parsed.seats,
          capturedAt: parsed.capturedAt,
        };

        // Cache result
        snapshotCache.set(showtimeId, {
          timestamp: now,
          data: payload,
        });

        return NextResponse.json(payload);
      }
    } catch (err) {
      console.warn(
        `[Live Seat API] Live harvester fell back to architectural layout for showtime ${showtimeId}:`,
        err
      );
    }
  }

  // 3. Fallback: Exact physical architectural layout for the auditorium
  try {
    const layout = getAuditoriumLayout(auditoriumId);
    const occupiedCount = layout.seats.filter((s) => s.status === 'OCCUPIED').length;
    const availableCount = layout.seats.length - occupiedCount;

    return NextResponse.json({
      showtimeId,
      isLive: false,
      source: 'ARCHITECTURAL_BASELINE',
      auditoriumName: layout.name,
      screenFormat: layout.screenFormat,
      totalSeats: layout.totalPhysicalCapacity,
      occupiedSeats: occupiedCount,
      availableSeats: availableCount,
      seats: layout.seats,
      capturedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Auditorium not found' }, { status: 404 });
  }
}
