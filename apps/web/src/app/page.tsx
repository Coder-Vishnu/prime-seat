// apps/web/src/app/page.tsx
// Task 1 (9.0): Scoped to AMC Tysons Corner 16 only. App opens at CALENDAR stage.
'use client';

import React, { useState } from 'react';
import { TheatreSearch } from '../components/TheatreSearch';
import { CalendarPicker } from '../components/CalendarPicker';
import { ShowtimeSchedule } from '../components/ShowtimeSchedule';
import { AuditoriumCanvas } from '../components/AuditoriumCanvas';
import { SeatAlertModal } from '../components/SeatAlertModal';
import { TYSONS_THEATRE } from '../data/theatres';
import { Movie, Showtime } from '../data/showtimes';
import tysonsDb from '../data/tysons_schedule_db.json';
import { getAuditoriumLayout } from '../data/auditoriums';
import { useAuditoriumStream, SeatData } from '../hooks/useAuditoriumStream';
import { useDesktopNotification } from '../hooks/useDesktopNotification';

// Stage 1 (THEATRES) is retired — Prime Seat is Tysons-only.
export type BookingStage = 'CALENDAR' | 'SHOWTIMES' | 'SEATMAP';

// Today's date in YYYY-MM-DD
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const [stage, setStage] = useState<BookingStage>('CALENDAR');

  // Tysons is always the fixed venue — no selection needed
  const selectedTheatre = TYSONS_THEATRE;

  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);

  // Seatmap interaction state
  const [heatmapMode, setHeatmapMode] = useState<boolean>(false);
  const [selectedSeat, setSelectedSeat] = useState<SeatData | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SeatData[]>([]);
  const [watchedSeats, setWatchedSeats] = useState<SeatData[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);

  // Active auditorium layout and streaming hook
  const activeAuditorium = getAuditoriumLayout(
    selectedShowtime?.auditoriumId || 'tysons-aud-11-dolby'
  );

  const streamId = selectedShowtime?.id || 'amc-tysons-dolby-current';
  const {
    seats: streamSeats,
    latestDrop,
    isConnected,
    isHydrating,
    liveMetadata,
  } = useAuditoriumStream(streamId, selectedShowtime?.auditoriumId);
  const { permission, requestPermission, playChime } = useDesktopNotification();

  const [pushToast, setPushToast] = useState<string | null>(null);

  const handleTestPhonePush = async () => {
    try {
      setPushToast('Sending test push to phone & watch...');
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'prime-seat-tysons-vishnu',
          movieTitle: selectedMovie?.title || 'The Cat in the Hat',
          row: 'E',
          seatNumber: 8,
          auditorium: activeAuditorium.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPushToast(`⚡ Push alert sent! View on phone or at ${data.viewUrl}`);
      } else {
        setPushToast(`Push error: ${data.error}`);
      }
    } catch {
      setPushToast('Failed to reach notification service');
    }
    setTimeout(() => setPushToast(null), 5000);
  };

  const activeSeats = streamSeats.length > 0 ? streamSeats : activeAuditorium.seats;

  // Pipeline handlers
  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSeats([]);
    setWatchedSeats([]);
    setSelectedSeat(null);
    setStage('SHOWTIMES');
  };

  const handleSelectShowtime = (showtime: Showtime, movie: Movie) => {
    setSelectedShowtime(showtime);
    setSelectedMovie(movie);
    setSelectedSeats([]);
    setWatchedSeats([]);
    setSelectedSeat(null);
    setStage('SEATMAP');
  };

  const handleSeatClick = (seat: SeatData) => {
    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.row === seat.row && s.number === seat.number);
      if (exists) {
        const next = prev.filter((s) => !(s.row === seat.row && s.number === seat.number));
        setSelectedSeat(next.length > 0 ? next[next.length - 1] : null);
        return next;
      } else {
        setSelectedSeat(seat);
        return [...prev, seat];
      }
    });
  };

  const handleSeatToggle = (seat: SeatData) => {
    handleSeatClick(seat);
  };

  const handleSelectPrimeBox = () => {
    const primes = activeSeats.filter((s) => s.is_prime);
    const toSelect = primes.slice(0, 4);
    setSelectedSeats(toSelect);
    if (toSelect[0]) setSelectedSeat(toSelect[0]);
  };

  // Combined drop probability: 1 - product(1 - p_i)
  const combinedDropProb = selectedSeats.reduce((acc, s) => {
    const p = s.drop_probability !== undefined ? s.drop_probability : 0.35;
    return acc * (1 - p);
  }, 1);
  const effectiveCombinedProb = selectedSeats.length > 0 ? Math.min(1 - combinedDropProb, 0.99) : 0;

  // Check if latest drop matches any seat in the monitored watchlist pool
  const monitoredPool = watchedSeats.length > 0 ? watchedSeats : selectedSeats;
  const isTargetDrop = Boolean(
    latestDrop &&
      monitoredPool.some(
        (s) => s.row === latestDrop.seat.row && s.number === latestDrop.seat.number
      )
  );

  const handleBack = () => {
    if (stage === 'SEATMAP') {
      setStage('SHOWTIMES');
      setSelectedSeat(null);
      setSelectedSeats([]);
    } else if (stage === 'SHOWTIMES') {
      setStage('CALENDAR');
    }
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
              v10.0.0.2
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            AMC Tysons Corner 16 · PLF Seat Reclamation Engine
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

          <button
            onClick={handleTestPhonePush}
            title="Send test push notification to iPhone & Apple Watch"
            className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-400/40 text-sky-200 hover:from-sky-500/30 hover:to-indigo-500/30 transition font-medium flex items-center gap-1.5 shadow-sm"
            data-testid="test-phone-push-btn"
          >
            📱 Test iPhone Push
          </button>
        </div>
      </header>

      {/* Push Toast Notification */}
      {pushToast && (
        <div className="w-full max-w-5xl mt-3 px-4 py-2.5 rounded-xl bg-sky-950/80 border border-sky-500/40 text-sky-200 text-xs flex items-center justify-between animate-fadeIn backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>{pushToast}</span>
          </div>
          <button
            onClick={() => setPushToast(null)}
            className="text-neutral-400 hover:text-white text-sm px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Venue Banner — always visible */}
      <div className="w-full max-w-5xl mt-4">
        <TheatreSearch />
      </div>

      {/* Breadcrumb Navigation */}
      <nav
        className="w-full max-w-5xl my-5 flex flex-wrap items-center justify-between gap-3 bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-2.5 backdrop-blur-md text-xs"
        aria-label="Booking Pipeline Breadcrumbs"
        data-testid="booking-pipeline-breadcrumbs"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Back button */}
          {stage !== 'CALENDAR' && (
            <button
              onClick={handleBack}
              type="button"
              className="mr-2 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium transition flex items-center gap-1"
              data-testid="pipeline-back-button"
            >
              ← Back
            </button>
          )}

          {/* Fixed venue crumb */}
          <span className="font-semibold text-neutral-300">
            AMC Tysons Corner 16
          </span>

          {/* Breadcrumb: Date */}
          <span className="text-neutral-600">/</span>
          <button
            onClick={() => setStage('CALENDAR')}
            className={`transition ${
              stage === 'CALENDAR'
                ? 'text-amber-400 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
            data-testid="breadcrumb-date"
          >
            {selectedDate || 'Pick a Date'}
          </button>

          {/* Breadcrumb: Showtimes */}
          {selectedDate && (
            <>
              <span className="text-neutral-600">/</span>
              <button
                onClick={() => setStage('SHOWTIMES')}
                className={`transition ${
                  stage === 'SHOWTIMES'
                    ? 'text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
                data-testid="breadcrumb-showtimes"
              >
                {selectedShowtime && selectedMovie
                  ? `${selectedMovie.title} (${selectedShowtime.time})`
                  : 'Showtimes'}
              </button>
            </>
          )}

          {/* Breadcrumb: Seatmap */}
          {selectedShowtime && selectedMovie && (
            <>
              <span className="text-neutral-600">/</span>
              <button
                onClick={() => setStage('SEATMAP')}
                className={`transition ${
                  stage === 'SEATMAP'
                    ? 'text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
                data-testid="breadcrumb-seatmap"
              >
                Seatmap
              </button>
            </>
          )}
        </div>

        <div
          className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider"
          data-testid="current-stage-badge"
        >
          Stage: <span className="text-white font-bold">{stage}</span>
        </div>
      </nav>

      {/* Main Content */}
      <div className="w-full max-w-5xl flex flex-col gap-6">

        {/* Stage: Date Picker */}
        {stage === 'CALENDAR' && (
          <section data-testid="stage-calendar-picker">
            <CalendarPicker
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              minDate={todayStr()}
              maxDate="2026-12-26"
              availableDates={Object.keys(tysonsDb.dates)}
            />
          </section>
        )}

        {/* Stage: Showtime Schedule */}
        {stage === 'SHOWTIMES' && (
          <section data-testid="stage-showtime-schedule" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between text-xs text-neutral-400 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
              <span>
                Date: <strong className="text-white">{selectedDate}</strong>
              </span>
              <button
                onClick={() => setStage('CALENDAR')}
                className="text-amber-400 hover:underline"
              >
                Change Date
              </button>
            </div>

            <ShowtimeSchedule
              theatreId={selectedTheatre.id}
              date={selectedDate}
              selectedShowtimeId={selectedShowtime?.id}
              onSelectShowtime={handleSelectShowtime}
            />
          </section>
        )}

        {/* Stage: Seatmap Canvas */}
        {stage === 'SEATMAP' && (
          <section data-testid="stage-seatmap-canvas" className="flex flex-col gap-6">
            {/* Seatmap Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedMovie?.title || 'Now Showing'}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-normal">
                    {selectedShowtime?.time}
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>
                    {selectedTheatre.name} · {activeAuditorium.name} ({activeAuditorium.totalPhysicalCapacity} physical seats)
                  </span>
                  {liveMetadata?.isLive && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1"
                      data-testid="live-amc-seat-badge"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live AMC Patron Seats ({liveMetadata.availableSeats} Available / {liveMetadata.occupiedSeats} Reserved)
                    </span>
                  )}
                  {isHydrating && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse"
                      data-testid="hydrating-amc-seat-badge"
                    >
                      ⚡ Sniffing Live AMC Seating...
                    </span>
                  )}
                </p>
              </div>

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

            {/* Drop Alert Banner */}
            {latestDrop && (
              <div
                className={`w-full p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse ${
                  isTargetDrop
                    ? 'border-emerald-500/80 bg-emerald-500/15 shadow-xl shadow-emerald-500/20'
                    : 'border-amber-500/50 bg-amber-500/10'
                }`}
                data-testid="reclamation-drop-banner"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{isTargetDrop ? '🎯' : '⚡'}</span>
                  <div>
                    <div
                      className={`text-sm font-bold ${
                        isTargetDrop ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {isTargetDrop ? 'WATCHLIST SEAT OPENED: ' : 'RECLAMATION DROP: '}
                      {latestDrop.movie_title}
                    </div>
                    <div className="text-xs text-neutral-300">
                      Row {latestDrop.seat.row}, Seat {latestDrop.seat.number} vacated! Confidence:{' '}
                      {(latestDrop.drop_probability * 100).toFixed(0)}%
                      {isTargetDrop && (
                        <strong className="text-emerald-300 ml-1.5 font-semibold">
                          ★ Matches your multi-seat watchlist!
                        </strong>
                      )}
                    </div>
                  </div>
                </div>
                <a
                  href={latestDrop.checkout_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition ${
                    isTargetDrop
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/30'
                      : 'bg-amber-500 hover:bg-amber-400 text-black'
                  }`}
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
                onSeatToggle={handleSeatToggle}
                selectedSeat={selectedSeat}
                selectedSeats={selectedSeats}
              />
            </div>

            {/* Multi-Seat Target Watchlist Dock */}
            {selectedSeats.length > 0 && (
              <div
                className="w-full bg-neutral-900/95 border border-sky-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn"
                data-testid="multi-seat-watchlist-dock"
              >
                <div className="flex flex-col gap-1.5 w-full md:w-auto">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      Watchlist Target Pool ({selectedSeats.length} Seats Selected)
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ⚡ Combined Drop Prob: {(effectiveCombinedProb * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedSeats.map((s) => (
                      <span
                        key={`${s.row}-${s.number}`}
                        className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono flex items-center gap-1"
                      >
                        <span>
                          Row {s.row} #{s.number}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSeatToggle(s)}
                          className="text-neutral-400 hover:text-white ml-0.5 font-bold"
                          title="Remove seat from target pool"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={handleSelectPrimeBox}
                    className="text-xs px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 font-medium transition"
                    data-testid="quick-select-prime-btn"
                  >
                    + Prime Box
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSeats([]);
                      setSelectedSeat(null);
                    }}
                    className="text-xs px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAlertModalOpen(true)}
                    className="text-xs px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
                    data-testid="arm-watchlist-btn"
                  >
                    <span>🔔</span>
                    <span>Arm Watchlist ({selectedSeats.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Selected Seat Alert Modal & Inspector */}
            {(isAlertModalOpen || (selectedSeat && selectedSeats.length <= 1)) && (
              <SeatAlertModal
                seat={selectedSeat}
                seats={selectedSeats}
                showtime={selectedShowtime}
                movie={selectedMovie}
                theatreName={selectedTheatre.name}
                auditoriumName={activeAuditorium.name}
                onClose={() => {
                  setIsAlertModalOpen(false);
                  setSelectedSeat(null);
                }}
                onArmAlerts={(armed) => {
                  setWatchedSeats(armed);
                }}
              />
            )}
          </section>
        )}
      </div>
    </main>
  );
}
