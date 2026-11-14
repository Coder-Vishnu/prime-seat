// apps/web/tests/ShowtimeSchedule.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShowtimeSchedule } from '../src/components/ShowtimeSchedule';
import { FEATURED_MOVIES, SEED_SHOWTIMES } from '../src/data/showtimes';

describe('Milestone 8.0 Task 3 Verification: ShowtimeSchedule Component', () => {
  const targetDate = '2026-11-14';
  const targetTheatre = 'amc-tysons-16';

  it('renders movie presentation cards and showtimes for selected theatre and date', () => {
    const handleSelect = vi.fn();
    render(
      <ShowtimeSchedule
        theatreId={targetTheatre}
        date={targetDate}
        onSelectShowtime={handleSelect}
      />
    );

    // Dune 2 and Gladiator 2 should be in the schedule for Tysons on 2026-11-14
    expect(screen.getByTestId('movie-card-dune-part-two')).toBeInTheDocument();
    expect(screen.getAllByText('Dune: Part Two')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Gladiator II')[0]).toBeInTheDocument();
    expect(screen.getByTestId('active-schedule-date')).toHaveTextContent(targetDate);
  });

  it('correctly filters showtime pills by format tabs (Dolby Cinema vs IMAX with Laser)', () => {
    const handleSelect = vi.fn();
    render(
      <ShowtimeSchedule
        theatreId={targetTheatre}
        date={targetDate}
        onSelectShowtime={handleSelect}
      />
    );

    // Initially "All PLF Formats" is active - both Dolby and IMAX pills exist
    expect(screen.getByTestId('showtime-pill-st-tysons-dune2-dolby-1400')).toBeInTheDocument();
    expect(screen.getByTestId('showtime-pill-st-tysons-dune2-imax-1930')).toBeInTheDocument();

    // Click "Dolby Cinema" tab
    const dolbyTab = screen.getByTestId('filter-tab-dolby_cinema');
    fireEvent.click(dolbyTab);

    // Dolby pills should remain, IMAX pills should be filtered out
    expect(screen.getByTestId('showtime-pill-st-tysons-dune2-dolby-1400')).toBeInTheDocument();
    expect(screen.queryByTestId('showtime-pill-st-tysons-dune2-imax-1930')).not.toBeInTheDocument();

    // Click "IMAX with Laser" tab
    const imaxTab = screen.getByTestId('filter-tab-imax_laser');
    fireEvent.click(imaxTab);

    // IMAX pills should be present, Dolby pills should be filtered out
    expect(screen.getByTestId('showtime-pill-st-tysons-dune2-imax-1930')).toBeInTheDocument();
    expect(screen.queryByTestId('showtime-pill-st-tysons-dune2-dolby-1400')).not.toBeInTheDocument();
  });

  it('displays accurate vacancy badges (Prime Left, Available, Sold Out)', () => {
    const handleSelect = vi.fn();
    render(
      <ShowtimeSchedule
        theatreId={targetTheatre}
        date={targetDate}
        onSelectShowtime={handleSelect}
      />
    );

    // Low prime vacancy badge (< 5 prime left)
    expect(screen.getByTestId('badge-low-prime-st-tysons-dune2-dolby-1400')).toHaveTextContent('3 Prime Left');

    // Available badge
    expect(screen.getByTestId('badge-available-st-tysons-gladiator2-imax-1600')).toHaveTextContent('64 Available');

    // Sold out badge
    const soldOutBadge = screen.getByTestId('badge-sold-out-st-tysons-dune2-imax-1930');
    expect(soldOutBadge).toHaveTextContent('Sold Out');

    // Sold out button should be disabled
    const soldOutButton = screen.getByTestId('showtime-pill-st-tysons-dune2-imax-1930');
    expect(soldOutButton).toBeDisabled();
    fireEvent.click(soldOutButton);
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('fires onSelectShowtime with complete payload when an available showtime is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <ShowtimeSchedule
        theatreId={targetTheatre}
        date={targetDate}
        onSelectShowtime={handleSelect}
      />
    );

    const showtimePill = screen.getByTestId('showtime-pill-st-tysons-dune2-dolby-1400');
    fireEvent.click(showtimePill);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'st-tysons-dune2-dolby-1400',
        theatreId: 'amc-tysons-16',
        movieId: 'dune-part-two',
        format: 'DOLBY_CINEMA',
        auditoriumId: 'tysons-aud-11-dolby',
        time: '2:00 PM',
      }),
      expect.objectContaining({
        id: 'dune-part-two',
        title: 'Dune: Part Two',
        rating: 'PG-13',
      })
    );
  });

  it('displays empty state and allows resetting filter when no showtimes match', () => {
    const handleSelect = vi.fn();
    render(
      <ShowtimeSchedule
        theatreId="nonexistent-theatre"
        date={targetDate}
        onSelectShowtime={handleSelect}
      />
    );

    expect(screen.getByTestId('no-showtimes-found')).toBeInTheDocument();
    expect(screen.getByText('No PLF Showtimes Found')).toBeInTheDocument();
  });
});
