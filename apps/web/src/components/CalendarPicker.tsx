// apps/web/src/components/CalendarPicker.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';

export interface CalendarPickerProps {
  selectedDate: string; // Format: YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  availableDates?: string[]; // Specific dates with available showtimes
  minDate?: string; // Minimum selectable date (YYYY-MM-DD), defaults to today
  maxDate?: string; // Maximum selectable date (YYYY-MM-DD)
  className?: string;
}

/** Formats a Date object to YYYY-MM-DD using local time */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a YYYY-MM-DD string into a local Date object */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Adds N days to a date */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Gets the upcoming day of the week (0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat) */
function getUpcomingDayOfWeek(baseDate: Date, targetDay: number): Date {
  const currentDay = baseDate.getDay();
  let diff = targetDay - currentDay;
  if (diff < 0) {
    diff += 7;
  }
  return addDays(baseDate, diff);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
  availableDates,
  minDate,
  maxDate,
  className = '',
}) => {
  // Compute baseline dates
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDate(today), [today]);
  const effectiveMinDate = minDate ?? todayStr;

  // View state: Year and Month currently displayed (0-11)
  const initialDate = useMemo(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return parseDate(selectedDate);
    }
    return parseDate(effectiveMinDate);
  }, [selectedDate, effectiveMinDate]);

  const [viewYear, setViewYear] = useState<number>(() => initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => initialDate.getMonth());

  // Sync view month when selectedDate changes significantly
  useEffect(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const parsed = parseDate(selectedDate);
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [selectedDate]);

  // Compute navigation boundaries
  const canGoPrev = useMemo(() => {
    const minParsed = parseDate(effectiveMinDate);
    const minYear = minParsed.getFullYear();
    const minMonth = minParsed.getMonth();
    return viewYear > minYear || (viewYear === minYear && viewMonth > minMonth);
  }, [viewYear, viewMonth, effectiveMinDate]);

  const canGoNext = useMemo(() => {
    if (!maxDate) return true;
    const maxParsed = parseDate(maxDate);
    const maxYear = maxParsed.getFullYear();
    const maxMonth = maxParsed.getMonth();
    return viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);
  }, [viewYear, viewMonth, maxDate]);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Shortcut date calculations based on effectiveMinDate (or today)
  const shortcuts = useMemo(() => {
    const base = parseDate(effectiveMinDate);
    const tomorrow = addDays(base, 1);
    const friday = getUpcomingDayOfWeek(base, 5);
    const saturday = getUpcomingDayOfWeek(base, 6);
    const sunday = getUpcomingDayOfWeek(base, 0);

    const list = [
      { id: 'today', label: 'Today', dateStr: formatDate(base) },
      { id: 'tomorrow', label: 'Tomorrow', dateStr: formatDate(tomorrow) },
      { id: 'friday', label: 'This Friday', dateStr: formatDate(friday) },
      { id: 'saturday', label: 'This Saturday', dateStr: formatDate(saturday) },
      { id: 'sunday', label: 'This Sunday', dateStr: formatDate(sunday) },
    ];

    // Add multi-week blockbuster anchors if within horizon
    if (effectiveMinDate <= '2026-11-26' && (!maxDate || maxDate >= '2026-11-26')) {
      list.push({ id: 'thanksgiving', label: 'Thanksgiving', dateStr: '2026-11-26' });
    }
    if (effectiveMinDate <= '2026-12-18' && (!maxDate || maxDate >= '2026-12-18')) {
      list.push({ id: 'dec18', label: 'Dec 18 (Dune / HG)', dateStr: '2026-12-18' });
    }
    if (effectiveMinDate <= '2026-12-25' && (!maxDate || maxDate >= '2026-12-25')) {
      list.push({ id: 'christmas', label: 'Christmas Day', dateStr: '2026-12-25' });
    }

    return list;
  }, [effectiveMinDate]);

  // Calendar days grid generation
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    interface CellData {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isPast: boolean;
      isSelected: boolean;
      isToday: boolean;
      hasShowtimes: boolean;
    }

    const cells: CellData[] = [];

    // 1. Previous month trailing padding days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      const dateStr = formatDate(prevDate);
      const isPast = dateStr < effectiveMinDate;
      const hasShowtimes = availableDates ? availableDates.includes(dateStr) : !isPast;

      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isPast,
        isSelected: dateStr === selectedDate,
        isToday: dateStr === todayStr,
        hasShowtimes,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = dateStr < effectiveMinDate;
      const isBeyondMax = maxDate ? dateStr > maxDate : false;
      const disabled = isPast || isBeyondMax;
      const hasShowtimes = availableDates ? availableDates.includes(dateStr) : !disabled;

      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isPast: disabled,
        isSelected: dateStr === selectedDate,
        isToday: dateStr === todayStr,
        hasShowtimes,
      });
    }

    // 3. Next month leading padding days to complete grid rows
    const totalRemaining = (7 - (cells.length % 7)) % 7;
    for (let n = 1; n <= totalRemaining; n++) {
      const nextDate = new Date(viewYear, viewMonth + 1, n);
      const dateStr = formatDate(nextDate);
      const isBeyondMax = maxDate ? dateStr > maxDate : false;
      const hasShowtimes = availableDates ? availableDates.includes(dateStr) : !isBeyondMax;

      cells.push({
        dateStr,
        dayNumber: n,
        isCurrentMonth: false,
        isPast: false,
        isSelected: dateStr === selectedDate,
        isToday: dateStr === todayStr,
        hasShowtimes,
      });
    }

    return cells;
  }, [viewYear, viewMonth, effectiveMinDate, maxDate, selectedDate, todayStr, availableDates]);

  const handleDateClick = (dateStr: string, isPast: boolean) => {
    if (isPast) return;
    onSelectDate(dateStr);
  };

  const handleShortcutClick = (dateStr: string) => {
    onSelectDate(dateStr);
    const parsed = parseDate(dateStr);
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());
  };

  return (
    <div
      className={`w-full bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-neutral-100 flex flex-col gap-6 ${className}`}
      data-testid="calendar-picker-container"
    >
      {/* Header with Title and Current Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Select Showtime Date
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Choose screening day or pick a quick shortcut to filter PLF showtimes
          </p>
        </div>

        {selectedDate && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium self-start sm:self-auto"
            data-testid="selected-date-badge"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        )}
      </div>

      {/* Quick Access Shortcut Pills */}
      <div className="flex flex-wrap items-center gap-2" data-testid="calendar-shortcuts">
        <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mr-1">
          Quick:
        </span>
        {shortcuts.map((shortcut) => {
          const isActive = selectedDate === shortcut.dateStr;
          return (
            <button
              key={shortcut.id}
              onClick={() => handleShortcutClick(shortcut.dateStr)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                isActive
                  ? 'bg-amber-500 text-black border-amber-400 font-semibold shadow-md shadow-amber-500/20 scale-105'
                  : 'bg-neutral-800/80 text-neutral-300 border-neutral-700/80 hover:bg-neutral-700 hover:text-white hover:border-neutral-600'
              }`}
              data-testid={`shortcut-${shortcut.id}`}
              type="button"
            >
              {shortcut.label}
            </button>
          );
        })}
      </div>

      {/* Month Navigation Controls */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          className={`p-2 rounded-xl border transition flex items-center justify-center ${
            canGoPrev
              ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-600 active:scale-95'
              : 'border-neutral-800/50 bg-neutral-900/50 text-neutral-600 cursor-not-allowed opacity-40'
          }`}
          aria-label="Previous Month"
          data-testid="prev-month-btn"
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h3
          className="text-base font-semibold text-neutral-100 tracking-wide"
          data-testid="current-month-heading"
        >
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h3>

        <button
          onClick={handleNextMonth}
          disabled={!canGoNext}
          className={`p-2 rounded-xl border transition flex items-center justify-center ${
            canGoNext
              ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-600 active:scale-95'
              : 'border-neutral-800/50 bg-neutral-900/50 text-neutral-600 cursor-not-allowed opacity-40'
          }`}
          aria-label="Next Month"
          data-testid="next-month-btn"
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday Labels Header */}
      <div className="grid grid-cols-7 gap-1 text-center border-b border-neutral-800/60 pb-2">
        {WEEKDAY_NAMES.map((day, idx) => (
          <div
            key={day + idx}
            className={`text-xs font-semibold uppercase tracking-wider ${
              idx === 0 || idx === 6 ? 'text-amber-400/80' : 'text-neutral-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days 7-Column Grid */}
      <div
        className="grid grid-cols-7 gap-1.5 sm:gap-2"
        role="grid"
        aria-label="Screening Calendar Grid"
        data-testid="calendar-days-grid"
      >
        {calendarCells.map((cell) => {
          const { dateStr, dayNumber, isCurrentMonth, isPast, isSelected, isToday, hasShowtimes } = cell;

          return (
            <button
              key={dateStr}
              type="button"
              role="gridcell"
              aria-label={dateStr}
              aria-selected={isSelected}
              disabled={isPast}
              onClick={() => handleDateClick(dateStr, isPast)}
              data-testid={`calendar-day-${dateStr}`}
              className={`relative flex flex-col items-center justify-center min-h-[52px] sm:min-h-[58px] p-1.5 rounded-xl transition-all duration-150 border text-sm select-none ${
                isPast
                  ? 'bg-neutral-900/40 border-neutral-800/30 text-neutral-600 cursor-not-allowed opacity-35'
                  : isSelected
                  ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-neutral-950 font-bold border-amber-300 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400 scale-[1.03] z-10'
                  : isToday
                  ? 'bg-neutral-800/90 border-sky-500/80 text-sky-300 font-semibold hover:bg-neutral-700/80 hover:border-sky-400'
                  : isCurrentMonth
                  ? 'bg-neutral-800/50 border-neutral-800 hover:bg-neutral-700/70 hover:border-neutral-600 text-neutral-200'
                  : 'bg-neutral-900/30 border-neutral-800/40 text-neutral-500 hover:bg-neutral-800/40 hover:text-neutral-300'
              }`}
            >
              {/* Day Number */}
              <span className="text-xs sm:text-sm leading-tight">{dayNumber}</span>

              {/* Today indicator dot if not selected */}
              {isToday && !isSelected && (
                <span className="text-[9px] uppercase tracking-tighter text-sky-400 font-bold leading-none mt-0.5">
                  Today
                </span>
              )}

              {/* Scheduled PLF showtime density dots */}
              {!isPast && hasShowtimes && (
                <div
                  className="flex items-center justify-center gap-1 mt-1"
                  data-testid={`density-dots-${dateStr}`}
                >
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isSelected ? 'bg-neutral-950' : 'bg-amber-400'
                    }`}
                    title="Dolby Cinema"
                  />
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isSelected ? 'bg-neutral-950' : 'bg-sky-400'
                    }`}
                    title="IMAX Laser"
                  />
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isSelected ? 'bg-neutral-950' : 'bg-emerald-400'
                    }`}
                    title="Prime"
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Format Legend Indicator */}
      <div className="flex flex-wrap items-center justify-between pt-3 border-t border-neutral-800/80 text-[11px] text-neutral-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Dolby Cinema
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            IMAX with Laser
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Prime at AMC
          </span>
        </div>
        <div className="text-neutral-500 text-[10px]">
          All times in Eastern Time (ET)
        </div>
      </div>
    </div>
  );
};
