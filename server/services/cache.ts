import { db } from "../db";
import { createHash } from 'crypto';
import fetch from 'node-fetch';
import { DiscoveredPage, UserTier, TierLimits, CachedAnalysis, analysisCache, emailCaptures } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

// Helper function to implement fetch with timeout using AbortController
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 10000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Tier configurations
export const TIER_LIMITS: Record<UserTier, Omit<TierLimits, 'tier'>> = {
  starter: {
    dailyAnalyses: 1,
    maxPagesPerAnalysis: 20, // Reduced from 50 to encourage upgrades
    aiPagesLimit: 0,
    cacheDurationDays: 30,
    features: {
      htmlExtraction: true,
      aiAnalysis: false,
      fileHistory: false,
      prioritySupport: false,
      smartCaching: true
    }
  },
  coffee: {
    dailyAnalyses: 999, // No daily limit, credit-based instead
    maxPagesPerAnalysis: 200, // 10x more than free tier
    aiPagesLimit: 200, // Full AI analysis for coffee tier
    cacheDurationDays: 7, // Same as growth tier
    features: {
      htmlExtraction: true,
      aiAnalysis: true, // AI analysis enabled for coffee tier
      fileHistory: false, // No file history for one-time purchases
      prioritySupport: false,
      smartCaching: true
    }
  },
  growth: {
    dailyAnalyses: 999,
    maxPagesPerAnalysis: 1000,
    aiPagesLimit: 200,
    cacheDurationDays: 7,
    features: {
      htmlExtraction: true,
      aiAnalysis: true,
      fileHistory: true,
      prioritySupport: true,
      smartCaching: true
    }
  },
  scale: {
    dailyAnalyses: 999,
    maxPagesPerAnalysis: 999999,
    aiPagesLimit: 999999,
    cacheDurationDays: 3,
    features: {
      htmlExtraction: true,
      aiAnalysis: true,
      fileHistory: true,
      prioritySupport: true,
      smartCaching: true,
      whiteLabel: true,
      apiAccess: true
    }
  }
};

// Generate URL hash for cache key
export function generateUrlHash(url: string): string {
  return createHash('sha256').update(url.toLowerCase()).digest('hex');
}

// Generate content hash for change detection
export function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

// Get cache duration in milliseconds based on tier and URL
export function getCacheDuration(url: string, tier: UserTier): number {
  const baseDays = TIER_LIMITS[tier].cacheDurationDays;
  let days = baseDays;
  
  // Shorter cache for frequently updated content
  if (url.includes('/blog/') || url.includes('/news/') || url.includes('/updates/')) {
    days = Math.max(1, Math.floor(baseDays * 0.5));
  }
  
  // Longer cache for documentation
  if (url.includes('/docs/') || url.includes('/api/') || url.includes('/reference/')) {
    days = baseDays * 2;
  }
  
  return days * 24 * 60 * 60 * 1000; // Convert to milliseconds
}

// Check if a page has changed since last cache
export async function hasPageChanged(url: string, cached: CachedAnalysis): Promise<boolean> {
  try {
    // First try HTTP HEAD request for efficiency
    const headers: any = {
      'User-Agent': 'LLM.txt Mastery Bot 1.0'
    };
    
    if (cached.lastModified) {
      headers['If-Modified-Since'] = cached.lastModified;
    }
    if (cached.etag) {
      headers['If-None-Match'] = cached.etag;
    }
    
    const response = await fetchWithTimeout(url, { 
      method: 'HEAD',
      headers
    }, 5000);
    
    // 304 Not Modified means content hasn't changed
    if (response.status === 304) {
      console.log(`Cache hit (304): ${url}`);
      return false;
    }
    
    // Check if we have new modification headers
    const newLastModified = response.headers.get('last-modified');
    const newEtag = response.headers.get('etag');
    
    if (newLastModified && cached.lastModified && newLastModified !== cached.lastModified) {
      console.log(`Content changed (Last-Modified): ${url}`);
      return true;
    }
    
    if (newEtag && cached.etag && newEtag !== cached.etag) {
      console.log(`Content changed (ETag): ${url}`);
      return true;
    }
    
    // If no reliable headers, fetch content and compare hash
    if (!cached.lastModified && !cached.etag) {
      const contentResponse = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
      }, 10000);
      
      if (contentResponse.ok) {
        const content = await contentResponse.text();
        const newHash = generateContentHash(content);
        const changed = newHash !== cached.contentHash;
        console.log(`Content ${changed ? 'changed' : 'unchanged'} (hash comparison): ${url}`);
        return changed;
      }
    }
    
    // Default to assuming changed if we can't determine
    return true;
    
  } catch (error) {
    console.error(`Error checking if page changed: ${url}`, error);
    // On error, assume changed to be safe
    return true;
  }
}

// Get cached analysis if valid
export async function getCachedAnalysis(url: string, tier: UserTier): Promise<CachedAnalysis | null> {
  try {
    const urlHash = generateUrlHash(url);
    const now = new Date();
    
    // Use Drizzle ORM for type-safe queries
    const result = await db
      .select()
      .from(analysisCache)
      .where(and(
        eq(analysisCache.urlHash, urlHash),
        eq(analysisCache.tier, tier),
        gt(analysisCache.expiresAt, now)
      ))
      .limit(1);
    
    if (result.length > 0) {
      const cached = result[0];
      
      // Increment hit count using Drizzle ORM
      await db
        .update(analysisCache)
        .set({ hitCount: cached.hitCount + 1 })
        .where(eq(analysisCache.id, cached.id));
      
      return cached as CachedAnalysis;
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving cached analysis:', error);
    return null;
  }
}

// Cache analysis result
export async function cacheAnalysis(
  url: string, 
  result: DiscoveredPage[], 
  tier: UserTier,
  contentHash: string,
  lastModified?: string,
  etag?: string
): Promise<void> {
  try {
    const urlHash = generateUrlHash(url);
    const duration = getCacheDuration(url, tier);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration);
    
    // Check if entry exists first
    const existing = await db
      .select({ id: analysisCache.id })
      .from(analysisCache)
      .where(and(
        eq(analysisCache.urlHash, urlHash),
        eq(analysisCache.tier, tier)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing entry
      await db
        .update(analysisCache)
        .set({
          contentHash,
          lastModified: lastModified || null,
          etag: etag || null,
          analysisResult: result,
          cachedAt: now,
          expiresAt,
          hitCount: 0
        })
        .where(eq(analysisCache.id, existing[0].id));
    } else {
      // Insert new entry
      await db
        .insert(analysisCache)
        .values({
          url,
          urlHash,
          contentHash,
          lastModified: lastModified || null,
          etag: etag || null,
          analysisResult: result,
          tier,
          cachedAt: now,
          expiresAt,
          hitCount: 0
        });
    }
    
    console.log(`Cached analysis for ${url} (tier: ${tier}, expires: ${expiresAt.toISOString()})`);
  } catch (error) {
    console.error('Error caching analysis:', error);
  }
}

// Clean up expired cache entries
export async function cleanupExpiredCache(): Promise<void> {
  try {
    const now = new Date();
    const result = await db
      .delete(analysisCache)
      .where(gt(now, analysisCache.expiresAt))
      .returning({ id: analysisCache.id });
    
    if (result.length > 0) {
      console.log(`Cleaned up ${result.length} expired cache entries`);
    }
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
}

// Get cache statistics for monitoring
export async function getCacheStats(tier?: UserTier): Promise<any> {
  try {
    // Note: For complex aggregations like this, we'll keep raw SQL for now
    // as Drizzle ORM's aggregate functions don't support all SQL features yet
    const tierClause = tier ? `WHERE tier = $1` : '';
    const params = tier ? [tier] : [];
    
    const stats = await db.execute(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(hit_count) as total_hits,
        AVG(hit_count) as avg_hits_per_entry,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_entries,
        COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_entries
      FROM analysis_cache
      ${tierClause}
    `, params);
    
    return stats.rows?.[0] || {
      total_entries: 0,
      total_hits: 0,
      avg_hits_per_entry: 0,
      active_entries: 0,
      expired_entries: 0
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
}

// Track cache savings
export async function trackCacheSavings(
  userEmail: string, 
  cacheHits: number,
  tier: UserTier
): Promise<void> {
  try {
    // Estimate cost savings based on tier
    const costPerAICall = 0.03; // Approximate GPT-4 cost
    const aiCallsSaved = tier === 'starter' ? 0 : cacheHits * 0.7; // 70% would use AI for paid tiers
    const costSaved = aiCallsSaved * costPerAICall;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get user ID first using Drizzle ORM
    const userResult = await db
      .select({ id: emailCaptures.id })
      .from(emailCaptures)
      .where(eq(emailCaptures.email, userEmail))
      .limit(1);
    
    const userId = userResult[0]?.id;
    if (!userId) {
      console.log(`No user found for cache savings tracking: ${userEmail}`);
      return;
    }
    
    // Note: cache_savings table doesn't exist in schema, so keeping this as placeholder
    // This would need to be implemented when cache savings tracking is fully developed
    console.log(`Cache savings tracked for ${userEmail}: ${cacheHits} hits, $${costSaved.toFixed(4)} saved`);
    
  } catch (error) {
    console.error('Error tracking cache savings:', error);
  }
}