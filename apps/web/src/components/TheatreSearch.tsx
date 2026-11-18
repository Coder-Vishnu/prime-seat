// apps/web/src/components/TheatreSearch.tsx
// Task 1 (9.0): Repurposed from multi-theatre search into a static Tysons Corner 16 venue banner.
'use client';

import React from 'react';
import { TYSONS_THEATRE, AMCTheatre } from '../data/theatres';

const FORMAT_BADGE_STYLES: Record<string, string> = {
  DOLBY_CINEMA: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  IMAX_LASER: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  '4DX': 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  PRIME: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  REALD_3D: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  LASER: 'bg-neutral-700/40 text-neutral-300 border border-neutral-700/60',
};

const FORMAT_LABELS: Record<string, string> = {
  DOLBY_CINEMA: 'Dolby Cinema',
  IMAX_LASER: 'IMAX with Laser',
  '4DX': '4DX',
  PRIME: 'Prime at AMC',
  REALD_3D: 'RealD 3D',
  LASER: 'Laser at AMC',
};

export interface TheatreSearchProps {
  onSelectTheatre?: (theatre: AMCTheatre) => void;
  selectedTheatreId?: string;
}

/**
 * TysonsBanner — Static venue header for AMC Tysons Corner 16.
 * Replaces the former multi-theatre TheatreSearch component now that
 * Prime Seat is scoped exclusively to this single venue.
 */
export const TheatreSearch: React.FC<TheatreSearchProps> = ({ onSelectTheatre, selectedTheatreId }) => {
  const t = TYSONS_THEATRE;
  return (
    <div
      className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 flex flex-col gap-5"
      data-testid="tysons-venue-banner"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-white tracking-tight">{t.name}</h2>
            {t.isFlagship && (
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
                Flagship
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {t.address} · {t.city}, {t.state} {t.zip}
          </p>
          {t.phone && (
            <p className="text-xs text-neutral-500 mt-0.5">{t.phone}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-neutral-400">
          <span>{t.screenCount} Screens · Recliners</span>
          <a
            href={`https://www.amctheatres.com/movie-theatres/${t.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:underline"
          >
            AMC Theatre Page ↗
          </a>
        </div>
      </div>

      {/* PLF Format Badges */}
      <div className="flex flex-wrap gap-2">
        {t.formats.map((fmt) => (
          <span
            key={fmt}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${FORMAT_BADGE_STYLES[fmt] ?? 'bg-neutral-800 text-neutral-400'}`}
          >
            {FORMAT_LABELS[fmt] ?? fmt}
          </span>
        ))}
      </div>

      {/* PLF Auditorium Quick Reference */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          { aud: 'Aud 11', fmt: 'Dolby Cinema', seats: '262 seats', style: 'border-amber-500/30 bg-amber-500/5' },
          { aud: 'Aud 9', fmt: 'Dolby Cinema', seats: '161 seats', style: 'border-amber-500/30 bg-amber-500/5' },
          { aud: 'Aud 3', fmt: 'IMAX with Laser', seats: '350 seats', style: 'border-sky-500/30 bg-sky-500/5' },
          { aud: 'Aud 2', fmt: '4DX', seats: '125 seats', style: 'border-rose-500/30 bg-rose-500/5' },
        ].map(({ aud, fmt, seats, style }) => (
          <div
            key={aud}
            className={`rounded-xl border p-3 flex flex-col gap-1 ${style}`}
          >
            <span className="font-bold text-white">{aud}</span>
            <span className="text-neutral-300">{fmt}</span>
            <span className="text-neutral-500">{seats}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
