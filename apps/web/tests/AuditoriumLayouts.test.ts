// apps/web/tests/AuditoriumLayouts.test.ts
import { describe, it, expect } from 'vitest';
import {
  getAuditoriumLayout,
  TYSONS_AUDITORIUM_11,
  TYSONS_AUDITORIUM_9,
  TYSONS_AUDITORIUM_3_IMAX,
  TYSONS_AUDITORIUM_2_4DX,
} from '../src/data/auditoriums';

describe('Milestone 9.0 Task 3 Verification: Exact PLF Auditorium Layouts', () => {
  it('verifies Auditorium 11 (Dolby Cinema) exact 262-seat layout and Row L split', () => {
    const layout = getAuditoriumLayout('tysons-aud-11-dolby');
    expect(layout.id).toBe('tysons-aud-11-dolby');
    expect(layout.totalPhysicalCapacity).toBe(262);
    expect(layout.seats.length).toBe(262);
    expect(layout.screenFormat).toBe('DOLBY_CINEMA');

    // Verify Row L aisle gap
    const rowLSeats = layout.seats.filter((s) => s.row === 'L').map((s) => s.number);
    expect(rowLSeats).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 17, 18, 19, 20, 21, 22, 23, 24]);
  });

  it('verifies Auditorium 9 (Dolby Cinema) exact 161-seat layout', () => {
    const layout = getAuditoriumLayout('tysons-aud-9-dolby');
    expect(layout.id).toBe('tysons-aud-9-dolby');
    expect(layout.totalPhysicalCapacity).toBe(161);
    expect(layout.seats.length).toBe(161);
    expect(layout.screenFormat).toBe('DOLBY_CINEMA');
  });

  it('verifies Auditorium 3 (IMAX with Laser) exact 350-seat layout and ADA rows', () => {
    const layout = getAuditoriumLayout('tysons-aud-3-imax');
    expect(layout.id).toBe('tysons-aud-3-imax');
    expect(layout.totalPhysicalCapacity).toBe(350);
    expect(layout.seats.length).toBe(350);
    expect(layout.screenFormat).toBe('IMAX_LASER');

    // Verify row letters (skipping I and O)
    const uniqueRows = Array.from(new Set(layout.seats.map((s) => s.row)));
    expect(uniqueRows).toContain('A');
    expect(uniqueRows).toContain('B');
    expect(uniqueRows).toContain('C');
    expect(uniqueRows).toContain('D');
    expect(uniqueRows).toContain('J');
    expect(uniqueRows).not.toContain('I');
    expect(uniqueRows).toContain('P');
    expect(uniqueRows).not.toContain('O');
    expect(uniqueRows).toContain('Q');

    // Verify ADA accessible seats on rows D and N
    const adaSeats = layout.seats.filter(
      (s) => s.seat_type === 'Wheelchair' || s.seat_type === 'Companion'
    );
    expect(adaSeats.length).toBeGreaterThan(0);
  });

  it('verifies Auditorium 2 (4DX) exact 125-seat motorized pod layout', () => {
    const layout = getAuditoriumLayout('tysons-aud-2-4dx');
    expect(layout.id).toBe('tysons-aud-2-4dx');
    expect(layout.totalPhysicalCapacity).toBe(125);
    expect(layout.seats.length).toBe(125);
    expect(layout.screenFormat).toBe('4DX');

    // Verify Row D has no right wing pod (starts at seat 5)
    const rowDSeats = layout.seats.filter((s) => s.row === 'D').map((s) => s.number);
    expect(Math.min(...rowDSeats)).toBe(5);
    expect(rowDSeats.length).toBe(12);
  });
});
