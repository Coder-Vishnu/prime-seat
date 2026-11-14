// apps/web/tests/CalendarPicker.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarPicker, formatDate, parseDate } from '../src/components/CalendarPicker';

describe('Milestone 8.0 Task 2 Verification: CalendarPicker Component', () => {
  const fixedToday = '2026-11-14'; // Saturday

  it('renders month heading and correct number of days for November 2026', () => {
    const handleSelect = vi.fn();
    render(
      <CalendarPicker
        selectedDate="2026-11-14"
        onSelectDate={handleSelect}
        minDate="2026-11-01"
      />
    );

    expect(screen.getByTestId('current-month-heading')).toHaveTextContent('November 2026');
    expect(screen.getByTestId('selected-date-badge')).toHaveTextContent(/Nov 14, 2026/i);

    // Nov 2026 has 30 days. Day 1 and Day 30 should exist in the grid
    expect(screen.getByTestId('calendar-day-2026-11-01')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-day-2026-11-30')).toBeInTheDocument();
  });

  it('disables past dates and prevents selection', () => {
    const handleSelect = vi.fn();
    render(
      <CalendarPicker
        selectedDate="2026-11-14"
        onSelectDate={handleSelect}
        minDate="2026-11-14"
      />
    );

    // Nov 13, 2026 is strictly in the past (< 2026-11-14)
    const pastDay = screen.getByTestId('calendar-day-2026-11-13');
    expect(pastDay).toBeDisabled();

    fireEvent.click(pastDay);
    expect(handleSelect).not.toHaveBeenCalled();

    // Nov 14 (today) and Nov 15 (future) should be enabled
    const todayCell = screen.getByTestId('calendar-day-2026-11-14');
    expect(todayCell).not.toBeDisabled();

    const futureCell = screen.getByTestId('calendar-day-2026-11-15');
    expect(futureCell).not.toBeDisabled();
    fireEvent.click(futureCell);
    expect(handleSelect).toHaveBeenCalledWith('2026-11-15');
  });

  it('navigates to next month and updates visible grid', () => {
    const handleSelect = vi.fn();
    render(
      <CalendarPicker
        selectedDate="2026-11-14"
        onSelectDate={handleSelect}
        minDate="2026-11-01"
      />
    );

    const nextBtn = screen.getByTestId('next-month-btn');
    fireEvent.click(nextBtn);

    expect(screen.getByTestId('current-month-heading')).toHaveTextContent('December 2026');
    expect(screen.getByTestId('calendar-day-2026-12-25')).toBeInTheDocument();

    const prevBtn = screen.getByTestId('prev-month-btn');
    fireEvent.click(prevBtn);

    expect(screen.getByTestId('current-month-heading')).toHaveTextContent('November 2026');
  });

  it('disables previous month button when viewing the minDate month', () => {
    const handleSelect = vi.fn();
    render(
      <CalendarPicker
        selectedDate="2026-11-14"
        onSelectDate={handleSelect}
        minDate="2026-11-14"
      />
    );

    const prevBtn = screen.getByTestId('prev-month-btn');
    expect(prevBtn).toBeDisabled();
  });

  it('accurately selects dates via shortcut pills ("Today", "Tomorrow")', () => {
    const handleSelect = vi.fn();
    render(
      <CalendarPicker
        selectedDate="2026-11-14"
        onSelectDate={handleSelect}
        minDate="2026-11-14"
      />
    );

    // Today shortcut
    const todayShortcut = screen.getByTestId('shortcut-today');
    fireEvent.click(todayShortcut);
    expect(handleSelect).toHaveBeenCalledWith('2026-11-14');

    // Tomorrow shortcut
    const tomorrowShortcut = screen.getByTestId('shortcut-tomorrow');
    fireEvent.click(tomorrowShortcut);
    expect(handleSelect).toHaveBeenCalledWith('2026-11-15');

    // Weekend shortcuts
    const fridayShortcut = screen.getByTestId('shortcut-friday');
    fireEvent.click(fridayShortcut);
    expect(handleSelect).toHaveBeenCalledWith('2026-11-20');

    const saturdayShortcut = screen.getByTestId('shortcut-saturday');
    fireEvent.click(saturdayShortcut);
    expect(handleSelect).toHaveBeenCalledWith('2026-11-14');

    const sundayShortcut = screen.getByTestId('shortcut-sunday');
    fireEvent.click(sundayShortcut);
    expect(handleSelect).toHaveBeenCalledWith('2026-11-15');
  });

  it('renders PLF screening density indicator dots on available dates', () => {
    const handleSelect = vi.fn();
    render(
      <CalendarPicker
        selectedDate="2026-11-14"
        onSelectDate={handleSelect}
        minDate="2026-11-01"
        availableDates={['2026-11-14', '2026-11-20']}
      />
    );

    expect(screen.getByTestId('density-dots-2026-11-14')).toBeInTheDocument();
    expect(screen.getByTestId('density-dots-2026-11-20')).toBeInTheDocument();
    expect(screen.queryByTestId('density-dots-2026-11-18')).not.toBeInTheDocument();
  });

  it('correctly formats and parses dates', () => {
    const date = new Date(2026, 10, 14); // November 14, 2026
    expect(formatDate(date)).toBe('2026-11-14');

    const parsed = parseDate('2026-11-14');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(10);
    expect(parsed.getDate()).toBe(14);
  });
});
