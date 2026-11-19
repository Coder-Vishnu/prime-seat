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
    expect(json.availableSeats).toBe(256);
    expect(json.occupiedSeats).toBe(94);

    // Verify Row A through D are completely available (all 79 front row seats are solid gold in AMC)
    const frontRows = ['A', 'B', 'C', 'D'];
    const frontSeats = json.seats.filter((s: any) => frontRows.includes(s.row));
    expect(frontSeats.length).toBe(79);
    expect(frontSeats.every((s: any) => s.status === 'AVAILABLE')).toBe(true);

    // Verify Row E center occupied block with open single E16
    const rowESeats = json.seats.filter((s: any) => s.row === 'E');
    const rowEOcc = rowESeats.filter((s: any) => s.status === 'OCCUPIED').map((s: any) => s.number);
    expect(rowEOcc.sort((a: number, b: number) => a - b)).toEqual([10, 11, 12, 13, 14, 15, 17]);
    const e16 = json.seats.find((s: any) => s.row === 'E' && s.number === 16);
    expect(e16.status).toBe('AVAILABLE');

    // Verify Row G isolated center open seat (G14 is available while surrounding G13 & G15 are occupied)
    const g13 = json.seats.find((s: any) => s.row === 'G' && s.number === 13);
    const g14 = json.seats.find((s: any) => s.row === 'G' && s.number === 14);
    const g15 = json.seats.find((s: any) => s.row === 'G' && s.number === 15);
    expect(g13.status).toBe('OCCUPIED');
    expect(g14.status).toBe('AVAILABLE');
    expect(g15.status).toBe('OCCUPIED');
  });
});
