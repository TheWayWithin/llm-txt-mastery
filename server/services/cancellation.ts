import { stripe } from './stripe';

// subscription.current_period_end moved to items.data[].current_period_end in
// Stripe API 2025-03-31.basil (LTM-ISS-8). Direct API responses lose the old
// field the moment the SDK pin advances, so read both shapes.
export function subscriptionPeriodEnd(subscription: any): number | undefined {
  return subscription?.current_period_end ?? subscription?.items?.data?.[0]?.current_period_end;
}

// invoice.payment_intent was removed in Stripe API 2025-03-31.basil in favour
// of the invoice.payments list (LTM-ISS-8). Old shape resolves without an
// extra API call; new shape fetches the invoice's payment records.
export async function resolveInvoicePaymentIntentId(invoice: any): Promise<string | null> {
  if (invoice.payment_intent) {
    return typeof invoice.payment_intent === 'string'
      ? invoice.payment_intent
      : invoice.payment_intent.id;
  }
  try {
    const detailed: any = await stripe().invoices.retrieve(invoice.id, { expand: ['payments'] });
    const payments = detailed?.payments?.data ?? [];
    const paid = payments.find((p: any) => p?.status === 'paid') ?? payments[0];
    const pi = paid?.payment?.payment_intent;
    return typeof pi === 'string' ? pi : (pi?.id ?? null);
  } catch (error) {
    console.error(`[REFUND] Could not resolve payment intent for invoice ${invoice.id}:`, error);
    return null;
  }
}
import { authStorage } from './auth-storage';
import { storage } from '../storage';
import { db } from '../db';
import { cancellations, refundRequests, oneTimeCredits } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { AuthUser } from '@shared/schema';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface CancellationRequest {
  userId: number;
  reason?: string;
  immediateRefund?: boolean;
}

export interface RefundCalculation {
  eligible: boolean;
  amount: number; // in cents
  reason: string;
  guaranteeApplies: boolean;
}

export interface CancellationResult {
  success: boolean;
  message: string;
  cancellationId?: number;
  subscriptionEndsAt?: string; // ISO date when access expires (for cancel-at-period-end)
}

/**
 * Check if a purchase is eligible for the 30-day money-back guarantee
 */
export function isEligibleFor30DayGuarantee(purchaseDate: Date): boolean {
  const now = new Date();
  const timeSincePurchase = now.getTime() - purchaseDate.getTime();
  return timeSincePurchase <= THIRTY_DAYS_MS;
}

/**
 * Calculate refund amount based on tier and purchase date
 */
export async function calculateRefundAmount(
  userId: number,
  tier: string
): Promise<RefundCalculation> {
  try {
    console.log(`[REFUND] calculateRefundAmount - userId: ${userId}, tier: ${tier}`);

    const user = await authStorage.getUserById(userId);
    if (!user) {
      return { eligible: false, amount: 0, reason: 'User not found', guaranteeApplies: false };
    }

    // Solo tier (monthly subscription) — handles both 'solo' and legacy 'coffee'
    if (tier === 'solo' || tier === 'coffee') {
      // Check for legacy one-time coffee purchases
      const coffeeCredits = await db
        .select()
        .from(oneTimeCredits)
        .where(
          and(
            eq(oneTimeCredits.userId, userId),
            eq(oneTimeCredits.productType, 'coffee'),
            eq(oneTimeCredits.refunded, false)
          )
        )
        .orderBy(desc(oneTimeCredits.purchasedAt))
        .limit(1);

      if (coffeeCredits.length) {
        const purchase = coffeeCredits[0];
        const purchaseDate = new Date(purchase.purchasedAt);
        const guaranteeApplies = isEligibleFor30DayGuarantee(purchaseDate);

        if (guaranteeApplies) {
          return {
            eligible: true,
            amount: 495,
            reason: '30-day money-back guarantee',
            guaranteeApplies: true,
          };
        }
        return {
          eligible: false,
          amount: 0,
          reason: '30-day guarantee period has passed.',
          guaranteeApplies: false,
        };
      }

      // Solo is now a subscription — check Stripe like Growth/Scale
      if (user.stripeCustomerId) {
        return await calculateSubscriptionRefund(user.stripeCustomerId);
      }

      return { eligible: false, amount: 0, reason: 'No purchase found', guaranteeApplies: false };
    }

    // Growth/Scale tiers (subscriptions)
    if (tier === 'growth' || tier === 'scale') {
      if (!user.stripeCustomerId) {
        return {
          eligible: false,
          amount: 0,
          reason: 'No Stripe customer found',
          guaranteeApplies: false,
        };
      }
      return await calculateSubscriptionRefund(user.stripeCustomerId);
    }

    return { eligible: false, amount: 0, reason: 'Invalid tier', guaranteeApplies: false };
  } catch (error) {
    console.error('❌ [REFUND ERROR]', error);
    return {
      eligible: false,
      amount: 0,
      reason: 'Error calculating refund amount',
      guaranteeApplies: false,
    };
  }
}

/**
 * Calculate refund for a Stripe subscription customer
 */
async function calculateSubscriptionRefund(stripeCustomerId: string): Promise<RefundCalculation> {
  try {
    // Check active subscriptions first
    const activeSubscriptions = await stripe().subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    let subscription: any = activeSubscriptions.data[0];

    // Also check subscriptions that are canceling at period end
    if (!subscription) {
      const allSubs = await stripe().subscriptions.list({
        customer: stripeCustomerId,
        limit: 5,
      });
      subscription = allSubs.data.find(
        (s: any) =>
          s.status === 'active' ||
          (s.status === 'canceled' && (subscriptionPeriodEnd(s) ?? 0) * 1000 > Date.now())
      );
      if (!subscription) {
        return {
          eligible: false,
          amount: 0,
          reason: 'No active subscription found',
          guaranteeApplies: false,
        };
      }
    }

    const subscriptionStartDate = new Date(subscription.created * 1000);
    const guaranteeApplies = isEligibleFor30DayGuarantee(subscriptionStartDate);

    if (guaranteeApplies) {
      const amountPaid = subscription.items.data[0].price.unit_amount || 0;
      return {
        eligible: true,
        amount: amountPaid,
        reason: '30-day money-back guarantee',
        guaranteeApplies: true,
      };
    } else {
      // No prorated refund for cancel-at-period-end — user keeps access until period end
      return {
        eligible: false,
        amount: 0,
        reason: 'Your access will continue until the end of your billing period.',
        guaranteeApplies: false,
      };
    }
  } catch (error) {
    console.error('Error fetching subscription from Stripe:', error);
    return {
      eligible: false,
      amount: 0,
      reason: 'Error calculating refund amount',
      guaranteeApplies: false,
    };
  }
}

/**
 * Request cancellation — two paths:
 * 1. Within 30 days: instant refund + immediate access revocation
 * 2. After 30 days: cancel at period end, access continues until then
 */
export async function requestCancellation(
  request: CancellationRequest
): Promise<CancellationResult> {
  try {
    const { userId, reason, immediateRefund = true } = request;

    const user = await authStorage.getUserById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // If user is already cancelled, handle gracefully
    if (user.tier === 'cancelled') {
      return { success: false, message: 'Your subscription is already cancelled.' };
    }

    const refundCalc = await calculateRefundAmount(userId, user.tier);

    // Create cancellation record
    const [cancellationRecord] = await db
      .insert(cancellations)
      .values({
        userId,
        tier: user.tier,
        reason,
        subscriptionId: user.stripeCustomerId || undefined,
        refundAmount: refundCalc.amount,
        refundStatus: refundCalc.eligible ? 'pending' : 'not_eligible',
        daysSincePurchase: user.createdAt
          ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })
      .returning();

    // Path 1: Solo tier with legacy coffee credits
    if (user.tier === 'solo' || user.tier === 'coffee') {
      // Check for legacy one-time coffee purchases first
      const coffeeCredits = await db
        .select()
        .from(oneTimeCredits)
        .where(
          and(
            eq(oneTimeCredits.userId, userId),
            eq(oneTimeCredits.productType, 'coffee'),
            eq(oneTimeCredits.refunded, false)
          )
        )
        .limit(1);

      if (coffeeCredits.length) {
        // Legacy coffee path
        if (refundCalc.eligible && immediateRefund) {
          await processCoffeeTierRefund(userId, cancellationRecord.id, refundCalc.amount);
        }
        await db
          .update(oneTimeCredits)
          .set({ refunded: true, refundedAt: new Date() })
          .where(
            and(
              eq(oneTimeCredits.userId, userId),
              eq(oneTimeCredits.productType, 'coffee'),
              eq(oneTimeCredits.refunded, false)
            )
          );
        // Immediate cancellation for legacy credits
        await authStorage.updateUser(userId, { tier: 'cancelled' });
        await updateCancellationProcessed(cancellationRecord.id, refundCalc.eligible);
        return {
          success: true,
          message: refundCalc.eligible
            ? `Refund of $${(refundCalc.amount / 100).toFixed(2)} is being processed. Your access has ended.`
            : 'Your subscription has been cancelled.',
          cancellationId: cancellationRecord.id,
        };
      }

      // Solo subscription path — fall through to subscription handling below
    }

    // Path 2+3: Subscription cancellation (Solo subscription, Growth, Scale)
    if (user.stripeCustomerId) {
      const result = await processSubscriptionCancellation(
        user.stripeCustomerId,
        cancellationRecord.id,
        refundCalc,
        immediateRefund && refundCalc.guaranteeApplies // Only immediate cancel for 30-day guarantee
      );

      await updateCancellationProcessed(cancellationRecord.id, refundCalc.eligible);

      if (refundCalc.guaranteeApplies && immediateRefund) {
        // Path 2: 30-day guarantee — immediate access revocation
        await authStorage.updateUser(userId, { tier: 'cancelled' });
        return {
          success: true,
          message: `Refund of $${(refundCalc.amount / 100).toFixed(2)} is being processed. Your access has ended.`,
          cancellationId: cancellationRecord.id,
        };
      } else {
        // Path 3: Cancel at period end — access continues
        // Don't change tier yet — webhook will handle that when period actually ends
        // The subscription is set to cancel_at_period_end in Stripe
        return {
          success: true,
          message: `Your subscription will end on ${result.periodEndDate}. You'll have full access until then.`,
          cancellationId: cancellationRecord.id,
          subscriptionEndsAt: result.periodEndISO,
        };
      }
    }

    // No Stripe customer — just cancel directly
    await authStorage.updateUser(userId, { tier: 'cancelled' });
    await updateCancellationProcessed(cancellationRecord.id, false);
    return {
      success: true,
      message: 'Your subscription has been cancelled.',
      cancellationId: cancellationRecord.id,
    };
  } catch (error) {
    console.error('Error processing cancellation:', error);
    return { success: false, message: 'Failed to process cancellation. Please contact support.' };
  }
}

async function updateCancellationProcessed(cancellationId: number, refundEligible: boolean) {
  await db
    .update(cancellations)
    .set({
      processedAt: new Date(),
      refundStatus: refundEligible ? 'processing' : 'not_eligible',
    })
    .where(eq(cancellations.id, cancellationId));
}

/**
 * Process refund for legacy coffee tier one-time purchases
 */
async function processCoffeeTierRefund(
  userId: number,
  cancellationId: number,
  amountInCents: number
): Promise<void> {
  try {
    const [credit] = await db
      .select()
      .from(oneTimeCredits)
      .where(
        and(
          eq(oneTimeCredits.userId, userId),
          eq(oneTimeCredits.productType, 'coffee'),
          eq(oneTimeCredits.refunded, false)
        )
      )
      .limit(1);

    if (!credit || !credit.stripePaymentIntentId) {
      throw new Error('Payment intent not found for coffee purchase');
    }

    const refund = await stripe().refunds.create({
      payment_intent: credit.stripePaymentIntentId,
      amount: amountInCents,
      reason: 'requested_by_customer',
      metadata: {
        userId: userId.toString(),
        cancellationId: cancellationId.toString(),
        guarantee: '30-day money-back',
      },
    });

    await db
      .update(cancellations)
      .set({ refundStripeId: refund.id, refundStatus: 'completed' })
      .where(eq(cancellations.id, cancellationId));

    await db.insert(refundRequests).values({
      userId,
      cancellationId,
      amount: amountInCents,
      reason: '30-day money-back guarantee',
      status: 'completed',
      stripeRefundId: refund.id,
      processedAt: new Date(),
    });
  } catch (error) {
    console.error('Error processing coffee tier refund:', error);
    await db.insert(refundRequests).values({
      userId,
      cancellationId,
      amount: amountInCents,
      reason: '30-day money-back guarantee',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Process subscription cancellation via Stripe.
 * - If within 30-day guarantee: cancel immediately + refund
 * - If after 30 days: set cancel_at_period_end (access until period end)
 * - Handles already-cancelled subscriptions gracefully
 */
async function processSubscriptionCancellation(
  stripeCustomerId: string,
  cancellationId: number,
  refundCalc: RefundCalculation,
  immediateCancel: boolean
): Promise<{ periodEndDate: string; periodEndISO: string }> {
  // Find active or canceling subscription
  const activeSubs = await stripe().subscriptions.list({
    customer: stripeCustomerId,
    status: 'active',
    limit: 1,
  });

  let subscription: any = activeSubs.data[0];

  if (!subscription) {
    // Check for subscriptions already set to cancel at period end
    const allSubs = await stripe().subscriptions.list({
      customer: stripeCustomerId,
      limit: 5,
    });

    const validSub = allSubs.data.find(
      (s: any) =>
        s.status === 'active' ||
        (s.cancel_at_period_end && (subscriptionPeriodEnd(s) ?? 0) * 1000 > Date.now())
    );

    if (validSub) {
      const endDate = new Date((subscriptionPeriodEnd(validSub) ?? NaN) * 1000);
      console.log(
        `[CANCEL] Subscription ${validSub.id} already cancelling, ends ${endDate.toISOString()}`
      );
      return {
        periodEndDate: endDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        periodEndISO: endDate.toISOString(),
      };
    }

    // No active subscription at all — already fully cancelled
    console.log(
      `[CANCEL] No active subscription found for customer ${stripeCustomerId} — already cancelled`
    );
    return {
      periodEndDate: new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      periodEndISO: new Date().toISOString(),
    };
  }

  if (immediateCancel) {
    // 30-day guarantee path: cancel immediately
    await stripe().subscriptions.cancel(subscription.id, {
      prorate: true,
      invoice_now: false,
    });

    if (refundCalc.eligible && refundCalc.amount > 0) {
      await processSubscriptionRefund(
        stripeCustomerId,
        subscription.id,
        cancellationId,
        refundCalc
      );
    }

    return {
      periodEndDate: new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      periodEndISO: new Date().toISOString(),
    };
  } else {
    // After 30 days: cancel at period end — user keeps access
    await stripe().subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    const endDate = new Date((subscriptionPeriodEnd(subscription) ?? NaN) * 1000);
    console.log(
      `[CANCEL] Subscription ${subscription.id} set to cancel at period end: ${endDate.toISOString()}`
    );

    return {
      periodEndDate: endDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      periodEndISO: endDate.toISOString(),
    };
  }
}

/**
 * Process refund on the latest paid invoice for a subscription
 */
async function processSubscriptionRefund(
  stripeCustomerId: string,
  subscriptionId: string,
  cancellationId: number,
  refundCalc: RefundCalculation
): Promise<void> {
  const invoices = await stripe().invoices.list({
    customer: stripeCustomerId,
    subscription: subscriptionId,
    status: 'paid',
    limit: 1,
  });

  const invoice: any = invoices.data[0];
  const paymentIntentId = invoice ? await resolveInvoicePaymentIntentId(invoice) : null;
  if (paymentIntentId) {
    const refund = await stripe().refunds.create({
      payment_intent: paymentIntentId,
      amount: refundCalc.amount,
      reason: 'requested_by_customer',
      metadata: {
        cancellationId: cancellationId.toString(),
        guarantee: refundCalc.guaranteeApplies ? '30-day' : 'prorated',
      },
    });

    await db
      .update(cancellations)
      .set({ refundStripeId: refund.id, refundStatus: 'completed' })
      .where(eq(cancellations.id, cancellationId));

    await db.insert(refundRequests).values({
      userId: 0, // Will be updated by caller if needed
      cancellationId,
      amount: refundCalc.amount,
      reason: refundCalc.reason,
      status: 'completed',
      stripeRefundId: refund.id,
      processedAt: new Date(),
    });
  }
}

/**
 * Get cancellation status
 */
export async function getCancellationStatus(
  userId: number
): Promise<{ hasCancelled: boolean; cancellation?: any; refund?: any }> {
  try {
    const [cancellation] = await db
      .select()
      .from(cancellations)
      .where(eq(cancellations.userId, userId))
      .orderBy(desc(cancellations.requestedAt))
      .limit(1);

    if (!cancellation) {
      return { hasCancelled: false };
    }

    const [refund] = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.cancellationId, cancellation.id))
      .limit(1);

    return { hasCancelled: true, cancellation, refund };
  } catch (error) {
    console.error('Error getting cancellation status:', error);
    return { hasCancelled: false };
  }
}

/**
 * Check refund eligibility without processing
 */
export async function checkRefundEligibility(userId: number): Promise<RefundCalculation> {
  try {
    const user = await authStorage.getUserById(userId);
    if (!user) {
      return { eligible: false, amount: 0, reason: 'User not found', guaranteeApplies: false };
    }
    return await calculateRefundAmount(userId, user.tier);
  } catch (error) {
    console.error('Error checking refund eligibility:', error);
    return {
      eligible: false,
      amount: 0,
      reason: 'Error checking eligibility',
      guaranteeApplies: false,
    };
  }
}
