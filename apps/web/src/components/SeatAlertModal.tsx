// apps/web/src/components/SeatAlertModal.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  seat?: SeatData | null;
  seats?: SeatData[];
  showtime: Showtime | null;
  movie: Movie | null;
  theatreName?: string;
  auditoriumName?: string;
  onClose: () => void;
  onArmAlerts?: (armedSeats: SeatData[]) => void;
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
  seats,
  showtime,
  movie,
  theatreName = 'AMC Tysons Corner 16',
  auditoriumName,
  onClose,
  onArmAlerts,
}) => {
  const [isAlertSet, setIsAlertSet] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const targetSeats: SeatData[] = useMemo(() => {
    if (seats && seats.length > 0) return seats;
    if (seat) return [seat];
    return [];
  }, [seats, seat]);

  const isMulti = targetSeats.length > 1;
  const singleSeat = targetSeats[0];

  // Combined drop probability: 1 - product(1 - p_i)
  const combinedDropProbability = useMemo(() => {
    if (targetSeats.length === 0) return 0;
    const missProb = targetSeats.reduce((acc, s) => {
      const p = s.drop_probability !== undefined ? s.drop_probability : 0.35;
      return acc * (1 - p);
    }, 1);
    return Math.min(1 - missProb, 0.99);
  }, [targetSeats]);

  useEffect(() => {
    if (targetSeats.length === 0 || !showtime) return;
    const list = getSavedAlerts();
    if (isMulti) {
      const hasAny = targetSeats.some((s) =>
        list.some((a) => a.showtimeId === showtime.id && a.row === s.row && a.seatNumber === s.number)
      );
      setIsAlertSet(hasAny);
    } else if (singleSeat) {
      const exists = list.some(
        (a) => a.showtimeId === showtime.id && a.row === singleSeat.row && a.seatNumber === singleSeat.number
      );
      setIsAlertSet(exists);
    }
  }, [targetSeats, showtime, isMulti, singleSeat]);

  if (targetSeats.length === 0 || !showtime) return null;

  const handleToggleAlert = () => {
    if (isAlertSet) {
      targetSeats.forEach((s) => {
        removeAlert(showtime.id, s.row, s.number);
      });
      setIsAlertSet(false);
      setToastMessage(isMulti ? 'Watchlist alerts removed.' : 'Alert removed.');
      if (onArmAlerts) onArmAlerts([]);
    } else {
      targetSeats.forEach((s) => {
        const newAlert: SavedAlert = {
          id: `${showtime.id}-${s.row}-${s.number}`,
          showtimeId: showtime.id,
          movieTitle: movie?.title || 'Feature Movie',
          showtime: showtime.time,
          format: showtime.format,
          auditoriumName: auditoriumName || showtime.auditoriumName,
          row: s.row,
          seatNumber: s.number,
          isPrime: s.is_prime,
          dropProbability: s.drop_probability,
          createdAt: new Date().toISOString(),
        };
        saveAlert(newAlert);
      });
      setIsAlertSet(true);
      setToastMessage(
        isMulti
          ? `⚡ Watchlist armed! Monitoring ${targetSeats.length} target seats.`
          : `⚡ Alert set for Row ${singleSeat.row}, Seat ${singleSeat.number}!`
      );
      if (onArmAlerts) onArmAlerts(targetSeats);
    }

    setTimeout(() => setToastMessage(null), 3500);
  };

  const isOccupied = singleSeat?.status === 'OCCUPIED';
  const isAvailable = singleSeat?.status === 'AVAILABLE';

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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-black text-white">
                {isMulti
                  ? `Watchlist: ${targetSeats.length} Seats`
                  : `Row ${singleSeat.row}, Seat ${singleSeat.number}`}
              </span>
              {!isMulti && singleSeat?.is_prime && (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  PRIME SIGHTLINE
                </span>
              )}
              {isMulti && (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  ANY-SEAT ALERT
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

        {/* Multi-seat Target Chips List */}
        {isMulti && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
              Monitored Target Pool ({targetSeats.length} Seats):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {targetSeats.map((s) => (
                <span
                  key={`${s.row}-${s.number}`}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-medium flex items-center gap-1 ${
                    s.is_prime
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-200'
                  }`}
                >
                  <span>
                    Row {s.row} #{s.number}
                  </span>
                  {s.is_prime && <span className="text-[9px] text-sky-400">★</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Seat Status & Churn Analytics Box */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 flex flex-col gap-3">
          {!isMulti ? (
            <>
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
                  {singleSeat.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Hardware Profile</span>
                <span className="font-medium text-neutral-200">{singleSeat.seat_type}</span>
              </div>

              {singleSeat.drop_probability !== undefined && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                      <span>🎯</span> Churn Cancellation Probability
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {(singleSeat.drop_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 via-amber-500 to-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(singleSeat.drop_probability * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                  <span>🎯</span> Combined Watchlist Drop Probability
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {(combinedDropProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 via-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(combinedDropProbability * 100, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                By targeting <strong className="text-white">{targetSeats.length} seats</strong>{' '}
                simultaneously, your probability of securing a prime seat jumps from ~
                {((targetSeats[0]?.drop_probability || 0.35) * 100).toFixed(0)}% to{' '}
                <strong className="text-emerald-300">
                  {(combinedDropProbability * 100).toFixed(0)}%
                </strong>
                . An alert triggers the moment <em>any one</em> of these seats drops!
              </p>
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
          {(isOccupied || isMulti) && (
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
                  <span>✓</span> {isMulti ? 'Watchlist Active — Cancel Alerts' : 'Alert Active — Cancel Alert'}
                </>
              ) : (
                <>
                  <span>⚡</span> {isMulti ? `Set Watchlist Alert (${targetSeats.length} Seats)` : 'Set Churn Reclamation Alert'}
                </>
              )}
            </button>
          )}

          {!isMulti && isAvailable && (
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
