import '@testing-library/jest-dom/vitest';

class MockEventSource {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  close = () => {};

  constructor(url: string) {
    this.url = url;
  }
}

if (typeof globalThis.EventSource === 'undefined') {
  // @ts-expect-error MockEventSource for testing environment
  globalThis.EventSource = MockEventSource;
}
