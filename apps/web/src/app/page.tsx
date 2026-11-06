// apps/web/src/app/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { AuditoriumCanvas } from '../components/AuditoriumCanvas';
import { useAuditoriumStream, SeatData } from '../hooks/useAuditoriumStream';
import { useDesktopNotification } from '../hooks/useDesktopNotification';

// Initial baseline seating topology for AMC Tysons Corner 16 Dolby Cinema (Rows A-J, 18 cols)
function generateDefaultDolbySeats(): SeatData[] {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
  const cols = 18;
  const seats: SeatData[] = [];

  rows.forEach((row, rowIdx) => {
    for (let num = 1; num <= cols; num++) {
      const isPrime = (row === 'E' || row === 'F' || row === 'G' || row === 'H') && num >= 6 && num <= 13;
      // Seed some realistic statuses
      const isBlocked = (row === 'A' && (num <= 2 || num >= 17));
      const isOccupied = !isBlocked && (isPrime ? (num % 3 !== 0) : ((rowIdx * 7 + num) % 4 !== 0));

      // Calculate mock ML churn drop probability for prime occupied seats
      let dropProb: number | undefined;
      if (isOccupied && isPrime) {
        // Deterministic pseudo-probabilities for demo
        dropProb = Number((0.35 + ((rowIdx * 11 + num * 17) % 55) / 100).toFixed(2));
      }

      seats.push({
        row,
        number: num,
        status: isBlocked ? 'BLOCKED' : isOccupied ? 'OCCUPIED' : 'AVAILABLE',
        seat_type: 'RECLINER',
        is_prime: isPrime,
        drop_probability: dropProb,
      });
    }
  });

  return seats;
}

export default function Home() {
  const [showtimeId, setShowtimeId] = useState<string>('amc-tysons-dolby-current');
  const [screenFormat, setScreenFormat] = useState<'DOLBY_CINEMA' | 'IMAX_LASER'>('DOLBY_CINEMA');
  const [heatmapMode, setHeatmapMode] = useState<boolean>(false);
  const [selectedSeat, setSelectedSeat] = useState<SeatData | null>(null);

  const { seats: streamSeats, latestDrop, isConnected } = useAuditoriumStream(showtimeId);
  const { permission, requestPermission, playChime } = useDesktopNotification();

  // Baseline fallback seats when stream hasn't sent snapshot yet
  const defaultSeats = useMemo(() => generateDefaultDolbySeats(), []);
  const activeSeats = streamSeats.length > 0 ? streamSeats : defaultSeats;

  const handleSeatClick = (seat: SeatData) => {
    setSelectedSeat(seat);
    if (seat.status === 'AVAILABLE' && latestDrop && latestDrop.seat.row === seat.row && latestDrop.seat.number === seat.number) {
      window.open(latestDrop.checkout_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col items-center py-8 px-4 sm:px-6">
      {/* Top Header & Telemetry Status Bar */}
      <header className="w-full max-w-5xl flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              PRIME <span className="text-sky-400">SEAT</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
              v7.0.0.3
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            AMC Tysons Corner 16 • Sub-50ms React 19 Vector Canvas Engine
          </p>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* SSE Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-neutral-300">
              {isConnected ? 'SSE LIVE' : 'SSE RECONNECTING'}
            </span>
          </div>

          {/* Desktop Push Permission Button */}
          {permission !== 'granted' && (
            <button
              onClick={() => requestPermission()}
              className="text-xs px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 transition font-medium"
            >
              Enable Notifications
            </button>
          )}

          {/* Sound Test Button */}
          <button
            onClick={() => playChime()}
            title="Test acoustic alert chime"
            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-700 transition"
          >
            🔔 Chime
          </button>

          {/* Heatmap Toggle */}
          <button
            onClick={() => setHeatmapMode((prev) => !prev)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition ${
              heatmapMode
                ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
            }`}
          >
            {heatmapMode ? '🔥 Heatmap Active' : '📊 ML Heatmap'}
          </button>
        </div>
      </header>

      {/* Screen Format Selector & Controls */}
      <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-4 py-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-400">Auditorium:</span>
          <button
            onClick={() => setScreenFormat('DOLBY_CINEMA')}
            className={`px-3 py-1 rounded font-medium transition ${
              screenFormat === 'DOLBY_CINEMA'
                ? 'bg-sky-500 text-white font-bold'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            Dolby Cinema
          </button>
          <button
            onClick={() => setScreenFormat('IMAX_LASER')}
            className={`px-3 py-1 rounded font-medium transition ${
              screenFormat === 'IMAX_LASER'
                ? 'bg-sky-500 text-white font-bold'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            IMAX with Laser
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-neutral-400 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-700 border border-sky-400 inline-block" /> Prime Zone
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 animate-pulse inline-block" /> Dropped
          </span>
          {heatmapMode && (
            <span className="flex items-center gap-1 text-neutral-300">
              Risk:
              <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> &lt;40%
              <span className="w-2.5 h-2.5 rounded bg-orange-500 inline-block" /> &ge;40%
              <span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" /> &ge;70%
            </span>
          )}
        </div>
      </div>

      {/* Latest Drop Alert Banner */}
      {latestDrop && (
        <div className="w-full max-w-5xl mb-6 p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-sm font-bold text-amber-400">
                RECLAMATION DROP: {latestDrop.movie_title}
              </div>
              <div className="text-xs text-neutral-300">
                Row {latestDrop.seat.row}, Seat {latestDrop.seat.number} vacated! Confidence: {(latestDrop.drop_probability * 100).toFixed(0)}%
              </div>
            </div>
          </div>
          <a
            href={latestDrop.checkout_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition"
          >
            Claim Seat Immediately →
          </a>
        </div>
      )}

      {/* Main 2D SVG Auditorium Canvas */}
      <section className="w-full max-w-5xl">
        <AuditoriumCanvas
          seats={activeSeats}
          totalRows={10}
          totalCols={18}
          screenFormat={screenFormat}
          latestDrop={latestDrop}
          heatmapMode={heatmapMode}
          onSeatClick={handleSeatClick}
        />
      </section>

      {/* Selected Seat Modal / Info Footer */}
      {selectedSeat && (
        <aside className="w-full max-w-5xl mt-6 p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
          <div className="text-xs">
            <span className="font-bold text-white">
              Selected: Row {selectedSeat.row}, Seat {selectedSeat.number}
            </span>
            <span className="mx-2 text-neutral-500">•</span>
            <span className="text-neutral-300">{selectedSeat.seat_type}</span>
            <span className="mx-2 text-neutral-500">•</span>
            <span
              className={`font-semibold ${
                selectedSeat.status === 'AVAILABLE'
                  ? 'text-emerald-400'
                  : selectedSeat.status === 'OCCUPIED'
                  ? 'text-slate-400'
                  : 'text-neutral-500'
              }`}
            >
              {selectedSeat.status}
            </span>
            {selectedSeat.is_prime && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold text-[10px]">
                PRIME SIGHTLINE
              </span>
            )}
          </div>
          <button
            onClick={() => setSelectedSeat(null)}
            className="text-xs text-neutral-400 hover:text-white px-2 py-1"
          >
            Close ✕
          </button>
        </aside>
      )}
    </main>
  );
}
