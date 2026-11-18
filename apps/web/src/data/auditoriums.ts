// apps/web/src/data/auditoriums.ts
// Milestone 9.0 Task 3: Exact physical ticketing layouts for all 4 AMC Tysons Corner 16 PLF auditoriums.
import { SeatData, SeatStatusType } from '../hooks/useAuditoriumStream';

export type ScreenFormatType = 'DOLBY_CINEMA' | 'IMAX_LASER' | '4DX' | 'PRIME' | 'REALD_3D' | 'LASER';

export interface AuditoriumLayout {
  id: string;
  name: string;
  auditoriumNumber: number;
  screenFormat: ScreenFormatType;
  totalRows: number;
  totalCols: number;
  totalPhysicalCapacity: number;
  seats: SeatData[];
}

/**
 * Exact 262-seat physical layout for AMC Tysons Corner 16 Auditorium 11 (Dolby Cinema).
 * Based on architectural ticketing telemetry from tysons_auditorium_11_dolby.json.
 */
function buildTysonsAuditorium11(): AuditoriumLayout {
  // Row configs matching exact AMC ticketing coordinates
  // Note: Row L has a center aisle gap between seat 10 and 17 (seats 3-10, 17-24)
  const rowsData: { row: string; seatNumbers: number[] }[] = [
    { row: 'A', seatNumbers: Array.from({ length: 26 }, (_, i) => i + 1) },
    { row: 'B', seatNumbers: Array.from({ length: 26 }, (_, i) => i + 1) },
    { row: 'C', seatNumbers: Array.from({ length: 26 }, (_, i) => i + 1) },
    { row: 'D', seatNumbers: Array.from({ length: 17 }, (_, i) => i + 5) },
    { row: 'E', seatNumbers: Array.from({ length: 24 }, (_, i) => i + 2) },
    { row: 'F', seatNumbers: Array.from({ length: 24 }, (_, i) => i + 2) },
    { row: 'G', seatNumbers: Array.from({ length: 26 }, (_, i) => i + 1) },
    { row: 'H', seatNumbers: Array.from({ length: 26 }, (_, i) => i + 1) },
    { row: 'J', seatNumbers: Array.from({ length: 26 }, (_, i) => i + 1) }, // skips I
    { row: 'K', seatNumbers: Array.from({ length: 25 }, (_, i) => i + 2) },
    {
      row: 'L',
      seatNumbers: [3, 4, 5, 6, 7, 8, 9, 10, 17, 18, 19, 20, 21, 22, 23, 24],
    },
  ];

  const seats: SeatData[] = [];
  rowsData.forEach(({ row, seatNumbers }, rowIdx) => {
    seatNumbers.forEach((num) => {
      // Prime sightline box: rows E-H, center columns 8-19
      const isPrime =
        (row === 'E' || row === 'F' || row === 'G' || row === 'H') &&
        num >= 8 &&
        num <= 19;

      const isOccupied = isPrime ? num % 4 !== 0 : (rowIdx * 5 + num) % 3 !== 0;
      let dropProb: number | undefined;
      if (isOccupied && isPrime) {
        dropProb = Number((0.45 + ((rowIdx * 7 + num * 13) % 45) / 100).toFixed(2));
      }

      seats.push({
        row,
        number: num,
        status: isOccupied ? 'OCCUPIED' : 'AVAILABLE',
        seat_type: 'Recliner',
        is_prime: isPrime,
        drop_probability: dropProb,
        grid_row: rowIdx,
        grid_col: num - 1,
      });
    });
  });

  return {
    id: 'tysons-aud-11-dolby',
    name: 'Auditorium 11 (Dolby Cinema at AMC Tysons Corner 16)',
    auditoriumNumber: 11,
    screenFormat: 'DOLBY_CINEMA',
    totalRows: 11,
    totalCols: 26,
    totalPhysicalCapacity: seats.length, // exactly 262 seats
    seats,
  };
}

/**
 * Exact 161-seat physical layout for AMC Tysons Corner 16 Auditorium 9 (Dolby Cinema / PLF).
 * Based on architectural ticketing telemetry from tysons_auditorium_9_dolby.json.
 */
function buildTysonsAuditorium9(): AuditoriumLayout {
  const rowsData: { row: string; seatNumbers: number[] }[] = [
    { row: 'A', seatNumbers: Array.from({ length: 14 }, (_, i) => i + 4) },
    { row: 'B', seatNumbers: Array.from({ length: 18 }, (_, i) => i + 2) },
    { row: 'C', seatNumbers: Array.from({ length: 20 }, (_, i) => i + 1) },
    { row: 'D', seatNumbers: Array.from({ length: 13 }, (_, i) => i + 4) },
    { row: 'E', seatNumbers: Array.from({ length: 16 }, (_, i) => i + 3) },
    { row: 'F', seatNumbers: Array.from({ length: 20 }, (_, i) => i + 1) },
    { row: 'G', seatNumbers: Array.from({ length: 20 }, (_, i) => i + 1) },
    { row: 'H', seatNumbers: Array.from({ length: 20 }, (_, i) => i + 1) },
    { row: 'J', seatNumbers: Array.from({ length: 20 }, (_, i) => i + 1) },
  ];

  const seats: SeatData[] = [];
  rowsData.forEach(({ row, seatNumbers }, rowIdx) => {
    seatNumbers.forEach((num) => {
      const isPrime = (row === 'E' || row === 'F' || row === 'G') && num >= 7 && num <= 14;
      const isOccupied = isPrime ? num % 3 !== 0 : (rowIdx * 3 + num) % 4 !== 0;

      let dropProb: number | undefined;
      if (isOccupied && isPrime) {
        dropProb = Number((0.4 + ((rowIdx * 9 + num * 11) % 50) / 100).toFixed(2));
      }

      seats.push({
        row,
        number: num,
        status: isOccupied ? 'OCCUPIED' : 'AVAILABLE',
        seat_type: 'Recliner',
        is_prime: isPrime,
        drop_probability: dropProb,
        grid_row: rowIdx,
        grid_col: num - 1,
      });
    });
  });

  return {
    id: 'tysons-aud-9-dolby',
    name: 'Auditorium 9 (Dolby Cinema / PLF at AMC Tysons Corner 16)',
    auditoriumNumber: 9,
    screenFormat: 'DOLBY_CINEMA',
    totalRows: 9,
    totalCols: 20,
    totalPhysicalCapacity: seats.length, // exactly 161 seats
    seats,
  };
}

/**
 * Exact 350-seat physical layout for AMC Tysons Corner 16 Auditorium 3 (IMAX with Laser).
 * Analyzed and verified from high-resolution AMC live ticketing seatmap capture.
 */
function buildTysonsAuditorium3Imax(): AuditoriumLayout {
  // Rows: A through Q (AMC skips I and O)
  // Max width: 27 seats across (seats 1 to 27)
  const rowsData: {
    row: string;
    seats: { num: number; type: string; colOffset: number }[];
  }[] = [
    // Row A: 19 seats (A1-A19), centered in 27-col grid (offset 4)
    {
      row: 'A',
      seats: Array.from({ length: 19 }, (_, i) => ({
        num: i + 1,
        type: 'Recliner',
        colOffset: i + 4,
      })),
    },
    // Row B: 22 seats (B1-B22), centered in 27-col grid (offset 2.5 -> 2)
    {
      row: 'B',
      seats: Array.from({ length: 22 }, (_, i) => ({
        num: i + 1,
        type: 'Recliner',
        colOffset: i + 2,
      })),
    },
    // Row C: 18 seats (C1-C9 right wing, C10-C18 left wing with center aisle)
    {
      row: 'C',
      seats: [
        ...Array.from({ length: 9 }, (_, i) => ({
          num: i + 1,
          type: 'Recliner',
          colOffset: i + 1,
        })),
        ...Array.from({ length: 9 }, (_, i) => ({
          num: i + 10,
          type: 'Recliner',
          colOffset: i + 17,
        })),
      ],
    },
    // Row D: 20 seats (D1-D8, D9-D12 ADA center platform, D13-D20)
    {
      row: 'D',
      seats: [
        ...Array.from({ length: 8 }, (_, i) => ({
          num: i + 1,
          type: 'Recliner',
          colOffset: i + 1,
        })),
        { num: 9, type: 'Companion', colOffset: 11 },
        { num: 10, type: 'Wheelchair', colOffset: 12 },
        { num: 11, type: 'Wheelchair', colOffset: 14 },
        { num: 12, type: 'Companion', colOffset: 15 },
        ...Array.from({ length: 8 }, (_, i) => ({
          num: i + 13,
          type: 'Recliner',
          colOffset: i + 18,
        })),
      ],
    },
    // Rows E through L: 27 contiguous seats across full width
    ...['E', 'F', 'G', 'H', 'J', 'K', 'L'].map((rowLetter) => ({
      row: rowLetter,
      seats: Array.from({ length: 27 }, (_, i) => ({
        num: i + 1,
        type: 'Recliner',
        colOffset: i,
      })),
    })),
    // Row M: 12 seats (M1-M6 right, M7-M12 left, center stairs/aisle)
    {
      row: 'M',
      seats: [
        ...Array.from({ length: 6 }, (_, i) => ({
          num: i + 1,
          type: 'Recliner',
          colOffset: i + 2,
        })),
        ...Array.from({ length: 6 }, (_, i) => ({
          num: i + 7,
          type: 'Recliner',
          colOffset: i + 19,
        })),
      ],
    },
    // Row N: 20 seats (N1-N4, N5-N16 ADA platform, N17-N20)
    {
      row: 'N',
      seats: [
        ...Array.from({ length: 4 }, (_, i) => ({
          num: i + 1,
          type: 'Recliner',
          colOffset: i + 1,
        })),
        ...Array.from({ length: 12 }, (_, i) => ({
          num: i + 5,
          type: i % 2 === 0 ? 'Companion' : 'Wheelchair',
          colOffset: i + 7,
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
          num: i + 17,
          type: 'Recliner',
          colOffset: i + 22,
        })),
      ],
    },
    // Row P: 25 seats (P1-P25), offset 1
    {
      row: 'P',
      seats: Array.from({ length: 25 }, (_, i) => ({
        num: i + 1,
        type: 'Recliner',
        colOffset: i + 1,
      })),
    },
    // Row Q: 25 seats (Q1-Q25), offset 1
    {
      row: 'Q',
      seats: Array.from({ length: 25 }, (_, i) => ({
        num: i + 1,
        type: 'Recliner',
        colOffset: i + 1,
      })),
    },
  ];

  const seats: SeatData[] = [];
  rowsData.forEach(({ row, seats: rowSeats }, rowIdx) => {
    rowSeats.forEach(({ num, type, colOffset }) => {
      // IMAX Prime Box: Rows F through K, center columns 9 through 19
      const isPrime =
        (row === 'F' || row === 'G' || row === 'H' || row === 'J' || row === 'K') &&
        num >= 9 &&
        num <= 19;

      const isOccupied = isPrime ? num % 3 !== 0 : (rowIdx * 4 + num) % 3 !== 0;
      let dropProb: number | undefined;
      if (isOccupied && isPrime) {
        dropProb = Number((0.42 + ((rowIdx * 7 + num * 11) % 48) / 100).toFixed(2));
      }

      seats.push({
        row,
        number: num,
        status: isOccupied ? 'OCCUPIED' : 'AVAILABLE',
        seat_type: type,
        is_prime: isPrime,
        drop_probability: dropProb,
        grid_row: rowIdx,
        grid_col: colOffset,
      });
    });
  });

  return {
    id: 'tysons-aud-3-imax',
    name: 'Auditorium 3 (IMAX with Laser at AMC Tysons Corner 16)',
    auditoriumNumber: 3,
    screenFormat: 'IMAX_LASER',
    totalRows: rowsData.length, // 15 rows
    totalCols: 27,
    totalPhysicalCapacity: seats.length, // exactly 350 seats
    seats,
  };
}

/**
 * Exact 125-seat physical layout for AMC Tysons Corner 16 Auditorium 2 (4DX at AMC).
 * Analyzed from AMC live ticketing seatmap capture:
 * - 4-seat motorized motion pods
 * - Row D lacks right wing pod
 * - Row C contains accessible cross-tier platform
 */
function buildTysonsAuditorium2FourDX(): AuditoriumLayout {
  // Rows A, B, D, E, F, G, H with 4-seat motorized pods
  // Standard pod column offsets in 19-unit visual grid:
  // Pod 1 (right): cols 0-3 | Pod 2: cols 5-8 | Pod 3: cols 10-13 | Pod 4 (left): cols 15-18
  const rowsData: {
    row: string;
    seats: { num: number; type: string; colOffset: number }[];
  }[] = [];

  // Helper for standard 4-pod rows (16 seats)
  const buildStandard4PodRow = (rowLetter: string) => ({
    row: rowLetter,
    seats: [
      ...Array.from({ length: 4 }, (_, i) => ({ num: i + 1, type: '4DX Pod', colOffset: i })),
      ...Array.from({ length: 4 }, (_, i) => ({ num: i + 5, type: '4DX Pod', colOffset: i + 5 })),
      ...Array.from({ length: 4 }, (_, i) => ({ num: i + 9, type: '4DX Pod', colOffset: i + 10 })),
      ...Array.from({ length: 4 }, (_, i) => ({ num: i + 13, type: '4DX Pod', colOffset: i + 15 })),
    ],
  });

  // Row A: 16 seats
  rowsData.push(buildStandard4PodRow('A'));
  // Row B: 16 seats
  rowsData.push(buildStandard4PodRow('B'));

  // Row C: 17 accessible and standard seats across cross-tier
  rowsData.push({
    row: 'C',
    seats: [
      { num: 1, type: 'Wheelchair', colOffset: 0 },
      { num: 2, type: 'Companion', colOffset: 1 },
      { num: 3, type: 'Standard', colOffset: 2 },
      { num: 4, type: 'Standard', colOffset: 3 },
      { num: 5, type: 'Companion', colOffset: 5 },
      { num: 6, type: 'Wheelchair', colOffset: 6 },
      { num: 7, type: 'Wheelchair', colOffset: 7 },
      { num: 8, type: 'Companion', colOffset: 8 },
      { num: 9, type: 'Standard', colOffset: 10 },
      { num: 10, type: 'Standard', colOffset: 11 },
      { num: 11, type: 'Companion', colOffset: 12 },
      { num: 12, type: 'Wheelchair', colOffset: 13 },
      { num: 13, type: 'Wheelchair', colOffset: 15 },
      { num: 14, type: 'Companion', colOffset: 16 },
      { num: 15, type: 'Standard', colOffset: 17 },
      { num: 16, type: 'Standard', colOffset: 18 },
      { num: 17, type: 'Standard', colOffset: 19 },
    ],
  });

  // Row D: 12 seats (Missing right wing pod, only pods D5-D8, D9-D12, D13-D16)
  rowsData.push({
    row: 'D',
    seats: [
      ...Array.from({ length: 4 }, (_, i) => ({ num: i + 5, type: '4DX Pod', colOffset: i + 5 })),
      ...Array.from({ length: 4 }, (_, i) => ({ num: i + 9, type: '4DX Pod', colOffset: i + 10 })),
      ...Array.from({ length: 4 }, (_, i) => ({ num: i + 13, type: '4DX Pod', colOffset: i + 15 })),
    ],
  });

  // Rows E, F, G, H: 16 seats each
  ['E', 'F', 'G', 'H'].forEach((r) => rowsData.push(buildStandard4PodRow(r)));

  const seats: SeatData[] = [];
  rowsData.forEach(({ row, seats: rowSeats }, rowIdx) => {
    rowSeats.forEach(({ num, type, colOffset }) => {
      // 4DX Prime Box: Rows E, F, G (center pods: seats 5 to 12)
      const isPrime = (row === 'E' || row === 'F' || row === 'G') && num >= 5 && num <= 12;

      const isOccupied = isPrime ? num % 3 !== 0 : (rowIdx * 3 + num) % 4 !== 0;
      let dropProb: number | undefined;
      if (isOccupied && isPrime) {
        dropProb = Number((0.38 + ((rowIdx * 8 + num * 9) % 45) / 100).toFixed(2));
      }

      seats.push({
        row,
        number: num,
        status: isOccupied ? 'OCCUPIED' : 'AVAILABLE',
        seat_type: type,
        is_prime: isPrime,
        drop_probability: dropProb,
        grid_row: rowIdx,
        grid_col: colOffset,
      });
    });
  });

  return {
    id: 'tysons-aud-2-4dx',
    name: 'Auditorium 2 (4DX at AMC Tysons Corner 16)',
    auditoriumNumber: 2,
    screenFormat: '4DX',
    totalRows: 8,
    totalCols: 20,
    totalPhysicalCapacity: seats.length, // 125 seats
    seats,
  };
}

export const TYSONS_AUDITORIUM_11 = buildTysonsAuditorium11();
export const TYSONS_AUDITORIUM_9 = buildTysonsAuditorium9();
export const TYSONS_AUDITORIUM_3_IMAX = buildTysonsAuditorium3Imax();
export const TYSONS_AUDITORIUM_2_4DX = buildTysonsAuditorium2FourDX();

/**
 * Retrieves the auditorium layout by ID, routing accurately to all 4 PLF auditoriums.
 */
export function getAuditoriumLayout(auditoriumId: string): AuditoriumLayout {
  if (auditoriumId === 'tysons-aud-11-dolby' || auditoriumId.includes('aud-11')) {
    return TYSONS_AUDITORIUM_11;
  }
  if (auditoriumId === 'tysons-aud-9-dolby' || auditoriumId.includes('aud-9-dolby')) {
    return TYSONS_AUDITORIUM_9;
  }
  if (
    auditoriumId === 'tysons-aud-3-imax' ||
    auditoriumId === 'tysons-aud-9-imax' ||
    auditoriumId.includes('imax')
  ) {
    return TYSONS_AUDITORIUM_3_IMAX;
  }
  if (auditoriumId === 'tysons-aud-2-4dx' || auditoriumId.includes('4dx')) {
    return TYSONS_AUDITORIUM_2_4DX;
  }

  // Fallback default
  return TYSONS_AUDITORIUM_11;
}
