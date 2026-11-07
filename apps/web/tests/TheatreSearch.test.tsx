// apps/web/tests/TheatreSearch.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TheatreSearch } from '../src/components/TheatreSearch';
import { DMV_AMC_THEATRES } from '../src/data/theatres';

describe('Milestone 8.0 Task 1 Verification: TheatreSearch Component', () => {
  it('renders all 10 DMV AMC theatres by default', () => {
    const handleSelect = vi.fn();
    render(<TheatreSearch onSelectTheatre={handleSelect} />);

    expect(screen.getByTestId('theatre-results-count')).toHaveTextContent(/Showing 10 of 10 premier DMV theatres/i);
    expect(screen.getByText('AMC Tysons Corner 16')).toBeInTheDocument();
    expect(screen.getByText('AMC Georgetown 14')).toBeInTheDocument();
    expect(screen.getByText('AMC Hoffman Center 22')).toBeInTheDocument();
  });

  it('accurately filters by city (e.g. "McLean" returns AMC Tysons Corner 16)', () => {
    const handleSelect = vi.fn();
    render(<TheatreSearch onSelectTheatre={handleSelect} />);

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'McLean' } });

    expect(screen.getByText('AMC Tysons Corner 16')).toBeInTheDocument();
    expect(screen.queryByText('AMC Georgetown 14')).not.toBeInTheDocument();
    expect(screen.queryByText('AMC Hoffman Center 22')).not.toBeInTheDocument();
  });

  it('accurately filters by zip code (e.g. "20007" returns Georgetown)', () => {
    const handleSelect = vi.fn();
    render(<TheatreSearch onSelectTheatre={handleSelect} />);

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: '20007' } });

    expect(screen.getByText('AMC Georgetown 14')).toBeInTheDocument();
    expect(screen.queryByText('AMC Tysons Corner 16')).not.toBeInTheDocument();
  });

  it('correctly filters theatres by Dolby Cinema format chip', () => {
    const handleSelect = vi.fn();
    render(<TheatreSearch onSelectTheatre={handleSelect} />);

    const dolbyChip = screen.getByTestId('filter-chip-dolby_cinema');
    fireEvent.click(dolbyChip);

    // Dolby theatres in dataset: Tysons 16, Georgetown 14, Hoffman 22, Montgomery 16, Rio 18, Magic Johnson 12, Columbia 14 (7 total)
    // Non-Dolby: Shirlington 7, Courthouse 8, Techworld 11
    expect(screen.getByText('AMC Tysons Corner 16')).toBeInTheDocument();
    expect(screen.getByText('AMC Georgetown 14')).toBeInTheDocument();
    expect(screen.queryByText('AMC Shirlington 7')).not.toBeInTheDocument();
    expect(screen.queryByText('AMC Courthouse Plaza 8')).not.toBeInTheDocument();
    expect(screen.queryByText('AMC DINE-IN Techworld 11')).not.toBeInTheDocument();
  });

  it('correctly filters theatres by Flagship PLF chip', () => {
    const handleSelect = vi.fn();
    render(<TheatreSearch onSelectTheatre={handleSelect} />);

    const flagshipChip = screen.getByTestId('filter-chip-flagship');
    fireEvent.click(flagshipChip);

    // Flagship theatres: Tysons 16 and Georgetown 14
    expect(screen.getByText('AMC Tysons Corner 16')).toBeInTheDocument();
    expect(screen.getByText('AMC Georgetown 14')).toBeInTheDocument();
    expect(screen.queryByText('AMC Hoffman Center 22')).not.toBeInTheDocument();
  });

  it('fires onSelectTheatre with correct payload when "View Showtimes" is clicked', () => {
    const handleSelect = vi.fn();
    render(<TheatreSearch onSelectTheatre={handleSelect} />);

    const tysonsBtn = screen.getByTestId('select-theatre-btn-amc-tysons-16');
    fireEvent.click(tysonsBtn);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'amc-tysons-16',
        name: 'AMC Tysons Corner 16',
        city: 'McLean',
        formats: expect.arrayContaining(['DOLBY_CINEMA', 'IMAX_LASER']),
      })
    );
  });

  it('displays empty state and allows resetting filters', () => {
    const handleSelect = vi.fn();
    render(<TheatreSearch onSelectTheatre={handleSelect} />);

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'Nonexistent City 99999' } });

    expect(screen.getByTestId('no-theatres-found')).toBeInTheDocument();
    expect(screen.getByText(/No AMC theatres found/i)).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /reset filters/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText('AMC Tysons Corner 16')).toBeInTheDocument();
  });
});
