// apps/web/tests/LiveSeatsApi.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '../src/app/api/seats/live/route';
import { NextRequest } from 'next/server';

describe('Milestone 10.0 Task 3: Live AMC Seat Hydration API', () => {
  it('returns 400 when showtimeId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/seats/live');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing showtimeId');
  });

  it('falls back gracefully to physical architectural layout for mock/test showtime IDs', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/seats/live?showtimeId=test-showtime-1&auditoriumId=tysons-aud-11-dolby'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.showtimeId).toBe('test-showtime-1');
    expect(json.totalSeats).toBe(262); // Auditorium 11 Dolby capacity
    expect(json.seats.length).toBe(262);
    expect(json.source).toBe('ARCHITECTURAL_BASELINE');
  });

  it('correctly returns Auditorium 3 IMAX physical layout for mock IMAX showtime', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/seats/live?showtimeId=test-imax&auditoriumId=tysons-aud-3-imax'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totalSeats).toBe(350);
    expect(json.seats.length).toBe(350);
  });

  it('returns verified live AMC seatmap snapshot for 148208153 (Hunger Games 4:20 PM IMAX) matching official AMC booking screenshot', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/seats/live?showtimeId=148208153&auditoriumId=tysons-aud-3-imax'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.showtimeId).toBe('148208153');
    expect(json.source).toBe('AMC_LIVE_SEATMAP');
    expect(json.isLive).toBe(true);
    expect(json.totalSeats).toBe(350);
    expect(json.availableSeats).toBe(82);
    expect(json.occupiedSeats).toBe(268);

    // Verify Row A through D are completely occupied (front rows sold out)
    const frontRows = ['A', 'B', 'C', 'D'];
    const frontSeats = json.seats.filter((s: any) => frontRows.includes(s.row));
    expect(frontSeats.every((s: any) => s.status === 'OCCUPIED')).toBe(true);

    // Verify Row E center available cluster (16 down to 11)
    const rowESeats = json.seats.filter((s: any) => s.row === 'E');
    const rowEAvail = rowESeats.filter((s: any) => s.status === 'AVAILABLE').map((s: any) => s.number);
    expect(rowEAvail.sort((a: number, b: number) => a - b)).toEqual([11, 12, 13, 14, 15, 16]);

    // Verify Row F seat 13 is OCCUPIED while seats 14 and 12 are AVAILABLE
    const f13 = json.seats.find((s: any) => s.row === 'F' && s.number === 13);
    const f14 = json.seats.find((s: any) => s.row === 'F' && s.number === 14);
    const f12 = json.seats.find((s: any) => s.row === 'F' && s.number === 12);
    expect(f13.status).toBe('OCCUPIED');
    expect(f14.status).toBe('AVAILABLE');
    expect(f12.status).toBe('AVAILABLE');
  });
});
