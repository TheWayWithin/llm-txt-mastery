import type { Express } from "express";
import { z } from "zod";
import { 
  createStripeCustomer, 
  createCheckoutSession,
  createOneTimeCheckoutSession, 
  createPortalSession,
  getStripeCustomer,
  getCustomerSubscriptions,
  validateWebhookSignature,
  getTierFromPriceId,
  TIER_PRICES
} from "../services/stripe";
import { storage } from "../storage";
import { authStorage } from "../services/auth-storage";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { apiLimiter } from "../middleware/rate-limit";

export function registerStripeRoutes(app: Express) {
  
  // Create checkout session for subscription
  app.post("/api/stripe/create-checkout", requireAuth, apiLimiter, async (req, res) => {
    try {
      const { tier } = z.object({
        tier: z.enum(['growth', 'scale'])
      }).parse(req.body);

      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Create Stripe customer for authenticated user
      const stripeCustomer = await createStripeCustomer({
        email: authUser.email,
        userId: authUser.id.toString()
      });
      
      // Update auth user with Stripe customer ID
      await authStorage.updateUser(authUser.id, {
        stripeCustomerId: stripeCustomer.id
      });

      // Create checkout session
      const priceId = TIER_PRICES[tier].priceId;
      const session = await createCheckoutSession({
        customerId: stripeCustomer.id,
        priceId,
        successUrl: `${req.headers.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${req.headers.origin}/subscription-cancel`,
        userId: authUser.id.toString()
      });

      res.json({ 
        sessionId: session.id,
        url: session.url 
      });

    } catch (error) {
      console.error("Checkout session creation failed:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create checkout session"
      });
    }
  });

  // Create one-time checkout session for coffee tier
  app.post("/api/stripe/create-coffee-checkout", optionalAuth, apiLimiter, async (req, res) => {
    try {
      const { email, websiteUrl } = z.object({
        email: z.string().email().optional(),
        websiteUrl: z.string().url().optional()
      }).parse(req.body);

      // Support both authenticated and email-based purchases
      const userEmail = req.user?.email || email;
      
      if (!userEmail) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Get or create email capture record (for freemium users)
      let emailCapture = await storage.getEmailCapture(userEmail);
      if (!emailCapture) {
        emailCapture = await storage.createEmailCapture({
          email: userEmail,
          tier: 'starter',
          websiteUrl: websiteUrl || null
        });
      }

      // Create Stripe customer (don't need user profile for freemium checkout)
      const stripeCustomer = await createStripeCustomer({
        email: userEmail,
        userId: emailCapture.id.toString() // Use email capture ID
      });

      // Create one-time payment checkout session
      const priceId = TIER_PRICES.coffee.priceId;
      
      // Encode website URL and email for success redirect
      const encodedWebsiteUrl = websiteUrl ? encodeURIComponent(websiteUrl) : '';
      const encodedEmail = encodeURIComponent(userEmail);
      
      let successUrl = `${req.headers.origin}/coffee-success?session_id={CHECKOUT_SESSION_ID}&email=${encodedEmail}`;
      if (websiteUrl) {
        successUrl += `&website=${encodedWebsiteUrl}`;
      }
        
      const session = await createOneTimeCheckoutSession({
        customerId: stripeCustomer.id,
        priceId,
        successUrl,
        cancelUrl: `${req.headers.origin}/coffee-cancel`,
        userId: emailCapture.id.toString(),
        productType: 'coffee'
      });

      res.json({ 
        sessionId: session.id,
        url: session.url 
      });

    } catch (error) {
      console.error("Coffee checkout session creation failed:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create coffee checkout session"
      });
    }
  });

  // Create customer portal session
  app.post("/api/stripe/create-portal", requireAuth, apiLimiter, async (req, res) => {
    try {
      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!authUser.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer found" });
      }

      const session = await createPortalSession(
        authUser.stripeCustomerId,
        `${req.headers.origin}/dashboard`
      );

      res.json({ url: session.url });

    } catch (error) {
      console.error("Portal session creation failed:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create portal session"
      });
    }
  });

  // Get subscription status
  app.get("/api/stripe/subscription-status", requireAuth, async (req, res) => {
    try {
      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Return authenticated user's tier and credits directly from auth_users table
      res.json({
        tier: authUser.tier,
        subscriptionStatus: null, // TODO: Add subscription status to auth_users if needed
        hasActiveSubscription: ['growth', 'scale'].includes(authUser.tier),
        creditsRemaining: authUser.creditsRemaining || 0,
        subscriptions: [] // TODO: Link subscriptions to auth_users if needed
      });

    } catch (error) {
      console.error("Failed to get subscription status:", error);
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });

  // Stripe webhook handler
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      if (!signature) {
        return res.status(400).json({ message: "Missing stripe signature" });
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
      console.error("Webhook processing failed:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Webhook processing failed"
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
      console.error("No userId in checkout session metadata");
      return;
    }

    console.log(`Checkout completed for user: ${userId}, payment type: ${paymentType || 'subscription'}`);
    
    if (paymentType === 'one_time' && productType === 'coffee') {
      // Handle one-time coffee purchase
      console.log(`Processing coffee purchase for user: ${userId}`);
      
      // Get customer email from Stripe session
      const customerEmail = session.customer_details?.email || session.customer_email;
      
      // Create credit record
      await storage.createOneTimeCredit({
        userId: parseInt(userId), // Convert to number for database
        creditsRemaining: 1, // Coffee tier gives 1 analysis credit
        creditsTotal: 1,
        productType: 'coffee',
        priceId: session.metadata?.priceId,
        stripePaymentIntentId: session.payment_intent
      });
      
      // Update user profile with credits
      const currentProfile = await storage.getUserProfile(userId);
      const currentCredits = currentProfile?.creditsRemaining || 0;
      
      await storage.updateUserProfile(userId, {
        creditsRemaining: currentCredits + 1,
        tier: 'coffee' // Update tier to coffee
      });
      
      // CRITICAL FIX: Update emailCaptures table with Coffee tier
      if (customerEmail) {
        try {
          const existingCapture = await storage.getEmailCapture(customerEmail);
          if (existingCapture) {
            // Update existing email capture to Coffee tier
            await storage.updateEmailCapture(customerEmail, { tier: 'coffee' });
            console.log(`Updated email capture for ${customerEmail} to Coffee tier`);
          } else {
            // Create new email capture record for Coffee tier
            await storage.createEmailCapture({
              email: customerEmail,
              tier: 'coffee',
              websiteUrl: null
            });
            console.log(`Created email capture for ${customerEmail} as Coffee tier`);
          }
        } catch (error) {
          console.error(`Failed to update email capture for ${customerEmail}:`, error);
        }
      }
      
      // NEW: Update auth_users table if user is authenticated
      if (customerEmail) {
        try {
          const authUser = await authStorage.getUserByEmail(customerEmail);
          if (authUser) {
            // Update authenticated user's tier and credits
            await authStorage.updateUser(authUser.id, {
              tier: 'coffee',
              creditsRemaining: (authUser.creditsRemaining || 0) + 1
            });
            console.log(`Updated authenticated user ${customerEmail} to Coffee tier with credits`);
          }
        } catch (error) {
          console.error(`Failed to update authenticated user for ${customerEmail}:`, error);
        }
      }
      
      console.log(`Added 1 coffee credit to user: ${userId}`);
      
    } else if (session.subscription) {
      // Handle subscription signup
      await storage.updateUserProfile(userId, {
        subscriptionId: session.subscription,
        subscriptionStatus: 'active'
      });
    }
  } catch (error) {
    console.error("Failed to handle checkout completion:", error);
  }
}

async function handleSubscriptionUpdate(subscription: any) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.error("No userId in subscription metadata");
      return;
    }

    const priceId = subscription.items?.data[0]?.price?.id;
    const tier = getTierFromPriceId(priceId) || 'starter';

    console.log(`Subscription updated for user: ${userId}, tier: ${tier}, status: ${subscription.status}`);

    await storage.updateUserProfile(userId, {
      tier: tier as any,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status
    });

    // Record payment history if subscription is active
    if (subscription.status === 'active') {
      await storage.createPaymentHistory({
        userId,
        stripeSubscriptionId: subscription.id,
        amount: subscription.items?.data[0]?.price?.unit_amount || 0,
        currency: subscription.items?.data[0]?.price?.currency || 'usd',
        status: 'paid',
        tier: tier as any
      });
    }

  } catch (error) {
    console.error("Failed to handle subscription update:", error);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.error("No userId in subscription metadata");
      return;
    }

    console.log(`Subscription cancelled for user: ${userId}`);

    await storage.updateUserProfile(userId, {
      tier: 'starter',
      subscriptionStatus: 'cancelled'
    });

  } catch (error) {
    console.error("Failed to handle subscription cancellation:", error);
  }
}

async function handlePaymentSucceeded(invoice: any) {
  try {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    console.log(`Payment succeeded for subscription: ${subscriptionId}`);
    
    // Could add payment history tracking here
    
  } catch (error) {
    console.error("Failed to handle payment success:", error);
  }
}

async function handlePaymentFailed(invoice: any) {
  try {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    console.log(`Payment failed for subscription: ${subscriptionId}`);
    
    // Could add failed payment handling here (e.g., notifications, grace period)
    
  } catch (error) {
    console.error("Failed to handle payment failure:", error);
  }
}