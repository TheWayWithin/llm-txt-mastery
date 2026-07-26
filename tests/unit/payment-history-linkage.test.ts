/**
 * LTM-ISS-7: payment history must link to its local subscriptions row.
 *
 * These tests exercise the REAL handleSubscriptionUpdate exported from
 * server/routes/stripe.ts (not a fixture copy), pinning:
 *  (a) linkage written when the local subscription row exists
 *  (b) the handler upserts the row and links it when none exists
 *      (nothing else populates the subscriptions table)
 *  (c) lookup/upsert failure degrades to a null linkage — the payment-history
 *      write still happens and the handler never throws (webhook must 200).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockStorage, mockAuthStorage } = vi.hoisted(() => ({
  mockStorage: {
    getSubscriptionByStripeId: vi.fn(),
    createSubscription: vi.fn(),
    createPaymentHistory: vi.fn(),
    updateUserProfile: vi.fn(),
    getEmailCapture: vi.fn(),
    updateEmailCapture: vi.fn(),
    createEmailCapture: vi.fn(),
  },
  mockAuthStorage: {
    getUserByEmail: vi.fn(),
    updateUser: vi.fn(),
  },
}));

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

vi.mock('../../server/services/auth-storage', () => ({
  authStorage: mockAuthStorage,
}));

vi.mock('../../server/services/stripe', () => ({
  stripe: vi.fn(),
  createStripeCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  getStripeCustomer: vi.fn().mockResolvedValue({ email: 'sub-test@example.com' }),
  getCustomerSubscriptions: vi.fn(),
  validateWebhookSignature: vi.fn(),
  getTierFromPriceId: vi.fn().mockReturnValue('growth'),
  TIER_PRICES: {
    solo: { priceId: 'price_solo' },
    growth: { priceId: 'price_growth' },
    scale: { priceId: 'price_scale' },
  },
}));

// Middleware imports pulled in by the routes module; not exercised here
vi.mock('../../server/middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../../server/middleware/rate-limit', () => ({
  apiLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { handleSubscriptionUpdate } from '../../server/routes/stripe';

const activeSubscription = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub_test_123',
  status: 'active',
  customer: 'cus_test_1',
  metadata: { userId: '42', tier: 'growth' },
  items: { data: [{ price: { id: 'price_growth', unit_amount: 995, currency: 'usd' } }] },
  ...overrides,
});

describe('LTM-ISS-7: payment history <-> subscription linkage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStorage.getUserByEmail.mockResolvedValue(null);
    mockStorage.getEmailCapture.mockResolvedValue({ id: 1, email: 'sub-test@example.com' });
    mockStorage.updateEmailCapture.mockResolvedValue(undefined);
    mockStorage.updateUserProfile.mockResolvedValue(undefined);
    mockStorage.createPaymentHistory.mockResolvedValue(undefined);
  });

  it('links payment history to an existing local subscription row', async () => {
    mockStorage.getSubscriptionByStripeId.mockResolvedValue({ id: 55 });

    await handleSubscriptionUpdate(activeSubscription());

    expect(mockStorage.getSubscriptionByStripeId).toHaveBeenCalledWith('sub_test_123');
    expect(mockStorage.createSubscription).not.toHaveBeenCalled();
    expect(mockStorage.createPaymentHistory).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: 55, amount: 995, currency: 'usd', status: 'paid' })
    );
  });

  it('upserts the local subscription row and links it when none exists', async () => {
    mockStorage.getSubscriptionByStripeId.mockResolvedValue(undefined);
    mockStorage.createSubscription.mockResolvedValue({ id: 77 });

    await handleSubscriptionUpdate(activeSubscription());

    expect(mockStorage.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        stripeSubscriptionId: 'sub_test_123',
        stripeCustomerId: 'cus_test_1',
        tier: 'growth',
        status: 'active',
      })
    );
    expect(mockStorage.createPaymentHistory).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: 77 })
    );
  });

  it('records payment history with null linkage and resolves when the lookup fails', async () => {
    mockStorage.getSubscriptionByStripeId.mockRejectedValue(new Error('db down'));

    await expect(handleSubscriptionUpdate(activeSubscription())).resolves.toBeUndefined();

    expect(mockStorage.createPaymentHistory).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: null })
    );
  });

  it('writes no payment history for non-active subscriptions (unchanged behaviour)', async () => {
    await handleSubscriptionUpdate(activeSubscription({ status: 'past_due' }));

    expect(mockStorage.createPaymentHistory).not.toHaveBeenCalled();
    expect(mockStorage.getSubscriptionByStripeId).not.toHaveBeenCalled();
  });
});
