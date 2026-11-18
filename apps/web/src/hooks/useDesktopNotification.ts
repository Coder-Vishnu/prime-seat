// apps/web/src/hooks/useDesktopNotification.ts
import { useState, useEffect, useCallback, useRef } from 'react';

export function useDesktopNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err: unknown) {
      console.error('Error requesting notification permission:', err);
      return 'denied';
    }
  }, []);

  const playChime = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Synthesize a pleasant two-tone reclamation chime (A5 = 880Hz, E6 = 1320Hz, A6 = 1760Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.25);

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.05);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch (err: unknown) {
      console.warn('Unable to play audio chime:', err);
    }
  }, []);

  const triggerNotification = useCallback(
    (title: string, options?: NotificationOptions): Notification | null => {
      if (typeof window === 'undefined' || !('Notification' in window)) return null;

      if (Notification.permission === 'granted') {
        playChime();
        return new Notification(title, {
          icon: '/icons/seat-icon-192.png',
          badge: '/icons/badge-72.png',
          ...options,
        });
      }
      return null;
    },
    [playChime]
  );

  return {
    permission,
    isSupported,
    requestPermission,
    playChime,
    triggerNotification,
  };
}
