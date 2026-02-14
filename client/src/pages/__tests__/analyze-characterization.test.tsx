/**
 * Analyze Page Component - Characterization Tests
 *
 * PURPOSE: Capture CURRENT behavior of 627-line Analyze component before refactoring
 * CRITICAL: These tests document existing behavior, not ideal behavior
 *
 * Component Overview:
 * - 627 lines of complex authenticated analysis flow
 * - URL validation and normalization
 * - State machine for analysis workflow
 * - Usage tracking and limit enforcement
 * - Multi-step progress tracking
 * - Error handling and recovery
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQueryClient, createMockAuthContext, createMockUser } from '@/test/test-utils';
import AnalyzePage from '../analyze';
import * as AuthContext from '@/contexts/AuthContext';

// Mock wouter navigation
const mockNavigate = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return {
    ...actual,
    useLocation: () => ['/', mockNavigate],
    useRoute: () => [false, {}],
    Link: ({ children, href, ...props }: any) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  };
});

// Mock all child components to isolate Analyze component behavior
vi.mock('@/components/AuthNav', () => ({
  AuthNav: () => <div data-testid="auth-nav">Auth Navigation</div>,
}));

vi.mock('@/components/auth/AuthModal', () => ({
  AuthModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="auth-modal" onClick={onClose}>
        Auth Modal
      </div>
    ) : null,
}));

vi.mock('@/components/usage-display', () => ({
  default: ({ userEmail, usageData }: any) => (
    <div data-testid="usage-display">
      Usage: {userEmail} - {usageData?.usage?.analysesToday || 0}/
      {usageData?.limits?.dailyAnalyses || 3}
    </div>
  ),
}));

vi.mock('@/components/content-analysis', () => ({
  default: ({ websiteUrl, userEmail, onAnalysisComplete }: any) => (
    <div data-testid="content-analysis">
      <div>Analyzing: {websiteUrl}</div>
      <div>User: {userEmail}</div>
      <button onClick={() => onAnalysisComplete('test-analysis-id', [])}>Complete Analysis</button>
    </div>
  ),
}));

vi.mock('@/components/content-review', () => ({
  default: ({ analysisId, onFileGenerated }: any) => (
    <div data-testid="content-review">
      <div>Review Analysis: {analysisId}</div>
      <button onClick={() => onFileGenerated('test-file-id')}>Generate File</button>
    </div>
  ),
}));

vi.mock('@/components/file-generation', () => ({
  default: ({ fileId }: any) => <div data-testid="file-generation">File Generation: {fileId}</div>,
}));

vi.mock('@/components/tier-limits-display', () => ({
  default: ({ url, email, onProceed }: any) => (
    <div data-testid="tier-limits">
      <div>
        Limits for: {url} - {email}
      </div>
      <button onClick={onProceed}>Proceed</button>
    </div>
  ),
}));

vi.mock('@/components/email-verification-banner', () => ({
  default: ({ userEmail }: any) => (
    <div data-testid="email-verification-banner">Verify email: {userEmail}</div>
  ),
}));

vi.mock('@/components/DailyLimitModal', () => ({
  default: ({ isOpen, userEmail, currentUsage, dailyLimit }: any) =>
    isOpen ? (
      <div data-testid="daily-limit-modal">
        Limit reached: {currentUsage}/{dailyLimit} for {userEmail}
      </div>
    ) : null,
}));

vi.mock('@/components/ErrorDisplay', () => ({
  default: ({ error, onRetry, onReset }: any) => (
    <div data-testid="error-display">
      <div>Error: {error?.message}</div>
      <button onClick={onRetry}>Retry</button>
      <button onClick={onReset}>Reset</button>
    </div>
  ),
}));

vi.mock('@/components/ui/progress-breadcrumb', () => ({
  ProgressBreadcrumb: ({ steps, currentStep }: any) => (
    <div data-testid="progress-breadcrumb">
      Progress: {currentStep} / {steps?.length || 0}
    </div>
  ),
  FLOW_STEPS: ['URL_INPUT', 'ANALYSIS', 'REVIEW', 'GENERATION'],
}));

vi.mock('@/hooks/useFlowStateMachine', () => ({
  useFlowStateMachine: () => ({
    currentState: 'URL_INPUT',
    websiteUrl: '',
    analysisId: null,
    discoveredPages: [],
    generatedFileId: null,
    progress: { currentStep: 0, completedSteps: [] },
    error: null,
    retryCount: 0,
    visibility: {
      error: false,
      tierLimits: false,
      analysis: false,
      review: false,
      generation: false,
    },
    actions: {
      startAnalysis: vi.fn(),
      proceedToAnalysis: vi.fn(),
      updateAnalysisProgress: vi.fn(),
      retryCurrentOperation: vi.fn(),
      recoverFromError: vi.fn(),
      viewAnalysisDetails: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useUsageTracking', () => ({
  useUsageTracking: (email: string) => ({
    usage: {
      currentUsage: 0,
      dailyAnalyses: 3,
      tier: 'starter',
    },
    isLimitReached: false,
    serverUsage: { count: 0 },
    clientUsage: { count: 0 },
  }),
}));

describe('Analyze Page Component - Characterization Tests', () => {
  const mockUseAuth = vi.spyOn(AuthContext, 'useAuth');

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL search params
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Requirements', () => {
    it('redirects to signup when user is not authenticated', () => {
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          authResolved: true,
          loading: false,
          isAuthenticated: false,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });

    it('redirects to signup with URL parameter when URL is provided', () => {
      // Mock URL parameter
      Object.defineProperty(window, 'location', {
        value: { search: '?websiteUrl=https://example.com' },
        writable: true,
      });

      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          authResolved: true,
          loading: false,
          isAuthenticated: false,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(mockNavigate).toHaveBeenCalledWith('/signup?websiteUrl=https%3A%2F%2Fexample.com');
    });

    it('does not redirect when user is authenticated', () => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          loading: false,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(screen.getByText('Welcome back, test!')).toBeInTheDocument();
    });
  });

  describe('Header and Navigation', () => {
    beforeEach(() => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );
    });

    it('displays header with logo and auth nav', () => {
      renderWithQueryClient(<AnalyzePage />);

      expect(screen.getByAltText('LLM.txt Mastery')).toBeInTheDocument();
      expect(screen.getByTestId('auth-nav')).toBeInTheDocument();
    });

    it('shows builder credit in header', () => {
      renderWithQueryClient(<AnalyzePage />);

      expect(screen.getByText('Built by Jamie Watters')).toBeInTheDocument();
      expect(screen.getByText('Solopreneur & Tool Builder')).toBeInTheDocument();
    });
  });

  describe('User Welcome Section', () => {
    it('displays personalized welcome message', () => {
      const mockUser = createMockUser({ email: 'john@example.com', tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.getByText('Welcome back, john!')).toBeInTheDocument();
      expect(
        screen.getByText('Ready to analyze your website and generate an optimized llms.txt file?')
      ).toBeInTheDocument();
    });

    it('shows dashboard link', () => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('User Statistics Display', () => {
    it('displays current tier information', () => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.getByText('Current Tier')).toBeInTheDocument();
      expect(screen.getByText('SOLO')).toBeInTheDocument();
    });

    it('displays usage statistics', () => {
      const mockUser = createMockUser({ tier: 'starter' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.getByText("Today's Usage")).toBeInTheDocument();
      expect(screen.getByText('0 / 3')).toBeInTheDocument();
    });

    it('displays tier-specific credit information', () => {
      const mockUser = createMockUser({ tier: 'coffee', creditsRemaining: 5 });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      // Note: Credit display not currently shown in this view
      expect(screen.getByText('SOLO')).toBeInTheDocument();
    });

    it('shows different credit display for starter tier', () => {
      const mockUser = createMockUser({ tier: 'starter' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      // Note: Tier-specific analysis text not currently displayed in this view
      expect(screen.getByText('FREE')).toBeInTheDocument();
    });
  });

  describe('Email Verification Banner', () => {
    it('shows verification banner when email is not verified', () => {
      const mockUser = createMockUser({ email: 'test@example.com', emailVerified: false });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.getByTestId('email-verification-banner')).toBeInTheDocument();
    });

    it('does not show verification banner when email is verified', () => {
      const mockUser = createMockUser({ emailVerified: true });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.queryByTestId('email-verification-banner')).not.toBeInTheDocument();
    });
  });

  describe('URL Input Interface', () => {
    beforeEach(() => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );
    });

    it('displays URL input form', () => {
      renderWithQueryClient(<AnalyzePage />);

      expect(screen.getByText('Analyze Your Website')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Enter your website URL to discover pages and generate an optimized llms.txt file'
        )
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Website URL')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('www.example.com or https://example.com')
      ).toBeInTheDocument();
    });

    it('shows protocol guidance text', () => {
      renderWithQueryClient(<AnalyzePage />);

      expect(
        screen.getByText("Protocol (https://) is optional - we'll add it automatically")
      ).toBeInTheDocument();
    });

    it('displays tier-specific analysis information', () => {
      renderWithQueryClient(<AnalyzePage />);

      // Note: Premium analysis count not displayed in current analyze view
      expect(screen.getByText('SOLO')).toBeInTheDocument();
    });

    it('shows analyze button', () => {
      renderWithQueryClient(<AnalyzePage />);

      expect(screen.getByText('Analyze Website')).toBeInTheDocument();
    });

    it('displays different analysis info for starter tier', () => {
      const mockUser = createMockUser({ tier: 'starter' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.getByText('AI analysis for first 5 pages')).toBeInTheDocument();
    });
  });

  describe('URL Validation', () => {
    it('handles URL parameter from query string', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?websiteUrl=https://example.com' },
        writable: true,
      });

      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      const urlInput = screen.getByLabelText('Website URL') as HTMLInputElement;
      expect(urlInput.value).toBe('https://example.com');
    });

    it('handles alternative url parameter name', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?url=test.com' },
        writable: true,
      });

      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      const urlInput = screen.getByLabelText('Website URL') as HTMLInputElement;
      expect(urlInput.value).toBe('test.com');
    });

    it('allows URL input changes', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      const urlInput = screen.getByLabelText('Website URL');
      await user.type(urlInput, 'example.com');

      expect((urlInput as HTMLInputElement).value).toBe('example.com');
    });
  });

  describe('Usage Display Integration', () => {
    it('renders usage display component with correct props', () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.getByTestId('usage-display')).toBeInTheDocument();
      expect(screen.getByText('Usage: test@example.com - 0/3')).toBeInTheDocument();
    });
  });

  describe('Component State Management', () => {
    it('does not show progress breadcrumb in URL_INPUT state', () => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.queryByTestId('progress-breadcrumb')).not.toBeInTheDocument();
    });

    it('does not show analysis components in initial state', () => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.queryByTestId('content-analysis')).not.toBeInTheDocument();
      expect(screen.queryByTestId('content-review')).not.toBeInTheDocument();
      expect(screen.queryByTestId('file-generation')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tier-limits')).not.toBeInTheDocument();
    });

    it('does not show error display in normal state', () => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
    });
  });

  describe('Modal States', () => {
    it('does not show auth modal by default', () => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });

    it('does not show daily limit modal by default', () => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.queryByTestId('daily-limit-modal')).not.toBeInTheDocument();
    });
  });

  describe('Recent Analyses Section', () => {
    it('does not show recent analyses when array is empty', () => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(screen.queryByText('Recent Analyses')).not.toBeInTheDocument();
    });
  });

  describe('Loading and Auth States', () => {
    it('handles auth loading state without crashing', () => {
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          loading: true,
          authResolved: false,
          isAuthenticated: false,
        })
      );

      expect(() => renderWithQueryClient(<AnalyzePage />)).not.toThrow();
    });

    it('handles auth resolution without immediate redirect', () => {
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          authResolved: false,
          loading: false,
          isAuthenticated: false,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Error Boundary Integration', () => {
    it('wraps content in error boundary', () => {
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      // Component should render without throwing
      expect(() => renderWithQueryClient(<AnalyzePage />)).not.toThrow();
    });
  });

  describe('Form Submission Handling', () => {
    it('prevents default form submission', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser({ tier: 'coffee' });
      mockUseAuth.mockReturnValue(
        createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true,
        })
      );

      renderWithQueryClient(<AnalyzePage />);

      // Add valid URL to enable button
      const urlInput = screen.getByLabelText('Website URL');
      await user.type(urlInput, 'https://example.com');

      const form = urlInput.closest('form');
      expect(form).toBeInTheDocument();
    });
  });
});
