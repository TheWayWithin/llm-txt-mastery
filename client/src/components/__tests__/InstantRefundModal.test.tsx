import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstantRefundModal } from '../InstantRefundModal';

// Mock the AuthContext
const mockGetAccessToken = vi.fn();
const mockRefreshUser = vi.fn();
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
    refreshUser: mockRefreshUser,
  }),
}));

// The modal builds its request as `${getApiBaseUrl()}/api/cancel`. getApiBaseUrl()
// resolves from VITE_API_URL or window.location, so under jsdom it would otherwise
// return the real production Railway URL. Pin it so the endpoint assertion is exact.
const TEST_API_BASE = 'https://api.test.local';
vi.mock('@/lib/api-config', () => ({
  getApiBaseUrl: () => TEST_API_BASE,
}));

describe('InstantRefundModal', () => {
  const mockEligibility = {
    eligible: true,
    amount: 495,
    amountFormatted: '$4.95',
    reason: 'Within 30-day guarantee period',
    guaranteeApplies: true,
    tier: 'solo',
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessToken.mockReturnValue('mock-token');
    global.fetch = vi.fn();
    // NOTE: no global vi.useFakeTimers() here. It used to be installed for every
    // test but never advanced, so testing-library's waitFor never ticked and all
    // six interaction tests hung until the 30s timeout. Only the auto-close test
    // needs fake timers, and it installs them itself.
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should display refund amount from props', () => {
    render(
      <InstantRefundModal isOpen={true} onClose={mockOnClose} eligibility={mockEligibility} />
    );

    expect(screen.getByText('$4.95')).toBeInTheDocument();
    expect(
      screen.getByText(/Refunded to your original payment method within 5-7 business days/)
    ).toBeInTheDocument();
  });

  it('should show warning about what user will lose', () => {
    render(
      <InstantRefundModal isOpen={true} onClose={mockOnClose} eligibility={mockEligibility} />
    );

    expect(screen.getByText(/You will lose access to:/)).toBeInTheDocument();
    expect(screen.getByText(/AI-enhanced analysis/)).toBeInTheDocument();
    expect(screen.getByText(/Remaining analysis credits/)).toBeInTheDocument();
    expect(screen.getByText(/200-page analysis capability/)).toBeInTheDocument();
  });

  it('should show different benefits for growth tier', () => {
    const growthEligibility = {
      ...mockEligibility,
      tier: 'growth',
      amount: 995,
      amountFormatted: '$9.95',
    };

    render(
      <InstantRefundModal isOpen={true} onClose={mockOnClose} eligibility={growthEligibility} />
    );

    expect(screen.getByText(/100 monthly analyses/)).toBeInTheDocument();
    expect(screen.getByText(/1,000-page analysis capability/)).toBeInTheDocument();
    expect(screen.getByText(/Priority processing/)).toBeInTheDocument();
  });

  it('should call /api/cancel on confirm', async () => {
    const user = userEvent.setup({ delay: null });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Refund processed' }),
    });

    render(
      <InstantRefundModal isOpen={true} onClose={mockOnClose} eligibility={mockEligibility} />
    );

    const confirmButton = screen.getByRole('button', { name: /Confirm Refund/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`${TEST_API_BASE}/api/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          processRefund: true,
          reason: 'Instant refund via 30-day money-back guarantee',
        }),
      });
    });
  });

  it('should show loading state during processing', async () => {
    const user = userEvent.setup({ delay: null });

    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <InstantRefundModal isOpen={true} onClose={mockOnClose} eligibility={mockEligibility} />
    );

    const confirmButton = screen.getByRole('button', { name: /Confirm Refund/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  it('should show success message after completion', async () => {
    const user = userEvent.setup({ delay: null });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Refund processed' }),
    });

    render(
      <InstantRefundModal isOpen={true} onClose={mockOnClose} eligibility={mockEligibility} />
    );

    const confirmButton = screen.getByRole('button', { name: /Confirm Refund/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Refund Processing')).toBeInTheDocument();
      expect(screen.getByText(/Your refund of \$4\.95 is being processed/)).toBeInTheDocument();
    });
  });

  it('should refresh user context after success', async () => {
    const user = userEvent.setup({ delay: null });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Refund processed' }),
    });

    render(
      <InstantRefundModal isOpen={true} onClose={mockOnClose} eligibility={mockEligibility} />
    );

    const confirmButton = screen.getByRole('button', { name: /Confirm Refund/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalled();
    });
  });

  it('should handle API errors', async () => {
    const user = userEvent.setup({ delay: null });

    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: 'Refund failed' }),
    });

    render(
      <InstantRefundModal isOpen={true} onClose={mockOnClose} eligibility={mockEligibility} />
    );

    const confirmButton = screen.getByRole('button', { name: /Confirm Refund/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Refund failed')).toBeInTheDocument();
    });

    // Should not close modal on error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should close on cancel button', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <InstantRefundModal isOpen={true} onClose={mockOnClose} eligibility={mockEligibility} />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show "cannot be undone" warning', () => {
    render(
      <InstantRefundModal isOpen={true} onClose={mockOnClose} eligibility={mockEligibility} />
    );

    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
    expect(screen.getByText(/downgraded to the Starter tier immediately/)).toBeInTheDocument();
  });

  it('should auto-close and reload 3 seconds after a successful refund', async () => {
    // New cover: the component schedules onClose() + window.location.reload() on a
    // 3s timer after success. Nothing asserted it, so the downgrade-then-reload step
    // of the refund path was untested.
    // Fake timers must be installed BEFORE the click, otherwise the component's
    // setTimeout is scheduled on real timers and advanceTimersByTime cannot reach it.
    // shouldAdvanceTime keeps waitFor and userEvent ticking while they are faked.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, reload },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Refund processed' }),
    });

    try {
      render(
        <InstantRefundModal isOpen={true} onClose={mockOnClose} eligibility={mockEligibility} />
      );

      await user.click(screen.getByRole('button', { name: /Confirm Refund/ }));
      await waitFor(() => expect(screen.getByText('Refund Processing')).toBeInTheDocument());

      // Before the timer fires, neither has happened.
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(reload).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);

      expect(mockOnClose).toHaveBeenCalled();
      expect(reload).toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });

  it('should not render when closed', () => {
    render(
      <InstantRefundModal isOpen={false} onClose={mockOnClose} eligibility={mockEligibility} />
    );

    expect(screen.queryByText('Confirm Instant Refund')).not.toBeInTheDocument();
  });
});
