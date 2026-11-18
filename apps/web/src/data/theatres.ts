// apps/web/src/data/theatres.ts
// Task 1 (9.0): Narrowed to AMC Tysons Corner 16 only.

export type TheatreFormat = 'DOLBY_CINEMA' | 'IMAX_LASER' | 'PRIME' | 'REALD_3D' | 'DINE_IN' | '4DX' | 'LASER';

export interface AMCTheatre {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  region: string;
  formats: TheatreFormat[];
  screenCount: number;
  hasRecliners: boolean;
  isFlagship: boolean;
  imageUrl?: string;
  phone?: string;
}

/**
 * Prime Seat is focused exclusively on AMC Tysons Corner 16.
 * PLF auditoriums on-site:
 *   - Auditorium 11 — Dolby Cinema (262 seats)
 *   - Auditorium 9  — Dolby Cinema / PLF (161 seats)
 *   - Auditorium 3  — IMAX with Laser
 *   - Auditorium 2  — 4DX
 */
export const TYSONS_THEATRE: AMCTheatre = {
  id: 'amc-tysons-16',
  name: 'AMC Tysons Corner 16',
  slug: 'amc-tysons-corner-16',
  address: '7850 Tysons Corner Center',
  city: 'McLean',
  state: 'VA',
  zip: '22102',
  region: 'Northern Virginia',
  formats: ['DOLBY_CINEMA', 'IMAX_LASER', 'PRIME', 'REALD_3D', '4DX', 'LASER'],
  screenCount: 16,
  hasRecliners: true,
  isFlagship: true,
  phone: '(703) 991-3067',
};

/** @deprecated Use TYSONS_THEATRE — kept for Vitest backward-compat only */
export const DMV_AMC_THEATRES: AMCTheatre[] = [TYSONS_THEATRE];
export const THEATRES: AMCTheatre[] = [TYSONS_THEATRE];
