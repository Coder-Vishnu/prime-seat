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
});
