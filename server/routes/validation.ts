/**
 * llms.txt Validation API Routes
 *
 * Implements POST /api/validate-llms-txt endpoint with:
 * - Optional authentication (authenticated + anonymous users)
 * - Anonymous ID tracking via HttpOnly cookies
 * - Rate limiting integration
 * - Database persistence
 * - Usage tracking for authenticated users
 * - Comprehensive error handling
 *
 * Security Features:
 * - SSRF protection via Zod schema validation
 * - Parameterized queries only (SQL injection prevention)
 * - HttpOnly, Secure, SameSite cookies
 * - No sensitive data in error messages
 */

import express from 'express';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../db';
import { llmsTxtValidations, usageTracking, authUsers } from '@shared/schema';
import { validateLlmsTxt } from '../services/validation';
import { rateLimitMiddleware } from '../middleware/rateLimiter';
import { optionalAuth } from '../middleware/auth';
import { validateLlmsTxtSchema } from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

const router = express.Router();

/**
 * POST /api/validate-llms-txt
 *
 * Validates an llms.txt file at the given URL.
 * Works for both authenticated and anonymous users.
 *
 * Request Body:
 * {
 *   url: string (required) - Base URL of website with llms.txt
 *   includeRobotsTxt?: boolean - Check robots.txt conflicts (default: true)
 *   bustCache?: boolean - Force fresh validation (default: false)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   validation: {
 *     id: number,
 *     url: string,
 *     valid: boolean,
 *     score: number,
 *     issues: ValidationIssue[],
 *     recommendations: ValidationRecommendation[],
 *     robotsConflicts?: RobotsConflict[],
 *     processingTime: number,
 *     createdAt: Date
 *   },
 *   user?: {
 *     tier: string,
 *     remainingValidations: number
 *   }
 * }
 */
router.post(
  '/validate-llms-txt',
  optionalAuth, // Allows both authenticated and anonymous users
  rateLimitMiddleware, // Enforces tier-based rate limits
  async (req, res) => {
    try {
      // Validate request body with Zod (includes SSRF protection)
      const validationResult = validateLlmsTxtSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid request',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.errors,
        });
      }

      const validatedData = validationResult.data;
      const user = req.user; // Set by optionalAuth middleware (may be undefined)

      // Get or create anonymous ID for non-authenticated users
      let anonymousId: string | null = null;

      if (!user) {
        // Check for existing anonymous ID in cookie
        anonymousId = req.cookies?.anonymousId;

        if (!anonymousId) {
          // Generate new anonymous ID
          anonymousId = uuidv4();

          // Set HttpOnly cookie with 7-day expiry for migration window
          // SECURITY: HttpOnly prevents XSS, Secure in production, SameSite prevents CSRF
          res.cookie('anonymousId', anonymousId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          });
        }
      }

      // Run validation service
      const result = await validateLlmsTxt(validatedData.url, {
        includeRobotsTxt: validatedData.includeRobotsTxt,
        bustCache: validatedData.bustCache,
      });

      // Create URL hash for deduplication
      const urlHash = createHash('sha256')
        .update(validatedData.url)
        .digest('hex');

      // Determine tier and expiry
      const tier = user?.tier || 'anonymous';
      const expiresAt = getExpiryDate(tier);

      // Save validation to database
      // SECURITY: Using parameterized queries via Drizzle ORM
      const validation = await db
        .insert(llmsTxtValidations)
        .values({
          userId: user?.id || null,
          anonymousId: anonymousId,
          url: validatedData.url,
          fileUrl: `${validatedData.url}/llms.txt`,
          urlHash: urlHash,
          valid: result.valid,
          score: result.score,
          issues: result.issues as any, // JSONB field
          recommendations: result.recommendations as any, // JSONB field
          robotsConflicts: result.robotsConflicts as any || null, // JSONB field
          tier: tier,
          cached: result.cached,
          processingTime: result.processingTime,
          expiresAt: expiresAt,
        })
        .returning();

      // Update usage tracking for authenticated users
      // SECURITY: Only track for authenticated users, parameterized upsert
      if (user) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        await db
          .insert(usageTracking)
          .values({
            userId: user.id,
            date: today,
            validationsCount: 1,
          })
          .onConflictDoUpdate({
            target: [usageTracking.userId, usageTracking.date],
            set: {
              validationsCount: sql`${usageTracking.validationsCount} + 1`,
            },
          });
      }

      // Calculate remaining validations for authenticated users
      let remainingValidations: number | undefined;
      if (user) {
        remainingValidations = await getRemainingValidations(user.id, user.tier);
      }

      // Return detailed response
      return res.json({
        success: true,
        validation: {
          id: validation[0].id,
          url: validatedData.url,
          valid: result.valid,
          score: result.score,
          issues: result.issues,
          recommendations: result.recommendations,
          robotsConflicts: result.robotsConflicts,
          processingTime: result.processingTime,
          createdAt: validation[0].createdAt,
        },
        user: user
          ? {
              tier: user.tier,
              remainingValidations: remainingValidations,
            }
          : undefined,
      });
    } catch (error) {
      // Handle Zod validation errors specifically
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        });
      }

      // Log error but don't expose internal details
      // SECURITY: Generic error messages only, no stack traces or internal info
      console.error('Validation endpoint error:', error);

      return res.status(500).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        message: 'An error occurred while validating your llms.txt file. Please try again.',
      });
    }
  }
);

/**
 * Calculate expiry date based on tier
 *
 * Tier expiry durations:
 * - anonymous: 7 days
 * - starter: 7 days
 * - coffee (solo): 30 days
 * - growth: 90 days
 * - scale: unlimited (null)
 */
function getExpiryDate(tier: string): Date | null {
  const expiryDays: Record<string, number | null> = {
    anonymous: 7,
    starter: 7,
    coffee: 30,
    solo: 30, // Display name, but backend uses "coffee"
    growth: 90,
    scale: null, // Unlimited retention
  };

  const days = expiryDays[tier];
  return days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
}

/**
 * Calculate remaining validations for authenticated user
 *
 * Tier monthly limits:
 * - starter: 5 validations/month
 * - coffee (solo): 20 validations/month
 * - growth: 35 validations/month
 * - scale: 100 validations/month
 */
async function getRemainingValidations(
  userId: number,
  tier: string
): Promise<number> {
  // Tier limits (monthly)
  const limits: Record<string, number> = {
    starter: 5,
    coffee: 20,
    solo: 20, // Display name
    growth: 35,
    scale: 100,
  };

  const limit = limits[tier] || 0;

  // Calculate start of current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Count validations this month
  // SECURITY: Parameterized query via Drizzle ORM
  const used = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(llmsTxtValidations)
    .where(
      and(
        eq(llmsTxtValidations.userId, userId),
        gte(llmsTxtValidations.createdAt, startOfMonth)
      )
    );

  const usedCount = Number(used[0]?.count || 0);
  return Math.max(0, limit - usedCount);
}

export default router;
