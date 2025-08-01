import { storage } from "../storage";
import { db } from "../db";
import { UserTier, UsageTracking } from "@shared/schema";
import { TIER_LIMITS } from "./cache";

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
    
    // Get user ID from email first
    const userResult = await db.execute<{ id: number }>(`
      SELECT id FROM email_captures WHERE email = $1 LIMIT 1
    `, [userEmail]);
    
    const userId = userResult.rows?.[0]?.id;
    if (!userId) {
      console.log(`⚠️ [GET USAGE] No user found for email: ${userEmail}`);
      return null;
    }
    console.log(`✅ [GET USAGE] Found user ID: ${userId} for ${userEmail}`);
    
    // Get today's usage from database
    const usageResult = await db.execute<{
      id: number;
      user_id: number;
      date: string;
      analyses_count: number;
      pages_processed: number;
      ai_calls_count: number;
      html_extractions_count: number;
      cache_hits: number;
      total_cost: number;
      created_at: string;
      updated_at: string;
    }>(`
      SELECT * FROM usage_tracking 
      WHERE user_id = $1 AND date = $2 
      LIMIT 1
    `, [userId, today]);
    
    const usage = usageResult.rows?.[0];
    if (!usage) {
      console.log(`ℹ️ [GET USAGE] No usage record found for user ${userId} on ${today}`);
      return null;
    }
    console.log(`📊 [GET USAGE] Found usage: ${usage.analyses_count} analyses for user ${userId}`);
    
    // Convert database result to UsageTracking interface
    return {
      id: usage.id,
      userId: usage.user_id,
      date: usage.date,
      analysesCount: usage.analyses_count,
      pagesProcessed: usage.pages_processed,
      cacheHits: usage.cache_hits,
      cost: usage.total_cost,
      createdAt: new Date(usage.created_at),
      updatedAt: new Date(usage.updated_at)
    };
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
    
    // Get user ID from email
    const userResult = await db.execute<{ id: number }>(`
      SELECT id FROM email_captures WHERE email = $1 LIMIT 1
    `, [userEmail]);
    
    const userId = userResult.rows?.[0]?.id;
    if (!userId) {
      console.log(`⚠️ [USAGE TRACKING] No user found for email: ${userEmail}`);
      return;
    }
    console.log(`✅ [USAGE TRACKING] Found user ID: ${userId} for ${userEmail}`);
    
    await db.execute(`
      INSERT INTO usage_tracking (
        user_id, date, analyses_count, pages_processed, 
        ai_calls_count, html_extractions_count, cache_hits, total_cost
      ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, date) 
      DO UPDATE SET
        analyses_count = usage_tracking.analyses_count + 1,
        pages_processed = usage_tracking.pages_processed + $3,
        ai_calls_count = usage_tracking.ai_calls_count + $4,
        html_extractions_count = usage_tracking.html_extractions_count + $5,
        cache_hits = usage_tracking.cache_hits + $6,
        total_cost = usage_tracking.total_cost + $7
    `, [userId, today, pagesProcessed, aiCallsCount, htmlExtractionsCount, cacheHits, estimatedCost]);
    
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