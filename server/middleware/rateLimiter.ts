/**
 * Rate Limiting Middleware for llms.txt Validation API
 *
 * Implements tier-based rate limiting with sliding window algorithm.
 *
 * Security Requirements:
 * - Parameterized queries only (SQL injection prevention)
 * - Proper tier identifier handling (backend "coffee" → display "Solo")
 * - No information leakage in error messages
 * - Database tracking for accurate request counting
 *
 * Rate Limits:
 * - Anonymous (IP-based): 3 validations/day
 * - Starter: 5 validations/month
 * - Solo (coffee): 20 credits/month
 * - Growth: 35 validations/month
 * - Scale: 100 validations/month
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { rateLimits } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface RateLimitConfig {
  endpoint: string;
  windowMinutes: {
    anonymous: number; // 24 hours = 1440 minutes
    user: number;      // 30 days = 43200 minutes
  };
  maxRequests: {
    anonymous: number;
    starter: number;
    coffee: number;
    growth: number;
    scale: number;
  };
}

// Configuration for validation endpoint
// Environment-aware: Higher limits for staging/dev to facilitate testing
const isProduction = process.env.NODE_ENV === 'production';

export const validationRateLimit: RateLimitConfig = {
  endpoint: '/api/validate-llms-txt',
  windowMinutes: {
    anonymous: 1440,  // 24 hours
    user: 43200,      // 30 days
  },
  maxRequests: {
    anonymous: isProduction ? 3 : 10,  // 3/day in prod, 10/day in staging/dev
    starter: 5,       // 5 per month
    coffee: 20,       // 20 credits (Solo tier)
    growth: 35,       // 35 per month
    scale: 100,       // 100 per month
  },
};

/**
 * Rate limiting middleware
 *
 * Checks request count against tier-based limits using sliding window algorithm.
 * Returns 429 status with upgrade CTA if limit exceeded.
 * Sets X-RateLimit-* headers for client transparency.
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const config = validationRateLimit;

  try {
    // Determine identifier (user ID or IP address)
    // req.user is set by optionalAuth middleware
    const user = req.user;
    const identifier = user ? user.id.toString() : (req.ip || 'unknown');
    const identifierType = user ? 'user' : 'ip';

    // Get tier - normalize "solo" to "coffee" for backend consistency
    let tier = user?.tier || 'anonymous';

    // Map display tier to backend tier if needed
    if (tier === 'solo') {
      tier = 'coffee';
    }

    // Determine limit and window
    const limit = (config.maxRequests as any)[tier] || config.maxRequests.anonymous;
    const windowMinutes = identifierType === 'user'
      ? config.windowMinutes.user
      : config.windowMinutes.anonymous;

    // Calculate window bounds (sliding window)
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - windowMinutes * 60 * 1000);

    // Query existing rate limit records within sliding window
    // SECURITY: Using parameterized queries via Drizzle ORM
    const existingLimits = await db
      .select()
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, identifier),
          eq(rateLimits.identifierType, identifierType),
          eq(rateLimits.endpoint, config.endpoint),
          gte(rateLimits.windowEnd, windowStart)
        )
      )
      .limit(1);

    let requestCount = 1;
    let resetTime = new Date(windowEnd.getTime() + windowMinutes * 60 * 1000);

    if (existingLimits.length > 0) {
      const record = existingLimits[0];
      requestCount = record.requestCount + 1;

      // Check if limit exceeded
      if (requestCount > limit) {
        // Calculate reset time
        resetTime = new Date(record.windowEnd.getTime() + windowMinutes * 60 * 1000);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', limit.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

        // Return 429 with upgrade CTA
        // SECURITY: No information leakage - generic messages only
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: user
            ? `You've reached your monthly limit of ${limit} validations. Upgrade your tier for more.`
            : `You've reached the daily limit of ${limit} validations. Sign up for more!`,
          resetAt: resetTime.toISOString(),
          upgradeUrl: '/pricing',
        }) as any;
      }

      // Update request count
      // SECURITY: Parameterized update via Drizzle ORM
      await db
        .update(rateLimits)
        .set({
          requestCount,
          windowEnd: new Date(windowStart.getTime() + windowMinutes * 60 * 1000)
        })
        .where(eq(rateLimits.id, record.id));

    } else {
      // Create new rate limit record
      // SECURITY: Parameterized insert via Drizzle ORM
      await db.insert(rateLimits).values({
        identifier,
        identifierType,
        endpoint: config.endpoint,
        requestCount: 1,
        windowStart,
        windowEnd: new Date(windowStart.getTime() + windowMinutes * 60 * 1000),
      });
    }

    // Set rate limit headers for successful request
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', (limit - requestCount).toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

    next();
  } catch (error) {
    // Log error but don't expose internal details
    console.error('Rate limiting error:', error);

    // SECURITY: Generic error message, no internal details leaked
    return res.status(500).json({
      error: 'Rate limiting service temporarily unavailable',
      message: 'Please try again in a moment.',
    }) as any;
  }
}

/**
 * Cleanup job for expired rate limit records
 *
 * Should be run daily via cron job to prevent table bloat.
 * Removes records where windowEnd is more than 30 days old.
 *
 * Usage:
 * - In Railway: Add cron job schedule "0 2 * * *" (2 AM daily)
 * - In code: Call cleanupExpiredRateLimits() on schedule
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete records older than 30 days
    // SECURITY: Parameterized delete via Drizzle ORM
    const result = await db
      .delete(rateLimits)
      .where(lte(rateLimits.windowEnd, thirtyDaysAgo));

    const deletedCount = result.rowCount || 0;
    console.log(`Rate limit cleanup: Removed ${deletedCount} expired records`);

    return deletedCount;
  } catch (error) {
    console.error('Rate limit cleanup error:', error);
    throw error;
  }
}

/**
 * Get current rate limit status for a user or IP
 *
 * Useful for displaying remaining requests in UI.
 *
 * @param identifier - User ID or IP address
 * @param identifierType - 'user' or 'ip'
 * @returns Rate limit status or null if no limits set
 */
export async function getRateLimitStatus(
  identifier: string,
  identifierType: 'user' | 'ip'
): Promise<{
  limit: number;
  remaining: number;
  resetAt: Date;
} | null> {
  try {
    const config = validationRateLimit;
    const windowMinutes = identifierType === 'user'
      ? config.windowMinutes.user
      : config.windowMinutes.anonymous;

    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const existingLimits = await db
      .select()
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, identifier),
          eq(rateLimits.identifierType, identifierType),
          eq(rateLimits.endpoint, config.endpoint),
          gte(rateLimits.windowEnd, windowStart)
        )
      )
      .limit(1);

    if (existingLimits.length === 0) {
      return null;
    }

    const record = existingLimits[0];
    const limit = identifierType === 'user'
      ? config.maxRequests.starter // Default to starter if tier unknown
      : config.maxRequests.anonymous;

    return {
      limit,
      remaining: Math.max(0, limit - record.requestCount),
      resetAt: new Date(record.windowEnd.getTime() + windowMinutes * 60 * 1000),
    };
  } catch (error) {
    console.error('Get rate limit status error:', error);
    return null;
  }
}
