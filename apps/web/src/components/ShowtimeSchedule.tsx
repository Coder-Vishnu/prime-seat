// apps/web/src/components/ShowtimeSchedule.tsx
'use client';

import React, { useState, useMemo } from 'react';
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
  { id: 'PRIME', label: 'Prime at AMC', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: '4DX', label: '4DX at AMC', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
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

  // Filter showtimes for the target theatre and date
  const filteredShowtimes = useMemo(() => {
    return showtimes.filter((st) => {
      if (theatreId && st.theatreId !== theatreId) return false;
      if (date && st.date !== date) return false;
      if (selectedFormat !== 'ALL' && st.format !== selectedFormat) return false;
      return true;
    });
  }, [showtimes, theatreId, date, selectedFormat]);

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
    return movies.filter((movie) => {
      const stList = movieShowtimesMap.get(movie.id);
      return stList && stList.length > 0;
    });
  }, [movies, movieShowtimesMap]);

  return (
    <div
      className={`w-full flex flex-col gap-6 text-neutral-100 ${className}`}
      data-testid="showtime-schedule-container"
    >
      {/* Header & PLF Format Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div>
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

      {/* Movies & Showtime Catalog */}
      {visibleMovies.length > 0 ? (
        <div className="flex flex-col gap-6" data-testid="movies-list">
          {visibleMovies.map((movie) => {
            const movieShowtimes = movieShowtimesMap.get(movie.id) || [];

            return (
              <div
                key={movie.id}
                className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row gap-6 transition hover:border-neutral-700/80"
                data-testid={`movie-card-${movie.id}`}
              >
                {/* Movie Poster & Metadata */}
                <div className="flex sm:flex-col items-start gap-4 sm:gap-3 flex-shrink-0 sm:w-44">
                  <div className="relative w-28 h-40 sm:w-44 sm:h-64 rounded-xl overflow-hidden bg-neutral-800 border border-neutral-700/60 shadow-lg flex-shrink-0">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/20 text-[10px] font-bold text-white tracking-wider">
                      {movie.rating}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 sm:hidden">
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span>{formatRuntime(movie.runtimeMinutes)}</span>
                      <span>•</span>
                      <span>{movie.genre}</span>
                    </div>
                  </div>
                </div>

                {/* Showtimes Grid & Details */}
                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="hidden sm:flex sm:items-start justify-between gap-3 border-b border-neutral-800/70 pb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white leading-tight">
                          {movie.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-medium">
                            {movie.rating}
                          </span>
                          <span>{formatRuntime(movie.runtimeMinutes)}</span>
                          <span>•</span>
                          <span>{movie.genre}</span>
                        </div>
                      </div>

                      {movie.releaseYear && (
                        <span className="text-xs text-neutral-500 font-mono">
                          {movie.releaseYear}
                        </span>
                      )}
                    </div>

                    {movie.synopsis && (
                      <p className="text-xs text-neutral-400 mt-3 line-clamp-2 leading-relaxed">
                        {movie.synopsis}
                      </p>
                    )}
                  </div>

                  {/* Showtime Pills */}
                  <div className="flex flex-col gap-3 mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                      <span>Screenings ({movieShowtimes.length})</span>
                      <span className="h-px flex-1 bg-neutral-800" />
                    </div>

                    <div className="flex flex-wrap gap-3" data-testid={`showtimes-grid-${movie.id}`}>
                      {movieShowtimes.map((st) => {
                        const isSelected = selectedShowtimeId === st.id;
                        const isSoldOut = st.availableSeats === 0;
                        const isLowPrime = st.primeAvailableSeats > 0 && st.primeAvailableSeats <= 5;

                        // Format Badge Colors
                        const formatBadgeClass =
                          st.format === 'DOLBY_CINEMA'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : st.format === 'IMAX_LASER'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : st.format === 'PRIME'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : st.format === '4DX'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : st.format === 'REALD_3D'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-neutral-700/40 text-neutral-300 border-neutral-700/60';

                        return (
                          <button
                            key={st.id}
                            type="button"
                            disabled={isSoldOut}
                            onClick={() => !isSoldOut && onSelectShowtime(st, movie)}
                            data-testid={`showtime-pill-${st.id}`}
                            className={`group relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 select-none ${
                              isSoldOut
                                ? 'bg-neutral-900/40 border-neutral-800 text-neutral-600 cursor-not-allowed opacity-50'
                                : isSelected
                                ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20 scale-105'
                                : 'bg-neutral-800/80 border-neutral-700/80 hover:bg-neutral-700/80 hover:border-neutral-600 text-neutral-100 hover:scale-[1.02]'
                            }`}
                          >
                            {/* Time & Format Header */}
                            <div className="flex items-center justify-between w-full gap-3">
                              <span
                                className={`text-sm font-bold tracking-tight ${
                                  isSelected ? 'text-amber-300' : 'text-white'
                                }`}
                              >
                                {st.time}
                              </span>

                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${formatBadgeClass}`}
                              >
                                {st.format === 'DOLBY_CINEMA'
                                  ? 'Dolby'
                                  : st.format === 'IMAX_LASER'
                                  ? 'IMAX'
                                  : st.format === 'PRIME'
                                  ? 'Prime'
                                  : st.format === '4DX'
                                  ? '4DX'
                                  : st.format === 'REALD_3D'
                                  ? '3D'
                                  : 'Laser'}
                              </span>
                            </div>

                            {/* Auditorium Info */}
                            <div className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
                              {st.auditoriumName}
                            </div>

                            {/* Vacancy / Prime Drop Badge */}
                            <div className="mt-2.5 w-full flex items-center justify-between gap-2">
                              {isSoldOut ? (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-400 uppercase tracking-wide"
                                  data-testid={`badge-sold-out-${st.id}`}
                                >
                                  Sold Out
                                </span>
                              ) : isLowPrime ? (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 uppercase tracking-wide flex items-center gap-1 animate-pulse"
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
      ) : (
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
      )}
    </div>
  );
};
