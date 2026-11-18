// apps/web/src/components/AuditoriumCanvas.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { SeatData, DropEventPayload } from '../hooks/useAuditoriumStream';

export interface AuditoriumCanvasProps {
  seats: SeatData[];
  totalRows: number;
  totalCols: number;
  screenFormat: 'DOLBY_CINEMA' | 'IMAX_LASER' | '4DX' | 'PRIME' | 'REALD_3D' | 'LASER';
  latestDrop: DropEventPayload | null;
  heatmapMode: boolean;
  onSeatClick?: (seat: SeatData) => void;
  selectedSeat?: SeatData | null;
}

export interface NodeStyling {
  fill: string;
  stroke: string;
  className: string;
}

export function getNodeColor(
  seat: SeatData,
  latestDrop: DropEventPayload | null,
  heatmapMode: boolean
): NodeStyling {
  const isRecentDrop =
    latestDrop?.seat.row === seat.row && latestDrop?.seat.number === seat.number;

  if (isRecentDrop) {
    return { fill: '#f59e0b', stroke: '#d97706', className: 'animate-pulse' };
  }
  if (seat.status === 'AVAILABLE') {
    return { fill: '#10b981', stroke: '#059669', className: '' };
  }
  if (seat.status === 'BLOCKED') {
    return { fill: '#1e293b', stroke: '#0f172a', className: 'opacity-40 pointer-events-none' };
  }
  // Occupied state
  if (heatmapMode && seat.drop_probability !== undefined) {
    const prob = seat.drop_probability;
    if (prob >= 0.7) return { fill: '#ef4444', stroke: '#dc2626', className: '' };
    if (prob >= 0.4) return { fill: '#f97316', stroke: '#ea580c', className: '' };
    return { fill: '#3b82f6', stroke: '#2563eb', className: '' };
  }
  if (seat.is_prime) {
    return { fill: '#475569', stroke: '#38bdf8', className: '' };
  }
  return { fill: '#334155', stroke: '#1e293b', className: '' };
}

export const AuditoriumCanvas: React.FC<AuditoriumCanvasProps> = ({
  seats,
  totalRows,
  totalCols,
  screenFormat,
  latestDrop,
  heatmapMode,
  onSeatClick,
  selectedSeat,
}) => {
  const [hoveredSeat, setHoveredSeat] = useState<SeatData | null>(null);

  const seatWidth = 28;
  const seatHeight = 24;
  const gapX = 10;
  const gapY = 14;
  const paddingX = 80;
  const paddingY = 90;

  // Build deterministic row index mapping based on unique row order
  const uniqueRows = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    seats.forEach((s) => {
      if (!seen.has(s.row)) {
        seen.add(s.row);
        list.push(s.row);
      }
    });
    return list;
  }, [seats]);

  const rowIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    uniqueRows.forEach((r, idx) => map.set(r, idx));
    return map;
  }, [uniqueRows]);

  const effectiveRows = Math.max(totalRows, uniqueRows.length);
  const canvasWidth = totalCols * (seatWidth + gapX) + paddingX * 2;
  const canvasHeight = effectiveRows * (seatHeight + gapY) + paddingY * 2;

  // Format label text
  const formatBannerTitle =
    screenFormat === 'DOLBY_CINEMA'
      ? 'Dolby Cinema Screen'
      : screenFormat === 'IMAX_LASER'
      ? 'IMAX with Laser Screen'
      : screenFormat === '4DX'
      ? '4DX Motion Screen'
      : screenFormat === 'REALD_3D'
      ? 'RealD 3D Screen'
      : 'Auditorium Screen';

  return (
    <div className="relative w-full flex flex-col items-center bg-[#0a0a0a] p-4 sm:p-6 rounded-2xl border border-neutral-800 shadow-2xl overflow-x-auto">
      {/* Curved Screen Banner */}
      <div className="w-full max-w-4xl mb-6 flex flex-col items-center">
        <svg viewBox="0 0 600 50" className="w-full max-w-2xl h-12">
          <path
            d="M 20 40 Q 300 10 580 40"
            fill="none"
            stroke={
              screenFormat === 'DOLBY_CINEMA'
                ? '#f59e0b'
                : screenFormat === 'IMAX_LASER'
                ? '#38bdf8'
                : screenFormat === '4DX'
                ? '#f43f5e'
                : screenFormat === 'REALD_3D'
                ? '#a855f7'
                : '#38bdf8'
            }
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-xs uppercase tracking-widest text-neutral-400 mt-1 font-semibold">
          {formatBannerTitle}
        </span>
      </div>

      {/* SVG Seating Chart */}
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="w-full max-w-5xl h-auto select-none"
        data-testid="auditorium-svg-canvas"
      >
        {/* Row Letter Markers on Left and Right */}
        {uniqueRows.map((rowLetter, idx) => {
          const y = paddingY + idx * (seatHeight + gapY) + seatHeight / 2 + 4;
          return (
            <g key={`row-label-${rowLetter}`}>
              <text
                x={paddingX - 25}
                y={y}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
                className="font-mono font-bold"
              >
                {rowLetter}
              </text>
              <text
                x={canvasWidth - paddingX + 25}
                y={y}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
                className="font-mono font-bold"
              >
                {rowLetter}
              </text>
            </g>
          );
        })}

        {/* Seat Nodes */}
        {seats.map((seat) => {
          const rowIdx =
            seat.grid_row !== undefined ? seat.grid_row : (rowIndexMap.get(seat.row) ?? 0);
          const colIdx = seat.grid_col !== undefined ? seat.grid_col : seat.number - 1;

          const x = paddingX + colIdx * (seatWidth + gapX);
          const y = paddingY + rowIdx * (seatHeight + gapY);
          const styling = getNodeColor(seat, latestDrop, heatmapMode);

          const isSelected =
            selectedSeat?.row === seat.row && selectedSeat?.number === seat.number;
          const isWheelchair = seat.seat_type === 'Wheelchair';
          const isCompanion = seat.seat_type === 'Companion';

          return (
            <g
              key={`${seat.row}-${seat.number}`}
              className={`cursor-pointer transition-opacity duration-150 ${styling.className}`}
              onClick={() => onSeatClick && onSeatClick(seat)}
              onMouseEnter={() => setHoveredSeat(seat)}
              onMouseLeave={() => setHoveredSeat(null)}
              data-testid={`seat-node-${seat.row}-${seat.number}`}
            >
              {/* Selected Glow Ring */}
              {isSelected && (
                <rect
                  x={x - 3}
                  y={y - 3}
                  width={seatWidth + 6}
                  height={seatHeight + 6}
                  rx={8}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
              )}

              {/* Main Seat Rectangle */}
              <rect
                x={x}
                y={y}
                width={seatWidth}
                height={seatHeight}
                rx={isWheelchair ? 12 : 6}
                fill={isSelected ? '#0284c7' : styling.fill}
                stroke={isSelected ? '#ffffff' : styling.stroke}
                strokeWidth={isSelected ? 2 : seat.is_prime ? 2.5 : 1.2}
              />

              {/* Seat Label */}
              <text
                x={x + seatWidth / 2}
                y={y + seatHeight / 2 + 3.5}
                textAnchor="middle"
                fontSize={isWheelchair || isCompanion ? '7.5' : '8.5'}
                fill={isSelected ? '#ffffff' : '#f8fafc'}
                className="font-mono font-semibold pointer-events-none"
              >
                {isWheelchair ? '♿' : isCompanion ? '★' : seat.number}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover Tooltip */}
      {hoveredSeat && (
        <div className="absolute bottom-4 left-6 bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-lg text-xs text-neutral-200 shadow-xl pointer-events-none z-10">
          <span className="font-bold text-sky-400">
            Row {hoveredSeat.row}, Seat {hoveredSeat.number}
          </span>
          <span className="mx-2">•</span>
          <span className="capitalize">{hoveredSeat.status.toLowerCase()}</span>
          {hoveredSeat.is_prime && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 font-semibold">
              PRIME SIGHTLINE
            </span>
          )}
          {hoveredSeat.drop_probability !== undefined && (
            <div className="mt-1 text-amber-400 font-mono">
              P(Drop): {(hoveredSeat.drop_probability * 100).toFixed(1)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};
