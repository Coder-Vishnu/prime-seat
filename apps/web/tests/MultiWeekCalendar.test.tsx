// apps/web/tests/MultiWeekCalendar.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarPicker } from '../src/components/CalendarPicker';
import { getShowtimes, getMovies } from '../src/data/showtimes';
import tysonsDb from '../src/data/tysons_schedule_db.json';

describe('Milestone 10.0 Task 2: Multi-Week Calendar & Dynamic Showtimes', () => {
  it('renders multi-week shortcuts including Dec 18 and Christmas', () => {
    const onSelect = vi.fn();
    render(
      <CalendarPicker
        selectedDate="2026-11-19"
        onSelectDate={onSelect}
        minDate="2026-11-19"
        maxDate="2026-12-26"
        availableDates={Object.keys(tysonsDb.dates)}
      />
    );

    expect(screen.getByTestId('shortcut-today')).toBeInTheDocument();
    expect(screen.getByTestId('shortcut-thanksgiving')).toBeInTheDocument();
    expect(screen.getByTestId('shortcut-dec18')).toBeInTheDocument();
    expect(screen.getByTestId('shortcut-christmas')).toBeInTheDocument();
  });

  it('selects Dec 18 when clicking the Dec 18 shortcut', () => {
    const onSelect = vi.fn();
    render(
      <CalendarPicker
        selectedDate="2026-11-19"
        onSelectDate={onSelect}
        minDate="2026-11-19"
        maxDate="2026-12-26"
      />
    );

    const dec18Btn = screen.getByTestId('shortcut-dec18');
    fireEvent.click(dec18Btn);
    expect(onSelect).toHaveBeenCalledWith('2026-12-18');
  });

  it('allows navigating to December and clicking Christmas Day', () => {
    const onSelect = vi.fn();
    render(
      <CalendarPicker
        selectedDate="2026-11-19"
        onSelectDate={onSelect}
        minDate="2026-11-19"
        maxDate="2026-12-26"
      />
    );

    // Initial month is November 2026
    expect(screen.getByTestId('current-month-heading')).toHaveTextContent('November 2026');

    // Click next month
    const nextBtn = screen.getByTestId('next-month-btn');
    fireEvent.click(nextBtn);

    expect(screen.getByTestId('current-month-heading')).toHaveTextContent('December 2026');

    // Find and click Dec 25
    const dec25Cell = screen.getByTestId('calendar-day-2026-12-25');
    expect(dec25Cell).toBeInTheDocument();
    fireEvent.click(dec25Cell);

    expect(onSelect).toHaveBeenCalledWith('2026-12-25');
  });

  it('provides verified showtimes for The Hunger Games and Ghost Soldier on Nov 19', () => {
    const showtimes = getShowtimes({ date: '2026-11-19' });
    expect(showtimes.length).toBeGreaterThan(0);

    const ghostSoldier = showtimes.find((st) => st.movieId === 'ghost-soldier');
    expect(ghostSoldier).toBeDefined();
    expect(ghostSoldier?.time).toBe('8:35 PM');
    expect(ghostSoldier?.format).toBe('LASER');

    const hungerGames = showtimes.filter((st) => st.movieId.includes('hunger-games'));
    expect(hungerGames.length).toBeGreaterThan(0);
    const imaxSt = hungerGames.find((st) => st.format === 'IMAX_LASER');
    expect(imaxSt).toBeDefined();
  });

  it('provides verified blockbuster showtimes for Dune 3 and Avengers on Dec 18', () => {
    const showtimes = getShowtimes({ date: '2026-12-18' });
    expect(showtimes.length).toBeGreaterThan(0);

    const dune = showtimes.filter((st) => st.movieId.includes('dune'));
    expect(dune.length).toBeGreaterThan(0);

    const avengers = showtimes.filter((st) => st.movieId.includes('avengers'));
    expect(avengers.length).toBeGreaterThan(0);
  });

  it('matches showtimes under both amc-tysons-16 and amc-tysons-corner-16 without dropping', () => {
    const listCanonical = getShowtimes({ date: '2026-11-19', theatreId: 'amc-tysons-16' });
    expect(listCanonical.length).toBeGreaterThanOrEqual(50);

    const listSlug = getShowtimes({ date: '2026-11-19', theatreId: 'amc-tysons-corner-16' });
    expect(listSlug.length).toBe(listCanonical.length);
  });
});
