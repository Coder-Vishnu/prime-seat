// apps/web/src/data/seatAllocator.ts
import { SeatData } from '@/hooks/useAuditoriumStream';
import { AuditoriumLayout } from './auditoriums';

export interface AllocationOptions {
  availableSeats?: number;
  primeAvailableSeats?: number;
  showtimeId?: string;
}

function hashSeed(seedStr: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

function createRng(seedVal: number) {
  let a = seedVal;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Realistic theatrical seat allocation engine.
 * Replaces synthetic arithmetic modulo formulas with patron demand curves:
 * - High-desirability prime acoustic sweet spots book first
 * - Extreme front rows and side walls remain open or blocked
 * - Strictly guarantees exact availableSeats and primeAvailableSeats count matching AMC schedule
 */
export function generateRealisticShowtimeSeats(
  layout: AuditoriumLayout,
  options?: AllocationOptions
): {
  seats: SeatData[];
  occupiedCount: number;
  availableCount: number;
} {
  const showtimeId = options?.showtimeId || 'default-seed';
  const rng = createRng(hashSeed(showtimeId));

  const totalPhysical = layout.seats.length;
  const targetAvailable =
    options?.availableSeats !== undefined
      ? Math.max(0, Math.min(totalPhysical, options.availableSeats))
      : Math.floor(totalPhysical * 0.42);

  const primeSeats = layout.seats.filter((s) => s.is_prime);
  const nonPrimeSeats = layout.seats.filter((s) => !s.is_prime);

  const targetPrimeAvail =
    options?.primeAvailableSeats !== undefined
      ? Math.max(0, Math.min(primeSeats.length, options.primeAvailableSeats))
      : Math.floor(primeSeats.length * 0.35);

  const targetNonPrimeAvail = Math.max(
    0,
    Math.min(nonPrimeSeats.length, targetAvailable - targetPrimeAvail)
  );

  const centerCol = (layout.totalCols - 1) / 2;

  function computeSeatDesirability(seat: SeatData): number {
    const rowIdx = seat.grid_row ?? 0;
    const colIdx = seat.grid_col ?? 0;

    // Row preference: sweet spot is around 55-65% back from screen
    const rowNorm = rowIdx / Math.max(1, layout.totalRows - 1);
    const rowDesirability = rowNorm < 0.2 ? rowNorm * 20 : 60 + (1 - Math.abs(rowNorm - 0.6)) * 40;

    // Column preference: distance from center
    const colDistNorm = Math.abs(colIdx - centerCol) / Math.max(1, centerCol);
    const colDesirability = (1 - colDistNorm) * 30;

    // Deterministic jitter
    const jitter = (rng() - 0.5) * 15;

    return rowDesirability + colDesirability + jitter;
  }

  // Score prime seats and sort descending (highest score books first)
  const scoredPrimes = primeSeats.map((s) => ({
    seat: s,
    score: computeSeatDesirability(s),
  }));
  scoredPrimes.sort((a, b) => b.score - a.score);

  const primeAvailSet = new Set<string>();
  const primeOccupiedCount = primeSeats.length - targetPrimeAvail;
  for (let i = primeOccupiedCount; i < scoredPrimes.length; i++) {
    primeAvailSet.add(`${scoredPrimes[i].seat.row}-${scoredPrimes[i].seat.number}`);
  }

  // Score non-prime seats and sort descending
  const scoredNonPrimes = nonPrimeSeats.map((s) => ({
    seat: s,
    score: computeSeatDesirability(s),
  }));
  scoredNonPrimes.sort((a, b) => b.score - a.score);

  const nonPrimeAvailSet = new Set<string>();
  const nonPrimeOccupiedCount = nonPrimeSeats.length - targetNonPrimeAvail;
  for (let i = nonPrimeOccupiedCount; i < scoredNonPrimes.length; i++) {
    nonPrimeAvailSet.add(`${scoredNonPrimes[i].seat.row}-${scoredNonPrimes[i].seat.number}`);
  }

  let finalAvailableCount = 0;
  let finalOccupiedCount = 0;

  const resultSeats: SeatData[] = layout.seats.map((seat, idx) => {
    const key = `${seat.row}-${seat.number}`;
    const isAvail = seat.is_prime ? primeAvailSet.has(key) : nonPrimeAvailSet.has(key);

    const status = isAvail ? 'AVAILABLE' : 'OCCUPIED';
    if (isAvail) {
      finalAvailableCount++;
    } else {
      finalOccupiedCount++;
    }

    let dropProb: number | undefined;
    if (status === 'OCCUPIED' && seat.is_prime) {
      dropProb = Number((0.35 + ((idx * 17 + hashSeed(showtimeId)) % 48) / 100).toFixed(2));
    }

    return {
      ...seat,
      status,
      drop_probability: dropProb,
    };
  });

  return {
    seats: resultSeats,
    occupiedCount: finalOccupiedCount,
    availableCount: finalAvailableCount,
  };
}
