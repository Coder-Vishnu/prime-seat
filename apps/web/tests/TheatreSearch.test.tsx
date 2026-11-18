// apps/web/tests/TheatreSearch.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TheatreSearch } from '../src/components/TheatreSearch';

describe('Milestone 9.0 Task 1 Verification: Tysons Venue Banner', () => {
  it('renders AMC Tysons Corner 16 venue branding and details', () => {
    render(<TheatreSearch />);

    expect(screen.getByTestId('tysons-venue-banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /AMC Tysons Corner 16/i })).toBeInTheDocument();
    expect(screen.getByText(/7850 Tysons Corner Center/i)).toBeInTheDocument();
    expect(screen.getByText(/FLAGSHIP/i)).toBeInTheDocument();
  });

  it('renders PLF format tags for Tysons', () => {
    render(<TheatreSearch />);

    // Dolby Cinema appears in format tags and auditorium cards
    expect(screen.getAllByText('Dolby Cinema').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IMAX with Laser').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4DX').length).toBeGreaterThan(0);
    expect(screen.getByText('Prime at AMC')).toBeInTheDocument();
  });

  it('renders all 4 PLF auditoriums in quick reference cards', () => {
    render(<TheatreSearch />);

    expect(screen.getByText('Aud 11')).toBeInTheDocument();
    expect(screen.getByText('Aud 9')).toBeInTheDocument();
    expect(screen.getByText('Aud 3')).toBeInTheDocument();
    expect(screen.getByText('Aud 2')).toBeInTheDocument();
    expect(screen.getByText('262 seats')).toBeInTheDocument();
    expect(screen.getByText('161 seats')).toBeInTheDocument();
    expect(screen.getByText('350 seats')).toBeInTheDocument();
    expect(screen.getByText('125 seats')).toBeInTheDocument();
  });
});
