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
  onSeatToggle?: (seat: SeatData) => void;
  selectedSeat?: SeatData | null;
  selectedSeats?: SeatData[];
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
  onSeatToggle,
  selectedSeat,
  selectedSeats,
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

  // Group seats by row and sort each row descending by seat number (greatest to least from left to right)
  const rowsMap = useMemo(() => {
    const map = new Map<string, SeatData[]>();
    seats.forEach((seat) => {
      const list = map.get(seat.row) || [];
      list.push(seat);
      map.set(seat.row, list);
    });
    map.forEach((rowSeats) => {
      rowSeats.sort((a, b) => b.number - a.number);
    });
    return map;
  }, [seats]);

  const effectiveRows = Math.max(totalRows, uniqueRows.length);
  const canvasWidth = totalCols * (seatWidth + gapX) + paddingX * 2;
  const canvasHeight = effectiveRows * (seatHeight + gapY) + paddingY * 2;

  // Format label text and screen color
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

  const screenColor =
    screenFormat === 'DOLBY_CINEMA'
      ? '#f59e0b'
      : screenFormat === 'IMAX_LASER'
      ? '#38bdf8'
      : screenFormat === '4DX'
      ? '#f43f5e'
      : screenFormat === 'REALD_3D'
      ? '#a855f7'
      : '#38bdf8';

  const screenStartX = paddingX - 25;
  const screenEndX = canvasWidth - paddingX + 25;
  const screenMidX = canvasWidth / 2;
  const screenApexY = 20;
  const screenBaseY = 56;

  return (
    <div className="relative w-full flex flex-col items-center bg-[#0a0a0a] p-4 sm:p-6 rounded-2xl border border-neutral-800 shadow-2xl overflow-x-auto">
      {/* SVG Seating Chart with Integrated Curved Screen */}
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="w-full max-w-5xl h-auto select-none"
        data-testid="auditorium-svg-canvas"
      >
        <defs>
          <filter id="screen-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="screen-beam" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={screenColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={screenColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Ambient Projector Light Beam from Screen */}
        <polygon
          points={`${screenStartX},${screenBaseY} ${screenEndX},${screenBaseY} ${screenEndX - 40},${canvasHeight - 20} ${screenStartX + 40},${canvasHeight - 20}`}
          fill="url(#screen-beam)"
          className="pointer-events-none"
        />

        {/* Curved Screen Arc — Surrounds and parallels the seating layout */}
        <path
          d={`M ${screenStartX} ${screenBaseY} Q ${screenMidX} ${screenApexY} ${screenEndX} ${screenBaseY}`}
          fill="none"
          stroke={screenColor}
          strokeWidth="6"
          strokeLinecap="round"
          filter="url(#screen-glow)"
        />

        {/* Inner subtle screen rim */}
        <path
          d={`M ${screenStartX + 4} ${screenBaseY + 3} Q ${screenMidX} ${screenApexY + 4} ${screenEndX - 4} ${screenBaseY + 3}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />

        {/* Centered Screen Label */}
        <text
          x={screenMidX}
          y={screenApexY + 22}
          textAnchor="middle"
          fontSize="11"
          letterSpacing="4"
          fill="#94a3b8"
          className="font-mono font-bold uppercase select-none tracking-widest"
        >
          {formatBannerTitle}
        </text>

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

          const rowSeats = rowsMap.get(seat.row) || [];
          const idxInRow = rowSeats.findIndex((s) => s.number === seat.number);

          let colIdx: number;
          if (seat.grid_col !== undefined && seat.grid_col < totalCols) {
            colIdx = seat.grid_col;
          } else {
            // Dynamic centering for live seats without pre-computed grid_col
            const rowCount = rowSeats.length;
            const rowOffset = Math.max(0, Math.floor((totalCols - rowCount) / 2));
            colIdx = rowOffset + (idxInRow >= 0 ? idxInRow : 0);
          }

          const x = paddingX + colIdx * (seatWidth + gapX);
          const y = paddingY + rowIdx * (seatHeight + gapY);
          const styling = getNodeColor(seat, latestDrop, heatmapMode);

          const isSelected =
            Boolean(selectedSeats && selectedSeats.some((s) => s.row === seat.row && s.number === seat.number)) ||
            Boolean(selectedSeat?.row === seat.row && selectedSeat?.number === seat.number);
          const isWheelchair = seat.seat_type === 'Wheelchair';
          const isCompanion = seat.seat_type === 'Companion';

          return (
            <g
              key={`${seat.row}-${seat.number}`}
              className={`cursor-pointer transition-opacity duration-150 ${styling.className}`}
              onClick={() => {
                if (onSeatClick) {
                  onSeatClick(seat);
                } else if (onSeatToggle) {
                  onSeatToggle(seat);
                }
              }}
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
