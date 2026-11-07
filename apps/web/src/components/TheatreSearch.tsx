// apps/web/src/components/TheatreSearch.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { AMCTheatre, DMV_AMC_THEATRES, TheatreFormat } from '../data/theatres';

export interface TheatreSearchProps {
  onSelectTheatre: (theatre: AMCTheatre) => void;
  selectedTheatreId?: string;
  theatres?: AMCTheatre[];
}

type FilterOption = 'ALL' | 'DOLBY_CINEMA' | 'IMAX_LASER' | 'PRIME' | 'FLAGSHIP' | 'DINE_IN';

export const TheatreSearch: React.FC<TheatreSearchProps> = ({
  onSelectTheatre,
  selectedTheatreId,
  theatres = DMV_AMC_THEATRES,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');

  // Filter theatres based on search query (name, city, zip, region) and format chips
  const filteredTheatres = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return theatres.filter((theatre) => {
      // Query match
      const matchesQuery =
        !q ||
        theatre.name.toLowerCase().includes(q) ||
        theatre.city.toLowerCase().includes(q) ||
        theatre.zip.includes(q) ||
        theatre.region.toLowerCase().includes(q) ||
        theatre.address.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      // Filter chip match
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'FLAGSHIP') return theatre.isFlagship;
      if (activeFilter === 'DOLBY_CINEMA') return theatre.formats.includes('DOLBY_CINEMA');
      if (activeFilter === 'IMAX_LASER') return theatre.formats.includes('IMAX_LASER');
      if (activeFilter === 'PRIME') return theatre.formats.includes('PRIME');
      if (activeFilter === 'DINE_IN') return theatre.formats.includes('DINE_IN');

      return true;
    });
  }, [theatres, searchQuery, activeFilter]);

  const formatFilterLabels: { id: FilterOption; label: string }[] = [
    { id: 'ALL', label: 'All DMV Theatres' },
    { id: 'DOLBY_CINEMA', label: 'Dolby Cinema' },
    { id: 'IMAX_LASER', label: 'IMAX with Laser' },
    { id: 'PRIME', label: 'Prime at AMC' },
    { id: 'FLAGSHIP', label: 'Flagship Locations' },
    { id: 'DINE_IN', label: 'Dine-In' },
  ];

  return (
    <div className="w-full flex flex-col gap-6" data-testid="theatre-search-container">
      {/* Search Bar & Instant Filter Controls */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          {/* Search Icon */}
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            type="text"
            role="searchbox"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search DMV AMC theatres by name, city, zip code (e.g. McLean, Tysons, 20007)..."
            className="w-full pl-11 pr-10 py-3 bg-neutral-900/90 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all text-sm shadow-inner"
            data-testid="theatre-search-input"
          />

          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-200 transition"
              aria-label="Clear search"
              data-testid="theatre-search-clear"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Format Filter Chips */}
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Format filters">
          {formatFilterLabels.map(({ id, label }) => {
            const isActive = activeFilter === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(id)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm'
                    : 'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:border-neutral-700'
                }`}
                data-testid={`filter-chip-${id.toLowerCase()}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span data-testid="theatre-results-count">
          Showing <strong className="text-neutral-200">{filteredTheatres.length}</strong> of{' '}
          {theatres.length} premier DMV theatres
        </span>
        {activeFilter !== 'ALL' && (
          <span className="font-mono text-sky-400">
            Filtered by: {formatFilterLabels.find((f) => f.id === activeFilter)?.label}
          </span>
        )}
      </div>

      {/* Theatres Grid */}
      {filteredTheatres.length === 0 ? (
        <div
          className="w-full p-8 text-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/30 text-neutral-400 text-sm"
          data-testid="no-theatres-found"
        >
          <p className="font-semibold text-neutral-300">No AMC theatres found</p>
          <p className="text-xs text-neutral-500 mt-1">
            Try adjusting your search query or format filter criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveFilter('ALL');
            }}
            className="mt-3 px-3 py-1.5 text-xs bg-neutral-800 text-neutral-200 rounded-lg hover:bg-neutral-700 transition"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="theatres-grid">
          {filteredTheatres.map((theatre) => {
            const isSelected = selectedTheatreId === theatre.id;

            return (
              <div
                key={theatre.id}
                data-testid={`theatre-card-${theatre.id}`}
                className={`group flex flex-col justify-between p-5 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'bg-neutral-900 border-sky-500 ring-1 ring-sky-500/50 shadow-lg shadow-sky-950/30'
                    : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
              >
                {/* Header: Name, City & Flagship Badge */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition">
                        {theatre.name}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {theatre.address}, {theatre.city}, {theatre.state} {theatre.zip}
                      </p>
                    </div>

                    {theatre.isFlagship && (
                      <span className="shrink-0 text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Flagship
                      </span>
                    )}
                  </div>

                  {/* Format Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {theatre.formats.map((fmt) => (
                      <FormatBadge key={fmt} format={fmt} />
                    ))}
                    {theatre.hasRecliners && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                        Recliners
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-800">
                      {theatre.screenCount} Screens
                    </span>
                  </div>
                </div>

                {/* Footer: Region & CTA */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-800/60">
                  <span className="text-xs font-mono text-neutral-500">{theatre.region}</span>

                  <button
                    onClick={() => onSelectTheatre(theatre)}
                    data-testid={`select-theatre-btn-${theatre.id}`}
                    className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                      isSelected
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'bg-neutral-800 text-neutral-200 hover:bg-sky-500 hover:text-white border border-neutral-700 hover:border-sky-500'
                    }`}
                  >
                    <span>{isSelected ? 'Selected' : 'View Showtimes'}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const FormatBadge: React.FC<{ format: TheatreFormat }> = ({ format }) => {
  switch (format) {
    case 'DOLBY_CINEMA':
      return (
        <span className="text-[10px] font-mono font-bold tracking-wide px-2 py-0.5 rounded bg-red-950/50 text-red-300 border border-red-700/50">
          Dolby Cinema
        </span>
      );
    case 'IMAX_LASER':
      return (
        <span className="text-[10px] font-mono font-bold tracking-wide px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-600/50">
          IMAX with Laser
        </span>
      );
    case 'PRIME':
      return (
        <span className="text-[10px] font-mono font-bold tracking-wide px-2 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-600/50">
          Prime
        </span>
      );
    case 'REALD_3D':
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950/40 text-teal-300 border border-teal-700/40">
          RealD 3D
        </span>
      );
    case 'DINE_IN':
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-700/50">
          Dine-In
        </span>
      );
    default:
      return null;
  }
};
