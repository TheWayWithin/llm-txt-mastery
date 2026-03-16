import type { Express } from 'express';
import express from 'express';
import { z } from 'zod';
import {
  stripe,
  createStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  getStripeCustomer,
  getCustomerSubscriptions,
  validateWebhookSignature,
  getTierFromPriceId,
  TIER_PRICES,
} from '../services/stripe';

// Credit bundle configuration
const COFFEE_TIER_CREDITS = 20;
import { storage } from '../storage';
import { authStorage } from '../services/auth-storage';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { apiLimiter } from '../middleware/rate-limit';

export function registerStripeRoutes(app: Express) {
  // Create checkout session for subscription
  app.post('/api/stripe/create-checkout', requireAuth, apiLimiter, async (req, res) => {
    try {
      const { tier } = z
        .object({
          tier: z.enum(['growth', 'scale']),
        })
        .parse(req.body);

      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Create Stripe customer for authenticated user
      const stripeCustomer = await createStripeCustomer({
        email: authUser.email,
        userId: authUser.id.toString(),
      });

      // Update auth user with Stripe customer ID
      await authStorage.updateUser(authUser.id, {
        stripeCustomerId: stripeCustomer.id,
      });

      // Create checkout session
      const priceId = TIER_PRICES[tier].priceId;
      const session = await createCheckoutSession({
        customerId: stripeCustomer.id,
        priceId,
        successUrl: `${req.headers.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${req.headers.origin}/subscription-cancel`,
        userId: authUser.id.toString(),
      });

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error('Checkout session creation failed:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Failed to create checkout session',
      });
    }
  });

  // Create Growth tier checkout session (for signup flow)
  app.post('/api/stripe/create-growth-checkout', optionalAuth, apiLimiter, async (req, res) => {
    try {
      console.log('📊 Growth checkout request:', {
        body: req.body,
        hasUser: !!req.user,
        userEmail: req.user?.email,
      });

      const { email, websiteUrl, metadata, billing } = z
        .object({
          email: z.string().email().optional(),
          websiteUrl: z.union([z.string().url(), z.literal('')]).optional(),
          billing: z.enum(['monthly', 'annual']).optional().default('monthly'),
          metadata: z
            .object({
              password: z.string().optional(),
              tier: z.string().optional(),
            })
            .optional(),
        })
        .parse(req.body);

      // Support both authenticated and email-based purchases
      const userEmail = req.user?.email || email;

      if (!userEmail) {
        console.error('❌ No email provided for Growth checkout');
        return res.status(400).json({ message: 'Email is required' });
      }

      console.log(`✅ Processing Growth checkout for: ${userEmail} (billing: ${billing})`);

      // Get or create email capture record
      let emailCapture = await storage.getEmailCapture(userEmail);
      if (!emailCapture) {
        emailCapture = await storage.createEmailCapture({
          email: userEmail,
          tier: 'starter',
          websiteUrl: websiteUrl || null,
        });
      }

      // Create Stripe customer
      const stripeCustomer = await createStripeCustomer({
        email: userEmail,
        userId: emailCapture.id.toString(),
      });

      // Select price ID based on billing interval
      const priceId =
        billing === 'annual' && TIER_PRICES.growth.annualPriceId
          ? TIER_PRICES.growth.annualPriceId
          : TIER_PRICES.growth.priceId;

      const encodedEmail = encodeURIComponent(userEmail);
      const encodedWebsiteUrl = websiteUrl ? encodeURIComponent(websiteUrl) : '';

      let successUrl = `${req.headers.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}&email=${encodedEmail}&tier=growth&billing=${billing}`;
      if (websiteUrl) {
        successUrl += `&website=${encodedWebsiteUrl}`;
      }

      const session = await createCheckoutSession({
        customerId: stripeCustomer.id,
        priceId,
        successUrl,
        cancelUrl: `${req.headers.origin}/subscription-cancel`,
        userId: emailCapture.id.toString(),
        metadata: {
          ...metadata,
          email: userEmail,
          tier: 'growth',
          billing,
          websiteUrl: websiteUrl || '',
        },
      });

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error('❌ Growth checkout session creation failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create growth checkout session';

      // Check for specific error types
      if (errorMessage.includes('STRIPE_SECRET_KEY')) {
        console.error('🔑 Stripe configuration error - missing API key');
        res.status(500).json({
          message: 'Payment system configuration error. Please contact support.',
        });
      } else {
        res.status(400).json({
          message: errorMessage,
        });
      }
    }
  });

  // Create Scale tier checkout session (for signup flow)
  app.post('/api/stripe/create-scale-checkout', optionalAuth, apiLimiter, async (req, res) => {
    try {
      console.log('📊 Scale checkout request:', {
        body: req.body,
        hasUser: !!req.user,
        userEmail: req.user?.email,
      });

      const { email, websiteUrl, metadata, billing } = z
        .object({
          email: z.string().email().optional(),
          websiteUrl: z.union([z.string().url(), z.literal('')]).optional(),
          billing: z.enum(['monthly', 'annual']).optional().default('monthly'),
          metadata: z
            .object({
              password: z.string().optional(),
              tier: z.string().optional(),
            })
            .optional(),
        })
        .parse(req.body);

      // Support both authenticated and email-based purchases
      const userEmail = req.user?.email || email;

      if (!userEmail) {
        console.error('❌ No email provided for Scale checkout');
        return res.status(400).json({ message: 'Email is required' });
      }

      console.log(`✅ Processing Scale checkout for: ${userEmail} (billing: ${billing})`);

      // Get or create email capture record
      let emailCapture = await storage.getEmailCapture(userEmail);
      if (!emailCapture) {
        emailCapture = await storage.createEmailCapture({
          email: userEmail,
          tier: 'starter',
          websiteUrl: websiteUrl || null,
        });
      }

      // Create Stripe customer
      const stripeCustomer = await createStripeCustomer({
        email: userEmail,
        userId: emailCapture.id.toString(),
      });

      // Select price ID based on billing interval
      const priceId =
        billing === 'annual' && TIER_PRICES.scale.annualPriceId
          ? TIER_PRICES.scale.annualPriceId
          : TIER_PRICES.scale.priceId;

      const encodedEmail = encodeURIComponent(userEmail);
      const encodedWebsiteUrl = websiteUrl ? encodeURIComponent(websiteUrl) : '';

      let successUrl = `${req.headers.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}&email=${encodedEmail}&tier=scale&billing=${billing}`;
      if (websiteUrl) {
        successUrl += `&website=${encodedWebsiteUrl}`;
      }

      const session = await createCheckoutSession({
        customerId: stripeCustomer.id,
        priceId,
        successUrl,
        cancelUrl: `${req.headers.origin}/subscription-cancel`,
        userId: emailCapture.id.toString(),
        metadata: {
          ...metadata,
          email: userEmail,
          tier: 'scale',
          billing,
          websiteUrl: websiteUrl || '',
        },
      });

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error('❌ Scale checkout session creation failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create scale checkout session';

      // Check for specific error types
      if (errorMessage.includes('STRIPE_SECRET_KEY')) {
        console.error('🔑 Stripe configuration error - missing API key');
        res.status(500).json({
          message: 'Payment system configuration error. Please contact support.',
        });
      } else {
        res.status(400).json({
          message: errorMessage,
        });
      }
    }
  });

  // Create checkout session for solo tier (recurring subscription)
  // Supports both new route name and legacy route name for backward compatibility
  const handleSoloCheckout = async (req: any, res: any) => {
    try {
      const { email, websiteUrl, billing, metadata } = z
        .object({
          email: z.string().email().optional(),
          websiteUrl: z.union([z.string().url(), z.literal('')]).optional(),
          billing: z.enum(['monthly', 'annual']).optional().default('monthly'),
          metadata: z
            .object({
              password: z.string().optional(),
              tier: z.string().optional(),
            })
            .optional(),
        })
        .parse(req.body);

      // Support both authenticated and email-based purchases
      const userEmail = req.user?.email || email;

      if (!userEmail) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Get or create email capture record (for freemium users)
      let emailCapture = await storage.getEmailCapture(userEmail);
      if (!emailCapture) {
        emailCapture = await storage.createEmailCapture({
          email: userEmail,
          tier: 'starter',
          websiteUrl: websiteUrl || null,
        });
      }

      // Create Stripe customer (don't need user profile for freemium checkout)
      const stripeCustomer = await createStripeCustomer({
        email: userEmail,
        userId: emailCapture.id.toString(), // Use email capture ID
      });

      // Encode website URL and email for success redirect
      const encodedWebsiteUrl = websiteUrl ? encodeURIComponent(websiteUrl) : '';
      const encodedEmail = encodeURIComponent(userEmail);

      if (billing === 'annual' && TIER_PRICES.solo.annualPriceId) {
        // Annual Solo: subscription checkout
        let successUrl = `${req.headers.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}&email=${encodedEmail}&tier=solo&billing=annual`;
        if (websiteUrl) {
          successUrl += `&website=${encodedWebsiteUrl}`;
        }

        const session = await createCheckoutSession({
          customerId: stripeCustomer.id,
          priceId: TIER_PRICES.solo.annualPriceId,
          successUrl,
          cancelUrl: `${req.headers.origin}/subscription-cancel`,
          userId: emailCapture.id.toString(),
          metadata: {
            ...metadata,
            email: userEmail,
            tier: 'solo',
            billing: 'annual',
            websiteUrl: websiteUrl || '',
          },
        });

        return res.json({ sessionId: session.id, url: session.url });
      }

      // Monthly Solo: subscription checkout (recurring)
      const priceId = TIER_PRICES.solo.priceId;

      let successUrl = `${req.headers.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}&email=${encodedEmail}&tier=solo&billing=monthly`;
      if (websiteUrl) {
        successUrl += `&website=${encodedWebsiteUrl}`;
      }

      const session = await createCheckoutSession({
        customerId: stripeCustomer.id,
        priceId,
        successUrl,
        cancelUrl: `${req.headers.origin}/subscription-cancel`,
        userId: emailCapture.id.toString(),
        metadata: {
          ...metadata,
          email: userEmail,
          tier: 'solo',
          billing: 'monthly',
          websiteUrl: websiteUrl || '',
        },
      });

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error('Solo checkout session creation failed:', error);
      res.status(400).json({
        message:
          error instanceof Error ? error.message : 'Failed to create solo checkout session',
      });
    }
  };

  // Register both new and legacy route names
  app.post('/api/stripe/create-solo-checkout', optionalAuth, apiLimiter, handleSoloCheckout);
  app.post('/api/stripe/create-coffee-checkout', optionalAuth, apiLimiter, handleSoloCheckout);

  // Create subscription upgrade session (handles proration automatically)
  app.post('/api/stripe/create-upgrade-session', requireAuth, apiLimiter, async (req, res) => {
    try {
      const { targetTier } = z
        .object({
          targetTier: z.enum(['growth', 'scale']),
        })
        .parse(req.body);

      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Check if user has a Stripe customer ID
      if (!authUser.stripeCustomerId) {
        // Create new customer if doesn't exist
        const stripeCustomer = await createStripeCustomer({
          email: authUser.email,
          userId: authUser.id.toString(),
        });

        await authStorage.updateUser(authUser.id, {
          stripeCustomerId: stripeCustomer.id,
        });

        authUser.stripeCustomerId = stripeCustomer.id;
      }

      // Get current subscriptions
      const subscriptions = await getCustomerSubscriptions(authUser.stripeCustomerId);

      if (subscriptions.length > 0) {
        // User has an active subscription - update it (Stripe handles proration)
        const currentSubscription = subscriptions[0];
        const targetPriceId = TIER_PRICES[targetTier].priceId;

        // Update subscription to new price (Stripe automatically prorates)
        const updatedSubscription = await stripe().subscriptions.update(currentSubscription.id, {
          items: [
            {
              id: currentSubscription.items.data[0].id,
              price: targetPriceId,
            },
          ],
          proration_behavior: 'always_invoice', // Charge immediately for the difference
          payment_behavior: 'pending_if_incomplete',
        });

        // If payment is required, create a checkout session to collect it
        if (updatedSubscription.status === 'incomplete') {
          const session = await stripe().checkout.sessions.create({
            customer: authUser.stripeCustomerId,
            payment_method_types: ['card'],
            mode: 'setup', // Setup mode since subscription already exists
            success_url: `${req.headers.origin}/subscription-success?upgraded=true&tier=${targetTier}`,
            cancel_url: `${req.headers.origin}/subscription-cancel`,
            metadata: {
              userId: authUser.id.toString(),
              upgradeFrom: authUser.tier,
              upgradeTo: targetTier,
            },
          });

          res.json({
            sessionId: session.id,
            url: session.url,
            message: 'Payment required for upgrade',
          });
        } else {
          // Upgrade successful without additional payment
          res.json({
            success: true,
            message: 'Subscription upgraded successfully',
            subscription: updatedSubscription,
          });
        }
      } else {
        // No existing subscription - create new checkout session
        const priceId = TIER_PRICES[targetTier].priceId;
        const session = await createCheckoutSession({
          customerId: authUser.stripeCustomerId,
          priceId,
          successUrl: `${req.headers.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}&tier=${targetTier}`,
          cancelUrl: `${req.headers.origin}/subscription-cancel`,
          userId: authUser.id.toString(),
        });

        res.json({
          sessionId: session.id,
          url: session.url,
          message: 'Redirecting to checkout',
        });
      }
    } catch (error) {
      console.error('Upgrade session creation failed:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Failed to create upgrade session',
      });
    }
  });

  // Create customer portal session
  app.post('/api/stripe/create-portal', requireAuth, apiLimiter, async (req, res) => {
    try {
      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!authUser.stripeCustomerId) {
        return res.status(400).json({ message: 'No Stripe customer found' });
      }

      const session = await createPortalSession(
        authUser.stripeCustomerId,
        `${req.headers.origin}/dashboard`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error('Portal session creation failed:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Failed to create portal session',
      });
    }
  });

  // Get subscription status
  app.get('/api/stripe/subscription-status', requireAuth, async (req, res) => {
    try {
      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Return authenticated user's tier and credits directly from auth_users table
      res.json({
        tier: authUser.tier,
        subscriptionStatus: null, // TODO: Add subscription status to auth_users if needed
        hasActiveSubscription: ['solo', 'coffee', 'growth', 'scale'].includes(authUser.tier),
        creditsRemaining: authUser.creditsRemaining || 0,
        subscriptions: [], // TODO: Link subscriptions to auth_users if needed
      });
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      res.status(500).json({ message: 'Failed to get subscription status' });
    }
  });

  // Stripe webhook handler — express.raw() reads the body before any parsing
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      // req.body is a raw Buffer from express.raw() middleware
      const payload = req.body;

      if (!signature) {
        return res.status(400).json({ message: 'Missing stripe signature' });
      }

      // Validate webhook signature
      const event = validateWebhookSignature(payload, signature);

      console.log(`Processing Stripe webhook: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          await handleCheckoutCompleted(session);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as any;
          await handleSubscriptionUpdate(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          await handleSubscriptionCancelled(subscription);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as any;
          await handlePaymentSucceeded(invoice);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as any;
          await handlePaymentFailed(invoice);
          break;
        }

        default:
          console.log(`Unhandled webhook event: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook processing failed:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Webhook processing failed',
      });
    }
  });
}

// Webhook event handlers
async function handleCheckoutCompleted(session: any) {
  try {
    const userId = session.metadata?.userId;
    const paymentType = session.metadata?.paymentType;
    const productType = session.metadata?.productType;

    if (!userId) {
      console.error('No userId in checkout session metadata');
      return;
    }

    console.log(
      `Checkout completed for user: ${userId}, payment type: ${paymentType || 'subscription'}`
    );

    if (paymentType === 'one_time' && (productType === 'coffee' || productType === 'solo')) {
      // Handle legacy one-time purchase (kept for backward compatibility with existing coffee purchases)
      console.log(`Processing legacy one-time Solo purchase for user: ${userId}`);

      // Get customer email from Stripe session
      const customerEmail = session.customer_details?.email || session.customer_email;

      // Create credit record
      await storage.createOneTimeCredit({
        userId: parseInt(userId), // Convert to number for database
        creditsRemaining: COFFEE_TIER_CREDITS, // Coffee tier gives 20 analysis credits
        creditsTotal: COFFEE_TIER_CREDITS,
        productType: 'coffee',
        priceId: session.metadata?.priceId,
        stripePaymentIntentId: session.payment_intent,
      });

      // Update user profile with credits
      const currentProfile = await storage.getUserProfile(userId);
      const currentCredits = currentProfile?.creditsRemaining || 0;

      await storage.updateUserProfile(userId, {
        creditsRemaining: currentCredits + COFFEE_TIER_CREDITS,
        tier: 'solo', // Update tier to solo (was 'coffee')
      });

      // CRITICAL FIX: Update emailCaptures table with Coffee tier
      if (customerEmail) {
        try {
          const existingCapture = await storage.getEmailCapture(customerEmail);
          if (existingCapture) {
            // Update existing email capture to Coffee tier
            await storage.updateEmailCapture(customerEmail, { tier: 'solo' });
            console.log(`Updated email capture for ${customerEmail} to Solo tier`);
          } else {
            // Create new email capture record for Coffee tier
            await storage.createEmailCapture({
              email: customerEmail,
              tier: 'solo',
              websiteUrl: null,
            });
            console.log(`Created email capture for ${customerEmail} as Solo tier`);
          }
        } catch (error) {
          console.error(`Failed to update email capture for ${customerEmail}:`, error);
        }
      }

      // NEW: Create or update auth_users table for auto-login functionality
      if (customerEmail) {
        try {
          let authUser = await authStorage.getUserByEmail(customerEmail);

          if (authUser) {
            // Update existing authenticated user's tier and credits
            await authStorage.updateUser(authUser.id, {
              tier: 'solo',
              creditsRemaining: (authUser.creditsRemaining || 0) + COFFEE_TIER_CREDITS,
            });
            console.log(`Updated authenticated user ${customerEmail} to Solo tier with credits`);
          } else {
            // Create new auth user account for auto-login
            // Generate a temporary password - user will need to set one when they first login
            const tempPassword = Math.random().toString(36).slice(-12);
            const { hashPassword } = await import('../services/auth');
            const passwordHash = await hashPassword(tempPassword);

            authUser = await authStorage.createUser({
              email: customerEmail,
              passwordHash,
              emailVerified: false, // They'll need to verify later
              tier: 'solo',
              creditsRemaining: COFFEE_TIER_CREDITS,
            });

            console.log(`Created new auth user ${customerEmail} with Solo tier for auto-login`);

            // TODO: Send welcome email with account setup instructions
            // For now, the user can use auto-login from coffee-success page
          }
        } catch (error) {
          console.error(`Failed to create/update authenticated user for ${customerEmail}:`, error);
        }
      }

      console.log(`Added ${COFFEE_TIER_CREDITS} coffee credits to user: ${userId}`);
    } else if (session.subscription) {
      // Handle subscription signup (Growth and Scale tiers)
      console.log(`Processing subscription checkout for user: ${userId}`);

      // Get customer email and tier from session
      const customerEmail = session.customer_details?.email || session.customer_email;
      const tier =
        session.metadata?.tier || getTierFromPriceId(session.metadata?.priceId) || 'starter';
      const encodedPassword = session.metadata?.password; // Base64 encoded password from signup flow

      await storage.updateUserProfile(userId, {
        subscriptionId: session.subscription,
        subscriptionStatus: 'active',
      });

      // CRITICAL FIX: Create or update auth_users for Growth/Scale subscription
      if (customerEmail) {
        try {
          let authUser = await authStorage.getUserByEmail(customerEmail);

          if (authUser) {
            // Update existing authenticated user's tier for subscription
            await authStorage.updateUser(authUser.id, {
              tier: tier as any,
              stripeCustomerId: session.customer,
            });
            console.log(`Updated authenticated user ${customerEmail} to ${tier} tier`);
          } else if (encodedPassword) {
            // Create new auth user (coming from signup flow with password)
            const { hashPassword } = await import('../services/auth');
            const password = Buffer.from(encodedPassword, 'base64').toString();
            const passwordHash = await hashPassword(password);

            authUser = await authStorage.createUser({
              email: customerEmail,
              passwordHash,
              emailVerified: false, // Will be verified later
              tier: tier as any,
              creditsRemaining: 0, // Not used for subscription tiers
              stripeCustomerId: session.customer,
            });
            console.log(
              `Created authenticated user ${customerEmail} as ${tier} tier with subscription`
            );

            // Send verification email
            const { sendVerificationEmail } = await import('../services/email');
            sendVerificationEmail(authUser).catch((error) => {
              console.error('Failed to send verification email:', error);
            });
          } else {
            console.warn(
              `No auth user exists for ${customerEmail} and no password provided to create one`
            );
          }

          // Update email capture
          const existingCapture = await storage.getEmailCapture(customerEmail);
          if (existingCapture) {
            await storage.updateEmailCapture(customerEmail, { tier: tier as any });
            console.log(`Updated email capture for ${customerEmail} to ${tier} tier`);
          } else {
            await storage.createEmailCapture({
              email: customerEmail,
              tier: tier as any,
              websiteUrl: null,
            });
            console.log(`Created email capture for ${customerEmail} as ${tier} tier`);
          }
        } catch (error) {
          console.error(`Failed to update auth/email for subscription ${customerEmail}:`, error);
        }
      } else {
        console.error(
          `No customer email found in subscription checkout session for user ${userId}`
        );
      }
    }
  } catch (error) {
    console.error('Failed to handle checkout completion:', error);
  }
}

async function handleSubscriptionUpdate(subscription: any) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }

    const priceId = subscription.items?.data[0]?.price?.id;
    // Check metadata first (more reliable), fall back to price ID lookup
    const tierFromMetadata = subscription.metadata?.tier as string | undefined;
    const tierFromPrice = getTierFromPriceId(priceId);
    const tier = (tierFromMetadata || tierFromPrice) as 'solo' | 'growth' | 'scale' | null;

    if (!tier) {
      console.warn(
        `handleSubscriptionUpdate: unknown price ${priceId} and no metadata tier — skipping tier update to avoid clobbering with 'starter'`
      );
      return;
    }

    console.log(
      `Subscription updated for user: ${userId}, tier: ${tier}, status: ${subscription.status}`
    );

    await storage.updateUserProfile(userId, {
      tier: tier as any,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
    });

    // CRITICAL FIX: Get customer email and update both auth_users and emailCaptures
    let customerEmail = null;
    try {
      // Get customer email from Stripe
      const customer = await getStripeCustomer(subscription.customer);
      customerEmail = customer?.email;

      if (customerEmail) {
        // Update auth_users table
        const authUser = await authStorage.getUserByEmail(customerEmail);
        if (authUser) {
          await authStorage.updateUser(authUser.id, {
            tier: tier as any,
            stripeCustomerId: subscription.customer,
          });
          console.log(`Updated auth_users for ${customerEmail} to ${tier} tier`);
        }

        // Update email captures
        const existingCapture = await storage.getEmailCapture(customerEmail);
        if (existingCapture) {
          await storage.updateEmailCapture(customerEmail, { tier: tier as any });
          console.log(`Updated emailCaptures for ${customerEmail} to ${tier} tier`);
        } else {
          await storage.createEmailCapture({
            email: customerEmail,
            tier: tier as any,
            websiteUrl: null,
          });
          console.log(`Created emailCaptures for ${customerEmail} as ${tier} tier`);
        }
      } else {
        console.error(`No email found for Stripe customer ${subscription.customer}`);
      }
    } catch (customerError) {
      console.error(
        `Failed to get customer email for subscription ${subscription.id}:`,
        customerError
      );
    }

    // Record payment history if subscription is active
    if (subscription.status === 'active') {
      await storage.createPaymentHistory({
        userId,
        stripeSubscriptionId: subscription.id,
        amount: subscription.items?.data[0]?.price?.unit_amount || 0,
        currency: subscription.items?.data[0]?.price?.currency || 'usd',
        status: 'paid',
        tier: tier as any,
      });
    }
  } catch (error) {
    console.error('Failed to handle subscription update:', error);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }

    console.log(`Subscription cancelled for user: ${userId}`);

    await storage.updateUserProfile(userId, {
      tier: 'starter',
      subscriptionStatus: 'cancelled',
    });

    // CRITICAL FIX: Downgrade both auth_users and emailCaptures when subscription is cancelled
    let customerEmail = null;
    try {
      // Get customer email from Stripe
      const customer = await getStripeCustomer(subscription.customer);
      customerEmail = customer?.email;

      if (customerEmail) {
        // Downgrade auth_users table
        const authUser = await authStorage.getUserByEmail(customerEmail);
        if (authUser) {
          await authStorage.updateUser(authUser.id, {
            tier: 'starter',
          });
          console.log(
            `Downgraded auth_users for ${customerEmail} to starter tier (subscription cancelled)`
          );
        }

        // Downgrade emailCaptures
        const existingCapture = await storage.getEmailCapture(customerEmail);
        if (existingCapture) {
          await storage.updateEmailCapture(customerEmail, { tier: 'starter' });
          console.log(
            `Downgraded emailCaptures for ${customerEmail} to starter tier (subscription cancelled)`
          );
        }
      } else {
        console.error(
          `No email found for cancelled subscription customer ${subscription.customer}`
        );
      }
    } catch (customerError) {
      console.error(
        `Failed to get customer email for cancelled subscription ${subscription.id}:`,
        customerError
      );
    }
  } catch (error) {
    console.error('Failed to handle subscription cancellation:', error);
  }
}

async function handlePaymentSucceeded(invoice: any) {
  try {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    console.log(`Payment succeeded for subscription: ${subscriptionId}`);

    // Get the customer email from the invoice
    const customerEmail = invoice.customer_email;

    // Check if this is a renewal (not the first payment)
    // billing_reason: 'subscription_cycle' means it's a renewal
    // billing_reason: 'subscription_create' means it's the first payment
    if (invoice.billing_reason === 'subscription_cycle') {
      console.log(`Subscription renewal detected for: ${customerEmail}`);

      // Get the user from auth_users table
      const authUser = await authStorage.getUserByEmail(customerEmail);

      if (authUser && (authUser.tier === 'solo' || authUser.tier === 'coffee')) {
        // Reset credits to 20 for Solo tier renewal
        await authStorage.updateUser(authUser.id, {
          creditsRemaining: COFFEE_TIER_CREDITS,
        });
        console.log(
          `[RENEWAL] Reset credits to ${COFFEE_TIER_CREDITS} for Solo tier user: ${customerEmail}`
        );

        // Also call the handleSubscriptionRenewal function from usage.ts
        const { handleSubscriptionRenewal } = await import('../services/usage');
        await handleSubscriptionRenewal(authUser.id);
      }
    }

    // Add payment history tracking
    console.log(
      `Payment recorded: ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()} for ${customerEmail}`
    );
  } catch (error) {
    console.error('Failed to handle payment success:', error);
  }
}

async function handlePaymentFailed(invoice: any) {
  try {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    console.log(`Payment failed for subscription: ${subscriptionId}`);

    // Could add failed payment handling here (e.g., notifications, grace period)
  } catch (error) {
    console.error('Failed to handle payment failure:', error);
  }
}
