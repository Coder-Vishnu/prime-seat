// apps/web/tests/BookingPipeline.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '../src/app/page';

describe('Milestone 8.0 Task 4 Verification: End-to-End Booking Pipeline', () => {
  it('test_gate_01_theatre_search_filtering: verifies searching "Georgetown" filters to AMC Georgetown 14 and transitions to Calendar stage', () => {
    render(<Home />);

    // Initial stage is THEATRES
    expect(screen.getByTestId('stage-theatre-search')).toBeInTheDocument();
    expect(screen.getByTestId('current-stage-badge')).toHaveTextContent('Stage: THEATRES');

    // Filter by city / keyword
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'Georgetown' } });

    expect(screen.getByText('AMC Georgetown 14')).toBeInTheDocument();
    expect(screen.queryByText('AMC Tysons Corner 16')).not.toBeInTheDocument();

    // Select theatre -> moves to CALENDAR stage
    const gtownBtn = screen.getByTestId('select-theatre-btn-amc-georgetown-14');
    fireEvent.click(gtownBtn);

    expect(screen.getByTestId('stage-calendar-picker')).toBeInTheDocument();
    expect(screen.getByTestId('current-stage-badge')).toHaveTextContent('Stage: CALENDAR');
    expect(screen.getByTestId('breadcrumb-theatre')).toHaveTextContent('AMC Georgetown 14');
  });

  it('test_gate_02_calendar_date_selection: verifies date navigation, shortcut pill selection, and transition to Showtimes', () => {
    render(<Home />);

    // Pick Tysons Corner 16
    const tysonsBtn = screen.getByTestId('select-theatre-btn-amc-tysons-16');
    fireEvent.click(tysonsBtn);

    expect(screen.getByTestId('stage-calendar-picker')).toBeInTheDocument();

    // Click Tomorrow shortcut
    const tomorrowBtn = screen.getByTestId('shortcut-tomorrow');
    fireEvent.click(tomorrowBtn);

    // Transitions to SHOWTIMES stage
    expect(screen.getByTestId('stage-showtime-schedule')).toBeInTheDocument();
    expect(screen.getByTestId('current-stage-badge')).toHaveTextContent('Stage: SHOWTIMES');
    expect(screen.getByTestId('breadcrumb-date')).toHaveTextContent('2026-11-15');
  });

  it('test_gate_03_format_showtime_filtering: verifies filtering by Dolby Cinema isolates Dolby showtimes in the schedule', () => {
    render(<Home />);

    // Step 1: Pick Tysons 16
    fireEvent.click(screen.getByTestId('select-theatre-btn-amc-tysons-16'));

    // Step 2: Pick date 2026-11-14 (today shortcut)
    fireEvent.click(screen.getByTestId('shortcut-today'));

    expect(screen.getByTestId('stage-showtime-schedule')).toBeInTheDocument();

    // Initially both Dolby and IMAX pills exist for Dune 2
    expect(screen.getByTestId('showtime-pill-st-tysons-dune2-dolby-1400')).toBeInTheDocument();
    expect(screen.getByTestId('showtime-pill-st-tysons-dune2-imax-1930')).toBeInTheDocument();

    // Filter to Dolby Cinema Only
    const dolbyTab = screen.getByTestId('filter-tab-dolby_cinema');
    fireEvent.click(dolbyTab);

    expect(screen.getByTestId('showtime-pill-st-tysons-dune2-dolby-1400')).toBeInTheDocument();
    expect(screen.queryByTestId('showtime-pill-st-tysons-dune2-imax-1930')).not.toBeInTheDocument();
  });

  it('test_gate_04_seatmap_stage_transition: verifies selecting a showtime renders the accurate 262-seat Auditorium 11 seatmap and allows back navigation', () => {
    render(<Home />);

    // Step 1: Pick Tysons 16
    fireEvent.click(screen.getByTestId('select-theatre-btn-amc-tysons-16'));

    // Step 2: Pick date 2026-11-14
    fireEvent.click(screen.getByTestId('shortcut-today'));

    // Step 3: Pick Dune 2 (2:00 PM Dolby) in Auditorium 11
    const duneDolbyPill = screen.getByTestId('showtime-pill-st-tysons-dune2-dolby-1400');
    fireEvent.click(duneDolbyPill);

    // Step 4: Verify SEATMAP stage
    expect(screen.getByTestId('stage-seatmap-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('current-stage-badge')).toHaveTextContent('Stage: SEATMAP');
    expect(screen.getByText(/Auditorium 11 \(Dolby Cinema at AMC Tysons Corner 16\)/i)).toBeInTheDocument();
    expect(screen.getByText(/262 physical seats/i)).toBeInTheDocument();
    expect(screen.getByTestId('auditorium-canvas-wrapper')).toBeInTheDocument();

    // Test back button transitions back to SHOWTIMES stage
    const backBtn = screen.getByTestId('pipeline-back-button');
    fireEvent.click(backBtn);
    expect(screen.getByTestId('stage-showtime-schedule')).toBeInTheDocument();
    expect(screen.getByTestId('current-stage-badge')).toHaveTextContent('Stage: SHOWTIMES');

    // Test breadcrumb back to THEATRES stage
    const theatresBreadcrumb = screen.getByTestId('breadcrumb-theatres');
    fireEvent.click(theatresBreadcrumb);
    expect(screen.getByTestId('stage-theatre-search')).toBeInTheDocument();
    expect(screen.getByTestId('current-stage-badge')).toHaveTextContent('Stage: THEATRES');
  });
});
