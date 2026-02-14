import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement } from 'react';
import { vi } from 'vitest';

// Common wouter mock setup
export const createWouterMock = () => {
  return {
    useLocation: vi.fn(() => ['/', vi.fn()]),
    useRoute: vi.fn(() => [false, {}]),
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    Switch: ({ children }: any) => <div data-testid="wouter-switch">{children}</div>,
    Route: ({ children }: any) => <div data-testid="wouter-route">{children}</div>,
  };
};

// Custom render function with QueryClient
export const renderWithQueryClient = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock auth context helper - must match AuthContextType interface
export const createMockAuthContext = (overrides = {}) => {
  return {
    user: null,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshUser: vi.fn(),
    getAccessToken: vi.fn(),
    hasCredits: false,
    canAnalyze: true,
    isAuthenticated: false,
    authResolved: true,
    // Added Aug 2025 for email-based auth flow
    recognizeEmailUser: vi.fn().mockResolvedValue(null),
    emailBasedUser: null,
    ...overrides,
  };
};

// Mock authenticated user
export const createMockUser = (overrides = {}) => {
  return {
    id: '1',
    email: 'test@example.com',
    tier: 'coffee',
    ...overrides,
  };
};

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
