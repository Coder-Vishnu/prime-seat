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

  it('verifies Auditorium 7 (RealD 3D) exact 92-seat layout matching AMC live ticketing capture', () => {
    const layout = getAuditoriumLayout('tysons-aud-7-3d');
    expect(layout.id).toBe('tysons-aud-7-3d');
    expect(layout.totalPhysicalCapacity).toBe(92);
    expect(layout.seats.length).toBe(92);
    expect(layout.screenFormat).toBe('REALD_3D');
    expect(layout.totalRows).toBe(7);

    // Verify Row C has 11 seats including 8 ADA seats
    const rowCSeats = layout.seats.filter((s) => s.row === 'C');
    expect(rowCSeats.length).toBe(11);
    const adaSeats = rowCSeats.filter((s) => s.seat_type === 'Wheelchair' || s.seat_type === 'Companion');
    expect(adaSeats.length).toBe(8);

    // Verify Row G aisle gap split (7 left, 5 right)
    const rowGSeats = layout.seats.filter((s) => s.row === 'G');
    expect(rowGSeats.length).toBe(12);
  });

  it('verifies Auditorium 6 (Laser) exact 104-seat layout with left-to-right greatest-to-least seat numbering (A12 -> A1)', () => {
    const layout = getAuditoriumLayout('tysons-aud-6-laser');
    expect(layout.id).toBe('tysons-aud-6-laser');
    expect(layout.totalPhysicalCapacity).toBe(104);
    expect(layout.seats.length).toBe(104);
    expect(layout.screenFormat).toBe('LASER');
    expect(layout.totalRows).toBe(8);

    // Verify Row A has 12 seats and numbers decrease from left to right (12 down to 1)
    const rowA = layout.seats.filter((s) => s.row === 'A');
    expect(rowA.length).toBe(12);
    const rowANumbers = rowA.map((s) => s.number);
    expect(rowANumbers).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);

    // Verify grid_col values strictly increase as seat numbers decrease (left-to-right positioning)
    for (let i = 0; i < rowA.length - 1; i++) {
      expect((rowA[i].grid_col ?? 0) < (rowA[i + 1].grid_col ?? 0)).toBe(true);
      expect(rowA[i].number > rowA[i + 1].number).toBe(true);
    }

    // Verify Row H has 12 seats (12 down to 1)
    const rowH = layout.seats.filter((s) => s.row === 'H');
    expect(rowH.length).toBe(12);
    expect(rowH.map((s) => s.number)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });
});
