import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstantRefundButton } from '../InstantRefundButton';

// Mock the AuthContext
const mockGetAccessToken = vi.fn();
const mockUser = {
  id: 1,
  email: 'test@example.com',
  tier: 'solo' as const,
  creditsRemaining: 5,
  username: 'testuser',
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    getAccessToken: mockGetAccessToken,
  }),
}));

// Mock InstantRefundModal to avoid rendering complexity
vi.mock('../InstantRefundModal', () => ({
  InstantRefundModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="refund-modal">Mock Refund Modal</div> : null,
}));

describe('InstantRefundButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockReturnValue('mock-token');
    global.fetch = vi.fn();
  });

  it('should show loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { container } = render(<InstantRefundButton />);

    // Check for loading spinner by looking for the animate-spin class
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show button when eligible and within 30 days', async () => {
    const mockEligibility = {
      eligible: true,
      amount: 495,
      amountFormatted: '$4.95',
      reason: 'Within 30-day guarantee period',
      guaranteeApplies: true,
      tier: 'solo',
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockEligibility,
    });

    render(<InstantRefundButton />);

    await waitFor(() => {
      expect(screen.getByText('30-Day Money-Back Guarantee')).toBeInTheDocument();
    });

    expect(screen.getByText('$4.95')).toBeInTheDocument();
    expect(screen.getByText(/back instantly/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get Instant Refund/ })).toBeInTheDocument();
  });

  it('should hide button when not eligible', async () => {
    const mockEligibility = {
      eligible: false,
      amount: 0,
      amountFormatted: '$0.00',
      reason: 'Beyond 30-day guarantee period',
      guaranteeApplies: false,
      tier: 'solo',
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockEligibility,
    });

    render(<InstantRefundButton />);

    await waitFor(() => {
      expect(screen.queryByText('30-Day Money-Back Guarantee')).not.toBeInTheDocument();
    });
  });

  it('should hide button when guarantee does not apply', async () => {
    const mockEligibility = {
      eligible: true,
      amount: 495,
      amountFormatted: '$4.95',
      reason: 'Beyond 30-day guarantee period',
      guaranteeApplies: false, // Key: guarantee doesn't apply
      tier: 'solo',
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockEligibility,
    });

    render(<InstantRefundButton />);

    await waitFor(() => {
      expect(screen.queryByText('30-Day Money-Back Guarantee')).not.toBeInTheDocument();
    });
  });

  it('should display correct refund amount', async () => {
    const mockEligibility = {
      eligible: true,
      amount: 995,
      amountFormatted: '$9.95',
      reason: 'Within 30-day guarantee period',
      guaranteeApplies: true,
      tier: 'growth',
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockEligibility,
    });

    render(<InstantRefundButton />);

    await waitFor(() => {
      expect(screen.getByText(/\$9\.95/)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<InstantRefundButton />);

    await waitFor(() => {
      expect(screen.queryByText('30-Day Money-Back Guarantee')).not.toBeInTheDocument();
    });

    // Should not show anything when there's an error
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should call eligibility endpoint on mount', async () => {
    const mockEligibility = {
      eligible: true,
      amount: 495,
      amountFormatted: '$4.95',
      reason: 'Within 30-day guarantee period',
      guaranteeApplies: true,
      tier: 'solo',
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockEligibility,
    });

    render(<InstantRefundButton />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/refund/eligibility', {
        headers: {
          Authorization: 'Bearer mock-token',
        },
      });
    });
  });

  it('should open modal on button click', async () => {
    const user = userEvent.setup();
    const mockEligibility = {
      eligible: true,
      amount: 495,
      amountFormatted: '$4.95',
      reason: 'Within 30-day guarantee period',
      guaranteeApplies: true,
      tier: 'solo',
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockEligibility,
    });

    render(<InstantRefundButton />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get Instant Refund/ })).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /Get Instant Refund/ });
    await user.click(button);

    // Modal should be visible
    expect(screen.getByTestId('refund-modal')).toBeInTheDocument();
  });

  it('should require authentication', async () => {
    mockGetAccessToken.mockReturnValue(null);

    const mockEligibility = {
      eligible: true,
      amount: 495,
      amountFormatted: '$4.95',
      reason: 'Within 30-day guarantee period',
      guaranteeApplies: true,
      tier: 'solo',
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockEligibility,
    });

    render(<InstantRefundButton />);

    // Should not make API call without token
    await waitFor(() => {
      expect(screen.queryByText('30-Day Money-Back Guarantee')).not.toBeInTheDocument();
    });
  });
});
