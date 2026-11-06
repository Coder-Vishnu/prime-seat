// apps/web/src/hooks/useAuditoriumStream.ts
import { useState, useEffect, useRef } from 'react';

export type SeatStatusType = 'AVAILABLE' | 'OCCUPIED' | 'BLOCKED';

export interface SeatData {
  row: string;
  number: number;
  status: SeatStatusType;
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

export interface SnapshotInitPayload {
  showtime_id: string;
  seats: SeatData[];
}

export type SSEEventMessage =
  | { event: 'SEAT_DROP'; data: DropEventPayload }
  | { event: 'SNAPSHOT_INIT'; data: SnapshotInitPayload };

export function calculateBackoffMs(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 16000);
}

export function useAuditoriumStream(showtimeId: string) {
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [latestDrop, setLatestDrop] = useState<DropEventPayload | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const retryCount = useRef<number>(0);

  useEffect(() => {
    if (!showtimeId) return;

    let eventSource: EventSource | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      eventSource = new EventSource(`/api/events/stream?showtime_id=${encodeURIComponent(showtimeId)}`);

      eventSource.onopen = () => {
        setIsConnected(true);
        retryCount.current = 0;
      };

      eventSource.onmessage = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as SSEEventMessage;

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
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`PRIME SEAT OPEN: ${dropData.movie_title}!`, {
                body: `Row ${dropData.seat.row} Seat ${dropData.seat.number} reopened!`,
                icon: '/icons/seat-icon-192.png',
              });
            }
          } else if (parsed.event === 'SNAPSHOT_INIT') {
            setSeats(parsed.data.seats);
          }
        } catch (err: unknown) {
          console.error('Failed to parse SSE event:', err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        // Exponential reconnect backoff: 1s, 2s, 4s, up to 16s
        const backoffMs = calculateBackoffMs(retryCount.current);
        retryCount.current += 1;
        timeoutId = setTimeout(connect, backoffMs);
      };
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [showtimeId]);

  return { seats, latestDrop, isConnected };
}
