import { storage } from '../storage';
import { db } from '../db';
import {
  UserTier,
  UsageTracking,
  emailCaptures,
  usageTracking,
  users,
  authUsers,
} from '@shared/schema';
import { authStorage } from '../services/auth-storage';
import { TIER_LIMITS } from './cache';
import { eq, and } from 'drizzle-orm';

// CRITICAL FIX: Shared user resolution logic to prevent race conditions
// Both trackUsage() and getTodayUsage() use this to ensure consistent behavior
export async function resolveUserFromEmail(userEmail: string): Promise<number | null> {
  try {
    console.log(`🔍 [USER RESOLUTION] Starting for: ${userEmail}`);

    // First, check if emailCapture exists and has a linked user
    const emailCaptureResult = await db
      .select({ id: emailCaptures.id, userId: emailCaptures.userId })
      .from(emailCaptures)
      .where(eq(emailCaptures.email, userEmail))
      .limit(1);

    if (!emailCaptureResult[0]) {
      console.log(`⚠️ [USER RESOLUTION] No emailCapture found for: ${userEmail}`);
      return null;
    }

    const emailCaptureId = emailCaptureResult[0].id;
    let actualUserId = emailCaptureResult[0].userId;

    // If emailCapture already has a userId, return it
    if (actualUserId) {
      console.log(`✅ [USER RESOLUTION] Found existing user ID: ${actualUserId} for ${userEmail}`);
      return actualUserId;
    }

    // Check if a user with this email as username already exists (from previous attempts)
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, userEmail))
      .limit(1);

    if (existingUser[0]) {
      // User exists but wasn't linked to emailCapture - link it now
      console.log(
        `🔗 [USER RESOLUTION] Found existing user ${existingUser[0].id}, linking to emailCapture`
      );

      await db
        .update(emailCaptures)
        .set({ userId: existingUser[0].id })
        .where(eq(emailCaptures.id, emailCaptureId));

      return existingUser[0].id;
    }

    // Otherwise, create a placeholder user and link it atomically
    console.log(`🔧 [USER RESOLUTION] Creating placeholder user for: ${userEmail}`);

    // TRANSACTION SAFETY: Execute user creation and emailCaptures update atomically
    const result = await db.transaction(async (tx) => {
      // Create a placeholder user in users table for usage tracking
      const newUser = await tx
        .insert(users)
        .values({
          username: userEmail, // Use email as username for placeholder
          password: 'placeholder', // This won't be used for login
        })
        .returning({ id: users.id });

      const userId = newUser[0].id;

      // Update emailCaptures to reference this user
      await tx
        .update(emailCaptures)
        .set({ userId: userId })
        .where(eq(emailCaptures.id, emailCaptureId));

      return userId;
    });

    console.log(`✅ [USER RESOLUTION] Created and linked user ID: ${result} for ${userEmail}`);
    return result;
  } catch (error) {
    console.error(`🚨 [USER RESOLUTION] Error for ${userEmail}:`, error);
    // Log additional details for debugging
    if (error instanceof Error) {
      console.error(`🚨 [USER RESOLUTION] Error details:`, {
        message: error.message,
        stack: error.stack,
        email: userEmail,
      });
    }
    return null;
  }
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: {
    analysesToday: number;
    pagesProcessedToday: number;
  };
  limits: {
    dailyAnalyses: number;
    maxPagesPerAnalysis: number;
    aiPagesLimit: number;
  };
  suggestedUpgrade?: UserTier;
}

// Get user's current tier (simplified to use emailCaptures only for now)
export async function getUserTier(userEmail: string): Promise<UserTier> {
  try {
    // Temporary manual override for Coffee tier customer
    if (userEmail === 'jamie.watters.mail@icloud.com') {
      console.log(`Manual override: ${userEmail} set to Coffee tier`);
      return 'coffee';
    }

    // Check emailCaptures table directly (where Coffee tier is stored)
    const emailCapture = await storage.getEmailCapture(userEmail);
    const tier = emailCapture?.tier || 'starter';
    console.log(`getUserTier for ${userEmail}: found tier "${tier}" in emailCaptures`);
    return tier;
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'starter';
  }
}

// Get today's usage for a user from database
export async function getTodayUsage(userEmail: string): Promise<UsageTracking | null> {
  try {
    console.log(`🔍 [GET USAGE] Checking today's usage for: ${userEmail}`);
    const today = new Date().toISOString().split('T')[0];

    // CRITICAL FIX: Use shared user resolution to ensure consistency with trackUsage()
    const actualUserId = await resolveUserFromEmail(userEmail);
    if (!actualUserId) {
      console.log(`⚠️ [GET USAGE] Failed to resolve user for: ${userEmail}`);
      return null;
    }

    // Get today's usage from database using Drizzle ORM
    const usageResult = await db
      .select()
      .from(usageTracking)
      .where(and(eq(usageTracking.userId, actualUserId), eq(usageTracking.date, today)))
      .limit(1);

    const usage = usageResult[0];
    if (!usage) {
      console.log(`ℹ️ [GET USAGE] No usage record found for user ${actualUserId} on ${today}`);
      return null;
    }
    console.log(
      `📊 [GET USAGE] Found usage: ${usage.analysesCount} analyses for user ${actualUserId}`
    );

    // Return usage data (already in correct format from Drizzle)
    return usage;
  } catch (error) {
    console.error('🚨 [GET USAGE] ERROR:', error);
    console.error('🚨 [GET USAGE] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    return null;
  }
}

// Check if user can perform analysis
export async function checkUsageLimits(
  userEmail: string,
  requestedPages: number
): Promise<UsageCheckResult> {
  // Note: Development bypass removed to restore proper usage tracking
  // All environments now enforce proper usage limits and tracking

  try {
    const tier = await getUserTier(userEmail);
    const limits = TIER_LIMITS[tier];
    const todayUsage = await getTodayUsage(userEmail);

    const analysesToday = todayUsage?.analysesCount || 0;
    const pagesProcessedToday = todayUsage?.pagesProcessed || 0;

    // Check daily analysis limit
    if (analysesToday >= limits.dailyAnalyses) {
      const suggestedUpgrade =
        tier === 'starter' ? 'coffee' : tier === 'coffee' ? 'growth' : 'scale';

      // Create user-friendly messaging based on tier
      let reason: string;
      if (tier === 'starter') {
        reason = `You've used your 3 free analyses for today! Buy me a coffee ($4.95) for unlimited AI-powered analysis of up to 200 pages. Your free analyses reset tomorrow at midnight.`;
      } else {
        reason = `Daily limit reached. ${tier} tier allows ${limits.dailyAnalyses} analysis${limits.dailyAnalyses > 1 ? 'es' : ''} per day. Resets at midnight.`;
      }

      return {
        allowed: false,
        reason,
        currentUsage: { analysesToday, pagesProcessedToday },
        limits: {
          dailyAnalyses: limits.dailyAnalyses,
          maxPagesPerAnalysis: limits.maxPagesPerAnalysis,
          aiPagesLimit: limits.aiPagesLimit,
        },
        suggestedUpgrade,
      };
    }

    // Note: Page limit per analysis is handled in the analysis pipeline (sitemap-enhanced.ts)
    // The tier-based page limiting happens there, not in usage validation
    // This allows free tier to analyze any website but only process the top N pages

    return {
      allowed: true,
      currentUsage: { analysesToday, pagesProcessedToday },
      limits: {
        dailyAnalyses: limits.dailyAnalyses,
        maxPagesPerAnalysis: limits.maxPagesPerAnalysis,
        aiPagesLimit: limits.aiPagesLimit,
      },
    };
  } catch (error) {
    console.error(`❌ [USAGE LIMITS] ERROR checking limits for ${userEmail}:`, error);
    console.error(`   Error details:`, error instanceof Error ? error.message : 'Unknown error');

    // CRITICAL FIX: Default to DENYING on error for starter tier to prevent abuse
    // Only allow if we can't determine the tier (network issues, etc)
    try {
      const tier = await getUserTier(userEmail);
      if (tier === 'starter') {
        return {
          allowed: false,
          reason:
            'Unable to verify usage limits. Please try again or contact support if the issue persists.',
          currentUsage: { analysesToday: 0, pagesProcessedToday: 0 },
          limits: {
            dailyAnalyses: 3,
            maxPagesPerAnalysis: 20,
            aiPagesLimit: 0,
          },
        };
      }
    } catch (tierError) {
      console.error(`❌ [USAGE LIMITS] Cannot determine tier:`, tierError);
    }

    // For paid tiers or unknown cases, allow but log the issue
    console.warn(
      `⚠️ [USAGE LIMITS] Allowing analysis for ${userEmail} despite error (fail-open for non-starter)`
    );
    return {
      allowed: true,
      currentUsage: { analysesToday: 0, pagesProcessedToday: 0 },
      limits: {
        dailyAnalyses: 3,
        maxPagesPerAnalysis: 20,
        aiPagesLimit: 0,
      },
    };
  }
}

// Track usage for a completed analysis
export async function trackUsage(
  userEmail: string,
  pagesProcessed: number,
  aiCallsCount: number,
  htmlExtractionsCount: number,
  cacheHits: number,
  estimatedCost: number,
  actualTokensUsed: number = 0,
  actualAiCostUSD: number = 0,
  modelUsed: string = '',
  costCapWouldTrigger: boolean = false
): Promise<void> {
  try {
    console.log(
      `✅ [USAGE TRACKING] Called successfully for ${userEmail}: ${pagesProcessed} pages, ${aiCallsCount} AI calls`
    );
    const today = new Date().toISOString().split('T')[0];

    // CRITICAL FIX: Use shared user resolution to ensure consistency with getTodayUsage()
    const actualUserId = await resolveUserFromEmail(userEmail);
    if (!actualUserId) {
      console.error(
        `❌ [USAGE TRACKING] CRITICAL: Cannot resolve user for ${userEmail} - usage will not be tracked!`
      );
      // Try to create a minimal tracking record using email
      try {
        const emailCapture = await storage.getEmailCapture(userEmail);
        if (emailCapture?.userId) {
          console.log(
            `🔧 [USAGE TRACKING] Found userId from email capture: ${emailCapture.userId}`
          );
          // Continue with the found userId
          const foundUserId = emailCapture.userId;
          await storage.createUsageTracking({
            userId: foundUserId,
            date: today,
            analysesCount: 1,
            pagesProcessed: pagesProcessed,
            aiCallsCount: aiCallsCount,
            htmlExtractionsCount: htmlExtractionsCount,
            cacheHits: cacheHits,
            totalCost: Math.round(estimatedCost * 100),
          });
          console.log(`✅ [USAGE TRACKING] Successfully tracked via email capture fallback`);
          return;
        }
      } catch (fallbackError) {
        console.error(`❌ [USAGE TRACKING] Fallback also failed:`, fallbackError);
      }
      return;
    }

    // Try to get existing usage record first
    const existingUsage = await db
      .select()
      .from(usageTracking)
      .where(and(eq(usageTracking.userId, actualUserId), eq(usageTracking.date, today)))
      .limit(1);

    if (existingUsage.length > 0) {
      // Update existing record with new cost tracking fields
      const updateResult = await db
        .update(usageTracking)
        .set({
          analysesCount: existingUsage[0].analysesCount + 1,
          pagesProcessed: existingUsage[0].pagesProcessed + pagesProcessed,
          aiCallsCount: existingUsage[0].aiCallsCount + aiCallsCount,
          htmlExtractionsCount: existingUsage[0].htmlExtractionsCount + htmlExtractionsCount,
          cacheHits: existingUsage[0].cacheHits + cacheHits,
          totalCost: existingUsage[0].totalCost + Math.round(estimatedCost * 100), // Convert to cents
          // New cost tracking fields
          actualTokensUsed: (existingUsage[0].actualTokensUsed || 0) + actualTokensUsed,
          actualAiCost: (existingUsage[0].actualAiCost || 0) + Math.round(actualAiCostUSD * 100), // Convert to cents
          modelUsed: modelUsed || existingUsage[0].modelUsed,
          costCapWouldTrigger: costCapWouldTrigger || existingUsage[0].costCapWouldTrigger,
          costCapTriggeredAt:
            costCapWouldTrigger && !existingUsage[0].costCapWouldTrigger
              ? new Date()
              : existingUsage[0].costCapTriggeredAt,
          updatedAt: new Date(),
        })
        .where(eq(usageTracking.id, existingUsage[0].id))
        .returning();

      console.log(`🔄 [USAGE TRACKING] UPDATED existing record for ${userEmail}:`, updateResult[0]);
    } else {
      // Insert new record with cost tracking fields
      const insertResult = await db
        .insert(usageTracking)
        .values({
          userId: actualUserId,
          date: today,
          analysesCount: 1,
          pagesProcessed: pagesProcessed,
          aiCallsCount: aiCallsCount,
          htmlExtractionsCount: htmlExtractionsCount,
          cacheHits: cacheHits,
          totalCost: Math.round(estimatedCost * 100), // Convert to cents
          // New cost tracking fields
          actualTokensUsed: actualTokensUsed,
          actualAiCost: Math.round(actualAiCostUSD * 100), // Convert to cents
          modelUsed: modelUsed,
          costCapWouldTrigger: costCapWouldTrigger,
          costCapTriggeredAt: costCapWouldTrigger ? new Date() : null,
        })
        .returning();

      console.log(`➕ [USAGE TRACKING] INSERTED new record for ${userEmail}:`, insertResult[0]);
    }

    console.log(
      `🎉 [USAGE TRACKING] SUCCESS for ${userEmail}: ${pagesProcessed} pages, ${aiCallsCount} AI calls, ${cacheHits} cache hits`
    );
  } catch (error) {
    console.error('🚨 [USAGE TRACKING] ERROR:', error);
    console.error('🚨 [USAGE TRACKING] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      table: error.table,
      column: error.column,
      constraint: error.constraint,
    });
  }
}

// Get monthly AI cost for a user
export async function getMonthlyAiCost(userEmail: string): Promise<{
  monthlyTotal: number;
  dailyAverage: number;
  tokensUsed: number;
  daysActive: number;
}> {
  try {
    const actualUserId = await resolveUserFromEmail(userEmail);
    if (!actualUserId) {
      return { monthlyTotal: 0, dailyAverage: 0, tokensUsed: 0, daysActive: 0 };
    }

    // Get current month's start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Query usage tracking for this month
    const monthUsage = await db
      .select({
        actualAiCost: usageTracking.actualAiCost,
        actualTokensUsed: usageTracking.actualTokensUsed,
      })
      .from(usageTracking)
      .where(and(eq(usageTracking.userId, actualUserId), gt(usageTracking.date, monthStart)));

    const monthlyTotal = monthUsage.reduce((sum, day) => sum + (day.actualAiCost || 0), 0) / 100; // Convert cents to USD
    const tokensUsed = monthUsage.reduce((sum, day) => sum + (day.actualTokensUsed || 0), 0);
    const daysActive = monthUsage.length;
    const dailyAverage = daysActive > 0 ? monthlyTotal / daysActive : 0;

    return { monthlyTotal, dailyAverage, tokensUsed, daysActive };
  } catch (error) {
    console.error('Error getting monthly AI cost:', error);
    return { monthlyTotal: 0, dailyAverage: 0, tokensUsed: 0, daysActive: 0 };
  }
}

// Check if AI usage should be allowed based on cost caps
export async function checkAiCostCap(
  userEmail: string,
  tier: UserTier
): Promise<{
  allowed: boolean;
  reason?: string;
  monthlyBudget: number;
  monthlySpent: number;
  percentUsed: number;
  wouldTrigger: boolean;
}> {
  // Check if cost caps are enabled
  const enableCostCaps = process.env.ENABLE_AI_COST_CAPS === 'true';

  // Get tier-specific budget
  const monthlyBudgets = {
    starter: 0, // No AI for starter tier
    coffee: 3.0, // Conservative limit for coffee tier
    growth: parseFloat(process.env.AI_COST_CAP_GROWTH || '8.00'),
    scale: parseFloat(process.env.AI_COST_CAP_SCALE || '16.00'),
  };

  const monthlyBudget = monthlyBudgets[tier];
  const alertThreshold = parseFloat(process.env.AI_COST_ALERT_THRESHOLD || '0.7');

  // Get current monthly spending
  const { monthlyTotal } = await getMonthlyAiCost(userEmail);
  const percentUsed = monthlyBudget > 0 ? monthlyTotal / monthlyBudget : 0;

  // Check if cap would be triggered
  const wouldTrigger = monthlyTotal >= monthlyBudget;

  // Log warning if approaching limit
  if (percentUsed >= alertThreshold) {
    console.warn(
      `⚠️ [AI COST WARNING] User ${userEmail} has used ${(percentUsed * 100).toFixed(1)}% of monthly AI budget`
    );
    console.warn(`   Budget: $${monthlyBudget.toFixed(2)}, Spent: $${monthlyTotal.toFixed(2)}`);
  }

  // Log when cap would trigger (monitoring mode)
  if (wouldTrigger && !enableCostCaps) {
    console.log(`🔍 [AI COST MONITOR] Cap WOULD trigger for ${userEmail} (monitoring mode)`);
    console.log(`   Budget: $${monthlyBudget.toFixed(2)}, Spent: $${monthlyTotal.toFixed(2)}`);
  }

  // Determine if AI should be allowed
  const allowed = !enableCostCaps || !wouldTrigger;

  return {
    allowed,
    reason: wouldTrigger
      ? `Monthly AI budget of $${monthlyBudget.toFixed(2)} exceeded. Current spend: $${monthlyTotal.toFixed(2)}`
      : undefined,
    monthlyBudget,
    monthlySpent: monthlyTotal,
    percentUsed,
    wouldTrigger,
  };
}

// Coffee tier credit management
export async function checkCoffeeCredits(
  userId: string
): Promise<{ hasCredits: boolean; creditsRemaining: number }> {
  try {
    console.log(`[DEBUG] Checking coffee credits for userId: ${userId}`);

    const numericUserId = parseInt(userId);
    if (isNaN(numericUserId)) {
      console.error(`[ERROR] Invalid userId format: ${userId}`);
      return { hasCredits: false, creditsRemaining: 0 };
    }

    // Query auth_users table directly for creditsRemaining
    const [authUser] = await db
      .select({
        creditsRemaining: authUsers.creditsRemaining,
        email: authUsers.email,
        tier: authUsers.tier,
      })
      .from(authUsers)
      .where(eq(authUsers.id, numericUserId));

    if (!authUser) {
      console.error(`[ERROR] No auth_user found for userId: ${userId}`);
      return { hasCredits: false, creditsRemaining: 0 };
    }

    const creditsRemaining = authUser.creditsRemaining;
    console.log(
      `[DEBUG] Found user ${authUser.email} with ${creditsRemaining} credits (tier: ${authUser.tier})`
    );

    return {
      hasCredits: creditsRemaining > 0,
      creditsRemaining,
    };
  } catch (error) {
    console.error(`[ERROR] Failed to check coffee credits for userId ${userId}:`, error);
    return { hasCredits: false, creditsRemaining: 0 };
  }
}

export async function consumeCoffeeCredit(userId: string): Promise<boolean> {
  try {
    console.log(`[DEBUG] Attempting to consume credit for userId: ${userId}`);

    const numericUserId = parseInt(userId);
    if (isNaN(numericUserId)) {
      console.error(`[ERROR] Invalid userId format: ${userId}`);
      return false;
    }

    // Get current credits directly from auth_users table
    const [authUser] = await db
      .select({
        creditsRemaining: authUsers.creditsRemaining,
        email: authUsers.email,
      })
      .from(authUsers)
      .where(eq(authUsers.id, numericUserId));

    if (!authUser || authUser.creditsRemaining <= 0) {
      console.log(
        `[DEBUG] User ${authUser?.email || 'unknown'} has ${authUser?.creditsRemaining || 0} credits - cannot consume`
      );
      return false;
    }

    // Consume one credit directly in auth_users table
    const newCredits = authUser.creditsRemaining - 1;
    await db
      .update(authUsers)
      .set({ creditsRemaining: newCredits })
      .where(eq(authUsers.id, numericUserId));

    console.log(
      `[DEBUG] Consumed 1 coffee credit for user ${authUser.email}. Remaining: ${newCredits}`
    );
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to consume coffee credit for userId ${userId}:`, error);
    return false;
  }
}

export async function getUserTierFromAuth(
  user: { id: string; email: string; tier: UserTier } | undefined,
  email?: string
): Promise<UserTier> {
  if (user) {
    // Get tier from authenticated user profile
    const userProfile = await storage.getUserProfile(user.id);
    return userProfile?.tier || user.tier || 'starter';
  } else if (email) {
    // Fallback to email-based tier lookup for backward compatibility
    return await getUserTier(email);
  } else {
    return 'starter';
  }
}

// Monthly credit reset for Coffee tier subscriptions
export async function resetMonthlyCredits(): Promise<void> {
  try {
    console.log('[CREDIT RESET] Starting monthly credit reset for Coffee tier users');

    // Get all Coffee tier users from auth_users table
    const coffeeTierUsers = await db.select().from(authUsers).where(eq(authUsers.tier, 'coffee'));

    console.log(`[CREDIT RESET] Found ${coffeeTierUsers.length} Coffee tier users`);

    // Reset credits to the proper Coffee tier allocation for each user
    const coffeeCredits = TIER_LIMITS.coffee.dailyAnalyses;
    for (const user of coffeeTierUsers) {
      await authStorage.updateUser(user.id, {
        creditsRemaining: coffeeCredits, // Reset to full monthly allocation
      });
      console.log(`[CREDIT RESET] Reset credits to ${coffeeCredits} for user ${user.email}`);
    }

    console.log('[CREDIT RESET] Monthly credit reset completed');
  } catch (error) {
    console.error('[CREDIT RESET] Failed to reset monthly credits:', error);
  }
}

// Handle subscription renewal (called from Stripe webhook)
export async function handleSubscriptionRenewal(userId: number): Promise<void> {
  try {
    const user = await authStorage.getUserById(userId);
    if (user && user.tier === 'coffee') {
      const coffeeCredits = TIER_LIMITS.coffee.dailyAnalyses;
      await authStorage.updateUser(userId, {
        creditsRemaining: coffeeCredits, // Reset to full credits on renewal
      });
      console.log(
        `[SUBSCRIPTION] Reset credits to ${coffeeCredits} for renewed Coffee subscription: ${user.email}`
      );
    }
  } catch (error) {
    console.error(`[SUBSCRIPTION] Failed to handle renewal for user ${userId}:`, error);
  }
}

// Get usage statistics for a user
export async function getUserUsageStats(userEmail: string, days: number = 30): Promise<any> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db.execute(
      `
      SELECT 
        COUNT(*) as days_active,
        SUM(analyses_count) as total_analyses,
        SUM(pages_processed) as total_pages,
        SUM(ai_calls_count) as total_ai_calls,
        SUM(cache_hits) as total_cache_hits,
        SUM(total_cost) as total_cost,
        AVG(analyses_count) as avg_analyses_per_day,
        AVG(pages_processed) as avg_pages_per_day
      FROM usage_tracking 
      WHERE user_id = (SELECT id FROM email_captures WHERE email = $1 LIMIT 1)
      AND date >= $2
    `,
      [userEmail, startDate.toISOString().split('T')[0]]
    );

    return (
      result.rows?.[0] || {
        days_active: 0,
        total_analyses: 0,
        total_pages: 0,
        total_ai_calls: 0,
        total_cache_hits: 0,
        total_cost: 0,
        avg_analyses_per_day: 0,
        avg_pages_per_day: 0,
      }
    );
  } catch (error) {
    console.error('Error getting user usage stats:', error);
    return null;
  }
}

// Estimate cost for an analysis
export function estimateAnalysisCost(
  pagesCount: number,
  tier: UserTier,
  cacheHits: number = 0
): number {
  const limits = TIER_LIMITS[tier];
  const uncachedPages = Math.max(0, pagesCount - cacheHits);

  // Calculate how many pages will use AI
  const aiPages = tier === 'starter' ? 0 : Math.min(uncachedPages, limits.aiPagesLimit);
  const htmlPages = uncachedPages - aiPages;

  // Cost estimates
  const aiCostPerPage = 0.03; // GPT-4 approximate cost
  const htmlCostPerPage = 0.001; // Basic processing cost

  return aiPages * aiCostPerPage + htmlPages * htmlCostPerPage;
}

// Get next tier suggestion
export function getNextTier(currentTier: UserTier): UserTier | null {
  switch (currentTier) {
    case 'starter':
      return 'growth';
    case 'growth':
      return 'scale';
    case 'scale':
      return null;
    default:
      return 'growth';
  }
}

// ============================================================================
// Sprint 6: JS Rendering Quota Management (Scale Tier Only)
// ============================================================================

const JS_RENDERS_MONTHLY_LIMIT = 100; // Scale tier gets 100 JS renders per month

/**
 * Check if user has remaining JS renders for this month
 * Returns the current count and whether they can use more
 */
export async function checkJsRenderQuota(
  userId: string
): Promise<{ hasQuota: boolean; rendersUsed: number; rendersRemaining: number; resetAt: Date | null }> {
  try {
    const numericUserId = parseInt(userId);
    if (isNaN(numericUserId)) {
      console.error(`[JS QUOTA] Invalid userId format: ${userId}`);
      return { hasQuota: false, rendersUsed: 0, rendersRemaining: 0, resetAt: null };
    }

    const [authUser] = await db
      .select({
        tier: authUsers.tier,
        jsRendersUsedThisMonth: authUsers.jsRendersUsedThisMonth,
        jsRendersResetAt: authUsers.jsRendersResetAt,
      })
      .from(authUsers)
      .where(eq(authUsers.id, numericUserId));

    if (!authUser) {
      console.error(`[JS QUOTA] No auth_user found for userId: ${userId}`);
      return { hasQuota: false, rendersUsed: 0, rendersRemaining: 0, resetAt: null };
    }

    // Only Scale tier gets JS rendering
    if (authUser.tier !== 'scale') {
      return { hasQuota: false, rendersUsed: 0, rendersRemaining: 0, resetAt: null };
    }

    // Check if reset is needed (monthly reset)
    let rendersUsed = authUser.jsRendersUsedThisMonth || 0;
    let resetAt = authUser.jsRendersResetAt;

    if (!resetAt || new Date() >= resetAt) {
      // Reset the counter and set next reset date
      const nextReset = new Date();
      nextReset.setMonth(nextReset.getMonth() + 1);
      nextReset.setDate(1);
      nextReset.setHours(0, 0, 0, 0);

      await db
        .update(authUsers)
        .set({
          jsRendersUsedThisMonth: 0,
          jsRendersResetAt: nextReset,
        })
        .where(eq(authUsers.id, numericUserId));

      rendersUsed = 0;
      resetAt = nextReset;
      console.log(`[JS QUOTA] Reset JS render counter for userId ${userId}. Next reset: ${nextReset.toISOString()}`);
    }

    const rendersRemaining = Math.max(0, JS_RENDERS_MONTHLY_LIMIT - rendersUsed);
    const hasQuota = rendersRemaining > 0;

    return { hasQuota, rendersUsed, rendersRemaining, resetAt };
  } catch (error) {
    console.error(`[JS QUOTA] Failed to check JS render quota for userId ${userId}:`, error);
    // Fail open - allow usage if we can't check quota
    return { hasQuota: true, rendersUsed: 0, rendersRemaining: JS_RENDERS_MONTHLY_LIMIT, resetAt: null };
  }
}

/**
 * Consume JS renders from the user's monthly quota
 * @param userId The user's auth_users ID
 * @param count Number of renders to consume (default 1)
 * @returns true if consumption was successful, false if quota exceeded
 */
export async function consumeJsRenders(userId: string, count: number = 1): Promise<boolean> {
  try {
    const numericUserId = parseInt(userId);
    if (isNaN(numericUserId)) {
      console.error(`[JS QUOTA] Invalid userId format: ${userId}`);
      return false;
    }

    // First check quota
    const quota = await checkJsRenderQuota(userId);
    if (!quota.hasQuota) {
      console.warn(`[JS QUOTA] User ${userId} has exceeded JS render quota (${quota.rendersUsed}/${JS_RENDERS_MONTHLY_LIMIT})`);
      return false;
    }

    if (quota.rendersRemaining < count) {
      console.warn(`[JS QUOTA] User ${userId} has insufficient JS renders (${quota.rendersRemaining} remaining, ${count} requested)`);
      return false;
    }

    // Consume the renders
    const newCount = (quota.rendersUsed + count);
    await db
      .update(authUsers)
      .set({ jsRendersUsedThisMonth: newCount })
      .where(eq(authUsers.id, numericUserId));

    console.log(`[JS QUOTA] Consumed ${count} JS render(s) for userId ${userId}. New total: ${newCount}/${JS_RENDERS_MONTHLY_LIMIT}`);
    return true;
  } catch (error) {
    console.error(`[JS QUOTA] Failed to consume JS renders for userId ${userId}:`, error);
    // Fail open - allow usage if we can't update quota
    return true;
  }
}

/**
 * Get the monthly JS render limit for display purposes
 */
export function getJsRenderMonthlyLimit(): number {
  return JS_RENDERS_MONTHLY_LIMIT;
}
