// apps/web/tests/ShowtimesApi.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '../src/app/api/showtimes/route';

describe('Milestone 9.0 Task 2 Verification: Showtimes API Route', () => {
  it('returns valid showtimes payload for AMC Tysons Corner 16', async () => {
    const req = new Request('http://localhost:3000/api/showtimes?date=2026-11-15');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.theatreId).toBe('amc-tysons-16');
    expect(json.date).toBe('2026-11-15');
    expect(Array.isArray(json.movies)).toBe(true);
    expect(Array.isArray(json.showtimes)).toBe(true);
    expect(json.movies.length).toBeGreaterThan(0);
    expect(json.showtimes.length).toBeGreaterThan(0);

    // Verify all showtimes belong to Tysons
    const allTysons = json.showtimes.every((st: any) => st.theatreId === 'amc-tysons-16');
    expect(allTysons).toBe(true);

    // Verify formats are mapped
    const formats = new Set(json.showtimes.map((st: any) => st.format));
    expect(formats.has('DOLBY_CINEMA') || formats.has('IMAX_LASER')).toBe(true);
  });

  it('handles custom date queries gracefully', async () => {
    const req = new Request('http://localhost:3000/api/showtimes?date=2026-11-20');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.theatreId).toBe('amc-tysons-16');
    expect(json.date).toBe('2026-11-20');
    expect(json.showtimes.length).toBeGreaterThan(0);
  });
});
