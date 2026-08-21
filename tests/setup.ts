import '@testing-library/jest-dom/vitest';

// Mock window.maiDesktop for tests
Object.defineProperty(window, 'maiDesktop', {
  writable: true,
  value: undefined,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock crypto.randomUUID
if (!global.crypto) {
  global.crypto = {} as unknown as Crypto;
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = (() =>
    '00000000-0000-4000-a000-000000000000') as unknown as () => `${string}-${string}-${string}-${string}-${string}`;
}
