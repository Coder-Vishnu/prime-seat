// apps/web/src/app/page.tsx
'use client';

import React, { useState } from 'react';
import { TheatreSearch } from '../components/TheatreSearch';
import { CalendarPicker, formatDate } from '../components/CalendarPicker';
import { ShowtimeSchedule } from '../components/ShowtimeSchedule';
import { AuditoriumCanvas } from '../components/AuditoriumCanvas';
import { AMCTheatre, DMV_AMC_THEATRES } from '../data/theatres';
import { Movie, Showtime } from '../data/showtimes';
import { getAuditoriumLayout } from '../data/auditoriums';
import { useAuditoriumStream, SeatData } from '../hooks/useAuditoriumStream';
import { useDesktopNotification } from '../hooks/useDesktopNotification';

export type BookingStage = 'THEATRES' | 'CALENDAR' | 'SHOWTIMES' | 'SEATMAP';

export default function Home() {
  const [stage, setStage] = useState<BookingStage>('THEATRES');

  // Pipeline navigation selection state
  const [selectedTheatre, setSelectedTheatre] = useState<AMCTheatre | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-14');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);

  // Seatmap interaction state
  const [heatmapMode, setHeatmapMode] = useState<boolean>(false);
  const [selectedSeat, setSelectedSeat] = useState<SeatData | null>(null);

  // Active auditorium layout and streaming hook
  const activeAuditorium = getAuditoriumLayout(
    selectedShowtime?.auditoriumId || 'tysons-aud-11-dolby'
  );

  const streamId = selectedShowtime?.id || 'amc-tysons-dolby-current';
  const { seats: streamSeats, latestDrop, isConnected } = useAuditoriumStream(streamId);
  const { permission, requestPermission, playChime } = useDesktopNotification();

  const activeSeats = streamSeats.length > 0 ? streamSeats : activeAuditorium.seats;

  // Handlers for pipeline transitions
  const handleSelectTheatre = (theatre: AMCTheatre) => {
    setSelectedTheatre(theatre);
    setStage('CALENDAR');
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setStage('SHOWTIMES');
  };

  const handleSelectShowtime = (showtime: Showtime, movie: Movie) => {
    setSelectedShowtime(showtime);
    setSelectedMovie(movie);
    setStage('SEATMAP');
  };

  const handleSeatClick = (seat: SeatData) => {
    setSelectedSeat(seat);
    if (
      seat.status === 'AVAILABLE' &&
      latestDrop &&
      latestDrop.seat.row === seat.row &&
      latestDrop.seat.number === seat.number
    ) {
      window.open(latestDrop.checkout_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleBack = () => {
    if (stage === 'SEATMAP') setStage('SHOWTIMES');
    else if (stage === 'SHOWTIMES') setStage('CALENDAR');
    else if (stage === 'CALENDAR') setStage('THEATRES');
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col items-center py-6 px-4 sm:px-6">
      {/* Top Brand Header */}
      <header className="w-full max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              PRIME <span className="text-sky-400">SEAT</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
              v8.0.0.4
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            DMV AMC Premium Large Format (PLF) Discovery &amp; Live Seat Reclamation Engine
          </p>
        </div>

        {/* Live SSE & Desktop Push Indicators */}
        <div className="flex flex-wrap items-center gap-3">
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

          {permission !== 'granted' && (
            <button
              onClick={() => requestPermission()}
              className="text-xs px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 transition font-medium"
            >
              Notifications
            </button>
          )}

          <button
            onClick={() => playChime()}
            title="Test acoustic chime"
            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition"
          >
            🔔 Chime
          </button>
        </div>
      </header>

      {/* Multi-Stage Breadcrumbs Bar */}
      <nav
        className="w-full max-w-5xl my-5 flex flex-wrap items-center justify-between gap-3 bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-2.5 backdrop-blur-md text-xs"
        aria-label="Booking Pipeline Breadcrumbs"
        data-testid="booking-pipeline-breadcrumbs"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Back button */}
          {stage !== 'THEATRES' && (
            <button
              onClick={handleBack}
              type="button"
              className="mr-2 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium transition flex items-center gap-1"
              data-testid="pipeline-back-button"
            >
              ← Back
            </button>
          )}

          {/* Breadcrumb 1: Theatres */}
          <button
            onClick={() => setStage('THEATRES')}
            className={`font-semibold transition ${
              stage === 'THEATRES'
                ? 'text-amber-400 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
            data-testid="breadcrumb-theatres"
          >
            1. Theatres
          </button>

          {/* Breadcrumb 2: Selected Theatre / Calendar */}
          <span className="text-neutral-600">/</span>
          <button
            onClick={() => selectedTheatre && setStage('CALENDAR')}
            disabled={!selectedTheatre}
            className={`transition ${
              stage === 'CALENDAR'
                ? 'text-amber-400 font-bold'
                : selectedTheatre
                ? 'text-neutral-300 hover:text-white'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
            data-testid="breadcrumb-theatre"
          >
            {selectedTheatre ? selectedTheatre.name : '2. Date'}
          </button>

          {/* Breadcrumb 3: Date / Showtimes */}
          <span className="text-neutral-600">/</span>
          <button
            onClick={() => selectedTheatre && selectedDate && setStage('SHOWTIMES')}
            disabled={!selectedTheatre || !selectedDate}
            className={`transition ${
              stage === 'SHOWTIMES'
                ? 'text-amber-400 font-bold'
                : selectedDate
                ? 'text-neutral-300 hover:text-white'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
            data-testid="breadcrumb-date"
          >
            {selectedDate || '3. Showtimes'}
          </button>

          {/* Breadcrumb 4: Showtime / Seatmap */}
          {selectedShowtime && selectedMovie && (
            <>
              <span className="text-neutral-600">/</span>
              <button
                onClick={() => setStage('SEATMAP')}
                className={`transition ${
                  stage === 'SEATMAP'
                    ? 'text-amber-400 font-bold'
                    : 'text-neutral-300 hover:text-white'
                }`}
                data-testid="breadcrumb-seatmap"
              >
                {selectedMovie.title} ({selectedShowtime.time})
              </button>
            </>
          )}
        </div>

        {/* Current Active Stage Indicator */}
        <div
          className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider"
          data-testid="current-stage-badge"
        >
          Stage: <span className="text-white font-bold">{stage}</span>
        </div>
      </nav>

      {/* Main Multi-Stage Pipeline Content View */}
      <div className="w-full max-w-5xl flex flex-col gap-6">
        {/* Stage 1: Theatre Search */}
        {stage === 'THEATRES' && (
          <section data-testid="stage-theatre-search">
            <TheatreSearch
              onSelectTheatre={handleSelectTheatre}
              selectedTheatreId={selectedTheatre?.id}
            />
          </section>
        )}

        {/* Stage 2: Date Picker */}
        {stage === 'CALENDAR' && (
          <section data-testid="stage-calendar-picker" className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-neutral-400 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
              <span>
                Selected Location:{' '}
                <strong className="text-white">
                  {selectedTheatre?.name || 'AMC Tysons Corner 16'}
                </strong>
              </span>
              <button
                onClick={() => setStage('THEATRES')}
                className="text-amber-400 hover:underline"
              >
                Change Theatre
              </button>
            </div>

            <CalendarPicker
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              minDate="2026-11-14"
            />
          </section>
        )}

        {/* Stage 3: Showtime Schedule */}
        {stage === 'SHOWTIMES' && (
          <section data-testid="stage-showtime-schedule" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between text-xs text-neutral-400 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-3">
                <span>
                  Theatre:{' '}
                  <strong className="text-white">
                    {selectedTheatre?.name || 'AMC Tysons Corner 16'}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Date: <strong className="text-white">{selectedDate}</strong>
                </span>
              </div>
              <button
                onClick={() => setStage('CALENDAR')}
                className="text-amber-400 hover:underline"
              >
                Change Date
              </button>
            </div>

            <ShowtimeSchedule
              theatreId={selectedTheatre?.id || 'amc-tysons-16'}
              date={selectedDate}
              selectedShowtimeId={selectedShowtime?.id}
              onSelectShowtime={handleSelectShowtime}
            />
          </section>
        )}

        {/* Stage 4: Live Seating Canvas */}
        {stage === 'SEATMAP' && (
          <section data-testid="stage-seatmap-canvas" className="flex flex-col gap-6">
            {/* Top Bar for Seatmap */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedMovie?.title || 'Dune: Part Two'}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-normal">
                    {selectedShowtime?.time || '7:15 PM'}
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {selectedTheatre?.name || 'AMC Tysons Corner 16'} •{' '}
                  {activeAuditorium.name} ({activeAuditorium.totalPhysicalCapacity} physical seats)
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setHeatmapMode((prev) => !prev)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition ${
                    heatmapMode
                      ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20'
                      : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                  }`}
                  data-testid="toggle-heatmap-btn"
                >
                  {heatmapMode ? '🔥 Heatmap Active' : '📊 ML Heatmap'}
                </button>
              </div>
            </div>

            {/* Latest Drop Alert Banner */}
            {latestDrop && (
              <div className="w-full p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <div className="text-sm font-bold text-amber-400">
                      RECLAMATION DROP: {latestDrop.movie_title}
                    </div>
                    <div className="text-xs text-neutral-300">
                      Row {latestDrop.seat.row}, Seat {latestDrop.seat.number} vacated! Confidence:{' '}
                      {(latestDrop.drop_probability * 100).toFixed(0)}%
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

            {/* SVG Auditorium Canvas */}
            <div data-testid="auditorium-canvas-wrapper">
              <AuditoriumCanvas
                seats={activeSeats}
                totalRows={activeAuditorium.totalRows}
                totalCols={activeAuditorium.totalCols}
                screenFormat={activeAuditorium.screenFormat}
                latestDrop={latestDrop}
                heatmapMode={heatmapMode}
                onSeatClick={handleSeatClick}
              />
            </div>

            {/* Selected Seat Inspector */}
            {selectedSeat && (
              <aside
                className="w-full p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-between"
                data-testid="selected-seat-inspector"
              >
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
          </section>
        )}
      </div>
    </main>
  );
}
