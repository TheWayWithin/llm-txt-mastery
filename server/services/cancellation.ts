import { stripe } from './stripe';
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
    console.log(`[REFUND DEBUG] calculateRefundAmount called - userId: ${userId}, tier: ${tier}`);

    // Get user details
    const user = await authStorage.getUserById(userId);
    console.log(
      `[REFUND DEBUG] User lookup result:`,
      user ? `found (id: ${user.id})` : 'NOT FOUND'
    );

    if (!user) {
      return {
        eligible: false,
        amount: 0,
        reason: 'User not found',
        guaranteeApplies: false,
      };
    }

    // Solo tier (monthly subscription) — handles both 'solo' and legacy 'coffee'
    if (tier === 'solo' || tier === 'coffee') {
      console.log(`[REFUND DEBUG] Processing Solo tier refund check`);
      // Find the most recent coffee purchase
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

      console.log(`[REFUND DEBUG] User ${userId} - Found ${coffeeCredits.length} coffee purchases`);

      if (!coffeeCredits.length) {
        return {
          eligible: false,
          amount: 0,
          reason: 'No coffee tier purchase found',
          guaranteeApplies: false,
        };
      }

      const purchase = coffeeCredits[0];
      const purchaseDate = new Date(purchase.purchasedAt);
      const daysSincePurchase = Math.floor(
        (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const guaranteeApplies = isEligibleFor30DayGuarantee(purchaseDate);

      console.log(`[REFUND DEBUG] Purchase date: ${purchaseDate.toISOString()}`);
      console.log(`[REFUND DEBUG] Days since purchase: ${daysSincePurchase}`);
      console.log(`[REFUND DEBUG] Guarantee applies: ${guaranteeApplies}`);

      if (guaranteeApplies) {
        return {
          eligible: true,
          amount: 495, // $4.95 in cents
          reason: '30-day money-back guarantee',
          guaranteeApplies: true,
        };
      } else {
        // Coffee tier credits never expire, so no refund after 30 days
        return {
          eligible: false,
          amount: 0,
          reason: 'Coffee credits never expire. 30-day guarantee period has passed.',
          guaranteeApplies: false,
        };
      }
    }

    // Growth/Scale tiers (subscriptions)
    if (tier === 'growth' || tier === 'scale') {
      // Get subscription details from Stripe
      if (!user.stripeCustomerId) {
        return {
          eligible: false,
          amount: 0,
          reason: 'No Stripe customer found',
          guaranteeApplies: false,
        };
      }

      try {
        // Get active subscriptions
        const subscriptions = await stripe().subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 1,
        });

        if (!subscriptions.data.length) {
          return {
            eligible: false,
            amount: 0,
            reason: 'No active subscription found',
            guaranteeApplies: false,
          };
        }

        const subscription = subscriptions.data[0];
        const subscriptionStartDate = new Date(subscription.created * 1000);
        const guaranteeApplies = isEligibleFor30DayGuarantee(subscriptionStartDate);

        if (guaranteeApplies) {
          // Full refund for 30-day guarantee
          const amountPaid = subscription.items.data[0].price.unit_amount || 0;
          return {
            eligible: true,
            amount: amountPaid,
            reason: '30-day money-back guarantee',
            guaranteeApplies: true,
          };
        } else {
          // Calculate prorated refund for unused time
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          const currentPeriodStart = new Date(subscription.current_period_start * 1000);
          const now = new Date();

          const totalPeriodMs = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
          const usedPeriodMs = now.getTime() - currentPeriodStart.getTime();
          const unusedPeriodMs = totalPeriodMs - usedPeriodMs;

          const amountPaid = subscription.items.data[0].price.unit_amount || 0;
          const proratedAmount = Math.round((unusedPeriodMs / totalPeriodMs) * amountPaid);

          return {
            eligible: true,
            amount: proratedAmount,
            reason: `Prorated refund for unused subscription time`,
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

    return {
      eligible: false,
      amount: 0,
      reason: 'Invalid tier',
      guaranteeApplies: false,
    };
  } catch (error) {
    console.error('❌ [REFUND ERROR] Error calculating refund:', error);
    console.error(
      '❌ [REFUND ERROR] Stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );
    console.error('❌ [REFUND ERROR] UserId:', userId, 'Tier:', tier);
    return {
      eligible: false,
      amount: 0,
      reason: 'Error calculating refund amount',
      guaranteeApplies: false,
    };
  }
}

/**
 * Request cancellation and process refund
 */
export async function requestCancellation(
  request: CancellationRequest
): Promise<{ success: boolean; message: string; cancellationId?: number }> {
  try {
    const { userId, reason, immediateRefund = true } = request;

    // Get user details
    const user = await authStorage.getUserById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Calculate refund amount
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
        daysSincePurchase: refundCalc.guaranteeApplies
          ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })
      .returning();

    // Process based on tier
    if (user.tier === 'solo' || user.tier === 'coffee') {
      // Handle coffee tier cancellation
      if (refundCalc.eligible && immediateRefund) {
        await processCoffeeTierRefund(userId, cancellationRecord.id, refundCalc.amount);
      }

      // Mark credits as refunded
      await db
        .update(oneTimeCredits)
        .set({
          refunded: true,
          refundedAt: new Date(),
        })
        .where(
          and(
            eq(oneTimeCredits.userId, userId),
            eq(oneTimeCredits.productType, 'coffee'),
            eq(oneTimeCredits.refunded, false)
          )
        );

      // Update user tier back to starter
      await authStorage.updateUser(userId, { tier: 'starter' });
    } else if (user.tier === 'growth' || user.tier === 'scale') {
      // Handle subscription cancellation
      if (user.stripeCustomerId) {
        await processSubscriptionCancellation(
          user.stripeCustomerId,
          cancellationRecord.id,
          refundCalc,
          immediateRefund
        );
      }

      // Update user tier back to starter
      await authStorage.updateUser(userId, { tier: 'starter' });
    }

    // Update cancellation as processed
    await db
      .update(cancellations)
      .set({
        processedAt: new Date(),
        refundStatus: refundCalc.eligible ? 'processing' : 'not_eligible',
      })
      .where(eq(cancellations.id, cancellationRecord.id));

    return {
      success: true,
      message: refundCalc.eligible
        ? `Cancellation processed. Refund of $${(refundCalc.amount / 100).toFixed(2)} is being processed.`
        : 'Cancellation processed. No refund applicable.',
      cancellationId: cancellationRecord.id,
    };
  } catch (error) {
    console.error('Error processing cancellation:', error);
    return {
      success: false,
      message: 'Failed to process cancellation. Please contact support.',
    };
  }
}

/**
 * Process refund for coffee tier
 */
async function processCoffeeTierRefund(
  userId: number,
  cancellationId: number,
  amountInCents: number
): Promise<void> {
  try {
    // Get the payment intent from oneTimeCredits
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

    // Create refund in Stripe
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

    // Update cancellation record
    await db
      .update(cancellations)
      .set({
        refundStripeId: refund.id,
        refundStatus: 'completed',
      })
      .where(eq(cancellations.id, cancellationId));

    // Create refund request record
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

    // Log failed refund
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
 * Process subscription cancellation
 */
async function processSubscriptionCancellation(
  stripeCustomerId: string,
  cancellationId: number,
  refundCalc: RefundCalculation,
  immediateRefund: boolean
): Promise<void> {
  try {
    // Get active subscriptions
    const subscriptions = await stripe().subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (!subscriptions.data.length) {
      throw new Error('No active subscription found');
    }

    const subscription = subscriptions.data[0];

    // Cancel subscription immediately
    const canceledSubscription = await stripe().subscriptions.cancel(subscription.id, {
      prorate: true, // This creates a credit, not a refund
      invoice_now: false, // Don't create a final invoice
    });

    // Process refund if eligible
    if (refundCalc.eligible && immediateRefund && refundCalc.amount > 0) {
      // Get the latest paid invoice
      const invoices = await stripe().invoices.list({
        customer: stripeCustomerId,
        subscription: subscription.id,
        status: 'paid',
        limit: 1,
      });

      if (invoices.data.length && invoices.data[0].payment_intent) {
        const paymentIntentId =
          typeof invoices.data[0].payment_intent === 'string'
            ? invoices.data[0].payment_intent
            : invoices.data[0].payment_intent.id;

        // Create refund
        const refund = await stripe().refunds.create({
          payment_intent: paymentIntentId,
          amount: refundCalc.amount,
          reason: 'requested_by_customer',
          metadata: {
            cancellationId: cancellationId.toString(),
            guarantee: refundCalc.guaranteeApplies ? '30-day' : 'prorated',
          },
        });

        // Update cancellation record
        await db
          .update(cancellations)
          .set({
            refundStripeId: refund.id,
            refundStatus: 'completed',
          })
          .where(eq(cancellations.id, cancellationId));

        // Create refund request record
        await db.insert(refundRequests).values({
          userId: canceledSubscription.metadata?.userId
            ? parseInt(canceledSubscription.metadata.userId)
            : 0,
          cancellationId,
          amount: refundCalc.amount,
          reason: refundCalc.reason,
          status: 'completed',
          stripeRefundId: refund.id,
          processedAt: new Date(),
        });
      }
    }
  } catch (error) {
    console.error('Error processing subscription cancellation:', error);
    throw error;
  }
}

/**
 * Get cancellation status
 */
export async function getCancellationStatus(
  userId: number
): Promise<{ hasCancelled: boolean; cancellation?: any; refund?: any }> {
  try {
    // Get most recent cancellation
    const [cancellation] = await db
      .select()
      .from(cancellations)
      .where(eq(cancellations.userId, userId))
      .orderBy(cancellations.requestedAt)
      .limit(1);

    if (!cancellation) {
      return { hasCancelled: false };
    }

    // Get refund details if any
    const [refund] = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.cancellationId, cancellation.id))
      .limit(1);

    return {
      hasCancelled: true,
      cancellation,
      refund,
    };
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
      return {
        eligible: false,
        amount: 0,
        reason: 'User not found',
        guaranteeApplies: false,
      };
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
