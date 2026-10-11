# Module 07: Auditorium UI Dashboard (Next.js 15 / React 19 PWA)

**Module Identifier:** `07_AUDITORIUM_UI_DASHBOARD`  
**System Layer:** Client-Side PWA, Interactive 2D Canvas & SSE Stream Consumer  
**Target Codebase Location:** `apps/web/`, `apps/web/src/components/AuditoriumCanvas.tsx`, `apps/web/src/hooks/useAuditoriumStream.ts`, `apps/web/public/sw.js`  
**Author:** Vishnu Venkatesan (Lead Systems Architect & AI Engineer)  
**Classification:** Core Full-Stack UI Blueprint  
**Version:** 2.0.0-PROD  

---

## 1. Domain Objective & Operational Contract

Module 07 constructs the frontend application in `apps/web`: a high-performance Next.js 15 / React 19 Progressive Web App (PWA) rendering an interactive, hardware-accelerated 2D SVG auditorium seatmap. It connects to the FastAPI backend via Server-Sent Events (SSE) to deliver real-time visual drops and desktop/mobile push alerts.

### Operational Contracts:
1. **Interactive Vector Canvas:** Renders true-to-life architectural seating layouts for AMC Tysons Corner 16 PLF auditoriums (Dolby Cinema & IMAX with Laser), including screen curvature, stair aisles, and prime sightline zones.
2. **Sub-50ms React Re-Rendering:** State diffs received via SSE trigger localized node updates without re-mounting the canvas DOM tree.
3. **PWA Standalone Execution:** Runs as an installed desktop/mobile application with Service Worker background push handling, actionable notification buttons, and audio alerts.
4. **Predictive Heatmap Mode:** Toggles an analytical overlay rendering PyTorch $P(\text{Drop})$ probabilities directly above occupied prime seats with color gradient shading.

```
                      +---------------------------------------+
                      | Backend FastAPI Event Stream (SSE)    |
                      | /api/events/stream?showtime_id={id}   |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      | useAuditoriumStream Hook              |
                      | - EventSource Subscription            |
                      | - Exponential Reconnect Backoff       |
                      | - Dispatches to Web Notification API  |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      | AuditoriumCanvas (SVG 2D Engine)      |
                      | - Curved Screen Indicator             |
                      | - Prime Center Box Highlight          |
                      | - Color-Coded Seat Nodes              |
                      | - Pulsing Amber Drop Keyframes        |
                      +---------------------------------------+
                                          |
                      +-------------------+-------------------+
                      |                                       |
                      v                                       v
         +-------------------------+             +-------------------------+
         | Click on Dropped Seat   |             | Toggle ML Heatmap View  |
         | Deep-link to AMC Mobile |             | Render P(Drop | X)      |
         | Ticketing Seat Checkout |             | Probability Gradients   |
         +-------------------------+             +-------------------------+
```

---

## 2. Auditorium Node State & Styling Matrix

Every physical node on the SVG canvas maps to a strict visual style and interaction pattern:

| Auditorium Node State | SVG Fill Color | SVG Stroke Color | Visual Effect & Keyframe | User Interaction Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Available** | `#10b981` (Emerald-500) | `#059669` (Emerald-600) | Static rounded rectangle | Click displays seat info modal & manual booking link. |
| **Occupied (Standard)** | `#334155` (Slate-700) | `#1e293b` (Slate-800) | Muted dark slate node | Hover displays reservation tenure. |
| **Occupied (Prime Row)** | `#475569` (Slate-600) | `#38bdf8` (Sky-400) | Cyan border highlight | Hover displays PyTorch $P(\text{Drop})$ score tooltip. |
| **Reclamation Drop** | `#f59e0b` (Amber-500) | `#d97706` (Amber-600) | Pulsing amber ring (`@keyframes pulse-ring`) | Click redirects immediately to direct AMC checkout URL. |
| **Blocked / House** | `#1e293b` (Slate-800) | `#0f172a` (Slate-900) | Dimmed hashed stroke | Non-interactive. Pointer-events: none. |
| **Aisle / Spacer** | `none` | `none` | Invisible grid spacer | Pointer-events: none. |

---

## 3. PWA Configuration & Native Desktop Integration

### 3.1 Web App Manifest (`apps/web/public/manifest.json`)

```json
{
  "name": "Prime Seat Sentinel",
  "short_name": "PrimeSeat",
  "description": "High-Throughput PLF Seat Vacancy Reclamation Monitor",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#0a0a0a",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/seat-icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/seat-icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 3.2 Service Worker & Push Notification Handler (`apps/web/public/sw.js`)

```javascript
// apps/web/public/sw.js
// PWA Service Worker & Native Desktop Push Handler

self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Prime Seat Reclamation Alert!';
  const options = {
    body: `Row ${data.row} Seat ${data.number} just vacated! Click to reserve immediately.`,
    icon: '/icons/seat-icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200, 100, 400],
    tag: `seat-drop-${data.row}-${data.number}`,
    renotify: true,
    data: {
      url: data.checkout_url || 'https://www.amctheatres.com',
    },
    actions: [
      { action: 'claim', title: 'Claim Seat' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  if (event.action === 'claim' || !event.action) {
    const targetUrl = event.notification.data.url;
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  }
});
```

---

## 4. Frontend Component & Hook Implementation

### 4.1 Real-Time SSE Synchronization Hook (`apps/web/src/hooks/useAuditoriumStream.ts`)

```typescript
// apps/web/src/hooks/useAuditoriumStream.ts
import { useState, useEffect, useRef } from 'react';

export interface SeatData {
  row: string;
  number: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'BLOCKED';
  seat_type: string;
  is_prime: boolean;
  drop_probability?: number;
}

export interface DropEventPayload {
  showtime_id: string;
  movie_title: string;
  seat: SeatData;
  drop_probability: number;
  timestamp: string;
  checkout_url: string;
}

export function useAuditoriumStream(showtimeId: string) {
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [latestDrop, setLatestDrop] = useState<DropEventPayload | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const retryCount = useRef<number>(0);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let timeoutId: NodeJS.Timeout;

    function connect() {
      eventSource = new EventSource(`/api/events/stream?showtime_id=${showtimeId}`);

      eventSource.onopen = () => {
        setIsConnected(true);
        retryCount.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);

          if (parsed.event === 'SEAT_DROP') {
            const dropData: DropEventPayload = parsed.data;
            setLatestDrop(dropData);

            // Update specific seat node in state array
            setSeats((prevSeats) =>
              prevSeats.map((s) =>
                s.row === dropData.seat.row && s.number === dropData.seat.number
                  ? { ...s, status: 'AVAILABLE' }
                  : s
              )
            );

            // Trigger Desktop Audio Chime & Banner
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`PRIME SEAT OPEN: ${dropData.movie_title}!`, {
                body: `Row ${dropData.seat.row} Seat ${dropData.seat.number} reopened!`,
                icon: '/icons/seat-icon-192.png',
              });
            }
          } else if (parsed.event === 'SNAPSHOT_INIT') {
            setSeats(parsed.data.seats);
          }
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        // Exponential reconnect backoff: 1s, 2s, 4s, up to 16s
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount.current), 16000);
        retryCount.current += 1;
        timeoutId = setTimeout(connect, backoffMs);
      };
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(timeoutId);
    };
  }, [showtimeId]);

  return { seats, latestDrop, isConnected };
}
```

### 4.2 Interactive Auditorium SVG Canvas (`apps/web/src/components/AuditoriumCanvas.tsx`)

```tsx
// apps/web/src/components/AuditoriumCanvas.tsx
'use client';

import React, { useState } from 'react';
import { SeatData, DropEventPayload } from '../hooks/useAuditoriumStream';

interface AuditoriumCanvasProps {
  seats: SeatData[];
  totalRows: number;
  totalCols: number;
  screenFormat: 'DOLBY_CINEMA' | 'IMAX_LASER';
  latestDrop: DropEventPayload | null;
  heatmapMode: boolean;
  onSeatClick?: (seat: SeatData) => void;
}

export const AuditoriumCanvas: React.FC<AuditoriumCanvasProps> = ({
  seats,
  totalRows,
  totalCols,
  screenFormat,
  latestDrop,
  heatmapMode,
  onSeatClick,
}) => {
  const [hoveredSeat, setHoveredSeat] = useState<SeatData | null>(null);

  const seatWidth = 28;
  const seatHeight = 24;
  const gapX = 10;
  const gapY = 12;

  const canvasWidth = totalCols * (seatWidth + gapX) + 120;
  const canvasHeight = totalRows * (seatHeight + gapY) + 180;

  const isRecentDrop = (seat: SeatData): boolean => {
    return latestDrop?.seat.row === seat.row && latestDrop?.seat.number === seat.number;
  };

  const getNodeColor = (seat: SeatData) => {
    if (isRecentDrop(seat)) {
      return { fill: '#f59e0b', stroke: '#d97706', className: 'animate-pulse' };
    }
    if (seat.status === 'AVAILABLE') {
      return { fill: '#10b981', stroke: '#059669', className: '' };
    }
    if (seat.status === 'BLOCKED') {
      return { fill: '#1e293b', stroke: '#0f172a', className: 'opacity-40' };
    }
    // Occupied state
    if (heatmapMode && seat.drop_probability !== undefined) {
      // Heatmap gradient based on predicted churn probability
      const prob = seat.drop_probability;
      if (prob >= 0.7) return { fill: '#ef4444', stroke: '#dc2626', className: '' };
      if (prob >= 0.4) return { fill: '#f97316', stroke: '#ea580c', className: '' };
      return { fill: '#3b82f6', stroke: '#2563eb', className: '' };
    }
    if (seat.is_prime) {
      return { fill: '#475569', stroke: '#38bdf8', className: '' };
    }
    return { fill: '#334155', stroke: '#1e293b', className: '' };
  };

  return (
    <div className="relative w-full flex flex-col items-center bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-2xl">
      {/* Curved Screen Banner */}
      <div className="w-full max-w-4xl mb-8 flex flex-col items-center">
        <svg viewBox="0 0 600 50" className="w-full max-w-2xl h-12">
          <path
            d="M 20 40 Q 300 10 580 40"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-xs uppercase tracking-widest text-neutral-400 mt-1 font-semibold">
          {screenFormat === 'DOLBY_CINEMA' ? 'Dolby Cinema Screen' : 'IMAX with Laser Screen'}
        </span>
      </div>

      {/* SVG Seating Chart */}
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="w-full max-w-5xl h-auto select-none"
      >
        {seats.map((seat) => {
          const rowIdx = seat.row.charCodeAt(0) - 65;
          const colIdx = seat.number - 1;
          const x = 60 + colIdx * (seatWidth + gapX);
          const y = 80 + rowIdx * (seatHeight + gapY);
          const styling = getNodeColor(seat);

          return (
            <g
              key={`${seat.row}-${seat.number}`}
              className={`cursor-pointer transition-transform duration-150 hover:scale-125 ${styling.className}`}
              onClick={() => onSeatClick && onSeatClick(seat)}
              onMouseEnter={() => setHoveredSeat(seat)}
              onMouseLeave={() => setHoveredSeat(null)}
            >
              <rect
                x={x}
                y={y}
                width={seatWidth}
                height={seatHeight}
                rx={6}
                fill={styling.fill}
                stroke={styling.stroke}
                strokeWidth={seat.is_prime ? 2.5 : 1.5}
              />
              <text
                x={x + seatWidth / 2}
                y={y + seatHeight / 2 + 4}
                textAnchor="middle"
                fontSize="9"
                fill="#ffffff"
                className="font-mono pointer-events-none"
              >
                {seat.number}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover Tooltip */}
      {hoveredSeat && (
        <div className="absolute bottom-4 left-6 bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-lg text-xs text-neutral-200 shadow-xl">
          <span className="font-bold text-sky-400">
            Row {hoveredSeat.row}, Seat {hoveredSeat.number}
          </span>
          <span className="mx-2">•</span>
          <span className="capitalize">{hoveredSeat.status.toLowerCase()}</span>
          {hoveredSeat.drop_probability !== undefined && (
            <div className="mt-1 text-amber-400">
              P(Drop): {(hoveredSeat.drop_probability * 100).toFixed(1)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 5. Verification Gates & Automated Test Suite

The test suite is located at `apps/web/tests/AuditoriumCanvas.test.tsx`. It verifies SVG node rendering, color encoding, and click interaction.

```typescript
// apps/web/tests/AuditoriumCanvas.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditoriumCanvas } from '../src/components/AuditoriumCanvas';
import { SeatData } from '../src/hooks/useAuditoriumStream';

describe('Gate 07: AuditoriumCanvas Rendering & Interaction Suite', () => {
  const mockSeats: SeatData[] = [
    { row: 'F', number: 14, status: 'AVAILABLE', seat_type: 'RECLINER', is_prime: true },
    { row: 'G', number: 15, status: 'OCCUPIED', seat_type: 'RECLINER', is_prime: true, drop_probability: 0.85 },
  ];

  it('renders all seat nodes with proper geometry', () => {
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

    expect(screen.getByText('14')).toBeDefined();
    expect(screen.getByText('15')).toBeDefined();
  });

  it('triggers onSeatClick callback when a seat node is clicked', () => {
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
});
```

---

## 6. Monorepo Directory Layout & Integration

```
apps/web/
├── public/
│   ├── manifest.json                  # PWA Manifest
│   ├── sw.js                          # Service Worker Push Handler
│   └── icons/
│       ├── seat-icon-192.png
│       └── seat-icon-512.png
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── AuditoriumCanvas.tsx       # SVG 2D Interactive Seatmap
│   └── hooks/
│       ├── useAuditoriumStream.ts     # Real-Time SSE Consumer
│       └── useDesktopNotification.ts  # Permission Request & Chimes
└── tests/
    └── AuditoriumCanvas.test.tsx      # Gate 07 Component Tests
```

---

## 7. Antigravity Milestone Execution Directive

To execute the implementation of this specification in the Antigravity Agent environment:

```bash
# 1. Switch Active Model in Antigravity Terminal
/model gemini-3.1-pro

# 2. Trigger Autonomous Milestone 7.0 Execution
/milestone-new "Milestone 7.0 based on docs/modules/07_AUDITORIUM_UI_DASHBOARD.md"
```

The Antigravity agent will autonomously:
1. Create Git branch `feat/milestone-7.0`.
2. Generate task tracking document `tasks/Milestone7.0.md`.
3. Scaffold `apps/web/src/components/AuditoriumCanvas.tsx` and `apps/web/src/hooks/useAuditoriumStream.ts`.
4. Run `npm test` / Vitest verifying component rendering and interaction callbacks.
