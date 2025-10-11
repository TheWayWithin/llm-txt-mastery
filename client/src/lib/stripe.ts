import { loadStripe } from '@stripe/stripe-js';

// API Base URL configuration to ensure calls go to Railway backend, not Netlify
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://llm-txt-mastery-production.up.railway.app';

// Initialize Stripe with better error handling
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('🚨 CRITICAL: VITE_STRIPE_PUBLISHABLE_KEY not found in environment variables');
  console.error('This will cause ERR_NETWORK_IO_SUSPENDED errors when trying to load Stripe');
  console.error('Available env vars:', Object.keys(import.meta.env));
}

export const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey).catch((error) => {
      console.error('Failed to load Stripe:', error);
      return null;
    })
  : Promise.resolve(null);

// Stripe-related types
export interface SubscriptionStatus {
  tier: 'starter' | 'coffee' | 'growth' | 'scale';
  subscriptionStatus: string | null;
  hasActiveSubscription: boolean;
  creditsRemaining?: number;
  subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodEnd: number;
    priceId: string;
  }>;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface CreatePortalSessionResponse {
  url: string;
}

// API functions
export async function createCheckoutSession(
  tier: 'growth' | 'scale',
  authToken: string
): Promise<CreateCheckoutSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/stripe/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ tier }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create checkout session');
  }

  return response.json();
}

export async function createUpgradeSession(
  targetTier: 'growth' | 'scale',
  authToken: string
): Promise<CreateCheckoutSessionResponse & { success?: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/stripe/create-upgrade-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ targetTier }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create upgrade session');
  }

  return response.json();
}

export async function createCoffeeCheckoutSession(
  authToken: string,
  email?: string
): Promise<CreateCheckoutSessionResponse> {
  const body: any = {};

  // Include email for non-authenticated purchases
  if (email) {
    body.email = email;
  }

  const response = await fetch(`${API_BASE_URL}/api/stripe/create-coffee-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create coffee checkout session');
  }

  return response.json();
}

export async function createPortalSession(authToken: string): Promise<CreatePortalSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/stripe/create-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create portal session');
  }

  return response.json();
}

export async function getSubscriptionStatus(authToken: string): Promise<SubscriptionStatus> {
  const response = await fetch(`${API_BASE_URL}/api/stripe/subscription-status`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get subscription status');
  }

  return response.json();
}

// Tier pricing configuration (should match server-side)
export const TIER_PRICING = {
  coffee: {
    name: 'Coffee Analysis',
    price: '$4.95',
    interval: 'monthly',
    features: [
      '20 monthly website analyses',
      'Up to 200 pages per analysis',
      'Full AI-enhanced analysis',
      'Quality scoring & insights',
      'Monthly subscription - price of a coffee!',
    ],
  },
  growth: {
    name: 'Growth',
    price: '$9.95',
    interval: 'month',
    features: [
      'Unlimited analyses per day',
      'Up to 1,000 pages per analysis',
      'AI-enhanced analysis on all pages',
      'Priority support',
      'Advanced quality scoring',
      'Analysis history & tracking',
    ],
  },
  scale: {
    name: 'Scale',
    price: '$19.95',
    interval: 'month',
    features: [
      'Everything in Growth',
      'Unlimited pages per analysis',
      'Full AI analysis (capped at $19.95 cost)',
      'API access for integrations',
      'Multi-site management',
      'Direct email support line',
    ],
  },
} as const;
