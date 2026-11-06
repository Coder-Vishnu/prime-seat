// apps/web/src/components/AuditoriumCanvas.tsx
'use client';

import React, { useState } from 'react';
import { SeatData, DropEventPayload } from '../hooks/useAuditoriumStream';

export interface AuditoriumCanvasProps {
  seats: SeatData[];
  totalRows: number;
  totalCols: number;
  screenFormat: 'DOLBY_CINEMA' | 'IMAX_LASER';
  latestDrop: DropEventPayload | null;
  heatmapMode: boolean;
  onSeatClick?: (seat: SeatData) => void;
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
    // Heatmap gradient based on predicted churn probability
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
}) => {
  const [hoveredSeat, setHoveredSeat] = useState<SeatData | null>(null);

  const seatWidth = 28;
  const seatHeight = 24;
  const gapX = 10;
  const gapY = 12;

  const canvasWidth = totalCols * (seatWidth + gapX) + 120;
  const canvasHeight = totalRows * (seatHeight + gapY) + 180;

  return (
    <div className="relative w-full flex flex-col items-center bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-2xl">
      {/* Curved Screen Banner */}
      <div className="w-full max-w-4xl mb-8 flex flex-col items-center">
        <svg viewBox="0 0 600 50" className="w-full max-w-2xl h-12">
          <path
            d="M 20 40 Q 300 10 580 40"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-xs uppercase tracking-widest text-neutral-400 mt-1 font-semibold">
          {screenFormat === 'DOLBY_CINEMA' ? 'Dolby Cinema Screen' : 'IMAX with Laser Screen'}
        </span>
      </div>

      {/* SVG Seating Chart */}
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="w-full max-w-5xl h-auto select-none"
      >
        {seats.map((seat) => {
          const rowIdx = seat.row.charCodeAt(0) - 65;
          const colIdx = seat.number - 1;
          const x = 60 + colIdx * (seatWidth + gapX);
          const y = 80 + rowIdx * (seatHeight + gapY);
          const styling = getNodeColor(seat, latestDrop, heatmapMode);

          return (
            <g
              key={`${seat.row}-${seat.number}`}
              className={`cursor-pointer transition-transform duration-150 hover:scale-125 ${styling.className}`}
              onClick={() => onSeatClick && onSeatClick(seat)}
              onMouseEnter={() => setHoveredSeat(seat)}
              onMouseLeave={() => setHoveredSeat(null)}
            >
              <rect
                x={x}
                y={y}
                width={seatWidth}
                height={seatHeight}
                rx={6}
                fill={styling.fill}
                stroke={styling.stroke}
                strokeWidth={seat.is_prime ? 2.5 : 1.5}
              />
              <text
                x={x + seatWidth / 2}
                y={y + seatHeight / 2 + 4}
                textAnchor="middle"
                fontSize="9"
                fill="#ffffff"
                className="font-mono pointer-events-none"
              >
                {seat.number}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover Tooltip */}
      {hoveredSeat && (
        <div className="absolute bottom-4 left-6 bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-lg text-xs text-neutral-200 shadow-xl pointer-events-none">
          <span className="font-bold text-sky-400">
            Row {hoveredSeat.row}, Seat {hoveredSeat.number}
          </span>
          <span className="mx-2">•</span>
          <span className="capitalize">{hoveredSeat.status.toLowerCase()}</span>
          {hoveredSeat.is_prime && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 font-semibold">
              PRIME
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
