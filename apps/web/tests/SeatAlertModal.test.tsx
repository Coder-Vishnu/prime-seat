// apps/web/tests/SeatAlertModal.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeatAlertModal, getSavedAlerts } from '../src/components/SeatAlertModal';
import { SeatData } from '../src/hooks/useAuditoriumStream';
import { Showtime, Movie } from '../src/data/showtimes';

describe('Milestone 9.0 Task 4 Verification: SeatAlertModal & Alert Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockMovie: Movie = {
    id: 'dune-part-two',
    title: 'Dune: Part Two',
    rating: 'PG-13',
    runtimeMinutes: 166,
    posterUrl: 'https://example.com/poster.jpg',
    genre: 'Sci-Fi',
  };

  const mockShowtime: Showtime = {
    id: 'st-tysons-dune2-imax-1930',
    theatreId: 'amc-tysons-16',
    movieId: 'dune-part-two',
    date: '2026-11-18',
    time: '7:30 PM',
    format: 'IMAX_LASER',
    auditoriumId: 'tysons-aud-3-imax',
    auditoriumName: 'Auditorium 3 (IMAX with Laser)',
    totalSeats: 350,
    availableSeats: 50,
    primeAvailableSeats: 5,
    checkoutUrl: 'https://www.amctheatres.com/checkout/dune2',
  };

  const mockOccupiedPrimeSeat: SeatData = {
    row: 'H',
    number: 14,
    status: 'OCCUPIED',
    seat_type: 'Recliner',
    is_prime: true,
    drop_probability: 0.78,
  };

  const mockAvailableSeat: SeatData = {
    row: 'B',
    number: 10,
    status: 'AVAILABLE',
    seat_type: 'Recliner',
    is_prime: false,
  };

  it('renders modal details for an occupied prime seat', () => {
    const handleClose = vi.fn();
    render(
      <SeatAlertModal
        seat={mockOccupiedPrimeSeat}
        showtime={mockShowtime}
        movie={mockMovie}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Row H, Seat 14/i)).toBeInTheDocument();
    expect(screen.getByText('PRIME SIGHTLINE')).toBeInTheDocument();
    expect(screen.getByText('OCCUPIED')).toBeInTheDocument();
    expect(screen.getByText('78.0%')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-drop-alert-btn')).toHaveTextContent(/Set Churn Reclamation Alert/i);
  });

  it('saves alert to localStorage when clicking Set Churn Reclamation Alert', () => {
    const handleClose = vi.fn();
    render(
      <SeatAlertModal
        seat={mockOccupiedPrimeSeat}
        showtime={mockShowtime}
        movie={mockMovie}
        onClose={handleClose}
      />
    );

    const alertBtn = screen.getByTestId('toggle-drop-alert-btn');
    fireEvent.click(alertBtn);

    // Verify localStorage has saved alert
    const saved = getSavedAlerts();
    expect(saved.length).toBe(1);
    expect(saved[0].row).toBe('H');
    expect(saved[0].seatNumber).toBe(14);
    expect(saved[0].showtimeId).toBe(mockShowtime.id);

    // Toast message appears
    expect(screen.getByTestId('alert-toast-message')).toHaveTextContent(/Alert set for Row H, Seat 14/i);
    // Button state updates
    expect(screen.getByTestId('toggle-drop-alert-btn')).toHaveTextContent(/Alert Active — Cancel Alert/i);

    // Clicking again removes alert
    fireEvent.click(alertBtn);
    expect(getSavedAlerts().length).toBe(0);
  });

  it('renders Book Now link when viewing an available seat', () => {
    const handleClose = vi.fn();
    render(
      <SeatAlertModal
        seat={mockAvailableSeat}
        showtime={mockShowtime}
        movie={mockMovie}
        onClose={handleClose}
      />
    );

    const bookNowLink = screen.getByTestId('book-now-cta');
    expect(bookNowLink).toBeInTheDocument();
    expect(bookNowLink).toHaveAttribute('href', mockShowtime.checkoutUrl);
  });
});
