import '@testing-library/jest-dom';

// Sprint 16: Set required env vars for server-side tests BEFORE any imports
// that validate them at module load time (e.g. server/services/auth.ts).
// These are dummy values used only for tests — real secrets come from .env in dev/prod.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-64-characters-long-for-security-validation-padding';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-at-least-64-characters-long-for-security-validation';
}
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'sk-test-dummy-key-for-tests-only';
}

// Sprint 16: This setup file runs in BOTH jsdom and node environments
// (configured per-test-file in vitest.config.ts). Server-side tests run
// in node where `window` doesn't exist, so guard all browser API mocks.
const isBrowserLike = typeof window !== 'undefined';

if (isBrowserLike) {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock window.ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Sprint 16: Mock IntersectionObserver — jsdom does not implement it natively,
  // but several components (lazy loading, infinite scroll, scroll-spy) instantiate it.
  class MockIntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [];
    disconnect() {}
    observe() {}
    takeRecords() { return []; }
    unobserve() {}
  }
  global.IntersectionObserver = MockIntersectionObserver as any;
  window.IntersectionObserver = MockIntersectionObserver as any;
}
