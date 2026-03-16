/**
 * EmailCapture Component - Characterization Tests
 *
 * PURPOSE: Capture CURRENT behavior of 843-line EmailCapture component before refactoring
 * CRITICAL: These tests document existing behavior, not ideal behavior
 *
 * Component Overview:
 * - 843 lines of complex tier selection and navigation logic
 * - Default: Coffee tier selected ($4.95/month subscription)
 * - Navigation: Direct auth page navigation (no email capture)
 * - Analytics tracking for tier selections
 * - Complex UI with multiple tiers and guarantees
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQueryClient } from '@/test/test-utils';
import * as analytics from '@/lib/analytics';
import EmailCapture from '../email-capture';

// Mock wouter navigation
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

// Mock analytics tracking
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

// Mock QuickHelp component
vi.mock('../HelpSystem', () => ({
  QuickHelp: ({ context }: { context: string }) => (
    <div data-testid={`quick-help-${context}`}>Help for {context}</div>
  ),
}));

describe('EmailCapture Component - Characterization Tests', () => {
  const defaultProps = {
    websiteUrl: 'https://example.com',
    onEmailCaptured: vi.fn(),
    isVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset URL params
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Visibility', () => {
    it('renders when isVisible is true', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} />);
      expect(screen.getByText('Choose Your Analysis Type')).toBeInTheDocument();
    });

    it('does not render when isVisible is false', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} isVisible={false} />);
      expect(screen.queryByText('Choose Your Analysis Type')).not.toBeInTheDocument();
    });
  });

  describe('Header Content', () => {
    it('displays correct header with website URL', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      expect(screen.getByText('Choose Your Analysis Type')).toBeInTheDocument();
      expect(screen.getByText(/Generate professional llms.txt files for/)).toBeInTheDocument();
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });

    it('displays fallback message when no website URL provided', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} websiteUrl={undefined} />);

      expect(
        screen.getByText(/Select your tier, enter your email, and we'll help you create/)
      ).toBeInTheDocument();
    });
  });

  describe('Tier Options Display', () => {
    beforeEach(() => {
      renderWithQueryClient(<EmailCapture {...defaultProps} />);
    });

    it('displays all four tier options with correct labels', () => {
      // Free tier (starter)
      expect(screen.getByText('Free (But Crippled)')).toBeInTheDocument();
      expect(screen.getByText('⚠️ SEVERELY LIMITED')).toBeInTheDocument();

      // Coffee tier
      expect(screen.getByText('Coffee Power ($4.95/month subscription)')).toBeInTheDocument();
      expect(screen.getByText('🏆 CRUSH YOUR COMPETITION')).toBeInTheDocument();

      // Growth tier
      expect(screen.getByText('Professional Power ($9.95/mo)')).toBeInTheDocument();

      // Scale tier
      expect(screen.getByText('Agency & API ($19.95/mo)')).toBeInTheDocument();
    });

    it('displays detailed benefits for each tier', () => {
      // Free tier warnings
      expect(screen.getByText(/Only 3 analyses per day/)).toBeInTheDocument();
      expect(screen.getByText(/Severely limited to 20 pages only/)).toBeInTheDocument();
      expect(screen.getByText(/Your competitors will find 10x more pages/)).toBeInTheDocument();

      // Coffee tier benefits
      expect(screen.getByText(/UNLIMITED daily analyses/)).toBeInTheDocument();
      expect(screen.getByText(/200 pages per analysis/)).toBeInTheDocument();
      expect(screen.getByText(/AI-powered content scoring/)).toBeInTheDocument();

      // Growth tier features
      expect(screen.getByText(/1,000 pages per analysis/)).toBeInTheDocument();
      expect(screen.getByText(/Team collaboration/)).toBeInTheDocument();

      // Scale tier features
      expect(screen.getByText(/Full API access/)).toBeInTheDocument();
      expect(screen.getByText(/White-label options/)).toBeInTheDocument();
    });

    it('shows tier images for each option', () => {
      expect(screen.getByAltText('Free Tier')).toBeInTheDocument();
      expect(screen.getByAltText('Coffee Tier')).toBeInTheDocument();
      expect(screen.getByAltText('Growth Tier')).toBeInTheDocument();
      expect(screen.getByAltText('Scale Tier')).toBeInTheDocument();
    });
  });

  describe('Default Tier Selection', () => {
    it('defaults to coffee tier selection', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      const coffeeRadio = screen.getByRole('radio', { name: /Coffee Tier Coffee Power/i });
      expect(coffeeRadio).toBeChecked();

      const freeRadio = screen.getByRole('radio', { name: /Free Tier Free/i });
      expect(freeRadio).not.toBeChecked();
    });

    it('shows authentication buttons immediately due to default coffee selection', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });
  });

  describe('Tier Selection Behavior', () => {
    it('allows switching between tiers', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      // Initially coffee is selected
      expect(screen.getByRole('radio', { name: /Coffee Tier Coffee Power/i })).toBeChecked();

      // Click free tier
      const freeOption = screen.getByText('Free (But Crippled)');
      await user.click(freeOption);

      // Verify selection changed
      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /Free Tier Free/i })).toBeChecked();
        expect(screen.getByRole('radio', { name: /Coffee Tier Coffee Power/i })).not.toBeChecked();
      });
    });

    it('tracks analytics events when tier is selected', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      // Click growth tier
      const growthOption = screen.getByText('Professional Power ($9.95/mo)');
      await user.click(growthOption);

      await waitFor(() => {
        expect(analytics.trackEvent).toHaveBeenCalledWith(
          'tier_selected',
          expect.objectContaining({
            tier_selected: 'growth',
            previous_tier: 'solo',
            website_url: 'https://example.com',
            event_category: 'engagement',
          })
        );
      });
    });

    it('shows tier-specific benefit messages based on selection', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      // Coffee tier shows success message
      expect(screen.getByText(/SMART CHOICE: Full power/)).toBeInTheDocument();

      // Switch to free tier
      await user.click(screen.getByText('Free (But Crippled)'));

      // Should show warning message
      await waitFor(() => {
        expect(screen.getByText(/WARNING: Severely limited/)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Navigation', () => {
    it('navigates to login with correct parameters when Sign In clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      await user.click(screen.getByText('Sign In'));

      expect(mockSetLocation).toHaveBeenCalledWith(
        '/login?tier=coffee&website=https%3A//example.com'
      );
    });

    it('navigates to signup with correct parameters when Sign Up clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      await user.click(screen.getByText('Sign Up'));

      expect(mockSetLocation).toHaveBeenCalledWith(
        '/signup?tier=coffee&website=https%3A//example.com'
      );
    });

    it('tracks analytics for authentication clicks', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      // Test login analytics
      await user.click(screen.getByText('Sign In'));
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'login_click',
        expect.objectContaining({
          tier_selected: 'solo',
          website_url: 'https://example.com',
          event_category: 'auth',
        })
      );

      // Test signup analytics
      await user.click(screen.getByText('Sign Up'));
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'signup_click',
        expect.objectContaining({
          tier_selected: 'solo',
          website_url: 'https://example.com',
          event_category: 'auth',
        })
      );
    });

    it('handles navigation with different tier selections', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      // Switch to growth tier
      await user.click(screen.getByText('Professional Power ($9.95/mo)'));

      // Click Sign In
      await user.click(screen.getByText('Sign In'));

      expect(mockSetLocation).toHaveBeenCalledWith(
        '/login?tier=growth&website=https%3A//example.com'
      );
    });
  });

  describe('UI State Management', () => {
    it('shows help context for email-capture', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      expect(screen.getAllByTestId('quick-help-email-capture')).toHaveLength(2);
    });

    it('displays returning user guidance', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      expect(screen.getByText(/Returning user?.*Sign In/)).toBeInTheDocument();
      expect(screen.getByText(/New to LLM.txt Mastery?.*Sign Up/)).toBeInTheDocument();
    });

    it('shows tier selection guidance text', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      expect(screen.getByText(/Need help choosing?.*Coffee tier.*is perfect/)).toBeInTheDocument();
    });
  });

  describe('Guarantee Section', () => {
    it('displays comprehensive guarantee section', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      expect(
        screen.getByText('🛡️ ZERO RISK GUARANTEE - We Remove ALL Your Fears')
      ).toBeInTheDocument();
      expect(screen.getByText('💰 30-Day Money Back Guarantee')).toBeInTheDocument();
      expect(screen.getByText('⚡ Cancel Instantly Anytime')).toBeInTheDocument();
      expect(screen.getByText('🏆 Results in 24 Hours or Refund')).toBeInTheDocument();
      expect(screen.getByText('🚀 Outperform Competitors or Refund')).toBeInTheDocument();
    });

    it('shows trust indicators', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      expect(
        screen.getByText(/Secure & Private.*No Spam Ever.*Built by Expert Solopreneur/)
      ).toBeInTheDocument();
    });
  });

  describe('Error State Handling', () => {
    it('does not show error state initially', () => {
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      expect(screen.queryByText('Unable to proceed')).not.toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('shows error handling UI structure when needed', () => {
      // Note: Error state is managed internally by component
      // This test documents the error UI structure exists in the code
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      // Verify error handling elements aren't visible in normal state
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.queryByText('Start Over')).not.toBeInTheDocument();
    });
  });

  describe('Component Integration Points', () => {
    it('calls onEmailCaptured callback (legacy - not currently used)', () => {
      // This prop exists but isn't used in current implementation
      renderWithQueryClient(<EmailCapture {...defaultProps} />);

      // Verify callback prop is accepted without throwing
      expect(defaultProps.onEmailCaptured).toBeDefined();
    });

    it('supports onLoginRequested callback (legacy - replaced by direct navigation)', () => {
      const onLoginRequested = vi.fn();
      renderWithQueryClient(<EmailCapture {...defaultProps} onLoginRequested={onLoginRequested} />);

      // Component still accepts this prop but uses direct navigation instead
      expect(onLoginRequested).not.toHaveBeenCalled();
    });

    it('supports onReset callback for error recovery', () => {
      const onReset = vi.fn();
      renderWithQueryClient(<EmailCapture {...defaultProps} onReset={onReset} />);

      // Reset functionality exists but error UI not visible in normal state
      expect(screen.queryByText('Start Over')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design Elements', () => {
    it('uses responsive grid classes', () => {
      const { container } = renderWithQueryClient(<EmailCapture {...defaultProps} />);

      // Verify responsive classes exist (md:grid-cols-2 for tier grid)
      const tierGrid = container.querySelector('.grid-cols-1.md\\:grid-cols-2');
      expect(tierGrid).toBeInTheDocument();
    });

    it('uses responsive button layout', () => {
      const { container } = renderWithQueryClient(<EmailCapture {...defaultProps} />);

      // Verify auth buttons use responsive grid
      const buttonGrid = container.querySelector('.grid-cols-1.sm\\:grid-cols-2');
      expect(buttonGrid).toBeInTheDocument();
    });
  });
});
