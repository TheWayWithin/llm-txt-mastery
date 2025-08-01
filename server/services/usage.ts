import { storage } from "../storage";
import { db } from "../db";
import { UserTier, UsageTracking, emailCaptures, usageTracking } from "@shared/schema";
import { TIER_LIMITS } from "./cache";
import { eq, and } from "drizzle-orm";

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
    
    // Get user ID from email first using Drizzle ORM
    const userResult = await db
      .select({ id: emailCaptures.id })
      .from(emailCaptures)
      .where(eq(emailCaptures.email, userEmail))
      .limit(1);
    
    const userId = userResult[0]?.id;
    if (!userId) {
      console.log(`⚠️ [GET USAGE] No user found for email: ${userEmail}`);
      return null;
    }
    console.log(`✅ [GET USAGE] Found user ID: ${userId} for ${userEmail}`);
    
    // Get today's usage from database using Drizzle ORM
    const usageResult = await db
      .select()
      .from(usageTracking)
      .where(and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.date, today)
      ))
      .limit(1);
    
    const usage = usageResult[0];
    if (!usage) {
      console.log(`ℹ️ [GET USAGE] No usage record found for user ${userId} on ${today}`);
      return null;
    }
    console.log(`📊 [GET USAGE] Found usage: ${usage.analysesCount} analyses for user ${userId}`);
    
    // Return usage data (already in correct format from Drizzle)
    return usage;
  } catch (error) {
    console.error('Error getting today usage:', error);
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
      const suggestedUpgrade = tier === 'starter' ? 'coffee' : tier === 'coffee' ? 'growth' : 'scale';
      
      // Create user-friendly messaging based on tier
      let reason: string;
      if (tier === 'starter') {
        reason = `You've used your free analysis for today! Buy me a coffee ($4.95) for unlimited AI-powered analysis of up to 200 pages. Your free analysis resets tomorrow at midnight.`;
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
          aiPagesLimit: limits.aiPagesLimit
        },
        suggestedUpgrade
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
        aiPagesLimit: limits.aiPagesLimit
      }
    };
    
  } catch (error) {
    console.error('Error checking usage limits:', error);
    // Default to allowing on error to not block users
    return {
      allowed: true,
      currentUsage: { analysesToday: 0, pagesProcessedToday: 0 },
      limits: {
        dailyAnalyses: 1,
        maxPagesPerAnalysis: 50,
        aiPagesLimit: 0
      }
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
  estimatedCost: number
): Promise<void> {
  try {
    console.log(`🔍 [USAGE TRACKING] Starting for ${userEmail}: ${pagesProcessed} pages, ${aiCallsCount} AI calls`);
    const today = new Date().toISOString().split('T')[0];
    
    // Get user ID from email using Drizzle ORM
    const userResult = await db
      .select({ id: emailCaptures.id })
      .from(emailCaptures)
      .where(eq(emailCaptures.email, userEmail))
      .limit(1);
    
    const userId = userResult[0]?.id;
    if (!userId) {
      console.log(`⚠️ [USAGE TRACKING] No user found for email: ${userEmail}`);
      return;
    }
    console.log(`✅ [USAGE TRACKING] Found user ID: ${userId} for ${userEmail}`);
    
    // Try to get existing usage record first
    const existingUsage = await db
      .select()
      .from(usageTracking)
      .where(and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.date, today)
      ))
      .limit(1);

    if (existingUsage.length > 0) {
      // Update existing record
      await db
        .update(usageTracking)
        .set({
          analysesCount: existingUsage[0].analysesCount + 1,
          pagesProcessed: existingUsage[0].pagesProcessed + pagesProcessed,
          aiCallsCount: existingUsage[0].aiCallsCount + aiCallsCount,
          htmlExtractionsCount: existingUsage[0].htmlExtractionsCount + htmlExtractionsCount,
          cacheHits: existingUsage[0].cacheHits + cacheHits,
          totalCost: existingUsage[0].totalCost + Math.round(estimatedCost * 100), // Convert to cents
          updatedAt: new Date()
        })
        .where(eq(usageTracking.id, existingUsage[0].id));
    } else {
      // Insert new record
      await db
        .insert(usageTracking)
        .values({
          userId: userId,
          date: today,
          analysesCount: 1,
          pagesProcessed: pagesProcessed,
          aiCallsCount: aiCallsCount,
          htmlExtractionsCount: htmlExtractionsCount,
          cacheHits: cacheHits,
          totalCost: Math.round(estimatedCost * 100) // Convert to cents
        });
    }
    
    console.log(`🎉 [USAGE TRACKING] SUCCESS for ${userEmail}: ${pagesProcessed} pages, ${aiCallsCount} AI calls, ${cacheHits} cache hits`);
    
  } catch (error) {
    console.error('🚨 [USAGE TRACKING] ERROR:', error);
    console.error('🚨 [USAGE TRACKING] Full error details:', JSON.stringify(error, null, 2));
  }
}

// Coffee tier credit management
export async function checkCoffeeCredits(userId: string): Promise<{ hasCredits: boolean; creditsRemaining: number }> {
  try {
    const userProfile = await storage.getUserProfile(userId);
    const creditsRemaining = userProfile?.creditsRemaining || 0;
    
    return {
      hasCredits: creditsRemaining > 0,
      creditsRemaining
    };
  } catch (error) {
    console.error('Error checking coffee credits:', error);
    return { hasCredits: false, creditsRemaining: 0 };
  }
}

export async function consumeCoffeeCredit(userId: string): Promise<boolean> {
  try {
    const userProfile = await storage.getUserProfile(userId);
    if (!userProfile || userProfile.creditsRemaining <= 0) {
      return false;
    }
    
    // Consume one credit
    await storage.updateUserProfile(userId, {
      creditsRemaining: userProfile.creditsRemaining - 1
    });
    
    console.log(`Consumed 1 coffee credit for user: ${userId}. Remaining: ${userProfile.creditsRemaining - 1}`);
    return true;
  } catch (error) {
    console.error('Error consuming coffee credit:', error);
    return false;
  }
}

export async function getUserTierFromAuth(user: { id: string; email: string; tier: UserTier } | undefined, email?: string): Promise<UserTier> {
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

// Get usage statistics for a user
export async function getUserUsageStats(userEmail: string, days: number = 30): Promise<any> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await db.execute(`
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
    `, [userEmail, startDate.toISOString().split('T')[0]]);
    
    return result.rows?.[0] || {
      days_active: 0,
      total_analyses: 0,
      total_pages: 0,
      total_ai_calls: 0,
      total_cache_hits: 0,
      total_cost: 0,
      avg_analyses_per_day: 0,
      avg_pages_per_day: 0
    };
    
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
  
  return (aiPages * aiCostPerPage) + (htmlPages * htmlCostPerPage);
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