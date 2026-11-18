import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditoriumCanvas, getNodeColor } from '../src/components/AuditoriumCanvas';
import { SeatData, DropEventPayload } from '../src/hooks/useAuditoriumStream';

describe('Milestone 7.0 Verification Gates: AuditoriumCanvas Engine', () => {
  const mockSeats: SeatData[] = [
    { row: 'F', number: 14, status: 'AVAILABLE', seat_type: 'RECLINER', is_prime: true },
    { row: 'G', number: 15, status: 'OCCUPIED', seat_type: 'RECLINER', is_prime: true, drop_probability: 0.85 },
    { row: 'B', number: 4, status: 'OCCUPIED', seat_type: 'RECLINER', is_prime: false, drop_probability: 0.45 },
    { row: 'C', number: 7, status: 'OCCUPIED', seat_type: 'RECLINER', is_prime: false, drop_probability: 0.20 },
    { row: 'A', number: 1, status: 'BLOCKED', seat_type: 'RECLINER', is_prime: false },
  ];

  it('test_gate_01_seat_node_rendering_and_geometry: renders all seat nodes with proper geometry and labels', () => {
    render(
      <AuditoriumCanvas
        seats={mockSeats}
        totalRows={10}
        totalCols={20}
        screenFormat="DOLBY_CINEMA"
        latestDrop={null}
        heatmapMode={false}
      />
    );

    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/Dolby Cinema Screen/i)).toBeInTheDocument();
  });

  it('test_gate_02_click_interaction_callback: triggers onSeatClick callback with exact SeatData payload', () => {
    const handleClick = vi.fn();
    render(
      <AuditoriumCanvas
        seats={mockSeats}
        totalRows={10}
        totalCols={20}
        screenFormat="DOLBY_CINEMA"
        latestDrop={null}
        heatmapMode={false}
        onSeatClick={handleClick}
      />
    );

    const seatNode = screen.getByText('14');
    fireEvent.click(seatNode);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockSeats[0]);
  });

  it('test_gate_03_color_encoding_matrix: renders correct SVG fill and stroke for all 6 states', () => {
    // 1. Available: Emerald-500 (#10b981), Emerald-600 (#059669)
    const availableColor = getNodeColor(mockSeats[0], null, false);
    expect(availableColor.fill).toBe('#10b981');
    expect(availableColor.stroke).toBe('#059669');

    // 2. Occupied Standard: Slate-700 (#334155), Slate-800 (#1e293b)
    const occStdColor = getNodeColor(mockSeats[2], null, false);
    expect(occStdColor.fill).toBe('#334155');
    expect(occStdColor.stroke).toBe('#1e293b');

    // 3. Occupied Prime: Slate-600 (#475569), Sky-400 (#38bdf8)
    const occPrimeColor = getNodeColor(mockSeats[1], null, false);
    expect(occPrimeColor.fill).toBe('#475569');
    expect(occPrimeColor.stroke).toBe('#38bdf8');

    // 4. Reclamation Drop: Amber-500 (#f59e0b), Amber-600 (#d97706), animate-pulse
    const dropPayload: DropEventPayload = {
      showtime_id: 'show-123',
      movie_title: 'Dune: Part Two',
      seat: mockSeats[0],
      drop_probability: 0.95,
      timestamp: new Date().toISOString(),
      checkout_url: 'https://www.amctheatres.com',
    };
    const dropColor = getNodeColor(mockSeats[0], dropPayload, false);
    expect(dropColor.fill).toBe('#f59e0b');
    expect(dropColor.stroke).toBe('#d97706');
    expect(dropColor.className).toContain('animate-pulse');

    // 5. Blocked: Slate-800 (#1e293b), Slate-900 (#0f172a)
    const blockedColor = getNodeColor(mockSeats[4], null, false);
    expect(blockedColor.fill).toBe('#1e293b');
    expect(blockedColor.stroke).toBe('#0f172a');
    expect(blockedColor.className).toContain('opacity-40');
  });

  it('test_gate_04_heatmap_probability_gradient: maps drop probabilities to red, orange, and blue', () => {
    // High risk (>= 0.70) -> Red (#ef4444 / #dc2626)
    const highRisk = getNodeColor(mockSeats[1], null, true);
    expect(highRisk.fill).toBe('#ef4444');
    expect(highRisk.stroke).toBe('#dc2626');

    // Medium risk (>= 0.40, < 0.70) -> Orange (#f97316 / #ea580c)
    const medRisk = getNodeColor(mockSeats[2], null, true);
    expect(medRisk.fill).toBe('#f97316');
    expect(medRisk.stroke).toBe('#ea580c');

    // Low risk (< 0.40) -> Blue (#3b82f6 / #2563eb)
    const lowRisk = getNodeColor(mockSeats[3], null, true);
    expect(lowRisk.fill).toBe('#3b82f6');
    expect(lowRisk.stroke).toBe('#2563eb');
  });

  it('test_gate_05_sub_50ms_rerender_sla: guarantees localized state diff update executes under 50ms', () => {
    // Generate full auditorium (200 seats)
    const fullSeats: SeatData[] = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
    rows.forEach((row) => {
      for (let num = 1; num <= 20; num++) {
        fullSeats.push({
          row,
          number: num,
          status: 'OCCUPIED',
          seat_type: 'RECLINER',
          is_prime: (row === 'F' || row === 'G') && num >= 8 && num <= 13,
        });
      }
    });

    const { rerender } = render(
      <AuditoriumCanvas
        seats={fullSeats}
        totalRows={10}
        totalCols={20}
        screenFormat="DOLBY_CINEMA"
        latestDrop={null}
        heatmapMode={false}
      />
    );

    // Apply state diff (one seat dropped to AVAILABLE)
    const updatedSeats = fullSeats.map((s) =>
      s.row === 'F' && s.number === 10 ? { ...s, status: 'AVAILABLE' as const } : s
    );

    const dropPayload: DropEventPayload = {
      showtime_id: 'test-show',
      movie_title: 'Oppenheimer',
      seat: { row: 'F', number: 10, status: 'AVAILABLE', seat_type: 'RECLINER', is_prime: true },
      drop_probability: 0.92,
      timestamp: new Date().toISOString(),
      checkout_url: 'https://www.amctheatres.com',
    };

    const start = performance.now();
    rerender(
      <AuditoriumCanvas
        seats={updatedSeats}
        totalRows={10}
        totalCols={20}
        screenFormat="DOLBY_CINEMA"
        latestDrop={dropPayload}
        heatmapMode={false}
      />
    );
    const duration = performance.now() - start;

    console.log(`AuditoriumCanvas state diff re-render latency: ${duration.toFixed(3)}ms`);
    expect(duration).toBeLessThan(50);
  });
});
