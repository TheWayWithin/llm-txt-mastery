import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from '../home';
import * as AuthContext from '@/contexts/AuthContext';

// Mock all the child components to focus on auth flow logic
vi.mock('@/components/url-input', () => ({
  default: ({ onAnalysisStart, isVisible }: any) =>
    isVisible ? (
      <div data-testid="url-input">
        <button onClick={() => onAnalysisStart('https://test.com')}>Start Analysis</button>
      </div>
    ) : null,
}));

// Home still mounts EmailCapture behind `visibility.emailCapture`, but no
// reducer case in useFlowStateMachine returns the EMAIL_CAPTURE state any more,
// so this stub only exists to keep the real component out of the module graph.
vi.mock('@/components/email-capture', () => ({
  default: ({ isVisible }: any) => (isVisible ? <div data-testid="email-capture" /> : null),
}));

vi.mock('@/components/tier-limits-display', () => ({
  default: ({ isVisible }: any) =>
    isVisible ? <div data-testid="tier-limits">Tier Limits Display</div> : null,
}));

vi.mock('@/components/content-analysis', () => ({
  default: ({ isVisible }: any) =>
    isVisible ? <div data-testid="content-analysis">Content Analysis</div> : null,
}));

vi.mock('@/components/AuthNav', () => ({
  AuthNav: () => <div data-testid="auth-nav">Auth Nav</div>,
}));

vi.mock('@/components/auth/AuthModal', () => ({
  AuthModal: ({ isOpen, onClose, defaultMode }: any) =>
    isOpen ? (
      <div data-testid="auth-modal">
        <div>Auth Modal - {defaultMode}</div>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

// Mock wouter
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return {
    ...actual,
    useLocation: () => ['/', vi.fn()],
    useRoute: () => [false, {}],
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    Switch: ({ children }: any) => <div data-testid="wouter-switch">{children}</div>,
    Route: ({ children }: any) => <div data-testid="wouter-route">{children}</div>,
  };
});

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

// Unskipped and rewritten against the current Home page (LTM-ISS-22).
// Current behaviour these tests pin down:
//   - unauthenticated visitors get the marketing landing page, NOT the workflow
//   - authenticated visitors land straight in URL_INPUT and skip email capture
//   - the auth modal is opened from the demo-mode banner (the only remaining
//     caller of actions.openAuthModal that Home can actually reach)
describe('Home Component - Authentication Flow', () => {
  const mockUseAuth = vi.spyOn(AuthContext, 'useAuth');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthenticated User Flow', () => {
    it('shows the marketing landing page and no workflow step', async () => {
      mockUseAuth.mockReturnValue({
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
        recognizeEmailUser: vi.fn(),
        emailBasedUser: null,
      });

      renderWithQueryClient(<Home />);

      // Auth resolves anonymous => LANDING (useFlowStateMachine AUTH_RESOLVED),
      // so Home renders HeroSection instead of any workflow step.
      await waitFor(() => {
        expect(
          screen.getByText(/AI assistants are answering questions about your industry right now/)
        ).toBeInTheDocument();
      });

      const heroHeading = screen.getByText(
        /AI assistants are answering questions about your industry right now/
      );
      expect(heroHeading.textContent).toBe(
        'AI assistants are answering questions about your industry right now. Is your site part of the conversation?'
      );

      // No workflow steps for anonymous visitors: they sign up first.
      expect(screen.queryByTestId('url-input')).not.toBeInTheDocument();
      expect(screen.queryByTestId('email-capture')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tier-limits')).not.toBeInTheDocument();
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated User Flow', () => {
    it('skips email capture for authenticated users', async () => {
      const user = userEvent.setup();

      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'test@example.com',
          tier: 'starter',
          creditsRemaining: 0,
          emailVerified: true,
          createdAt: '2025-01-01T00:00:00Z',
        },
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: true,
        authResolved: true,
        recognizeEmailUser: vi.fn(),
        emailBasedUser: null,
      });

      renderWithQueryClient(<Home />);

      // Initially shows URL input
      expect(screen.getByTestId('url-input')).toBeInTheDocument();

      // Click start analysis
      const startButton = screen.getByText('Start Analysis');
      await user.click(startButton);

      // Should skip email capture and go directly to tier limits
      await waitFor(() => {
        expect(screen.getByTestId('tier-limits')).toBeInTheDocument();
        expect(screen.queryByTestId('email-capture')).not.toBeInTheDocument();
        expect(screen.queryByTestId('url-input')).not.toBeInTheDocument();
      });
    });

    it('handles loading state properly', async () => {
      const user = userEvent.setup();

      // Start with loading state
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: false,
        authResolved: true,
        recognizeEmailUser: vi.fn(),
        emailBasedUser: null,
      });

      const { rerender } = renderWithQueryClient(<Home />);

      // While auth is loading the machine sits in INITIALIZING: no workflow step
      // is offered yet, and the landing page is withheld too.
      expect(screen.queryByTestId('url-input')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tier-limits')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/AI assistants are answering questions about your industry right now/)
      ).not.toBeInTheDocument();

      // Simulate auth loading completion with authenticated user
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'test@example.com',
          tier: 'starter',
          creditsRemaining: 0,
          emailVerified: true,
          createdAt: '2025-01-01T00:00:00Z',
        },
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: true,
        authResolved: true,
        recognizeEmailUser: vi.fn(),
        emailBasedUser: null,
      });

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <Home />
        </QueryClientProvider>
      );

      // AUTH_RESOLVED with a user moves INITIALIZING -> URL_INPUT
      await waitFor(() => {
        expect(screen.getByTestId('url-input')).toBeInTheDocument();
      });

      // And the URL then submits straight through to the tier-limits step
      await user.click(screen.getByText('Start Analysis'));

      await waitFor(() => {
        expect(screen.getByTestId('tier-limits')).toBeInTheDocument();
        expect(screen.queryByTestId('url-input')).not.toBeInTheDocument();
      });
    });
  });

  // DELETED (LTM-ISS-22): the 'Email Pre-fill' test drove Home into the
  // EMAIL_CAPTURE state, which no reducer case in useFlowStateMachine can reach
  // any more, and it asserted nothing about pre-filling once there.

  describe('Auth Modal Integration', () => {
    // The demo-mode banner is the only path left in Home that calls
    // actions.openAuthModal(); the EmailCapture onLoginRequested wiring below it
    // is unreachable because the EMAIL_CAPTURE state is never entered.
    const demoUserAuth = {
      user: {
        id: 1,
        email: 'demo@example.com',
        tier: 'starter' as const,
        creditsRemaining: 0,
        emailVerified: true,
        createdAt: '2025-01-01T00:00:00Z',
        isDemo: true,
      },
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
      getAccessToken: vi.fn(),
      hasCredits: false,
      canAnalyze: true,
      isAuthenticated: true,
      authResolved: true,
      recognizeEmailUser: vi.fn(),
      emailBasedUser: null,
    };

    it('opens the auth modal in login mode when a demo user asks to log in', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue(demoUserAuth);

      renderWithQueryClient(<Home />);

      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Login with Real Account/ }));

      await waitFor(() => {
        expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      });
      expect(screen.getByText('Auth Modal - login')).toBeInTheDocument();
    });

    it('closes auth modal when requested', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue(demoUserAuth);

      renderWithQueryClient(<Home />);

      await user.click(screen.getByRole('button', { name: /Login with Real Account/ }));

      // Modal should be open
      await waitFor(() => {
        expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByText('Close Modal');
      await user.click(closeButton);

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
      });
    });
  });
});
