// apps/web/src/components/SeatAlertModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { SeatData } from '../hooks/useAuditoriumStream';
import { Showtime, Movie } from '../data/showtimes';

export interface SavedAlert {
  id: string;
  showtimeId: string;
  movieTitle: string;
  showtime: string;
  format: string;
  auditoriumName: string;
  row: string;
  seatNumber: number;
  isPrime: boolean;
  dropProbability?: number;
  createdAt: string;
}

export interface SeatAlertModalProps {
  seat: SeatData | null;
  showtime: Showtime | null;
  movie: Movie | null;
  theatreName?: string;
  auditoriumName?: string;
  onClose: () => void;
}

const STORAGE_KEY = 'prime-seat:alerts';

export function getSavedAlerts(): SavedAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAlert(alert: SavedAlert): void {
  if (typeof window === 'undefined') return;
  const list = getSavedAlerts();
  const exists = list.some(
    (a) => a.showtimeId === alert.showtimeId && a.row === alert.row && a.seatNumber === alert.seatNumber
  );
  if (!exists) {
    list.push(alert);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export function removeAlert(showtimeId: string, row: string, seatNumber: number): void {
  if (typeof window === 'undefined') return;
  const list = getSavedAlerts().filter(
    (a) => !(a.showtimeId === showtimeId && a.row === row && a.seatNumber === seatNumber)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const SeatAlertModal: React.FC<SeatAlertModalProps> = ({
  seat,
  showtime,
  movie,
  theatreName = 'AMC Tysons Corner 16',
  auditoriumName,
  onClose,
}) => {
  const [isAlertSet, setIsAlertSet] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!seat || !showtime) return;
    const list = getSavedAlerts();
    const exists = list.some(
      (a) => a.showtimeId === showtime.id && a.row === seat.row && a.seatNumber === seat.number
    );
    setIsAlertSet(exists);
  }, [seat, showtime]);

  if (!seat || !showtime) return null;

  const handleToggleAlert = () => {
    if (isAlertSet) {
      removeAlert(showtime.id, seat.row, seat.number);
      setIsAlertSet(false);
      setToastMessage('Alert removed.');
    } else {
      const newAlert: SavedAlert = {
        id: `${showtime.id}-${seat.row}-${seat.number}`,
        showtimeId: showtime.id,
        movieTitle: movie?.title || 'Feature Movie',
        showtime: showtime.time,
        format: showtime.format,
        auditoriumName: auditoriumName || showtime.auditoriumName,
        row: seat.row,
        seatNumber: seat.number,
        isPrime: seat.is_prime,
        dropProbability: seat.drop_probability,
        createdAt: new Date().toISOString(),
      };
      saveAlert(newAlert);
      setIsAlertSet(true);
      setToastMessage(`⚡ Alert set for Row ${seat.row}, Seat ${seat.number}!`);
    }

    setTimeout(() => setToastMessage(null), 3000);
  };

  const isOccupied = seat.status === 'OCCUPIED';
  const isAvailable = seat.status === 'AVAILABLE';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      data-testid="seat-alert-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-700/80 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-5"
        data-testid="seat-alert-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">
                Row {seat.row}, Seat {seat.number}
              </span>
              {seat.is_prime && (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  PRIME SIGHTLINE
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {movie?.title} · {showtime.time} ({showtime.format.replace('_', ' ')})
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {theatreName} · {auditoriumName || showtime.auditoriumName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition text-sm"
            data-testid="close-seat-modal"
          >
            ✕
          </button>
        </div>

        {/* Seat Status & Churn Analytics Box */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Current Occupancy</span>
            <span
              className={`font-bold px-2 py-0.5 rounded ${
                isAvailable
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isOccupied
                  ? 'bg-slate-700/40 text-slate-300 border border-slate-700'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {seat.status}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Hardware Profile</span>
            <span className="font-medium text-neutral-200">{seat.seat_type}</span>
          </div>

          {seat.drop_probability !== undefined && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                  <span>🎯</span> Churn Cancellation Probability
                </span>
                <span className="font-mono font-bold text-amber-400">
                  {(seat.drop_probability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 via-amber-500 to-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(seat.drop_probability * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Toast confirmation */}
        {toastMessage && (
          <div
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse text-center"
            data-testid="alert-toast-message"
          >
            {toastMessage}
          </div>
        )}

        {/* Action CTAs */}
        <div className="flex flex-col gap-2 pt-2">
          {isOccupied && (
            <button
              onClick={handleToggleAlert}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wide transition shadow-lg flex items-center justify-center gap-2 ${
                isAlertSet
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30'
                  : 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20'
              }`}
              data-testid="toggle-drop-alert-btn"
            >
              {isAlertSet ? (
                <>
                  <span>✓</span> Alert Active — Cancel Alert
                </>
              ) : (
                <>
                  <span>⚡</span> Set Churn Reclamation Alert
                </>
              )}
            </button>
          )}

          {isAvailable && (
            <a
              href={showtime.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wide bg-emerald-500 hover:bg-emerald-400 text-black text-center transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              data-testid="book-now-cta"
            >
              <span>🎟</span> Book Seat Now on AMC Theatres ↗
            </a>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-neutral-400 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
