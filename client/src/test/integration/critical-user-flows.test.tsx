/**
 * Critical User Flows - Integration Tests
 *
 * PURPOSE: Test complete user journeys that span multiple components
 * CRITICAL: These tests ensure component integration doesn't break during refactoring
 *
 * Critical Flows Covered:
 * 1. Unauthenticated User → Email Capture → Auth → Analysis
 * 2. Authenticated User → Direct Analysis Flow
 * 3. Tier Selection → Payment Flow Integration
 * 4. Error Recovery → Reset Flow
 * 5. Multi-step Analysis → File Generation
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithQueryClient, createMockAuthContext, createMockUser } from '@/test/test-utils';
import * as AuthContext from '@/contexts/AuthContext';

// Mock wouter navigation
const mockNavigate = vi.fn();
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
  useRoute: () => [false, {}],
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

// Import components after mocks are set up
import Home from '@/pages/home';
import AnalyzePage from '@/pages/analyze';
import EmailCapture from '@/components/email-capture';

// Unskipped and realigned with the current /analyze UI (LTM-ISS-22): tier names
// come from getTierDisplayName ("Solo"/"Starter"/"Growth", not "SOLO"/"FREE"),
// the verification banner is a shadcn Alert with no test id, and UsageDisplay
// renders only once the shared ['/api/usage', email] query has data.
describe('Critical User Flows - Integration Tests', () => {
  const mockUseAuth = vi.spyOn(AuthContext, 'useAuth');

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    });
  });

  // getTierDisplayName renders in two places on /analyze (the AuthNav badge and
  // the "Current Tier" quick stat), so scope tier assertions to the quick stat.
  const currentTierStat = () =>
    (screen.getByText('Current Tier').parentElement as HTMLElement).textContent;

  describe('Flow 1: Unauthenticated User Journey', () => {
    it('should guide user from homepage through email capture to auth', async () => {
      const user = userEvent.setup();

      // Start with unauthenticated user
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: null,
          isAuthenticated: false,
          authResolved: true,
        })
      );

      // Mock Home component simplified behavior
      const MockHome = () => {
        const [showEmailCapture, setShowEmailCapture] = React.useState(false);
        const [websiteUrl, setWebsiteUrl] = React.useState('');

        return (
          <div>
            {!showEmailCapture ? (
              <div>
                <h1>LLM.txt Mastery</h1>
                <button
                  onClick={() => {
                    setWebsiteUrl('https://example.com');
                    setShowEmailCapture(true);
                  }}
                >
                  Start Analysis
                </button>
              </div>
            ) : (
              <EmailCapture
                websiteUrl={websiteUrl}
                onEmailCaptured={(email, tier) => {
                  console.log('Email captured:', email, tier);
                }}
                isVisible={true}
              />
            )}
          </div>
        );
      };

      renderWithQueryClient(<MockHome />);

      // User starts on homepage
      expect(screen.getByText('LLM.txt Mastery')).toBeInTheDocument();

      // User clicks start analysis
      await user.click(screen.getByText('Start Analysis'));

      // User sees email capture with tier selection
      await waitFor(() => {
        expect(screen.getByText('Choose Your Analysis Type')).toBeInTheDocument();
      });

      // Default coffee tier should be selected
      expect(screen.getByRole('radio', { name: /coffee/i })).toBeChecked();

      // User can click Sign Up to proceed
      expect(screen.getByText('Sign Up')).toBeInTheDocument();

      // Click Sign Up should navigate with correct parameters
      await user.click(screen.getByText('Sign Up'));

      expect(mockSetLocation).toHaveBeenCalledWith(
        '/signup?tier=solo&website=https%3A%2F%2Fexample.com'
      );
    });

    it('should handle tier switching before auth', async () => {
      const user = userEvent.setup();

      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: null,
          isAuthenticated: false,
          authResolved: true,
        })
      );

      renderWithQueryClient(
        <EmailCapture websiteUrl="https://test.com" onEmailCaptured={vi.fn()} isVisible={true} />
      );

      // Initially coffee tier selected
      expect(screen.getByRole('radio', { name: /coffee/i })).toBeChecked();

      // Switch to growth tier
      await user.click(screen.getByText('Professional Power ($9.95/mo)'));

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /growth/i })).toBeChecked();
      });

      // Sign up should use new tier
      await user.click(screen.getByText('Sign Up'));

      expect(mockSetLocation).toHaveBeenCalledWith(
        '/signup?tier=growth&website=https%3A%2F%2Ftest.com'
      );
    });
  });

  describe('Flow 2: Authenticated User Direct Analysis', () => {
    it('should allow authenticated user to go directly to analysis', () => {
      const mockUser = createMockUser({
        email: 'user@example.com',
        tier: 'solo',
        creditsRemaining: 5,
      });

      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          isAuthenticated: true,
          authResolved: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      // Should show analysis page immediately
      expect(screen.getByText('Welcome back, user!')).toBeInTheDocument();
      expect(screen.getByText('Analyze Your Website')).toBeInTheDocument();
      expect(screen.getByLabelText('Website URL')).toBeInTheDocument();

      // Should show user stats: tier stat uses getTierDisplayName('solo')
      expect(currentTierStat()).toBe('Current TierSolo');
      // ...and the URL-input hint reports the user's remaining Solo credits
      expect(screen.getByText('5 premium analyses remaining')).toBeInTheDocument();
    });

    it('should handle URL prefill for authenticated users', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?websiteUrl=https://prefilled.com' },
        writable: true,
      });

      const mockUser = createMockUser();
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          isAuthenticated: true,
          authResolved: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      const urlInput = screen.getByLabelText('Website URL') as HTMLInputElement;
      expect(urlInput.value).toBe('https://prefilled.com');
    });
  });

  describe('Flow 3: Email Verification Integration', () => {
    it('should show email verification banner when needed', () => {
      const mockUser = createMockUser({
        email: 'unverified@example.com',
        emailVerified: false,
      });

      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          isAuthenticated: true,
          authResolved: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      // EmailVerificationBanner renders a shadcn <Alert role="alert">; its copy is
      // split across two spans, so assert the assembled text of the alert itself.
      const banner = screen.getByText('Verify your email address').closest('[role="alert"]');
      expect(banner).not.toBeNull();
      expect(banner!.textContent).toContain(
        'Verify your email addressto unlock all features including password reset and tier upgrades.'
      );
      expect(
        within(banner as HTMLElement).getByRole('button', { name: 'Resend Email' })
      ).toBeInTheDocument();
    });

    it('should not show verification banner for verified users', () => {
      const mockUser = createMockUser({
        emailVerified: true,
      });

      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          isAuthenticated: true,
          authResolved: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.queryByText('Verify your email address')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Resend Email' })).not.toBeInTheDocument();
    });
  });

  describe('Flow 4: Tier-Based Feature Access', () => {
    it('should show different analysis limits for different tiers', () => {
      // Test starter tier limits
      const starterUser = createMockUser({ tier: 'starter' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: starterUser,
          isAuthenticated: true,
          authResolved: true,
        })
      );

      const { rerender } = renderWithQueryClient(<AnalyzePage />);

      expect(screen.getByText('AI analysis for first 5 pages')).toBeInTheDocument();
      expect(currentTierStat()).toBe('Current TierStarter');
      expect(screen.getByText('Upgrade Available')).toBeInTheDocument();

      // Test Solo tier limits (the tier that replaced "Coffee")
      const soloUser = createMockUser({
        tier: 'solo',
        creditsRemaining: 3,
      });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: soloUser,
          isAuthenticated: true,
          authResolved: true,
        })
      );

      rerender(<AnalyzePage />);

      expect(screen.getByText('3 premium analyses remaining')).toBeInTheDocument();
      expect(currentTierStat()).toBe('Current TierSolo');
      expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
      expect(screen.queryByText('AI analysis for first 5 pages')).not.toBeInTheDocument();
    });

    it('should show growth tier limits', () => {
      const growthUser = createMockUser({ tier: 'growth' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: growthUser,
          isAuthenticated: true,
          authResolved: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      // Growth is metered, not unlimited: 35 AI-enhanced analyses a month.
      expect(currentTierStat()).toBe('Current TierGrowth');
      expect(screen.getByText('35 AI-enhanced analyses/month')).toBeInTheDocument();
      expect(screen.getByText('Pro Features Active')).toBeInTheDocument();
      expect(screen.getByText('500 pages per site')).toBeInTheDocument();
    });
  });

  describe('Flow 5: Navigation Integration', () => {
    it('should handle login vs signup navigation correctly', async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <EmailCapture
          websiteUrl="https://nav-test.com"
          onEmailCaptured={vi.fn()}
          isVisible={true}
        />
      );

      // Test login navigation
      await user.click(screen.getByText('Sign In'));
      expect(mockSetLocation).toHaveBeenCalledWith(
        '/login?tier=solo&website=https%3A%2F%2Fnav-test.com'
      );

      // Reset mock
      mockSetLocation.mockClear();

      // Test signup navigation
      await user.click(screen.getByText('Sign Up'));
      expect(mockSetLocation).toHaveBeenCalledWith(
        '/signup?tier=solo&website=https%3A%2F%2Fnav-test.com'
      );
    });

    it('should handle dashboard navigation from analyze page', () => {
      const mockUser = createMockUser();
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          isAuthenticated: true,
          authResolved: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Flow 6: Component State Persistence', () => {
    it('should maintain tier selection state across interactions', async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <EmailCapture
          websiteUrl="https://state-test.com"
          onEmailCaptured={vi.fn()}
          isVisible={true}
        />
      );

      // Switch from coffee to growth tier
      await user.click(screen.getByText('Professional Power ($9.95/mo)'));

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /growth/i })).toBeChecked();
      });

      // Switch back to coffee
      await user.click(screen.getByText('Coffee Power ($4.95/month)'));

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /coffee/i })).toBeChecked();
        expect(screen.getByRole('radio', { name: /growth/i })).not.toBeChecked();
      });

      // Auth buttons should still work with current selection
      await user.click(screen.getByText('Sign Up'));
      expect(mockSetLocation).toHaveBeenCalledWith(
        '/signup?tier=solo&website=https%3A%2F%2Fstate-test.com'
      );
    });
  });

  describe('Flow 7: Error Boundary Integration', () => {
    it('should handle component errors gracefully', () => {
      // Mock console.error to avoid test noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockUser = createMockUser();
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          isAuthenticated: true,
          authResolved: true,
        })
      );

      // Component should render without throwing even with complex state
      expect(() => renderWithQueryClient(<AnalyzePage />)).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Flow 8: URL Parameter Handling', () => {
    it('should handle various URL parameter formats', () => {
      const testCases = [
        { search: '?websiteUrl=https://test.com', expected: 'https://test.com' },
        { search: '?url=example.com', expected: 'example.com' },
        { search: '?websiteUrl=test.com&other=param', expected: 'test.com' },
        { search: '', expected: '' },
      ];

      testCases.forEach(({ search, expected }) => {
        Object.defineProperty(window, 'location', {
          value: { search },
          writable: true,
        });

        const mockUser = createMockUser();
        mockUseAuth.mockReturnValue(
          createMockAuthContext({
            user: mockUser,
            isAuthenticated: true,
            authResolved: true,
          })
        );

        const { unmount } = renderWithQueryClient(<AnalyzePage />);

        const urlInput = screen.getByLabelText('Website URL') as HTMLInputElement;
        expect(urlInput.value).toBe(expected);

        unmount();
      });
    });
  });

  describe('Flow 9: Authentication State Transitions', () => {
    it('should handle auth loading to authenticated transition', () => {
      // Start with loading state
      const { rerender } = renderWithQueryClient(<AnalyzePage />);
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          loading: true,
          authResolved: false,
        })
      );

      rerender(<AnalyzePage />);

      // Should not redirect during loading
      expect(mockSetLocation).not.toHaveBeenCalled();

      // Transition to authenticated
      const mockUser = createMockUser();
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          loading: false,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      rerender(<AnalyzePage />);

      // Should show authenticated content
      expect(screen.getByText('Welcome back, test!')).toBeInTheDocument();
      expect(mockSetLocation).not.toHaveBeenCalled();
    });

    it('should redirect after auth resolves to unauthenticated', () => {
      // Start with unresolved auth
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          loading: false,
          authResolved: false,
        })
      );

      const { rerender } = renderWithQueryClient(<AnalyzePage />);

      expect(mockSetLocation).not.toHaveBeenCalled();

      // Resolve to unauthenticated
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          loading: false,
          authResolved: true,
          isAuthenticated: false,
        })
      );

      rerender(<AnalyzePage />);

      expect(mockSetLocation).toHaveBeenCalledWith('/signup');
    });
  });

  describe('Flow 10: Component Interaction Dependencies', () => {
    it('should show usage display only for authenticated users', () => {
      // Unauthenticated - no usage display expected in analyze page
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          authResolved: true,
          isAuthenticated: false,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      // Should redirect, and render nothing at all (no usage panel) before it
      expect(mockSetLocation).toHaveBeenCalledWith('/signup');
      expect(screen.queryByText("Today's Progress")).not.toBeInTheDocument();

      // Test authenticated state. UsageDisplay renders null until the shared
      // ['/api/usage', email] query has data, so seed the cache rather than
      // letting it hit the network.
      mockSetLocation.mockClear();
      const mockUser = createMockUser({ email: 'test@example.com', tier: 'starter' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      queryClient.setQueryData(['/api/usage', 'test@example.com'], {
        tier: 'starter',
        usage: { analysesToday: 1, cacheHitsToday: 2 },
        limits: { dailyAnalyses: 3, maxPagesPerAnalysis: 20, aiPagesLimit: 5 },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AnalyzePage />
        </QueryClientProvider>
      );

      // The real UsageDisplay is mounted with that user's email
      expect(screen.getByText("Today's Progress")).toBeInTheDocument();
      const dailyRow = screen.getByText('Daily Analyses').parentElement as HTMLElement;
      expect(dailyRow.textContent).toBe('Daily Analyses1 / 3');
      expect(screen.getByText('• 3 free analyses per day')).toBeInTheDocument();
      expect(mockSetLocation).not.toHaveBeenCalled();
    });
  });
});
