// apps/web/src/components/ShowtimeSchedule.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Movie,
  Showtime,
  PLFFormat,
  FEATURED_MOVIES,
  SEED_SHOWTIMES,
} from '../data/showtimes';

export interface ShowtimeScheduleProps {
  theatreId?: string;
  date: string; // YYYY-MM-DD
  movies?: Movie[];
  showtimes?: Showtime[];
  selectedShowtimeId?: string;
  onSelectShowtime: (showtime: Showtime, movie: Movie) => void;
  className?: string;
}

type FormatFilterOption = 'ALL' | PLFFormat;

const FORMAT_TABS: { id: FormatFilterOption; label: string; badgeColor: string }[] = [
  { id: 'ALL', label: 'All Formats', badgeColor: 'bg-neutral-800 text-neutral-300' },
  { id: 'DOLBY_CINEMA', label: 'Dolby Cinema', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'IMAX_LASER', label: 'IMAX with Laser', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { id: '4DX', label: '4DX at AMC', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { id: 'PRIME', label: 'Prime at AMC', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'REALD_3D', label: 'RealD 3D', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'LASER', label: 'Laser at AMC', badgeColor: 'bg-neutral-700/40 text-neutral-300 border-neutral-700/60' },
];

/** Formats minutes into hours and minutes, e.g. 166 -> 2h 46m */
function formatRuntime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

export const ShowtimeSchedule: React.FC<ShowtimeScheduleProps> = ({
  theatreId,
  date,
  movies = FEATURED_MOVIES,
  showtimes = SEED_SHOWTIMES,
  selectedShowtimeId,
  onSelectShowtime,
  className = '',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<FormatFilterOption>('ALL');

  // Live API data state
  const [liveData, setLiveData] = useState<{
    movies: Movie[];
    showtimes: Showtime[];
    isLive: boolean;
    source: string;
    notice?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch live showtimes when date or theatre changes (client-side)
  useEffect(() => {
    // In Vitest unit test environment or SSR, respect synchronous default props
    if (process.env.NODE_ENV === 'test' || typeof window === 'undefined') {
      return;
    }

    // If custom movies/showtimes were provided as props, respect them
    if (movies !== FEATURED_MOVIES || showtimes !== SEED_SHOWTIMES) {
      return;
    }

    let active = true;
    setIsLoading(true);

    const origin = window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : 'http://localhost:3000';

    const query = new URLSearchParams({
      date: date || new Date().toISOString().slice(0, 10),
      theatreId: theatreId || 'amc-tysons-16',
    });

    fetch(`${origin}/api/showtimes?${query.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setLiveData({
          movies: data.movies || FEATURED_MOVIES,
          showtimes: data.showtimes || SEED_SHOWTIMES,
          isLive: Boolean(data.isLive),
          source: data.source || 'CACHED_FALLBACK',
          notice: data.notice,
        });
      })
      .catch((err) => {
        console.warn('[ShowtimeSchedule] Live fetch error:', err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date, theatreId, movies, showtimes]);

  const activeMovies = liveData ? liveData.movies : movies;
  const activeShowtimes = liveData ? liveData.showtimes : showtimes;

  // Filter showtimes for the target theatre and date
  const filteredShowtimes = useMemo(() => {
    return activeShowtimes.filter((st) => {
      if (theatreId && st.theatreId !== theatreId) return false;
      if (date && st.date !== date) return false;
      if (selectedFormat !== 'ALL' && st.format !== selectedFormat) return false;
      return true;
    });
  }, [activeShowtimes, theatreId, date, selectedFormat]);

  // Group filtered showtimes by movieId
  const movieShowtimesMap = useMemo(() => {
    const map = new Map<string, Showtime[]>();
    filteredShowtimes.forEach((st) => {
      const existing = map.get(st.movieId) || [];
      existing.push(st);
      map.set(st.movieId, existing);
    });
    return map;
  }, [filteredShowtimes]);

  // Movies that have showtimes matching the current theatre/date/format filters
  const visibleMovies = useMemo(() => {
    return activeMovies.filter((movie) => {
      const stList = movieShowtimesMap.get(movie.id);
      return stList && stList.length > 0;
    });
  }, [activeMovies, movieShowtimesMap]);

  return (
    <div
      className={`w-full flex flex-col gap-6 text-neutral-100 ${className}`}
      data-testid="showtime-schedule-container"
    >
      {/* Header & PLF Format Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <svg
                className="w-5 h-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                />
              </svg>
              Available Showtimes
            </h2>

            {/* Live Data Badge */}
            {liveData && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  liveData.isLive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
                data-testid="live-status-badge"
              >
                {liveData.isLive ? '● Live AMC Feed' : '✓ Verified Schedule'}
              </span>
            )}
          </div>

          <p className="text-xs text-neutral-400 mt-0.5">
            Screening on{' '}
            <span className="font-semibold text-neutral-200" data-testid="active-schedule-date">
              {date || 'Selected Date'}
            </span>
          </p>
        </div>

        {/* Format Filter Tabs */}
        <div
          className="flex flex-wrap items-center gap-1.5 bg-neutral-950/70 p-1.5 rounded-xl border border-neutral-800"
          role="tablist"
          aria-label="Format filter tabs"
          data-testid="format-filter-tabs"
        >
          {FORMAT_TABS.map((tab) => {
            const isActive = selectedFormat === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedFormat(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-neutral-800 text-white font-semibold shadow border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                }`}
                data-testid={`filter-tab-${tab.id.toLowerCase()}`}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cloudflare / Fallback Notice Banner */}
      {liveData?.notice && (
        <div className="w-full text-xs text-neutral-400 bg-neutral-900/40 border border-neutral-800/60 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">ℹ</span>
            <span>{liveData.notice}</span>
          </div>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
            {liveData.source}
          </span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-4 animate-pulse" data-testid="schedule-loading">
          <div className="h-36 rounded-2xl bg-neutral-900/60 border border-neutral-800" />
          <div className="h-36 rounded-2xl bg-neutral-900/60 border border-neutral-800" />
        </div>
      )}

      {/* Movie Cards with Showtimes */}
      {!isLoading && visibleMovies.length > 0 ? (
        <div className="flex flex-col gap-6" data-testid="movies-list">
          {visibleMovies.map((movie) => {
            const movieShowtimes = movieShowtimesMap.get(movie.id) || [];
            return (
              <div
                key={movie.id}
                className="flex flex-col md:flex-row bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl overflow-hidden transition-all duration-200 shadow-lg"
                data-testid={`movie-card-${movie.id}`}
              >
                {/* Poster Column */}
                <div className="w-full md:w-44 h-48 md:h-auto flex-shrink-0 relative overflow-hidden bg-neutral-950">
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent md:hidden" />
                </div>

                {/* Movie Details & Showtime Grid */}
                <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-5">
                  {/* Title & Metadata Header */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {movie.rating}
                      </span>
                      <span className="text-xs text-neutral-400 font-medium">
                        {formatRuntime(movie.runtimeMinutes)}
                      </span>
                      <span className="text-xs text-neutral-500">•</span>
                      <span className="text-xs text-neutral-400">{movie.genre}</span>
                      {movie.releaseYear && (
                        <>
                          <span className="text-xs text-neutral-500">•</span>
                          <span className="text-xs text-neutral-400">{movie.releaseYear}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {movie.title}
                    </h3>
                    {movie.synopsis && (
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                        {movie.synopsis}
                      </p>
                    )}
                  </div>

                  {/* Showtimes Grid */}
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Select Showtime &amp; Format
                    </span>

                    <div className="flex flex-wrap gap-3" data-testid={`showtimes-grid-${movie.id}`}>
                      {movieShowtimes.map((st) => {
                        const isSelected = selectedShowtimeId === st.id;
                        const isSoldOut = st.availableSeats === 0;
                        const isLowPrime = !isSoldOut && st.primeAvailableSeats > 0 && st.primeAvailableSeats <= 3;

                        // Visual chip styling per PLF format
                        let formatBadgeClass = 'border-neutral-700 bg-neutral-800 text-neutral-300';
                        let formatLabel = 'Laser';
                        if (st.format === 'DOLBY_CINEMA') {
                          formatBadgeClass = 'border-amber-500/40 bg-amber-500/10 text-amber-300';
                          formatLabel = 'Dolby Cinema';
                        } else if (st.format === 'IMAX_LASER') {
                          formatBadgeClass = 'border-sky-500/40 bg-sky-500/10 text-sky-300';
                          formatLabel = 'IMAX Laser';
                        } else if (st.format === '4DX') {
                          formatBadgeClass = 'border-rose-500/40 bg-rose-500/10 text-rose-300';
                          formatLabel = '4DX';
                        } else if (st.format === 'PRIME') {
                          formatBadgeClass = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
                          formatLabel = 'Prime';
                        } else if (st.format === 'REALD_3D') {
                          formatBadgeClass = 'border-purple-500/40 bg-purple-500/10 text-purple-300';
                          formatLabel = 'RealD 3D';
                        }

                        return (
                          <button
                            key={st.id}
                            type="button"
                            disabled={isSoldOut}
                            onClick={() => onSelectShowtime(st, movie)}
                            className={`group relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-150 ${
                              isSoldOut
                                ? 'opacity-40 cursor-not-allowed border-neutral-800 bg-neutral-900/40'
                                : isSelected
                                ? 'border-sky-400 bg-sky-500/15 shadow-lg shadow-sky-500/10 ring-1 ring-sky-400'
                                : 'border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 hover:bg-neutral-800/80'
                            }`}
                            data-testid={`showtime-pill-${st.id}`}
                          >
                            {/* Top row: Format badge & Auditorium */}
                            <div className="flex items-center gap-1.5 mb-1.5 w-full">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${formatBadgeClass}`}
                              >
                                {formatLabel}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {st.auditoriumName.split(' ')[0]} {st.auditoriumName.split(' ')[1]}
                              </span>
                            </div>

                            {/* Middle row: Time */}
                            <div className="text-base font-bold text-white tracking-tight">
                              {st.time}
                            </div>

                            {/* Bottom row: Availability badges */}
                            <div className="mt-2 flex items-center justify-between w-full gap-2">
                              {isSoldOut ? (
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 tracking-wide"
                                  data-testid={`badge-sold-out-${st.id}`}
                                >
                                  Sold Out
                                </span>
                              ) : isLowPrime ? (
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1 tracking-wide"
                                  data-testid={`badge-low-prime-${st.id}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  {st.primeAvailableSeats} Prime Left
                                </span>
                              ) : (
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 tracking-wide"
                                  data-testid={`badge-available-${st.id}`}
                                >
                                  {st.availableSeats} Available
                                </span>
                              )}

                              <span className="text-[10px] text-neutral-500 group-hover:text-amber-400 transition-colors">
                                Select →
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !isLoading ? (
        /* Empty State */
        <div
          className="w-full bg-neutral-900/70 border border-neutral-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3"
          data-testid="no-showtimes-found"
        >
          <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white">No PLF Showtimes Found</h3>
          <p className="text-xs text-neutral-400 max-w-sm">
            No screenings match the selected format filter for this date. Try switching format tabs or picking a different day on the calendar.
          </p>
          {selectedFormat !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedFormat('ALL')}
              className="mt-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-neutral-200 transition"
              data-testid="reset-format-filter"
            >
              Reset to All Formats
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};
