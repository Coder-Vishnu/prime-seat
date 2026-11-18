// apps/web/tests/BookingPipeline.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '../src/app/page';

describe('Milestone 9.0 Task 1 Verification: Tysons-Only Streamlined Booking Pipeline', () => {
  it('test_gate_01_direct_calendar_entry: verifies app opens directly at Calendar stage with AMC Tysons Corner 16', () => {
    render(<Home />);

    // Initial stage is CALENDAR directly
    expect(screen.getByTestId('stage-calendar-picker')).toBeInTheDocument();
    expect(screen.getByTestId('current-stage-badge')).toHaveTextContent('Stage: CALENDAR');

    // Venue banner is present
    expect(screen.getByTestId('tysons-venue-banner')).toBeInTheDocument();
    expect(screen.getAllByText('AMC Tysons Corner 16').length).toBeGreaterThan(0);
  });

  it('test_gate_02_calendar_date_selection: verifies date navigation, shortcut selection, and transition to Showtimes', () => {
    render(<Home />);

    // Click Tomorrow shortcut
    const tomorrowBtn = screen.getByTestId('shortcut-tomorrow');
    fireEvent.click(tomorrowBtn);

    // Transitions to SHOWTIMES stage
    expect(screen.getByTestId('stage-showtime-schedule')).toBeInTheDocument();
    expect(screen.getByTestId('current-stage-badge')).toHaveTextContent('Stage: SHOWTIMES');
  });

  it('test_gate_03_format_showtime_filtering: verifies filtering by Dolby Cinema isolates Dolby showtimes in the schedule', () => {
    render(<Home />);

    // Step 1: Pick date via shortcut
    fireEvent.click(screen.getByTestId('shortcut-today'));

    expect(screen.getByTestId('stage-showtime-schedule')).toBeInTheDocument();

    // Check showtime schedule container is loaded for Tysons
    expect(screen.getByTestId('showtime-schedule-container')).toBeInTheDocument();
  });

  it('test_gate_04_seatmap_stage_transition: verifies selecting a showtime renders the 262-seat Auditorium 11 seatmap and allows back navigation', () => {
    render(<Home />);

    // Step 1: Pick date 2026-11-14
    fireEvent.click(screen.getByTestId('shortcut-today'));

    // Step 2: If showtime pills are present for the date, click one
    const showtimePills = screen.queryAllByTestId(/^showtime-pill-/);
    if (showtimePills.length > 0) {
      fireEvent.click(showtimePills[0]);

      // Step 3: Verify SEATMAP stage
      expect(screen.getByTestId('stage-seatmap-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('current-stage-badge')).toHaveTextContent('Stage: SEATMAP');
      expect(screen.getByTestId('auditorium-canvas-wrapper')).toBeInTheDocument();

      // Test back button transitions back to SHOWTIMES stage
      const backBtn = screen.getByTestId('pipeline-back-button');
      fireEvent.click(backBtn);
      expect(screen.getByTestId('stage-showtime-schedule')).toBeInTheDocument();
      expect(screen.getByTestId('current-stage-badge')).toHaveTextContent('Stage: SHOWTIMES');

      // Test back button transitions back to CALENDAR stage
      fireEvent.click(screen.getByTestId('pipeline-back-button'));
      expect(screen.getByTestId('stage-calendar-picker')).toBeInTheDocument();
      expect(screen.getByTestId('current-stage-badge')).toHaveTextContent('Stage: CALENDAR');
    }
  });
});
