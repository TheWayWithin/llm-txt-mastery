import Stripe from 'stripe';

// Pinned to the API version this stripe-node build ships types for. The typed
// literal (no cast) means tsc forces this pin and the SDK to move in lockstep
// on future upgrades. Migrated from 2024-06-20 in LTM-ISS-8; the only breaking
// release in between was 2025-03-31.basil, and every consumed field was
// audited against it (see the LTM-ISS-8 branch summary).
const PINNED_STRIPE_API_VERSION: Stripe.StripeConfig['apiVersion'] = '2025-08-27.basil';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: PINNED_STRIPE_API_VERSION,
    });
  }
  return stripeInstance;
}

export const stripe = getStripe;

// Tier pricing configuration
export const TIER_PRICES = {
  solo: {
    priceId: process.env.STRIPE_LLM_TXT_SOLO_PRICE_ID || 'price_1S0lZnIiC84gpR8HCqUGxmaD',
    annualPriceId: process.env.STRIPE_LLM_TXT_SOLO_ANNUAL_PRICE_ID || '',
    amount: 495, // $4.95/mo in cents
    annualAmount: 4740, // $47.40/yr in cents ($3.95/mo × 12)
    currency: 'usd',
    interval: 'month',
  },
  growth: {
    priceId: process.env.STRIPE_LLM_TXT_GROWTH_PRICE_ID || 'price_1TBkXmIiC84gpR8H7tlgInp3',
    annualPriceId: process.env.STRIPE_LLM_TXT_GROWTH_ANNUAL_PRICE_ID || '',
    amount: 995, // $9.95/mo in cents
    annualAmount: 9540, // $95.40/yr in cents ($7.95/mo × 12)
    currency: 'usd',
    interval: 'month',
  },
  scale: {
    priceId: process.env.STRIPE_LLM_TXT_SCALE_PRICE_ID || 'price_1TBlFrIiC84gpR8HGIBEzagu',
    annualPriceId: process.env.STRIPE_LLM_TXT_SCALE_ANNUAL_PRICE_ID || '',
    amount: 1995, // $19.95/mo in cents
    annualAmount: 19140, // $191.40/yr in cents ($15.95/mo × 12)
    currency: 'usd',
    interval: 'month',
  },
};

export interface CreateCustomerParams {
  email: string;
  name?: string;
  userId: string;
}

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  userId: string;
}

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
  try {
    const customer = await stripe().customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        userId: params.userId,
        source: 'llm-txt-mastery',
      },
    });

    console.log(`Created Stripe customer: ${customer.id} for user: ${params.userId}`);
    return customer;
  } catch (error) {
    console.error('Failed to create Stripe customer:', error);
    throw new Error(
      `Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create a subscription for a customer
 */
export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe().subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      // latest_invoice.payment_intent is not an expandable path on basil
      // (invoice.payment_intent was removed in 2025-03-31.basil); expand the
      // invoice itself and read confirmation_secret/payments as needed
      expand: ['latest_invoice'],
      metadata: {
        userId: params.userId,
      },
    });

    console.log(`Created subscription: ${subscription.id} for customer: ${params.customerId}`);
    return subscription;
  } catch (error) {
    console.error('Failed to create subscription:', error);
    throw new Error(
      `Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  metadata?: Record<string, string>;
  trialDays?: number;
}): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe().checkout.sessions.create({
      customer: params.customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId,
        ...(params.metadata || {}),
      },
      subscription_data: {
        metadata: {
          userId: params.userId,
          ...(params.metadata || {}),
        },
        ...(params.trialDays ? { trial_period_days: params.trialDays } : {}),
      },
    });

    console.log(`Created checkout session: ${session.id} for customer: ${params.customerId}`);
    return session;
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    throw new Error(
      `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create a one-time payment checkout session (for coffee tier)
 */
export async function createOneTimeCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  productType?: string;
}): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe().checkout.sessions.create({
      customer: params.customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment mode
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId,
        productType: params.productType || 'coffee',
        paymentType: 'one_time',
      },
    });

    console.log(
      `Created one-time checkout session: ${session.id} for customer: ${params.customerId}`
    );
    return session;
  } catch (error) {
    console.error('Failed to create one-time checkout session:', error);
    throw new Error(
      `Failed to create one-time checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get customer by ID
 */
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer | null> {
  try {
    const customer = await stripe().customers.retrieve(customerId);
    return customer.deleted ? null : (customer as Stripe.Customer);
  } catch (error) {
    console.error('Failed to get Stripe customer:', error);
    return null;
  }
}

/**
 * Get customer's active subscriptions
 */
export async function getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
  try {
    const subscriptions = await stripe().subscriptions.list({
      customer: customerId,
      status: 'active',
    });
    return subscriptions.data;
  } catch (error) {
    console.error('Failed to get customer subscriptions:', error);
    return [];
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe().subscriptions.cancel(subscriptionId);
    console.log(`Cancelled subscription: ${subscriptionId}`);
    return subscription;
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw new Error(
      `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create customer portal session for subscription management
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session;
  } catch (error) {
    console.error('Failed to create portal session:', error);
    throw new Error(
      `Failed to create portal session: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required');
  }

  try {
    return stripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature validation failed:', error);
    throw new Error(
      `Webhook signature validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get tier from price ID (monthly or annual)
 */
export function getTierFromPriceId(priceId: string): 'solo' | 'growth' | 'scale' | null {
  if (!priceId) return null;
  if (priceId === TIER_PRICES.solo.priceId) return 'solo';
  if (TIER_PRICES.solo.annualPriceId && priceId === TIER_PRICES.solo.annualPriceId) return 'solo';
  if (priceId === TIER_PRICES.growth.priceId) return 'growth';
  if (TIER_PRICES.growth.annualPriceId && priceId === TIER_PRICES.growth.annualPriceId)
    return 'growth';
  if (priceId === TIER_PRICES.scale.priceId) return 'scale';
  if (TIER_PRICES.scale.annualPriceId && priceId === TIER_PRICES.scale.annualPriceId)
    return 'scale';
  return null;
}
