/**
 * Test version of webhook handlers extracted from /server/routes/stripe.ts
 * 
 * These are the actual functions being tested to ensure tier upgrades work correctly.
 * This file isolates the webhook handlers for comprehensive unit testing.
 */

import { storage } from '../../server/storage';
import { authStorage } from '../../server/services/auth-storage';
import { getTierFromPriceId, getStripeCustomer } from '../../server/services/stripe';

// Webhook event handlers (extracted from /server/routes/stripe.ts for testing)
export async function handleCheckoutCompleted(session: any) {
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
      
      // NEW: Create or update auth_users table for auto-login functionality
      if (customerEmail) {
        try {
          let authUser = await authStorage.getUserByEmail(customerEmail);
          
          if (authUser) {
            // Update existing authenticated user's tier and credits
            await authStorage.updateUser(authUser.id, {
              tier: 'coffee',
              creditsRemaining: (authUser.creditsRemaining || 0) + 1
            });
            console.log(`Updated authenticated user ${customerEmail} to Coffee tier with credits`);
          } else {
            // Create new auth user account for auto-login
            // Generate a temporary password - user will need to set one when they first login
            const tempPassword = Math.random().toString(36).slice(-12);
            const { hashPassword } = await import('../../server/services/auth');
            const passwordHash = await hashPassword(tempPassword);
            
            authUser = await authStorage.createUser({
              email: customerEmail,
              passwordHash,
              emailVerified: false, // They'll need to verify later
              tier: 'coffee',
              creditsRemaining: 1
            });
            
            console.log(`Created new auth user ${customerEmail} with Coffee tier for auto-login`);
            
            // TODO: Send welcome email with account setup instructions
            // For now, the user can use auto-login from coffee-success page
          }
        } catch (error) {
          console.error(`Failed to create/update authenticated user for ${customerEmail}:`, error);
        }
      }
      
      console.log(`Added 1 coffee credit to user: ${userId}`);
      
    } else if (session.subscription) {
      // Handle subscription signup
      await storage.updateUserProfile(userId, {
        subscriptionId: session.subscription,
        subscriptionStatus: 'active'
      });
      
      // CRITICAL FIX: Get customer email and update emailCaptures for subscriptions
      const customerEmail = session.customer_details?.email || session.customer_email;
      if (customerEmail) {
        // Get tier from subscription metadata or price ID
        const priceId = session.metadata?.priceId;
        const tier = getTierFromPriceId(priceId) || 'starter';
        
        try {
          const existingCapture = await storage.getEmailCapture(customerEmail);
          if (existingCapture) {
            // Update existing email capture to subscription tier
            await storage.updateEmailCapture(customerEmail, { tier: tier as any });
            console.log(`Updated email capture for ${customerEmail} to ${tier} tier`);
          } else {
            // Create new email capture record for subscription tier
            await storage.createEmailCapture({
              email: customerEmail,
              tier: tier as any,
              websiteUrl: null
            });
            console.log(`Created email capture for ${customerEmail} as ${tier} tier`);
          }
        } catch (error) {
          console.error(`Failed to update email capture for subscription ${customerEmail}:`, error);
        }
      } else {
        console.error(`No customer email found in subscription checkout session for user ${userId}`);
      }
    }
  } catch (error) {
    console.error("Failed to handle checkout completion:", error);
  }
}

export async function handleSubscriptionUpdate(subscription: any) {
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

    // CRITICAL FIX: Get customer email and update emailCaptures for subscription updates
    let customerEmail = null;
    try {
      // Get customer email from Stripe
      const customer = await getStripeCustomer(subscription.customer);
      customerEmail = customer?.email;
      
      if (customerEmail) {
        const existingCapture = await storage.getEmailCapture(customerEmail);
        if (existingCapture) {
          // Update existing email capture to subscription tier
          await storage.updateEmailCapture(customerEmail, { tier: tier as any });
          console.log(`Updated emailCaptures for ${customerEmail} to ${tier} tier`);
        } else {
          // Create new email capture record for subscription tier
          await storage.createEmailCapture({
            email: customerEmail,
            tier: tier as any,
            websiteUrl: null
          });
          console.log(`Created emailCaptures for ${customerEmail} as ${tier} tier`);
        }
      } else {
        console.error(`No email found for Stripe customer ${subscription.customer}`);
      }
    } catch (customerError) {
      console.error(`Failed to get customer email for subscription ${subscription.id}:`, customerError);
    }

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

export async function handleSubscriptionCancelled(subscription: any) {
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

    // CRITICAL FIX: Downgrade emailCaptures tier when subscription is cancelled
    let customerEmail = null;
    try {
      // Get customer email from Stripe
      const customer = await getStripeCustomer(subscription.customer);
      customerEmail = customer?.email;
      
      if (customerEmail) {
        const existingCapture = await storage.getEmailCapture(customerEmail);
        if (existingCapture) {
          // Downgrade to starter tier on cancellation
          await storage.updateEmailCapture(customerEmail, { tier: 'starter' });
          console.log(`Downgraded emailCaptures for ${customerEmail} to starter tier (subscription cancelled)`);
        }
      } else {
        console.error(`No email found for cancelled subscription customer ${subscription.customer}`);
      }
    } catch (customerError) {
      console.error(`Failed to get customer email for cancelled subscription ${subscription.id}:`, customerError);
    }

  } catch (error) {
    console.error("Failed to handle subscription cancellation:", error);
  }
}