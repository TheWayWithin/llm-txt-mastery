/**
 * LTM-ISS-8: Stripe API migration 2024-06-20 -> 2025-08-27.basil.
 *
 * The only breaking release in that range is 2025-03-31.basil, which
 *  - removed invoice.subscription (now invoice.parent.subscription_details.subscription)
 *  - removed invoice.payment_intent (now the invoice.payments list)
 *  - moved subscription.current_period_* onto items.data[].current_period_*
 *
 * Webhook event shapes follow the ENDPOINT's API version (a dashboard setting),
 * so during migration the code must accept BOTH shapes. These tests pin that:
 * old-shape events keep working exactly as today, new-shape events resolve the
 * same values, and handlers never throw either way.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockStorage, mockAuthStorage, mockStripeClient } = vi.hoisted(() => ({
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
  mockStripeClient: {
    invoices: { retrieve: vi.fn() },
  },
}));

vi.mock('../../server/storage', () => ({ storage: mockStorage }));
vi.mock('../../server/services/auth-storage', () => ({ authStorage: mockAuthStorage }));
vi.mock('../../server/services/usage', () => ({
  handleSubscriptionRenewal: vi.fn(),
}));
vi.mock('../../server/services/stripe', () => ({
  stripe: () => mockStripeClient,
  createStripeCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
  createOneTimeCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  getStripeCustomer: vi.fn().mockResolvedValue({ email: 'basil-test@example.com' }),
  getCustomerSubscriptions: vi.fn(),
  validateWebhookSignature: vi.fn(),
  getTierFromPriceId: vi.fn().mockReturnValue('growth'),
  TIER_PRICES: {
    solo: { priceId: 'price_solo' },
    growth: { priceId: 'price_growth' },
    scale: { priceId: 'price_scale' },
  },
}));
vi.mock('../../server/middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../../server/middleware/rate-limit', () => ({
  apiLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { handlePaymentSucceeded, handlePaymentFailed } from '../../server/routes/stripe';
import {
  subscriptionPeriodEnd,
  resolveInvoicePaymentIntentId,
  effectiveSubscriptionEndAt,
  isCancellationScheduled,
} from '../../server/services/cancellation';

const renewalInvoiceBase = {
  id: 'in_test_1',
  customer_email: 'basil-test@example.com',
  billing_reason: 'subscription_cycle',
  amount_paid: 495,
  currency: 'usd',
};

describe('LTM-ISS-8: invoice.subscription dual-shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStorage.getUserByEmail.mockResolvedValue({
      id: 9,
      tier: 'solo',
      email: 'basil-test@example.com',
    });
    mockAuthStorage.updateUser.mockResolvedValue(true);
  });

  it('old shape (invoice.subscription) still triggers renewal handling', async () => {
    await handlePaymentSucceeded({ ...renewalInvoiceBase, subscription: 'sub_old_1' });
    expect(mockAuthStorage.updateUser).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ creditsRemaining: 20 })
    );
  });

  it('basil shape (invoice.parent.subscription_details) triggers the same renewal handling', async () => {
    await handlePaymentSucceeded({
      ...renewalInvoiceBase,
      parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_new_1' } },
    });
    expect(mockAuthStorage.updateUser).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ creditsRemaining: 20 })
    );
  });

  it('non-subscription invoice (neither shape) returns early without throwing', async () => {
    await expect(handlePaymentSucceeded({ ...renewalInvoiceBase })).resolves.toBeUndefined();
    expect(mockAuthStorage.updateUser).not.toHaveBeenCalled();
  });

  it('handlePaymentFailed resolves for both shapes', async () => {
    await expect(
      handlePaymentFailed({ id: 'in_f', subscription: 'sub_old' })
    ).resolves.toBeUndefined();
    await expect(
      handlePaymentFailed({
        id: 'in_f2',
        parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_new' } },
      })
    ).resolves.toBeUndefined();
  });
});

describe('LTM-ISS-8: subscription.current_period_end dual-shape', () => {
  it('reads the legacy top-level field (pre-basil responses)', () => {
    expect(subscriptionPeriodEnd({ current_period_end: 1750000000 })).toBe(1750000000);
  });

  it('reads items.data[0].current_period_end (basil responses)', () => {
    expect(subscriptionPeriodEnd({ items: { data: [{ current_period_end: 1760000000 }] } })).toBe(
      1760000000
    );
  });

  it('prefers the legacy field when both exist and is undefined when neither does', () => {
    expect(
      subscriptionPeriodEnd({ current_period_end: 1, items: { data: [{ current_period_end: 2 }] } })
    ).toBe(1);
    expect(subscriptionPeriodEnd({})).toBeUndefined();
  });
});

describe('LTM-ISS-8: invoice payment-intent resolution dual-shape', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses invoice.payment_intent directly when present (pre-basil, string and object)', async () => {
    expect(await resolveInvoicePaymentIntentId({ id: 'in_1', payment_intent: 'pi_1' })).toBe(
      'pi_1'
    );
    expect(
      await resolveInvoicePaymentIntentId({ id: 'in_2', payment_intent: { id: 'pi_2' } })
    ).toBe('pi_2');
    expect(mockStripeClient.invoices.retrieve).not.toHaveBeenCalled();
  });

  it('falls back to the invoice.payments list on basil invoices', async () => {
    mockStripeClient.invoices.retrieve.mockResolvedValue({
      id: 'in_3',
      payments: { data: [{ status: 'paid', payment: { payment_intent: 'pi_3' } }] },
    });
    expect(await resolveInvoicePaymentIntentId({ id: 'in_3' })).toBe('pi_3');
    expect(mockStripeClient.invoices.retrieve).toHaveBeenCalledWith('in_3', {
      expand: ['payments'],
    });
  });

  it('returns null (never throws) when no payment intent can be resolved', async () => {
    mockStripeClient.invoices.retrieve.mockRejectedValue(new Error('api down'));
    expect(await resolveInvoicePaymentIntentId({ id: 'in_4' })).toBeNull();
  });
});

/**
 * LTM-ISS-17: SDK 18 -> 22, API pin 2025-08-27.basil -> 2026-06-24.dahlia.
 *
 * The behavioural change that matters is flexible billing mode, the creation
 * default from 2025-09-30.clover onward (so every subscription created under the
 * dahlia pin). Stripe documents that a Customer Portal cancellation then sets
 * `cancel_at` and leaves `cancel_at_period_end` FALSE, where classic mode set
 * cancel_at_period_end = true:
 * https://docs.stripe.com/billing/subscriptions/billing-mode/compare
 *
 * Reading only cancel_at_period_end therefore misses a real cancellation, which
 * is what these tests pin. "Scheduled to cancel" is defined as: a live status,
 * either cancellation signal present, and an effective end date in the future.
 */
describe('LTM-ISS-17: cancellation state across classic and flexible billing modes', () => {
  const FUTURE = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  const PAST = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

  describe('isCancellationScheduled', () => {
    it('detects a CLASSIC cancellation (cancel_at_period_end true)', () => {
      expect(
        isCancellationScheduled({
          status: 'active',
          cancel_at_period_end: true,
          cancel_at: FUTURE,
          items: { data: [{ current_period_end: FUTURE }] },
        })
      ).toBe(true);
    });

    it('detects a FLEXIBLE portal cancellation (cancel_at set, cancel_at_period_end FALSE)', () => {
      // The regression this issue exists to prevent: the old predicate returned
      // false here, so a paying customer's cancellation was invisible.
      expect(
        isCancellationScheduled({
          status: 'active',
          cancel_at_period_end: false,
          cancel_at: FUTURE,
          items: { data: [{ current_period_end: FUTURE }] },
        })
      ).toBe(true);
    });

    it('treats a subscription with no cancellation signal as not scheduled', () => {
      expect(
        isCancellationScheduled({
          status: 'active',
          cancel_at_period_end: false,
          cancel_at: null,
          items: { data: [{ current_period_end: FUTURE }] },
        })
      ).toBe(false);
    });

    it('treats an elapsed cancellation date as not scheduled', () => {
      expect(isCancellationScheduled({ status: 'active', cancel_at: PAST })).toBe(false);
    });

    it('ignores subscriptions in a non-live status', () => {
      expect(isCancellationScheduled({ status: 'canceled', cancel_at: FUTURE })).toBe(false);
      expect(
        isCancellationScheduled({ status: 'incomplete_expired', cancel_at_period_end: true })
      ).toBe(false);
    });

    it('covers the live statuses Stripe still serves (past_due, trialing, unpaid, paused)', () => {
      for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'paused']) {
        expect(isCancellationScheduled({ status, cancel_at: FUTURE })).toBe(true);
      }
    });

    it('never throws on a malformed or empty subscription', () => {
      expect(isCancellationScheduled({})).toBe(false);
      expect(isCancellationScheduled(null)).toBe(false);
      expect(isCancellationScheduled(undefined)).toBe(false);
    });
  });

  describe('effectiveSubscriptionEndAt', () => {
    it('prefers cancel_at: flexible mode resolves it once and never re-derives it', () => {
      // items period end has since moved; cancel_at remains authoritative.
      expect(
        effectiveSubscriptionEndAt({
          cancel_at: 1800000000,
          items: { data: [{ current_period_end: 1900000000 }] },
        })
      ).toBe(1800000000);
    });

    it('falls back to the period end when no cancellation is scheduled', () => {
      expect(
        effectiveSubscriptionEndAt({
          cancel_at: null,
          items: { data: [{ current_period_end: 1900000000 }] },
        })
      ).toBe(1900000000);
    });

    it('is undefined when neither shape carries a date', () => {
      expect(effectiveSubscriptionEndAt({})).toBeUndefined();
    });
  });

  describe('subscriptionPeriodEnd multi-item correctness', () => {
    it('takes the LATEST item period end, matching how Stripe resolves flexible cancellations', () => {
      expect(
        subscriptionPeriodEnd({
          items: { data: [{ current_period_end: 1750000000 }, { current_period_end: 1760000000 }] },
        })
      ).toBe(1760000000);
    });

    it('still prefers the legacy top-level field (pre-basil responses)', () => {
      expect(
        subscriptionPeriodEnd({
          current_period_end: 1700000000,
          items: { data: [{ current_period_end: 1760000000 }] },
        })
      ).toBe(1700000000);
    });

    it('ignores non-numeric item period ends rather than returning NaN', () => {
      expect(
        subscriptionPeriodEnd({ items: { data: [{ current_period_end: null }, {}] } })
      ).toBeUndefined();
    });
  });
});
