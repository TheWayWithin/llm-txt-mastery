import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { z } from 'zod';
import {
  urlAnalysisSchema,
  insertSitemapAnalysisSchema,
  insertLlmTextFileSchema,
  emailCaptureSchema,
  DiscoveredPage,
  SelectedPage,
  UserTier,
  users,
  usageTracking,
  SPADetectionResult,
} from '@shared/schema';
import { fetchSitemap } from './services/sitemap';
import { analyzeDiscoveredPagesWithCache } from './services/sitemap-enhanced';
import { storage } from './storage';
import { db } from './db';
import { eq, and } from 'drizzle-orm';
import {
  checkUsageLimits,
  trackUsage,
  getUserTier,
  estimateAnalysisCost,
  checkCoffeeCredits,
  consumeCoffeeCredit,
  getUserTierFromAuth,
  getTodayUsage,
  resolveUserFromEmail,
  // Sprint 6: JS rendering quota
  checkJsRenderQuota,
  consumeJsRenders,
  getJsRenderMonthlyLimit,
} from './services/usage';
import { authStorage } from './services/auth-storage';
import { TIER_LIMITS } from './services/cache';
import {
  apiLimiter,
  analysisLimiter,
  fileGenerationLimiter,
  emailCaptureLimiter,
} from './middleware/rate-limit';
import { smartBotProtection } from './middleware/smart-bot-protection';
import { optionalAuth } from './middleware/auth';
import { 
  comprehensiveAnalysisProtection,
  costProtectionLimiter 
} from './middleware/enhanced-bot-protection';
import { registerStripeRoutes } from './routes/stripe';
import { registerCancellationRoutes } from './routes/cancellation';
import authRoutes from './routes/auth';
import validationRoutes from './routes/validation';
// import featureFlagRoutes from "./routes/feature-flags"; // Temporarily disabled - Redis issue
import abTestingRoutes from './routes/ab-testing';
import semanticMonitoringRoutes from './routes/semantic-monitoring';
import simpleUsageRoutes from './routes/simple-usage';
import adminAiCostsRoutes from './routes/admin-ai-costs';
import apiV1Routes from './routes/api-v1';
import { incrementSimpleUsage, getSimpleUsage } from './services/simple-tracker';
import { connectionPool } from './services/connection-pool';

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply smart bot protection to all routes for intelligent bot detection
  app.use(smartBotProtection);

  // Register authentication routes
  app.use('/api/auth', authRoutes);

  // Register feature flag routes - TEMPORARILY DISABLED (Redis issue)
  // app.use("/api/feature-flags", optionalAuth, featureFlagRoutes);
  // app.use("/api/admin", featureFlagRoutes);

  // Register A/B testing routes
  app.use('/api/ab-testing', abTestingRoutes);
  app.use('/api/admin/ab-testing', abTestingRoutes);

  // Register semantic monitoring routes
  app.use('/api/semantic/metrics', semanticMonitoringRoutes);
  app.use('/api/semantic', semanticMonitoringRoutes);

  // Register simple usage tracking routes (robust fallback)
  app.use(simpleUsageRoutes);

  // Register admin AI costs monitoring routes
  app.use('/api/admin', adminAiCostsRoutes);

  // Register validation routes
  app.use('/api', validationRoutes);

  // Register Public API v1 routes
  app.use('/api/v1', apiV1Routes);

  // Debug tier lookup (temporary endpoint) - PRODUCTION PROTECTED
  app.post('/api/debug-tier', async (req, res) => {
    // CRITICAL SECURITY: Block debug endpoints in production
    if (process.env.NODE_ENV === 'production') {
      console.warn(`🚨 SECURITY: Blocked debug endpoint access in production from ${req.ip}`);
      return res.status(404).json({ message: 'Not found' });
    }

    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email required' });
      }

      // Check what getUserTier returns
      const detectedTier = await getUserTier(email);

      // Check email capture directly
      const emailCapture = await storage.getEmailCapture(email);

      // Also check raw database query
      const rawCheck = emailCapture ? emailCapture.tier : 'not found';

      res.json({
        email,
        detectedTier,
        rawEmailCaptureTier: rawCheck,
        emailCapture: emailCapture
          ? {
              tier: emailCapture.tier,
              email: emailCapture.email,
              createdAt: emailCapture.createdAt,
              updatedAt: emailCapture.updatedAt,
            }
          : null,
        debug: {
          timestamp: new Date().toISOString(),
          storageType: typeof storage,
        },
      });
    } catch (error) {
      console.error('Debug tier error:', error);
      res.status(500).json({
        message: 'Failed to debug tier',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Debug usage tracking - comprehensive database state check - PRODUCTION PROTECTED
  app.post('/api/debug-usage-tracking', async (req, res) => {
    // CRITICAL SECURITY: Block debug endpoints in production
    if (process.env.NODE_ENV === 'production') {
      console.warn(`🚨 SECURITY: Blocked debug endpoint access in production from ${req.ip}`);
      return res.status(404).json({ message: 'Not found' });
    }

    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email required' });
      }

      const today = new Date().toISOString().split('T')[0];

      // Check emailCaptures table
      const emailCapture = await storage.getEmailCapture(email);

      // Check if user exists in users table
      let userInUsersTable = null;
      if (emailCapture?.userId) {
        const userResult = await db
          .select()
          .from(users)
          .where(eq(users.id, emailCapture.userId))
          .limit(1);
        userInUsersTable = userResult[0] || null;
      }

      // Check usageTracking table
      let usageRecord = null;
      if (emailCapture?.userId) {
        const usageResult = await db
          .select()
          .from(usageTracking)
          .where(and(eq(usageTracking.userId, emailCapture.userId), eq(usageTracking.date, today)))
          .limit(1);
        usageRecord = usageResult[0] || null;
      }

      // Test the shared resolver
      const resolvedUserId = await resolveUserFromEmail(email);

      // Get usage via the API function
      const todayUsage = await getTodayUsage(email);

      res.json({
        email,
        date: today,
        debug: {
          emailCapture: emailCapture
            ? {
                id: emailCapture.id,
                userId: emailCapture.userId,
                tier: emailCapture.tier,
                createdAt: emailCapture.createdAt,
              }
            : null,
          userInUsersTable: userInUsersTable
            ? {
                id: userInUsersTable.id,
                username: userInUsersTable.username,
              }
            : null,
          usageRecord: usageRecord
            ? {
                id: usageRecord.id,
                userId: usageRecord.userId,
                date: usageRecord.date,
                analysesCount: usageRecord.analysesCount,
                pagesProcessed: usageRecord.pagesProcessed,
                cacheHits: usageRecord.cacheHits,
              }
            : null,
          resolvedUserId,
          todayUsage: todayUsage
            ? {
                analysesCount: todayUsage.analysesCount,
                pagesProcessed: todayUsage.pagesProcessed,
                cacheHits: todayUsage.cacheHits,
              }
            : null,
        },
      });
    } catch (error) {
      console.error('Debug usage tracking error:', error);
      res.status(500).json({
        message: 'Failed to debug usage tracking',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Manual Coffee tier fix for existing customers (temporary endpoint) - PRODUCTION PROTECTED
  app.post('/api/fix-coffee-tier', async (req, res) => {
    // CRITICAL SECURITY: Block debug endpoints in production
    if (process.env.NODE_ENV === 'production') {
      console.warn(`🚨 SECURITY: Blocked debug endpoint access in production from ${req.ip}`);
      return res.status(404).json({ message: 'Not found' });
    }

    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email required' });
      }

      // Update email capture to Solo tier
      const existingCapture = await storage.getEmailCapture(email);
      if (existingCapture) {
        await storage.updateEmailCapture(email, { tier: 'solo' });
        console.log(`Manually updated ${email} to Solo tier`);
        res.json({
          message: 'Successfully updated to Solo tier',
          tier: 'solo',
          previousTier: existingCapture.tier,
        });
      } else {
        // Create new Solo tier email capture
        await storage.createEmailCapture({
          email,
          tier: 'solo',
          websiteUrl: null,
        });
        console.log(`Created Solo tier record for ${email}`);
        res.json({
          message: 'Created Solo tier record',
          tier: 'solo',
          previousTier: 'none',
        });
      }
    } catch (error) {
      console.error('Coffee tier fix error:', error);
      res.status(500).json({
        message: 'Failed to fix Coffee tier',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Email capture endpoint for freemium model
  app.post('/api/email-capture', emailCaptureLimiter, async (req, res) => {
    try {
      const emailData = emailCaptureSchema.parse(req.body);

      // Check if email already exists
      const existingCapture = await storage.getEmailCapture(emailData.email);
      if (existingCapture) {
        // CRITICAL FIX: Update tier to honor user's current selection
        const updatedCapture = await storage.updateEmailCapture(emailData.email, {
          tier: emailData.tier || 'starter',
          websiteUrl: emailData.websiteUrl,
        });

        console.log(
          `🔄 Updated existing email ${emailData.email} tier: ${existingCapture.tier} → ${emailData.tier}`
        );

        return res.json({
          message: 'Email tier updated',
          capture: updatedCapture,
          tier: emailData.tier || 'starter',
        });
      }

      // Create new email capture with submitted tier
      const capture = await storage.createEmailCapture({
        ...emailData,
        tier: emailData.tier || ('starter' as any),
      });

      console.log(
        `✅ Created new email capture for ${emailData.email} with tier: ${emailData.tier || 'starter'}`
      );

      res.json({
        message: 'Email captured successfully',
        capture,
        tier: emailData.tier || 'starter',
      });
    } catch (error) {
      console.error('Email capture error:', error);
      res.status(400).json({
        message: 'Failed to capture email',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Check usage limits before analysis - SIMPLIFIED
  app.post('/api/check-limits', async (req, res) => {
    try {
      const { email, url } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email required' });
      }

      // Get simple usage
      const simpleUsage = await getSimpleUsage(email);

      // Get tier
      let tier = 'starter';
      try {
        tier = await getUserTier(email);
      } catch (e) {
        console.debug('Using default tier for limits check');
      }

      const tierLimits = TIER_LIMITS[tier];

      // Simple check: have we hit the daily limit?
      const allowed = simpleUsage.count < tierLimits.dailyAnalyses;

      // Fetch sitemap to count pages
      const sitemapResult = await fetchSitemap(url);
      const pageCount = Math.min(sitemapResult.entries.length, tierLimits.maxPagesPerAnalysis);

      res.json({
        allowed,
        reason: allowed
          ? null
          : `Daily limit reached (${simpleUsage.count}/${tierLimits.dailyAnalyses} analyses)`,
        pageCount,
        tier,
        limits: {
          dailyAnalyses: tierLimits.dailyAnalyses,
          maxPagesPerAnalysis: tierLimits.maxPagesPerAnalysis,
          aiPagesLimit: tierLimits.aiPagesLimit,
        },
        currentUsage: {
          analysesToday: simpleUsage.count,
        },
        estimatedCost: 0,
        suggestedUpgrade: allowed ? null : 'solo',
      });
    } catch (error) {
      console.error('Limit check error:', error);
      res.status(500).json({ message: 'Failed to check limits' });
    }
  });

  // Enhanced analyze endpoint with comprehensive bot protection
  // CRITICAL SECURITY FIX: Enhanced protection for OpenAI API cost exposure
  app.post('/api/analyze', costProtectionLimiter, comprehensiveAnalysisProtection, optionalAuth, async (req, res) => {
    try {
      const {
        url,
        force = false,
        email,
      } = z
        .object({
          url: z.string(),
          force: z.boolean().optional().default(false),
          email: z.string().optional(),
        })
        .parse(req.body);

      // Get user information (authenticated or email-based)
      // SPRINT 2 FIX: Changed const to let - user must be reassignable
      // so email fallback can populate it for coffee tier credit checks
      let user = req.user;

      // CRITICAL FIX: Properly handle authenticated users
      let userEmail: string;
      if (user?.email) {
        // User is authenticated via JWT - use their verified email
        userEmail = user.email;
        console.log(`🔐 Authenticated user analyzing: ${userEmail} (tier: ${user.tier})`);
      } else if (email) {
        // Unauthenticated request - verify email ownership
        // Check both email_captures table AND auth_users table (for authenticated users with stale JWT)
        const emailCapture = await storage.getEmailCapture(email);
        const authUser = !emailCapture ? await authStorage.getUserByEmail(email) : null;

        if (!emailCapture && !authUser) {
          console.warn(
            `🚨 SECURITY: Attempt to analyze as unverified email ${email} from ${req.ip}`
          );
          return res.status(403).json({
            message: 'Email not found. Please sign up first or log in to analyze websites.',
          });
        }

        // If user exists in auth_users but JWT is stale, they're still a valid user
        if (authUser && !emailCapture) {
          console.log(`🔄 JWT stale but auth user found: ${email} (tier: ${authUser.tier})`);
          userEmail = email;
        } else if (emailCapture) {
          // Check if email capture is recent (within 24 hours) to prevent old email abuse
          // Skip this check for users who have created accounts (userId exists)
          if (!emailCapture.userId) {
            const emailAge = emailCapture.createdAt
              ? Date.now() - new Date(emailCapture.createdAt).getTime()
              : Date.now();
            const maxEmailAge = 24 * 60 * 60 * 1000; // 24 hours

            if (emailAge > maxEmailAge) {
              console.warn(
                `🚨 SECURITY: Attempt to use stale email capture ${email} (${Math.floor(emailAge / 1000 / 60 / 60)}h old) from ${req.ip}`
              );
              return res.status(403).json({
                message: 'Email verification expired. Please sign up again to analyze websites.',
              });
            }
          }

          userEmail = email;
          console.log(`📧 Email-based user analyzing: ${userEmail} (tier: ${emailCapture.tier})`);
        } else {
          userEmail = email;
        }
      } else {
        userEmail = '';
      }

      if (!userEmail) {
        return res.status(400).json({
          message: 'Email required for analysis. Please sign up first.',
        });
      }

      // SPRINT 2 FIX: If user is still undefined (expired JWT) but we have a valid email,
      // look up the auth user so coffee tier credit checks have access to user.id.
      // This handles both paths: authUser-only AND emailCapture-with-auth-account.
      if (!user && userEmail) {
        const authUserFallback = await authStorage.getUserByEmail(userEmail);
        if (authUserFallback) {
          user = authUserFallback;
          console.log(`🔄 [SPRINT 2] Populated user from email fallback: id=${authUserFallback.id}, tier=${authUserFallback.tier}`);
        }
      }

      // Get user tier (prioritize authenticated user data)
      const tier = await getUserTierFromAuth(user, userEmail);

      // Normalize URL
      const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;

      // Quick page count check (also runs SPA detection)
      const sitemapResult = await fetchSitemap(normalizedUrl);
      const pageCount = sitemapResult.entries.length;

      // Sprint 10: Auto-detect JS rendering need for Scale tier based on SPA detection
      // JS rendering is auto-enabled when: Scale tier + site is CSR/SPA (no manual checkbox)
      const spaDetected = sitemapResult.spaDetection?.framework.renderingStrategy === 'CSR' ||
                          sitemapResult.spaDetection?.framework.framework === 'angular' ||
                          (sitemapResult.spaDetection?.contentCoverage.estimatedCoverage ?? 100) < 50;
      let jsRenderingEnabled = tier === 'scale' && spaDetected;
      let jsRenderQuotaInfo: { hasQuota: boolean; rendersRemaining: number } = { hasQuota: true, rendersRemaining: 100 };

      if (jsRenderingEnabled) {
        console.log(`🎯 [Sprint 10] Auto-detected SPA/CSR site — JS rendering auto-enabled for Scale tier user: ${userEmail}`);
        console.log(`   Framework: ${sitemapResult.spaDetection?.framework.framework}, Strategy: ${sitemapResult.spaDetection?.framework.renderingStrategy}, Coverage: ${sitemapResult.spaDetection?.contentCoverage.estimatedCoverage}%`);
      } else if (tier === 'scale' && !spaDetected) {
        console.log(`ℹ️ [Sprint 10] SSR/SSG site detected — skipping JS rendering for faster analysis`);
      }

      // Check quota for Scale tier users with auto-detected JS rendering
      if (jsRenderingEnabled && user?.id) {
        jsRenderQuotaInfo = await checkJsRenderQuota(user.id);
        if (!jsRenderQuotaInfo.hasQuota) {
          console.log(`⚠️ [Sprint 10] JS render quota exhausted for user ${userEmail} (${jsRenderQuotaInfo.rendersRemaining} remaining)`);
          jsRenderingEnabled = false;
        } else {
          console.log(`🎯 [Sprint 10] JS render quota: ${jsRenderQuotaInfo.rendersRemaining} renders remaining`);
        }
      }

      // Check usage limits (for non-authenticated users or non-coffee tier)
      const usageCheck = await checkUsageLimits(userEmail, pageCount);
      if (!usageCheck.allowed) {
        return res.status(403).json({
          message: usageCheck.reason,
          currentUsage: usageCheck.currentUsage,
          limits: usageCheck.limits,
          suggestedUpgrade: usageCheck.suggestedUpgrade,
        });
      }

      // For Solo tier users, check credits instead of daily limits
      if (tier === 'solo' || tier === 'coffee') {
        console.log(`[ANALYZE] Solo tier detected, user object:`, {
          hasUser: !!user,
          userId: user?.id,
          userEmail: user?.email,
          userTier: user?.tier,
        });

        if (!user?.id) {
          console.error(`[ANALYZE] Solo tier user but no user.id available`);
          return res.status(400).json({
            message: 'Authentication required for Solo tier. Please log in again.',
            tier: 'solo',
          });
        }

        console.log(
          `[ANALYZE] Checking Solo tier credits for user ${user.email} (id: ${user.id})`
        );
        const creditCheck = await checkCoffeeCredits(user.id.toString());
        console.log(`[ANALYZE] Credit check result:`, creditCheck);
        if (!creditCheck.hasCredits) {
          return res.status(403).json({
            message:
              'Monthly analysis limit reached. Your analyses reset on your next billing cycle, or upgrade to Growth for more.',
            currentCredits: creditCheck.creditsRemaining,
            tier: 'solo',
            suggestedUpgrade: 'growth',
          });
        }
      }

      // Check if already analyzing (to prevent duplicate analysis)
      const existingAnalysis = await storage.getAnalysisByUrl(normalizedUrl);
      if (existingAnalysis && existingAnalysis.status === 'analyzing') {
        return res.json({
          analysisId: existingAnalysis.id,
          status: 'analyzing',
        });
      }

      // If force flag is not set and we have a completed analysis, return it
      if (!force && existingAnalysis && existingAnalysis.status === 'completed') {
        // Check if it's recent enough based on tier cache duration
        const analysisAge = existingAnalysis.createdAt
          ? Date.now() - new Date(existingAnalysis.createdAt).getTime()
          : Date.now();
        const maxAge = TIER_LIMITS[tier].cacheDurationDays * 24 * 60 * 60 * 1000;

        if (analysisAge < maxAge) {
          // ULTRA-SIMPLE: Just increment for cached results too
          const newCount = await incrementSimpleUsage(userEmail, tier);
          console.log(`📊 [USAGE] Cached result for ${userEmail}. Daily count: ${newCount}`);

          return res.json({
            analysisId: existingAnalysis.id,
            status: 'completed',
            discoveredPages: existingAnalysis.discoveredPages,
            fromCache: true,
          });
        }
      }

      // Create new analysis record
      const analysis = await storage.createAnalysis({
        url: normalizedUrl,
        status: 'analyzing',
        sitemapContent: null,
        discoveredPages: [],
        // Store user email for tracking
        analysisMetadata: { userEmail: userEmail } as any,
      });

      // Start analysis process (async with proper error handling)
      // Pass user.id for Coffee tier credit consumption
      // Sprint 6: Pass JS rendering options and SPA detection
      analyzeWebsiteEnhanced(
        analysis.id,
        normalizedUrl,
        userEmail,
        tier,
        user?.id?.toString(),
        {
          jsRenderingEnabled,
          spaDetection: sitemapResult.spaDetection,
        },
        force
      ).catch((error) => {
        console.error(`🚨 CRITICAL: Unhandled analysis error for ${normalizedUrl}:`, error);
        // Ensure the analysis is marked as failed even on unhandled errors
        storage
          .updateAnalysis(analysis.id, {
            status: 'failed',
            discoveredPages: [],
            analysisMetadata: {
              siteType: 'unknown',
              sitemapFound: false,
              analysisMethod: 'error',
              message: 'Analysis failed due to unexpected error',
              totalPagesFound: 0,
              userEmail: userEmail,
              tier,
              error: error.message,
            },
          })
          .catch((updateError) => {
            console.error(`🚨 CRITICAL: Failed to update analysis status:`, updateError);
          });

        // Track usage even for completely failed analyses
        trackUsage(userEmail, 0, 0, 0, 0, 0).catch((trackError) => {
          console.error(`🚨 CRITICAL: Failed to track usage for failed analysis:`, trackError);
        });
      });

      res.json({
        analysisId: analysis.id,
        status: 'analyzing',
        estimatedDuration: Math.min(300, pageCount * 0.5), // 0.5 seconds per page estimate
        pageCount: Math.min(pageCount, TIER_LIMITS[tier].maxPagesPerAnalysis),
        // Sprint 10: Auto-detected JS rendering info
        jsRenderingAvailable: tier === 'scale',
        jsRenderingEnabled,
        jsRenderingAutoDetected: spaDetected,
        jsRenderQuota: tier === 'scale' ? {
          remaining: jsRenderQuotaInfo.rendersRemaining,
          limit: getJsRenderMonthlyLimit(),
        } : undefined,
        spaDetected,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Failed to analyze website',
      });
    }
  });

  // Get analysis status and results with metrics
  app.get('/api/analysis/:id', async (req, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      let analysis = await storage.getAnalysis(analysisId);

      if (!analysis) {
        return res.status(404).json({ message: 'Analysis not found' });
      }

      // ORPHANED ANALYSIS DETECTION: If analysis has been "analyzing" for more than 15 minutes,
      // it's likely an orphaned job (server restart killed the processing). Mark it as failed.
      const ORPHAN_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
      if (analysis.status === 'analyzing' && analysis.createdAt) {
        const analysisAge = Date.now() - new Date(analysis.createdAt).getTime();
        if (analysisAge > ORPHAN_TIMEOUT_MS) {
          console.warn(
            `⚠️ ORPHAN DETECTED: Analysis ${analysisId} stuck in 'analyzing' for ${Math.floor(analysisAge / 60000)} minutes. Marking as failed.`
          );
          await storage.updateAnalysis(analysisId, {
            status: 'failed',
            analysisMetadata: {
              ...analysis.analysisMetadata,
              message: 'Analysis timed out. The server may have restarted during processing. Please try again.',
              error: 'Orphaned analysis detected - exceeded 15 minute timeout',
            },
          });
          // Refresh the analysis object with updated status
          analysis = (await storage.getAnalysis(analysisId)) || analysis;
        }
      }

      const response: any = {
        id: analysis.id,
        url: analysis.url,
        status: analysis.status,
        discoveredPages: analysis.discoveredPages || [],
        siteType: analysis.analysisMetadata?.siteType || 'unknown',
        sitemapFound: analysis.analysisMetadata?.sitemapFound || false,
        analysisMethod: analysis.analysisMetadata?.analysisMethod || 'unknown',
        message: analysis.analysisMetadata?.message || 'Analysis completed',
        totalPagesFound: analysis.analysisMetadata?.totalPagesFound || 0,
        // Include full analysisMetadata for frontend components
        analysisMetadata: analysis.analysisMetadata || {},
      };

      // Include metrics if available (also at top level for backwards compatibility)
      if (analysis.analysisMetadata?.metrics) {
        response.metrics = analysis.analysisMetadata.metrics;
      }

      // Include enhanced SPA detection data at top level (backwards compatibility)
      if (analysis.analysisMetadata?.spaDetection) {
        response.spaDetection = analysis.analysisMetadata.spaDetection;
        response.contentCoveragePercentage = analysis.analysisMetadata.contentCoveragePercentage;
        response.renderingStrategy = analysis.analysisMetadata.renderingStrategy;
      }

      res.json(response);
    } catch (error) {
      console.error('Get analysis error:', error);
      res.status(500).json({ message: 'Failed to get analysis' });
    }
  });

  // Usage statistics endpoint - SIMPLIFIED
  app.get('/api/usage/:email', async (req, res) => {
    try {
      const email = req.params.email;

      // Get simple usage (ALWAYS works)
      const simpleUsage = await getSimpleUsage(email);

      // Get tier (with fallback)
      let tier = 'starter';
      try {
        tier = await getUserTier(email);
      } catch (e) {
        console.debug('Using default tier:', e);
      }

      // Get today's usage for cache hits (with fallback)
      let cacheHits = 0;
      let pagesProcessed = 0;
      try {
        const todayUsage = await getTodayUsage(email);
        if (todayUsage) {
          cacheHits = todayUsage.cacheHits || 0;
          pagesProcessed = todayUsage.pagesProcessed || 0;
        }
      } catch (e) {
        console.debug('Could not fetch cache hits:', e);
      }

      // Get credits for Solo tier users (handles both 'solo' and legacy 'coffee')
      let creditsRemaining = 0;
      if (tier === 'solo' || tier === 'coffee') {
        try {
          // Check auth_users table for credits
          const authUser = await authStorage.getUserByEmail(email);
          if (authUser && (authUser.tier === 'solo' || authUser.tier === 'coffee')) {
            creditsRemaining = authUser.creditsRemaining || 0;
            console.log(`[USAGE API] Solo tier user ${email} has ${creditsRemaining} credits`);
          }
        } catch (e) {
          console.debug('Could not fetch solo credits:', e);
        }
      }

      const limits = TIER_LIMITS[tier];

      const responseData = {
        tier,
        usage: {
          analysesToday: simpleUsage.count,
          pagesProcessedToday: pagesProcessed,
          cacheHitsToday: cacheHits,
          costToday: cacheHits * 0.001, // Estimated cost saved
        },
        limits: {
          dailyAnalyses: limits.dailyAnalyses,
          maxPagesPerAnalysis: limits.maxPagesPerAnalysis,
          aiPagesLimit: limits.aiPagesLimit,
        },
        features: limits.features,
      };

      // Add credits for Solo tier (capped at tier limit to prevent display bugs)
      if (tier === 'solo' || tier === 'coffee') {
        const monthlyLimit = limits.dailyAnalyses; // 20 for solo
        responseData.creditsRemaining = Math.min(creditsRemaining, monthlyLimit);
      }

      res.json(responseData);
    } catch (error) {
      console.error('Get usage error:', error);
      // ALWAYS return something valid
      res.json({
        tier: 'starter',
        usage: { analysesToday: 0 },
        limits: { dailyAnalyses: 3, maxPagesPerAnalysis: 20, aiPagesLimit: 20 },
        features: {},
      });
    }
  });

  // Version endpoint to check deployment status
  app.get('/api/version', (req, res) => {
    res.json({
      version: '2.0.0-enhanced',
      features: {
        blockquoteSummary: true,
        dynamicClustering: true,
        semanticTags: true,
        intelligentSequencing: true,
        enhancedMetadata: true,
        contentQuality: true,
      },
      deployedAt: new Date().toISOString(),
      debugMode: true,
      message: 'Enhanced LLMs.txt generation with all 6 phases active',
    });
  });

  // Keep existing endpoints
  app.post('/api/generate-llm-file', fileGenerationLimiter, async (req, res) => {
    try {
      const { analysisId, selectedPages } = z
        .object({
          analysisId: z.number(),
          selectedPages: z.array(
            z.object({
              url: z.string(),
              title: z.string(),
              description: z.string(),
              selected: z.boolean(),
              bodyContent: z.string().optional(),
            })
          ),
        })
        .parse(req.body);

      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ message: 'Analysis not found' });
      }

      // Enrich selectedPages with bodyContent from stored analysis (Sprint 15)
      const discoveredMap = new Map(
        (analysis.discoveredPages || []).map(dp => [dp.url, dp])
      );
      const enrichedPages = selectedPages.map(page => {
        const discovered = discoveredMap.get(page.url);
        return {
          ...page,
          bodyContent: page.bodyContent || discovered?.bodyContent,
        };
      });

      // Filter only selected pages
      const selectedOnly = enrichedPages.filter((page) => page.selected);
      const excludedPages = enrichedPages.filter((page) => !page.selected);

      const metadataCtx = { ...analysis.analysisMetadata, analysisId };

      // Sprint 12: Generate all 3 formats from same data
      const llmContent = generateLlmTxtContent(
        analysis.url,
        selectedOnly,
        excludedPages,
        analysis.discoveredPages || [],
        metadataCtx
      );
      const llmFullContent = generateLlmFullTxtContent(
        analysis.url,
        selectedOnly,
        analysis.discoveredPages || [],
        metadataCtx
      );
      const llmMiniContent = generateLlmMiniTxtContent(
        analysis.url,
        selectedOnly,
        analysis.discoveredPages || [],
        metadataCtx
      );

      // Save standard format (backward compatible)
      const llmFile = await storage.createLlmFile({
        analysisId,
        selectedPages: selectedOnly,
        content: llmContent,
      });

      // Approximate token counts (words * 1.3)
      const tokenCount = (text: string) => Math.round(text.split(/\s+/).filter(w => w.length > 0).length * 1.3);

      res.json({
        id: llmFile.id,
        content: llmContent,
        pageCount: selectedOnly.length,
        fileSize: Buffer.byteLength(llmContent, 'utf8'),
        // Sprint 12: Multi-format response
        formats: {
          standard: {
            content: llmContent,
            fileSize: Buffer.byteLength(llmContent, 'utf8'),
            tokenCount: tokenCount(llmContent),
            filename: 'llms.txt',
          },
          full: {
            content: llmFullContent,
            fileSize: Buffer.byteLength(llmFullContent, 'utf8'),
            tokenCount: tokenCount(llmFullContent),
            filename: 'llms-full.txt',
          },
          mini: {
            content: llmMiniContent,
            fileSize: Buffer.byteLength(llmMiniContent, 'utf8'),
            tokenCount: tokenCount(llmMiniContent),
            filename: 'llms-mini.txt',
          },
        },
      });
    } catch (error) {
      console.error('Generate file error:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Failed to generate LLMs.txt file',
      });
    }
  });

  // Get LLM file data
  app.get('/api/llm-file/:id', async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const llmFile = await storage.getLlmFile(fileId);

      if (!llmFile) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.json({
        id: llmFile.id,
        content: llmFile.content,
        pageCount: llmFile.selectedPages?.length || 0,
        fileSize: Buffer.byteLength(llmFile.content, 'utf8'),
      });
    } catch (error) {
      console.error('Get file error:', error);
      res.status(500).json({ message: 'Failed to get file data' });
    }
  });

  // Download LLMs.txt file (Sprint 12: supports format parameter)
  app.get('/api/download/:id', async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const format = (req.query.format as string) || 'standard';
      const llmFile = await storage.getLlmFile(fileId);

      if (!llmFile) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Get the analysis to regenerate other formats if needed
      let content = llmFile.content;
      let filename = 'llms.txt';

      if (format === 'full' || format === 'mini') {
        const analysis = llmFile.analysisId ? await storage.getAnalysis(llmFile.analysisId) : null;
        if (analysis && llmFile.selectedPages) {
          const selectedOnly = (llmFile.selectedPages as SelectedPage[]).filter((p: SelectedPage) => p.selected !== false);
          if (format === 'full') {
            content = generateLlmFullTxtContent(analysis.url, selectedOnly, analysis.discoveredPages || []);
            filename = 'llms-full.txt';
          } else {
            content = generateLlmMiniTxtContent(analysis.url, selectedOnly, analysis.discoveredPages || []);
            filename = 'llms-mini.txt';
          }
        }
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ message: 'Failed to download file' });
    }
  });

  // Sprint 12: Deployment verification endpoint
  app.post('/api/verify-deployment', async (req, res) => {
    try {
      const { domain } = z.object({
        domain: z.string().min(1, 'Domain is required'),
      }).parse(req.body);

      // Normalize domain
      const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
      const urlObj = new URL(baseUrl);
      const origin = urlObj.origin;

      const checks: Array<{
        name: string;
        status: 'pass' | 'fail' | 'error';
        details: string;
      }> = [];

      // Check 1: File accessible
      try {
        const fileResp = await fetch(`${origin}/llms.txt`, {
          method: 'HEAD',
          redirect: 'follow',
          headers: { 'User-Agent': 'LLMTxtMastery-Verifier/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        checks.push({
          name: 'file_accessible',
          status: fileResp.ok ? 'pass' : 'fail',
          details: fileResp.ok ? `Found (HTTP ${fileResp.status})` : `Not found (HTTP ${fileResp.status})`,
        });

        // Check 4: Content-Type header (only if file exists)
        if (fileResp.ok) {
          const contentType = fileResp.headers.get('content-type') || '';
          checks.push({
            name: 'content_type',
            status: contentType.includes('text/plain') ? 'pass' : 'fail',
            details: contentType.includes('text/plain')
              ? `Correct (${contentType})`
              : `Expected text/plain, got ${contentType || 'none'}`,
          });
        } else {
          checks.push({ name: 'content_type', status: 'fail', details: 'Cannot check — file not found' });
        }
      } catch {
        checks.push({ name: 'file_accessible', status: 'error', details: 'Failed to reach server' });
        checks.push({ name: 'content_type', status: 'error', details: 'Cannot check — server unreachable' });
      }

      // Check 2: HTML discovery tag
      try {
        const htmlResp = await fetch(origin, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'User-Agent': 'LLMTxtMastery-Verifier/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        const html = await htmlResp.text();
        const hasLinkTag = /<link[^>]*rel=["']alternate["'][^>]*href=["'][^"']*llms\.txt["']/i.test(html);
        checks.push({
          name: 'html_tag',
          status: hasLinkTag ? 'pass' : 'fail',
          details: hasLinkTag ? 'Discovery tag found in <head>' : 'No <link rel="alternate" href="/llms.txt"> found',
        });
      } catch {
        checks.push({ name: 'html_tag', status: 'error', details: 'Failed to fetch homepage' });
      }

      // Check 3: robots.txt directive
      try {
        const robotsResp = await fetch(`${origin}/robots.txt`, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'User-Agent': 'LLMTxtMastery-Verifier/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        const robotsText = await robotsResp.text();
        const hasDirective = /Llms-Txt:/i.test(robotsText);
        checks.push({
          name: 'robots_directive',
          status: hasDirective ? 'pass' : 'fail',
          details: hasDirective ? 'Llms-Txt directive found' : 'No Llms-Txt directive in robots.txt',
        });
      } catch {
        checks.push({ name: 'robots_directive', status: 'error', details: 'Failed to fetch robots.txt' });
      }

      const passed = checks.filter(c => c.status === 'pass').length;
      const total = checks.length;

      res.json({
        domain: urlObj.hostname,
        checks,
        score: passed,
        total,
        status: passed === total ? 'fully_deployed' : passed >= Math.ceil(total / 2) ? 'partially_deployed' : 'not_deployed',
        message: passed === total
          ? 'Fully deployed — AI crawlers can discover your llms.txt'
          : `${passed}/${total} checks passed — complete the remaining steps`,
      });
    } catch (error) {
      console.error('Verify deployment error:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Verification failed',
      });
    }
  });

  // Connection pool monitoring endpoint
  app.get('/api/admin/connection-pool-stats', async (req, res) => {
    try {
      // Simple security check for production
      if (process.env.NODE_ENV === 'production') {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
          return res.status(403).json({ message: 'Unauthorized' });
        }
      }

      const stats = connectionPool.getStats();
      res.json({
        connectionPool: stats,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      });
    } catch (error) {
      console.error('Connection pool stats error:', error);
      res.status(500).json({ message: 'Failed to get connection pool stats' });
    }
  });

  // Register Stripe payment routes
  registerStripeRoutes(app);

  // Register cancellation and refund routes
  registerCancellationRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}

// Sprint 6: Interface for JS rendering options passed through the analysis chain
interface AnalysisJsRenderingOptions {
  jsRenderingEnabled?: boolean;
  spaDetection?: SPADetectionResult;
  forceJsRendering?: boolean;
}

// Enhanced website analysis with caching and tier support
async function analyzeWebsiteEnhanced(
  analysisId: number,
  url: string,
  userEmail: string,
  tier: UserTier,
  authUserId?: string,
  jsRenderingOptions?: AnalysisJsRenderingOptions,
  force?: boolean
) {
  console.log(`\n🚀 [ANALYSIS START] Beginning analysis for ${url}`);
  console.log(`  - User: ${userEmail}`);
  console.log(`  - Tier: ${tier}`);
  console.log(`  - Analysis ID: ${analysisId}`);
  console.log(`  - OPENAI_API_KEY available: ${!!process.env.OPENAI_API_KEY}`);

  // Add timeout protection to prevent infinite hanging
  const ANALYSIS_TIMEOUT = 10 * 60 * 1000; // 10 minutes maximum
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Analysis timeout: exceeded ${ANALYSIS_TIMEOUT / 1000}s limit`));
    }, ANALYSIS_TIMEOUT);
  });

  try {
    // Race the analysis against the timeout
    await Promise.race([
      performAnalysisWithTimeout(analysisId, url, userEmail, tier, authUserId, jsRenderingOptions, force),
      timeoutPromise,
    ]);
  } catch (error) {
    console.error('Website analysis failed:', error);

    // CRITICAL FIX: Track usage even for exception-based failures to prevent unlimited retries
    await trackUsage(
      userEmail,
      0, // No pages processed
      0, // No AI calls
      0, // No HTML extractions
      0, // No cache hits
      0 // No cost
    );

    await storage.updateAnalysis(analysisId, {
      status: 'failed',
      discoveredPages: [],
      analysisMetadata: {
        siteType: 'unknown',
        sitemapFound: false,
        analysisMethod: 'error',
        message: error.message || 'Analysis failed due to unexpected error',
        totalPagesFound: 0,
        userEmail,
        tier,
        error: error.message,
      },
    });
  }
}

// Separate function to perform the actual analysis
async function performAnalysisWithTimeout(
  analysisId: number,
  url: string,
  userEmail: string,
  tier: UserTier,
  authUserId?: string,
  jsRenderingOptions?: AnalysisJsRenderingOptions,
  force?: boolean
) {
  try {
    const startTime = Date.now();

    // Fetch and parse sitemap
    console.log(`Starting sitemap analysis for ${url}`);
    const sitemapResult = await fetchSitemap(url);
    console.log(
      `Sitemap result: found=${sitemapResult.sitemapFound}, method=${sitemapResult.analysisMethod}, entries=${sitemapResult.entries.length}`
    );

    // Check if sitemap discovery failed completely
    if (sitemapResult.entries.length === 0) {
      console.error(`No pages discovered for ${url}. Marking analysis as failed.`);

      // CRITICAL FIX: Track usage even for failed analyses to prevent unlimited retries
      await trackUsage(
        userEmail,
        0, // No pages processed
        0, // No AI calls
        0, // No HTML extractions
        0, // No cache hits
        0 // No cost
      );

      await storage.updateAnalysis(analysisId, {
        status: 'failed',
        discoveredPages: [],
        analysisMetadata: {
          siteType: 'unknown',
          sitemapFound: false,
          analysisMethod: sitemapResult.analysisMethod,
          message: sitemapResult.message || 'No pages could be discovered for analysis',
          totalPagesFound: 0,
          userEmail,
          tier,
        },
      });
      return; // Exit early to prevent infinite loop
    }

    // Determine site type
    const siteType = determineSiteType(sitemapResult);

    // Update analysis with sitemap data and total pages (for frontend progress estimation)
    await storage.updateAnalysis(analysisId, {
      sitemapContent: sitemapResult.entries,
      status: 'processing',
      analysisMetadata: {
        totalPagesFound: sitemapResult.entries.length,
        tier, // Include tier for frontend time estimation
        siteType,
        sitemapFound: sitemapResult.analysisMethod === 'sitemap',
        analysisMethod: sitemapResult.analysisMethod,
        spaDetection: sitemapResult.spaDetection,
        contentCoveragePercentage: sitemapResult.spaDetection?.contentCoverage.estimatedCoverage,
        renderingStrategy: sitemapResult.spaDetection?.framework.renderingStrategy,
      },
    });

    // Analyze pages with smart caching
    console.log(`Starting page analysis for ${sitemapResult.entries.length} pages`);

    // Sprint 10: Log JS rendering status (auto-detected)
    if (jsRenderingOptions?.jsRenderingEnabled) {
      console.log(`🎯 [Sprint 10] JS rendering auto-enabled for this analysis`);
    }

    const { pages, metrics } = await analyzeDiscoveredPagesWithCache(
      sitemapResult.entries,
      userEmail,
      tier,
      jsRenderingOptions ? {
        enabled: jsRenderingOptions.jsRenderingEnabled,
        spaDetection: jsRenderingOptions.spaDetection,
        forceAll: jsRenderingOptions.forceJsRendering,
      } : undefined,
      force
    );
    console.log(
      `Page analysis completed: ${pages.length} pages analyzed, ${metrics.aiCallsUsed} AI calls, ${metrics.cachedPages} cached`
    );

    // Sprint 1: Apply CSR quality score boost for SPA sites
    // On CSR sites the crawler only sees the HTML shell, so all pages score low.
    // Boost high-value URL patterns so they get auto-selected in the frontend.
    const isCSR = sitemapResult.spaDetection?.framework.renderingStrategy === 'CSR' ||
                  (sitemapResult.spaDetection?.contentCoverage.estimatedCoverage ?? 100) < 50;
    if (isCSR && pages.length > 0) {
      const boostedCount = applyCSRQualityBoost(pages);
      if (boostedCount > 0) {
        console.log(`🎯 [Sprint 1] CSR site detected - boosted quality scores for ${boostedCount} high-value pages`);
      }
    }

    // ULTRA-SIMPLE TRACKING: Just increment the counter
    const newCount = await incrementSimpleUsage(userEmail, tier);
    console.log(
      `📊 [USAGE] Analysis ${analysisId} completed for ${userEmail}. Daily count: ${newCount}`
    );

    // Keep the complex tracking for backwards compatibility but don't rely on it
    trackUsage(
      userEmail,
      metrics.analyzedPages + metrics.cachedPages,
      metrics.aiCallsUsed,
      metrics.htmlExtractionsUsed,
      metrics.cachedPages,
      metrics.estimatedCost,
      metrics.totalTokensUsed || 0,
      metrics.actualAiCostUSD || 0,
      metrics.modelUsed || '',
      metrics['costCapWouldTrigger'] || false
    ).catch((error) => {
      // Silently fail - we don't care if complex tracking fails
      console.debug(`[USAGE] Complex tracking failed (ignored):`, error.message);
    });

    // Consume Solo credit if user is on Solo tier
    if (tier === 'solo' || tier === 'coffee') {
      try {
        console.log(`[CREDIT] Consuming Solo credit for ${userEmail}`);

        // Use authUserId if available (from JWT auth), otherwise resolve from email
        let userId = authUserId;
        if (!userId) {
          const resolvedUserId = await resolveUserFromEmail(userEmail);
          userId = resolvedUserId?.toString();
        }

        if (!userId) {
          console.error(`[CREDIT] Failed to resolve userId for ${userEmail}`);
        } else {
          // Consume one credit
          const creditConsumed = await consumeCoffeeCredit(userId);
          if (creditConsumed) {
            console.log(
              `[CREDIT] Successfully consumed 1 credit for ${userEmail} (userId: ${userId})`
            );
          } else {
            console.error(
              `[CREDIT] Failed to consume credit for ${userEmail} (userId: ${userId}) - user may be out of credits`
            );
          }
        }
      } catch (error) {
        // Don't fail the analysis if credit consumption fails
        console.error(`[CREDIT] Credit consumption failed for ${userEmail}:`, error);
      }
    }

    // Sprint 6: Consume JS render quota if JS renders were used
    if (jsRenderingOptions?.jsRenderingEnabled && metrics.jsRenderedPages && metrics.jsRenderedPages > 0) {
      try {
        let userId = authUserId;
        if (!userId) {
          const resolvedUserId = await resolveUserFromEmail(userEmail);
          userId = resolvedUserId?.toString();
        }

        if (userId) {
          const consumed = await consumeJsRenders(userId, metrics.jsRenderedPages);
          if (consumed) {
            console.log(`🎯 [Sprint 6] Consumed ${metrics.jsRenderedPages} JS render(s) from quota for ${userEmail}`);
          } else {
            console.warn(`⚠️ [Sprint 6] Failed to consume JS renders from quota for ${userEmail}`);
          }
        }
      } catch (error) {
        console.error(`[Sprint 6] JS render quota consumption failed for ${userEmail}:`, error);
      }
    }

    // Update analysis with results and metrics
    await storage.updateAnalysis(analysisId, {
      discoveredPages: pages,
      status: 'completed',
      analysisMetadata: {
        siteType,
        sitemapFound: sitemapResult.sitemapFound,
        analysisMethod: sitemapResult.analysisMethod,
        message: sitemapResult.message,
        totalPagesFound: sitemapResult.entries.length,
        userEmail,
        tier,
        // Enhanced SPA detection data (Sprint 1: Phase 1)
        spaDetection: sitemapResult.spaDetection,
        contentCoveragePercentage: sitemapResult.spaDetection?.contentCoverage.estimatedCoverage,
        renderingStrategy: sitemapResult.spaDetection?.framework.renderingStrategy,
        // Sprint 6: JS rendering metrics
        jsRenderingEnabled: jsRenderingOptions?.jsRenderingEnabled || false,
        jsRenderedPages: metrics.jsRenderedPages || 0,
        metrics,
        processingTime: (Date.now() - startTime) / 1000,
      },
    });

    // Sprint 6: Enhanced completion logging with JS rendering info
    const jsRenderingInfo = jsRenderingOptions?.jsRenderingEnabled
      ? `, ${metrics.jsRenderedPages || 0} JS rendered`
      : '';
    console.log(
      `Analysis completed for ${url}: ${metrics.totalPages} pages (${metrics.cachedPages} cached, ${metrics.analyzedPages} analyzed${jsRenderingInfo})`
    );
  } catch (error) {
    console.error('Website analysis failed:', error);

    // CRITICAL FIX: Track usage even for exception-based failures to prevent unlimited retries
    await trackUsage(
      userEmail,
      0, // No pages processed
      0, // No AI calls
      0, // No HTML extractions
      0, // No cache hits
      0 // No cost
    );

    await storage.updateAnalysis(analysisId, {
      status: 'failed',
      discoveredPages: [],
      analysisMetadata: {
        siteType: 'unknown',
        sitemapFound: false,
        analysisMethod: 'error',
        message: error.message || 'Analysis failed due to unexpected error',
        totalPagesFound: 0,
        userEmail,
        tier,
        error: error.message,
      },
    });
  }
}

function determineSiteType(sitemapResult: any): 'single-page' | 'multi-page' | 'unknown' {
  if (sitemapResult.analysisMethod === 'homepage-only') {
    return 'single-page';
  }
  if (sitemapResult.entries.length === 1) {
    return 'single-page';
  }
  if (sitemapResult.entries.length > 1) {
    return 'multi-page';
  }
  return 'unknown';
}

/**
 * Generates semantic tags for a page based on URL patterns, title, and description
 */
function generateSemanticTags(page: SelectedPage): string[] {
  const tags: string[] = [];
  const url = page.url.toLowerCase();
  const title = page.title?.toLowerCase() || '';
  const description = page.description?.toLowerCase() || '';
  const content = `${title} ${description}`;

  // Sprint 15: Content-type tags ONLY — no rendering/access tags like [static], [form], [public]
  // These describe what the content IS, not how it's rendered

  // URL path is the strongest signal
  try {
    const pathname = new URL(page.url).pathname.toLowerCase();

    // About/informational pages
    if (pathname.match(/\/(about|team|company|who-we-are)/)) {
      tags.push('[informational]');
    }
    // Contact pages
    else if (pathname.match(/\/(contact|get-in-touch|reach-us)/)) {
      tags.push('[contact]');
    }
    // Legal/policy pages — no tags (these go to Optional section)
    else if (pathname.match(/\/(privacy|terms|cookies|legal|tos|gdpr|disclaimer)/)) {
      // No tags for legal pages
    }
    // Blog/article pages
    else if (pathname.match(/\/(blog|article|post|news)/)) {
      tags.push('[article]');
    }
    // Guide/tutorial pages
    else if (pathname.match(/\/(guide|tutorial|how-to|learn)/)) {
      tags.push('[guide]');
    }
    // Documentation/API pages
    else if (pathname.match(/\/(docs|documentation|api|reference)/)) {
      tags.push('[article]');
    }
    // Tool/interactive pages
    else if (pathname.match(/\/(tool|calculator|converter|analyzer|validator|generate|analyze)/)) {
      tags.push('[tool]');
    }
    // Product/pricing pages
    else if (pathname.match(/\/(product|features|pricing|plans|shop)/)) {
      tags.push('[product]');
    }
    // Homepage
    else if (pathname === '/' || pathname === '') {
      tags.push('[product]');
    }
  } catch {
    // Invalid URL, fall through to content-based detection
  }

  // Content-based detection as fallback (only if no URL-based tag found)
  if (tags.length === 0) {
    if (content.includes('blog') || content.includes('article') || content.includes('posted on')) {
      tags.push('[article]');
    } else if (content.includes('guide') || content.includes('tutorial') || content.includes('how to')) {
      tags.push('[guide]');
    } else if (content.includes('tool') || content.includes('calculator') || content.includes('analyzer')) {
      tags.push('[tool]');
    } else if (content.includes('product') || content.includes('pricing') || content.includes('buy')) {
      tags.push('[product]');
    } else if (content.includes('about') || content.includes('our team') || content.includes('our mission')) {
      tags.push('[informational]');
    } else if (content.includes('contact') || content.includes('reach us') || content.includes('get in touch')) {
      tags.push('[contact]');
    }
  }

  // Add secondary purpose tag if applicable
  if (
    tags[0] !== '[guide]' && tags[0] !== '[article]' &&
    (content.includes('learn') || content.includes('education') || content.includes('tutorial') || content.includes('course'))
  ) {
    tags.push('[educational]');
  } else if (
    tags[0] !== '[informational]' &&
    (content.includes('about') || content.includes('overview') || url.includes('/about'))
  ) {
    tags.push('[informational]');
  }

  // Max 2 tags per entry
  return [...new Set(tags)].slice(0, 2);
}

/**
 * Intelligent page sequencing algorithm for ordering pages within clusters
 * Based on information architecture hierarchy, URL depth, quality scores, and semantic tags
 */
function intelligentPageSequencing(pages: SelectedPage[]): SelectedPage[] {
  return pages.sort((a, b) => {
    // Get semantic tags for priority scoring
    const aSemanticTags = generateSemanticTags(a);
    const bSemanticTags = generateSemanticTags(b);

    // 1. Information Architecture Hierarchy (highest priority)
    const aHierarchyScore = getInformationArchitectureScore(a, aSemanticTags);
    const bHierarchyScore = getInformationArchitectureScore(b, bSemanticTags);

    if (aHierarchyScore !== bHierarchyScore) {
      return bHierarchyScore - aHierarchyScore; // Higher score first
    }

    // 2. URL Depth (shallower pages typically more important)
    const aDepth = getUrlDepth(a.url);
    const bDepth = getUrlDepth(b.url);

    if (aDepth !== bDepth) {
      return aDepth - bDepth; // Shallower depth first
    }

    // 3. Content Quality Scores
    const aQuality = getPageQualityScore(a);
    const bQuality = getPageQualityScore(b);

    if (aQuality !== bQuality) {
      return bQuality - aQuality; // Higher quality first
    }

    // 4. Semantic Tag Priority (within same hierarchy level)
    const aTagScore = getSemanticTagPriorityScore(aSemanticTags);
    const bTagScore = getSemanticTagPriorityScore(bSemanticTags);

    if (aTagScore !== bTagScore) {
      return bTagScore - aTagScore; // Higher tag priority first
    }

    // 5. Fallback: Alphabetical by title
    return (a.title || '').localeCompare(b.title || '');
  });
}

/**
 * Gets information architecture hierarchy score based on URL patterns and semantic tags
 * Entry points → Navigation hubs → Core content → Supporting content → Auxiliary pages
 */
function getInformationArchitectureScore(page: SelectedPage, semanticTags: string[]): number {
  const url = page.url.toLowerCase();
  const title = page.title?.toLowerCase() || '';
  const description = page.description?.toLowerCase() || '';

  // Entry points (homepage, main landing pages) - Score 100
  if (
    semanticTags.includes('[landing]') ||
    url === '/' ||
    url.includes('/home') ||
    url.includes('/index') ||
    title.includes('home') ||
    title.includes('welcome')
  ) {
    return 100;
  }

  // Navigation hubs (category pages, section indexes) - Score 80
  if (
    semanticTags.includes('[category]') ||
    url.includes('/category') ||
    url.includes('/section') ||
    url.includes('/products') ||
    url.includes('/services') ||
    title.includes('category') ||
    title.includes('section') ||
    description.includes('browse') ||
    description.includes('explore')
  ) {
    return 80;
  }

  // Core content (main products/services/articles) - Score 60
  if (
    semanticTags.includes('[product]') ||
    semanticTags.includes('[tool]') ||
    semanticTags.includes('[article]') ||
    semanticTags.includes('[api-doc]') ||
    url.includes('/product') ||
    url.includes('/tool') ||
    url.includes('/blog') ||
    url.includes('/api') ||
    url.includes('/docs')
  ) {
    return 60;
  }

  // Supporting content (help, FAQ, guides) - Score 40
  if (
    semanticTags.includes('[guide]') ||
    semanticTags.includes('[educational]') ||
    url.includes('/help') ||
    url.includes('/support') ||
    url.includes('/faq') ||
    url.includes('/guide') ||
    url.includes('/tutorial') ||
    title.includes('help') ||
    title.includes('guide') ||
    title.includes('tutorial')
  ) {
    return 40;
  }

  // Auxiliary pages (legal, admin, archives) - Score 20
  if (
    url.includes('/legal') ||
    url.includes('/privacy') ||
    url.includes('/terms') ||
    url.includes('/admin') ||
    url.includes('/archive') ||
    url.includes('/old') ||
    title.includes('privacy') ||
    title.includes('terms') ||
    title.includes('legal') ||
    semanticTags.includes('[deprecated]')
  ) {
    return 20;
  }

  // Default content - Score 50
  return 50;
}

/**
 * Gets URL depth (number of path segments)
 */
function getUrlDepth(url: string): number {
  try {
    const urlObj = new URL(url);
    const segments = urlObj.pathname.split('/').filter((s) => s.length > 0);
    return segments.length;
  } catch {
    return 999; // Invalid URLs go to end
  }
}

/**
 * Sprint 1: Boosts quality scores for high-value URL patterns on CSR/SPA sites.
 * On CSR sites, the crawler only sees the HTML shell so all pages score similarly low.
 * This ensures standard pages (about, docs, blog) cross the auto-selection threshold (>= 5).
 * Only mutates pages in-place when isCSR is true. Returns count of boosted pages.
 */
function applyCSRQualityBoost(pages: DiscoveredPage[]): number {
  const highValuePatterns: Array<{ pattern: RegExp; boost: number }> = [
    { pattern: /^\/$/, boost: 3 },               // Homepage
    { pattern: /^\/about\b/, boost: 2 },          // About page
    { pattern: /^\/docs\b/, boost: 2 },           // Documentation
    { pattern: /^\/blog\b/, boost: 2 },           // Blog
    { pattern: /^\/features\b/, boost: 2 },       // Features
    { pattern: /^\/guides?\b/, boost: 2 },        // Guides
    { pattern: /^\/getting-started\b/, boost: 2 }, // Getting started
    // Product feature pages (core SaaS tools)
    { pattern: /^\/analy[sz]e\b/, boost: 2 },    // Analyzer tools
    { pattern: /^\/validat(e|or)\b/, boost: 2 },  // Validator tools
    { pattern: /^\/check(er)?\b/, boost: 2 },     // Checker tools
    { pattern: /^\/scan(ner)?\b/, boost: 2 },     // Scanner tools
    { pattern: /^\/generat(e|or)\b/, boost: 2 },  // Generator tools
    { pattern: /^\/demo\b/, boost: 2 },           // Demo/playground
    { pattern: /^\/playground\b/, boost: 2 },     // Interactive playground
    { pattern: /^\/pricing\b/, boost: 1 },        // Pricing
    { pattern: /^\/contact\b/, boost: 1 },        // Contact
    { pattern: /^\/faq\b/, boost: 1 },            // FAQ
    { pattern: /^\/help\b/, boost: 1 },           // Help
    { pattern: /^\/support\b/, boost: 1 },        // Support
  ];

  let boostedCount = 0;

  for (const page of pages) {
    try {
      const pathname = new URL(page.url).pathname;
      let boost = 0;

      for (const { pattern, boost: pathBoost } of highValuePatterns) {
        if (pattern.test(pathname)) {
          boost = Math.max(boost, pathBoost);
        }
      }

      // Also boost shallow pages (depth 1) that didn't match a specific pattern
      if (boost === 0) {
        const depth = pathname.split('/').filter((s) => s.length > 0).length;
        if (depth <= 1 && depth > 0) boost = 1;
      }

      if (boost > 0) {
        page.qualityScore = Math.min(page.qualityScore + boost, 10);
        boostedCount++;
      }
    } catch {
      // Skip pages with invalid URLs
    }
  }

  return boostedCount;
}

/**
 * Extracts quality score from page data (assumes it's in analysisMetadata or defaults)
 */
function getPageQualityScore(page: SelectedPage): number {
  // Try to extract quality score from page metadata
  if (page.analysisMetadata?.qualityScore) {
    return page.analysisMetadata.qualityScore;
  }

  // Fallback scoring based on content richness
  let score = 5; // Base score

  if (page.title && page.title.length > 10) score += 1;
  if (page.description && page.description.length > 50) score += 2;
  if (page.description && page.description.length > 200) score += 1;

  return Math.min(score, 10);
}

/**
 * Gets priority score based on semantic tags
 */
function getSemanticTagPriorityScore(tags: string[]): number {
  const tagPriorities: Record<string, number> = {
    // Content type priorities
    '[landing]': 100,
    '[category]': 90,
    '[product]': 80,
    '[tool]': 75,
    '[api-doc]': 70,
    '[guide]': 65,
    '[article]': 60,

    // Interaction priorities
    '[interactive]': 50,
    '[form]': 45,
    '[calculator]': 40,
    '[static]': 30,

    // Purpose priorities
    '[transactional]': 85,
    '[navigational]': 75,
    '[educational]': 65,
    '[informational]': 55,

    // Technical priorities
    '[public]': 10,
    '[requires-auth]': 5,
    '[beta]': -5,
    '[deprecated]': -10,
  };

  let maxScore = 0;
  tags.forEach((tag) => {
    const score = tagPriorities[tag] || 0;
    if (score > maxScore) {
      maxScore = score;
    }
  });

  return maxScore;
}

/**
 * Phase 6: Content Quality Improvements - Enhances page descriptions for better LLM understanding
 */
function enhancePageDescriptions(pages: SelectedPage[]): SelectedPage[] {
  // Create enhanced copies to avoid mutating original pages
  const enhancedPages = pages.map((page) => ({ ...page }));

  // 1. Detect and merge duplicate/similar descriptions
  const duplicateMap = detectDuplicateDescriptions(enhancedPages);

  // 2. Process duplicates and enhance descriptions
  duplicateMap.forEach((duplicatePages, description) => {
    if (duplicatePages.length > 1) {
      // Enhance each duplicate with differentiating context
      duplicatePages.forEach((page, index) => {
        const relatedPages = findRelatedPages(page, enhancedPages);
        const enhanced = addRelationshipContext(page, relatedPages);

        // Find the page in enhancedPages and update its description
        const pageIndex = enhancedPages.findIndex((p) => p.url === page.url);
        if (pageIndex !== -1) {
          enhancedPages[pageIndex].description = enhanced;
        }
      });
    }
  });

  // 3. Enhance short descriptions
  enhancedPages.forEach((page, index) => {
    if (page.description && page.description.length < 20) {
      const enhanced = enhanceShortDescription(page, enhancedPages);
      enhancedPages[index].description = enhanced;
    }
  });

  return enhancedPages;
}

/**
 * Detects and differentiates identical page titles using URL path context.
 * Critical for CSR/SPA sites where every page returns the same <title> tag.
 */
function differentiateIdenticalTitles(pages: SelectedPage[]): SelectedPage[] {
  // Group pages by normalized title
  const titleGroups = new Map<string, number[]>();
  pages.forEach((page, idx) => {
    const title = (page.title || '').trim();
    if (!titleGroups.has(title)) titleGroups.set(title, []);
    titleGroups.get(title)!.push(idx);
  });

  // Only process groups where 2+ pages share the same title
  const enhanced = pages.map((page) => ({ ...page }));

  titleGroups.forEach((indices, sharedTitle) => {
    if (indices.length < 2 || !sharedTitle) return;

    indices.forEach((idx) => {
      const page = enhanced[idx];
      const pathSegment = extractTitleFromUrl(page.url);

      if (pathSegment && pathSegment.toLowerCase() !== sharedTitle.toLowerCase()) {
        enhanced[idx].title = `${pathSegment} - ${sharedTitle}`;
      }
    });
  });

  return enhanced;
}

/**
 * Sprint 15: Post-generation dedup — rewrites any remaining duplicate descriptions.
 * Runs after all other enhancements as a final safety net.
 * For each group of pages sharing the same description, replaces the description
 * with a unique one derived from the page's URL path and title.
 */
function deduplicateDescriptions(pages: SelectedPage[]): SelectedPage[] {
  const result = pages.map((p) => ({ ...p }));

  // Group by normalized description core — strip ALL trailing parenthetical context
  // added by enhancePageDescriptions, e.g., "(detailed view with 3 related pages)",
  // "(overview; see also: Page Title)", "Includes 42 structured items and 12 sections."
  const groups = new Map<string, number[]>();
  result.forEach((page, idx) => {
    const norm = (page.description || '')
      .replace(/\s*\([^)]*\)\s*$/g, '')         // Strip trailing parentheticals
      .replace(/\s*Includes \d+ structured items.*$/i, '') // Strip "Includes N structured items..."
      .trim().toLowerCase().replace(/\s+/g, ' ');
    if (!groups.has(norm)) groups.set(norm, []);
    groups.get(norm)!.push(idx);
  });

  // Rewrite duplicates
  groups.forEach((indices) => {
    if (indices.length < 2) return;

    // Keep the first occurrence as-is (usually the highest-quality match)
    for (let i = 1; i < indices.length; i++) {
      const idx = indices[i];
      const page = result[idx];
      const rewritten = buildUniqueDescription(page);
      if (rewritten) {
        result[idx].description = rewritten;
      }
    }
  });

  return result;
}

/**
 * Builds a unique description for a page from its URL path and title.
 * Used as a fallback when the AI produced a duplicate description.
 */
function buildUniqueDescription(page: SelectedPage): string | null {
  try {
    const url = new URL(page.url);
    const segments = url.pathname.split('/').filter((s) => s.length > 0);

    // Build a readable page name from the URL path
    const pageName = segments.length > 0
      ? segments[segments.length - 1]
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Home';

    // Build context from the full path (e.g., "blog/fundamentals" → "Blog > Fundamentals")
    const breadcrumb = segments
      .map((s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      .join(' > ');

    // Use title if it's meaningfully different from the path-derived name
    const title = (page.title || '').replace(/\s*[|–—-]\s*.*$/, '').trim();
    const titleDiffers = title.length > 10 &&
      title.toLowerCase() !== pageName.toLowerCase() &&
      !title.toLowerCase().includes(url.hostname);

    if (titleDiffers && segments.length > 1) {
      return `${title}. Located at ${breadcrumb} on ${url.hostname}.`;
    } else if (titleDiffers) {
      return `${title} — the ${pageName.toLowerCase()} section of ${url.hostname}.`;
    } else if (segments.length > 1) {
      return `${pageName} page in the ${breadcrumb} section of ${url.hostname}.`;
    } else {
      return `${pageName} page on ${url.hostname}.`;
    }
  } catch {
    return page.title ? `${page.title}.` : null;
  }
}

/**
 * Extracts a human-readable title from a URL path segment.
 * e.g., "/about" -> "About", "/docs/getting-started" -> "Getting Started"
 * Returns "Home" for root path.
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const segments = urlObj.pathname.split('/').filter((s) => s.length > 0);
    if (segments.length === 0) return 'Home';

    // Use the last meaningful segment
    const lastSegment = segments[segments.length - 1];

    // Convert slug to title case: "getting-started" -> "Getting Started"
    return lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return '';
  }
}

/**
 * Detects pages with duplicate or very similar descriptions
 */
function detectDuplicateDescriptions(pages: SelectedPage[]): Map<string, SelectedPage[]> {
  const descriptionMap = new Map<string, SelectedPage[]>();

  pages.forEach((page) => {
    if (page.description) {
      // Normalize description for comparison (trim, lowercase, remove extra spaces)
      const normalized = page.description.trim().toLowerCase().replace(/\s+/g, ' ');

      if (!descriptionMap.has(normalized)) {
        descriptionMap.set(normalized, []);
      }
      descriptionMap.get(normalized)!.push(page);
    }
  });

  // Only return descriptions that have duplicates
  const duplicates = new Map<string, SelectedPage[]>();
  descriptionMap.forEach((pages, description) => {
    if (pages.length > 1) {
      duplicates.set(description, pages);
    }
  });

  return duplicates;
}

/**
 * Enhances short descriptions with more context from page data
 */
function enhanceShortDescription(page: SelectedPage, allPages: SelectedPage[]): string {
  const originalDescription = page.description || '';

  // If description is already good length, don't change it
  if (originalDescription.length >= 20) {
    return originalDescription;
  }

  // Extract context from URL and title
  const url = page.url.toLowerCase();
  const title = page.title?.toLowerCase() || '';

  // Build enhanced description based on URL patterns and title
  let enhancement = '';

  // Add context based on URL structure
  if (url.includes('/api/')) {
    enhancement = 'API documentation and technical reference';
  } else if (url.includes('/guide') || url.includes('/tutorial')) {
    enhancement = 'Step-by-step guide and tutorial content';
  } else if (url.includes('/product') || url.includes('/tool')) {
    enhancement = 'Product information and features';
  } else if (url.includes('/blog') || url.includes('/article')) {
    enhancement = 'Article and blog content';
  } else if (url.includes('/support') || url.includes('/help')) {
    enhancement = 'Support and help documentation';
  } else if (url.includes('/about') || url.includes('/company')) {
    enhancement = 'Company and organizational information';
  } else if (title.includes('home') || title.includes('welcome') || url === '/') {
    enhancement = 'Main website homepage and overview';
  } else {
    // Generic enhancement based on page context
    const relatedPages = findRelatedPages(page, allPages);
    if (relatedPages.length > 0) {
      enhancement = 'Part of site content collection';
    } else {
      enhancement = 'Website content and information';
    }
  }

  // Combine original description with enhancement
  if (originalDescription.trim()) {
    return `${originalDescription.trim()} - ${enhancement}`;
  } else {
    return enhancement;
  }
}

/**
 * Finds pages related to the given page based on URL patterns and content similarity
 */
function findRelatedPages(page: SelectedPage, allPages: SelectedPage[]): SelectedPage[] {
  const related: SelectedPage[] = [];

  try {
    const pageUrl = new URL(page.url);
    const pageSegments = pageUrl.pathname.split('/').filter((s) => s.length > 0);

    allPages.forEach((otherPage) => {
      if (otherPage.url === page.url) return; // Skip self

      try {
        const otherUrl = new URL(otherPage.url);
        const otherSegments = otherUrl.pathname.split('/').filter((s) => s.length > 0);

        // Check for URL pattern relationships
        const hasCommonParent =
          pageSegments.length > 0 &&
          otherSegments.length > 0 &&
          pageSegments[0] === otherSegments[0];

        const isParentChild =
          pageSegments.length > 0 &&
          otherSegments.length > 0 &&
          (pageSegments.every((seg, i) => seg === otherSegments[i]) ||
            otherSegments.every((seg, i) => seg === pageSegments[i]));

        // Check for content similarity
        const titleSimilarity =
          page.title &&
          otherPage.title &&
          page.title.toLowerCase().includes(otherPage.title.toLowerCase().split(' ')[0]);

        if (hasCommonParent || isParentChild || titleSimilarity) {
          related.push(otherPage);
        }
      } catch {
        // Ignore invalid URLs
      }
    });
  } catch {
    // If URL parsing fails, return empty array
  }

  // Limit to most relevant related pages
  return related.slice(0, 3);
}

/**
 * Adds relationship context to enhance page descriptions with related page information
 */
function addRelationshipContext(page: SelectedPage, relatedPages: SelectedPage[]): string {
  const originalDescription = page.description || '';

  if (relatedPages.length === 0) {
    // No related pages - build a descriptive replacement from URL path
    try {
      const url = new URL(page.url);
      const segments = url.pathname.split('/').filter((s) => s.length > 0);

      if (segments.length > 0) {
        // Build a descriptive label from the last meaningful path segment
        const lastSegment = segments[segments.length - 1];
        const pageName = lastSegment
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        // Use page title if it differs from the original description
        const titleBased = page.title && page.title.length > 10
          ? `${pageName} page. ${page.title}.`
          : `${pageName} page.`;

        return titleBased;
      }
    } catch {
      // If URL parsing fails, use title-based fallback
    }

    // Final fallback: use title if available
    if (page.title && page.title.length > 10) {
      return page.title;
    }
    return originalDescription;
  }

  // Add context based on relationships
  const relationships: string[] = [];

  relatedPages.forEach((relatedPage) => {
    try {
      const pageUrl = new URL(page.url);
      const relatedUrl = new URL(relatedPage.url);
      const pageSegments = pageUrl.pathname.split('/').filter((s) => s.length > 0);
      const relatedSegments = relatedUrl.pathname.split('/').filter((s) => s.length > 0);

      // Determine relationship type
      if (pageSegments.length > relatedSegments.length) {
        relationships.push('detailed view');
      } else if (pageSegments.length < relatedSegments.length) {
        relationships.push('overview');
      } else if (pageSegments[0] === relatedSegments[0]) {
        relationships.push('related content');
      }
    } catch {
      relationships.push('related');
    }
  });

  // Add relationship context
  if (relationships.length > 0) {
    const uniqueRelationships = [...new Set(relationships)];
    const relationshipText = uniqueRelationships.slice(0, 2).join(' and ');

    // Check if we should add "See also" references
    if (relatedPages.length <= 2) {
      const seeAlso = relatedPages.map((p) => p.title || 'related page').join(', ');
      return `${originalDescription} (${relationshipText}; see also: ${seeAlso})`;
    } else {
      return `${originalDescription} (${relationshipText} with ${relatedPages.length} related pages)`;
    }
  }

  return originalDescription;
}

/**
 * Generates a comprehensive site summary for the blockquote section
 */
function generateSiteSummary(
  baseUrl: string,
  selectedPages: SelectedPage[],
  allDiscoveredPages: DiscoveredPage[] = []
): string {
  // Try to find the homepage in selected pages first, then all discovered pages
  const homePage =
    selectedPages.find((p) => {
      const url = new URL(p.url);
      return url.pathname === '/' || url.pathname === '';
    }) ||
    allDiscoveredPages.find((p) => {
      const url = new URL(p.url);
      return url.pathname === '/' || url.pathname === '';
    });

  const domain = new URL(baseUrl).hostname;
  const pageTypes = analyzePageTypes(selectedPages);
  const primaryContent = identifyPrimaryContent(selectedPages);

  // Sprint 15: Extract site name from homepage title (before | or - separator)
  let siteName = domain;
  if (homePage && homePage.title) {
    const titleParts = homePage.title.split(/\s*[|\-–—]\s*/);
    if (titleParts[0] && titleParts[0].trim().length > 2 && titleParts[0].trim().length < 50) {
      siteName = titleParts[0].trim();
    }
  }

  // Check if homepage description is generic (matches >50% of other page descriptions)
  let homepageDescIsGeneric = false;
  if (homePage && homePage.description) {
    const homeDescNorm = homePage.description.trim().toLowerCase().replace(/\s+/g, ' ');
    const matchCount = selectedPages.filter((p) => {
      if (p.url === homePage.url) return false;
      const norm = (p.description || '').trim().toLowerCase().replace(/\s+/g, ' ');
      return norm === homeDescNorm;
    }).length;
    const otherPageCount = selectedPages.length - 1;
    if (otherPageCount > 0 && matchCount / otherPageCount > 0.5) {
      homepageDescIsGeneric = true;
    }
  }

  // If we have a homepage with a good, unique description, use it as the base
  if (homePage && homePage.description && homePage.description.length > 50 && !homepageDescIsGeneric) {
    let summary = homePage.description;

    // Sprint 15: Replace generic "This page" with actual site name
    summary = summary.replace(/^This page\b/i, siteName);
    summary = summary.replace(/^This website\b/i, siteName);
    summary = summary.replace(/^This site\b/i, siteName);

    // Add context about the site's scope if not already included
    if (pageTypes.length > 0 && !summary.toLowerCase().includes('offering')) {
      summary += ` The site offers ${pageTypes.join(', ')}.`;
    }

    // Add information about primary content focus
    if (primaryContent && !summary.toLowerCase().includes(primaryContent.toLowerCase())) {
      summary += ` Primary focus includes ${primaryContent}.`;
    }

    return summary;
  }

  // Sprint 15: If homepage desc is generic (SPA pattern), build composite from top unique pages
  if (homepageDescIsGeneric) {
    const uniqueDescs = selectedPages
      .filter(p => p.description && p.url !== homePage?.url)
      .map(p => p.description)
      .filter((desc, idx, arr) => arr.indexOf(desc) === idx) // deduplicate
      .slice(0, 3);
    if (uniqueDescs.length >= 2) {
      const composite = `${siteName} features ${uniqueDescs.map(d => d.replace(/\.$/, '').toLowerCase()).join(', ')}.`;
      return composite;
    }
  }

  // Fallback: Infer product focus from page titles and descriptions
  const allText = selectedPages
    .map((p) => `${p.title || ''} ${p.description || ''}`)
    .join(' ')
    .toLowerCase();

  // Detect product focus from frequent terms in page content
  const focusTerms: { term: string; label: string }[] = [
    { term: 'llms.txt', label: 'llms.txt generation and AI visibility' },
    { term: 'llm.txt', label: 'llm.txt file generation' },
    { term: 'ai visibility', label: 'AI visibility optimization' },
    { term: 'seo', label: 'SEO and search optimization' },
    { term: 'api', label: 'API services' },
    { term: 'saas', label: 'SaaS platform' },
    { term: 'e-commerce', label: 'e-commerce' },
    { term: 'analytics', label: 'analytics and insights' },
  ];

  let productFocus = '';
  for (const { term, label } of focusTerms) {
    if (allText.includes(term)) {
      productFocus = label;
      break;
    }
  }

  const pageCount = selectedPages.length;
  let summary = '';

  if (productFocus) {
    summary = `${siteName} provides ${productFocus}`;
    if (pageTypes.length > 0) {
      summary += `, with ${pageTypes.join(', ')}`;
    }
    summary += `. This file covers ${pageCount} key ${pageCount === 1 ? 'page' : 'pages'} for AI consumption.`;
  } else {
    // Generic fallback without filler phrases
    const categories = extractCategories(selectedPages);
    summary = `${siteName}`;
    if (categories.length > 0) {
      summary += ` covers ${categories.slice(0, 3).join(', ')}`;
    }
    if (pageTypes.length > 0) {
      summary += `, offering ${pageTypes.join(', ')}`;
    }
    summary += `. This file covers ${pageCount} key ${pageCount === 1 ? 'page' : 'pages'} for AI consumption.`;
  }

  return summary;
}

/**
 * Analyzes the types of pages present on the site
 */
function analyzePageTypes(pages: SelectedPage[]): string[] {
  const types = new Set<string>();

  pages.forEach((page) => {
    const url = page.url.toLowerCase();
    const title = page.title?.toLowerCase() || '';
    const description = page.description?.toLowerCase() || '';

    // Detect common page types
    if (url.includes('/blog') || url.includes('/article') || url.includes('/post')) {
      types.add('blog articles');
    }
    if (url.includes('/product') || url.includes('/shop') || title.includes('buy')) {
      types.add('product pages');
    }
    if (url.includes('/doc') || url.includes('/guide') || url.includes('/tutorial')) {
      types.add('documentation');
    }
    if (url.includes('/api') || title.includes('api')) {
      types.add('API documentation');
    }
    if (url.includes('/tool') || url.includes('/calculator') || description.includes('calculate')) {
      types.add('interactive tools');
    }
    if (url.includes('/about') || url.includes('/team') || url.includes('/company')) {
      types.add('company information');
    }
    if (url.includes('/support') || url.includes('/help') || url.includes('/faq')) {
      types.add('support resources');
    }
  });

  return Array.from(types);
}

/**
 * Identifies the primary content focus of the site
 */
function identifyPrimaryContent(pages: SelectedPage[]): string {
  // Count occurrences of different content themes
  const themes: Record<string, number> = {};

  pages.forEach((page) => {
    const content = `${page.title} ${page.description}`.toLowerCase();

    // Common themes to detect
    const themeKeywords = {
      'financial services': ['finance', 'investment', 'banking', 'mortgage', 'loan'],
      'educational content': ['learn', 'tutorial', 'guide', 'course', 'education'],
      'software tools': ['tool', 'calculator', 'converter', 'generator', 'analyzer'],
      'e-commerce': ['product', 'shop', 'buy', 'cart', 'checkout'],
      'technical documentation': ['api', 'sdk', 'library', 'framework', 'developer'],
      'news and articles': ['news', 'article', 'blog', 'story', 'update'],
      'community resources': ['forum', 'community', 'discussion', 'support', 'help'],
    };

    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      keywords.forEach((keyword) => {
        if (content.includes(keyword)) {
          themes[theme] = (themes[theme] || 0) + 1;
        }
      });
    });
  });

  // Find the most common theme
  const primaryTheme = Object.entries(themes)
    .sort(([, a], [, b]) => b - a)
    .map(([theme]) => theme)[0];

  return primaryTheme || 'comprehensive content';
}

/**
 * Extracts categories from page URLs and titles
 */
function extractCategories(pages: SelectedPage[]): string[] {
  const categories = new Set<string>();

  pages.forEach((page) => {
    // Extract from URL path segments
    const url = new URL(page.url);
    const segments = url.pathname.split('/').filter((s) => s.length > 0);

    if (segments.length > 0) {
      // First segment often indicates category
      const category = segments[0].replace(/-/g, ' ').replace(/_/g, ' ').toLowerCase();

      // Filter out common non-category segments
      const nonCategories = ['page', 'p', 'id', 'index', 'home', 'default'];
      if (!nonCategories.includes(category) && category.length > 2) {
        categories.add(category);
      }
    }
  });

  return Array.from(categories);
}

/**
 * Enhanced Metadata Extraction Functions for Phase 5
 */

/**
 * Calculates the average quality score across all selected pages
 */
function calculateAverageQuality(pages: SelectedPage[]): number {
  if (pages.length === 0) return 0;

  const totalQuality = pages.reduce((sum, page) => {
    const quality = getPageQualityScore(page);
    return sum + quality;
  }, 0);

  return Math.round((totalQuality / pages.length) * 10) / 10; // Round to 1 decimal
}

/**
 * Estimates total word count across all selected pages
 */
function estimateTotalWordCount(pages: SelectedPage[]): number {
  return pages.reduce((total, page) => {
    // Estimate word count based on title and description length
    const titleWords = page.title ? page.title.split(/\s+/).length : 0;
    const descWords = page.description ? page.description.split(/\s+/).length : 0;

    // Estimate full page content: description is usually 10-20% of full content
    const estimatedPageWords = (titleWords + descWords) * 8; // Conservative multiplier

    return total + estimatedPageWords;
  }, 0);
}

/**
 * Analyzes site structure and returns metadata about depth and clustering
 */
function analyzeSiteStructure(pages: SelectedPage[]): SiteStructureMetadata {
  const depths = pages.map((page) => getUrlDepth(page.url)).filter((d) => d < 999);
  const clusters = clusterPagesIntoCategories(pages);

  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
  const avgDepth =
    depths.length > 0
      ? Math.round((depths.reduce((a, b) => a + b, 0) / depths.length) * 10) / 10
      : 0;

  return {
    maxDepth,
    avgDepth,
    clusterCount: clusters.size,
    depthDistribution: getDepthDistribution(depths),
    largestClusterSize: Math.max(...Array.from(clusters.values()).map((cluster) => cluster.length)),
  };
}

/**
 * Gets the most common semantic tags across all pages
 */
function getCommonSemanticTags(pages: SelectedPage[]): string[] {
  const tagCounts = new Map<string, number>();

  pages.forEach((page) => {
    const tags = generateSemanticTags(page);
    tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  // Sort by frequency and return top 5 most common tags
  return Array.from(tagCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);
}

/**
 * Analyzes technical indicators across the site
 */
function analyzeTechnicalIndicators(pages: SelectedPage[]): TechnicalIndicators {
  let hasInteractiveElements = false;
  let hasFormElements = false;
  let hasApiEndpoints = false;
  let hasAuthRequiredPages = false;
  let hasBetaFeatures = false;

  pages.forEach((page) => {
    const tags = generateSemanticTags(page);
    const content = `${page.title} ${page.description}`.toLowerCase();

    if (tags.includes('[interactive]') || tags.includes('[calculator]')) {
      hasInteractiveElements = true;
    }
    if (tags.includes('[form]')) {
      hasFormElements = true;
    }
    if (tags.includes('[api-doc]') || content.includes('api') || content.includes('endpoint')) {
      hasApiEndpoints = true;
    }
    if (tags.includes('[requires-auth]')) {
      hasAuthRequiredPages = true;
    }
    if (tags.includes('[beta]')) {
      hasBetaFeatures = true;
    }
  });

  return {
    hasInteractiveElements,
    hasFormElements,
    hasApiEndpoints,
    hasAuthRequiredPages,
    hasBetaFeatures,
  };
}

/**
 * Gets distribution of URL depths
 */
function getDepthDistribution(depths: number[]): Record<number, number> {
  const distribution: Record<number, number> = {};
  depths.forEach((depth) => {
    distribution[depth] = (distribution[depth] || 0) + 1;
  });
  return distribution;
}

/**
 * Generates inline metadata indicators for individual pages
 */
function getInlinePageMetadata(page: SelectedPage): string {
  const indicators: string[] = [];
  const quality = getPageQualityScore(page);
  const depth = getUrlDepth(page.url);
  const tags = generateSemanticTags(page);

  // Quality indicators for notable scores
  if (quality >= 9) {
    indicators.push('⭐ High Quality');
  } else if (quality <= 3) {
    indicators.push('⚠️ Low Quality');
  }

  // Depth indicators for deeply nested pages
  if (depth >= 4) {
    indicators.push(`🗂️ Depth ${depth}`);
  }

  // Special technical indicators
  if (tags.includes('[interactive]')) {
    indicators.push('🔧 Interactive');
  }
  if (tags.includes('[form]')) {
    indicators.push('📝 Form');
  }
  if (tags.includes('[api-doc]')) {
    indicators.push('🔌 API');
  }
  if (tags.includes('[requires-auth]')) {
    indicators.push('🔒 Auth Required');
  }
  if (tags.includes('[beta]')) {
    indicators.push('🧪 Beta');
  }
  if (tags.includes('[deprecated]')) {
    indicators.push('⚠️ Deprecated');
  }

  return indicators.length > 0 ? ` (${indicators.join(', ')})` : '';
}

// Type definitions for enhanced metadata
interface SiteStructureMetadata {
  maxDepth: number;
  avgDepth: number;
  clusterCount: number;
  depthDistribution: Record<number, number>;
  largestClusterSize: number;
}

interface TechnicalIndicators {
  hasInteractiveElements: boolean;
  hasFormElements: boolean;
  hasApiEndpoints: boolean;
  hasAuthRequiredPages: boolean;
  hasBetaFeatures: boolean;
}

/**
 * Clusters pages into dynamic categories based on URL patterns, content analysis, and semantic similarity
 */
function clusterPagesIntoCategories(pages: SelectedPage[]): Map<string, SelectedPage[]> {
  const clusters = new Map<string, SelectedPage[]>();

  // First pass: Cluster by URL patterns
  const urlClusters = clusterByUrlPatterns(pages);

  // Second pass: Refine clusters using content analysis
  const refinedClusters = refineClustersByContent(urlClusters);

  // Third pass: Merge small clusters and create meaningful category names
  const finalClusters = finalizeClusters(refinedClusters);

  return finalClusters;
}

/**
 * Clusters pages based on URL structure
 */
function clusterByUrlPatterns(pages: SelectedPage[]): Map<string, SelectedPage[]> {
  const clusters = new Map<string, SelectedPage[]>();

  pages.forEach((page) => {
    try {
      const url = new URL(page.url);
      const segments = url.pathname.split('/').filter((s) => s.length > 0);

      // Determine cluster based on URL structure
      let clusterKey = 'General Content';

      if (segments.length === 0 || (segments.length === 1 && segments[0] === 'index.html')) {
        clusterKey = 'Main Pages';
      } else if (segments.length > 0) {
        // Use the first meaningful segment as the initial cluster
        const firstSegment = segments[0].toLowerCase();

        // Map common URL patterns to readable categories
        const categoryMappings: Record<string, string> = {
          blog: 'Blog & Articles',
          posts: 'Blog & Articles',
          articles: 'Blog & Articles',
          news: 'News & Updates',
          products: 'Products & Services',
          services: 'Products & Services',
          docs: 'Documentation',
          documentation: 'Documentation',
          api: 'API Reference',
          guides: 'Guides & Tutorials',
          tutorials: 'Guides & Tutorials',
          about: 'About & Company',
          company: 'About & Company',
          team: 'About & Company',
          support: 'Support & Help',
          help: 'Support & Help',
          faq: 'Support & Help',
          tools: 'Tools & Utilities',
          calculators: 'Tools & Utilities',
          resources: 'Resources',
          legal: 'Legal & Policies',
          privacy: 'Legal & Policies',
          terms: 'Legal & Policies',
          pricing: 'Pricing & Plans',
          contact: 'Contact & Support',
        };

        // Check if we have a mapping for this segment
        if (categoryMappings[firstSegment]) {
          clusterKey = categoryMappings[firstSegment];
        } else {
          // Create a readable category from the segment
          clusterKey = firstSegment
            .split(/[-_]/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }

      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push(page);
    } catch (error) {
      // If URL parsing fails, add to general content
      if (!clusters.has('General Content')) {
        clusters.set('General Content', []);
      }
      clusters.get('General Content')!.push(page);
    }
  });

  return clusters;
}

/**
 * Refines clusters based on content analysis
 */
function refineClustersByContent(
  clusters: Map<string, SelectedPage[]>
): Map<string, SelectedPage[]> {
  const refined = new Map<string, SelectedPage[]>();

  clusters.forEach((pages, category) => {
    // For large clusters, try to sub-divide based on content
    if (pages.length > 10) {
      const subclusters = subdivideByContent(pages, category);
      subclusters.forEach((subPages, subCategory) => {
        refined.set(subCategory, subPages);
      });
    } else {
      refined.set(category, pages);
    }
  });

  return refined;
}

/**
 * Subdivides large clusters based on content similarity
 */
function subdivideByContent(
  pages: SelectedPage[],
  parentCategory: string
): Map<string, SelectedPage[]> {
  const subclusters = new Map<string, SelectedPage[]>();

  // Analyze content patterns
  const contentPatterns = new Map<string, SelectedPage[]>();

  pages.forEach((page) => {
    const content = `${page.title} ${page.description}`.toLowerCase();

    // Identify sub-patterns
    let subPattern = '';

    // Check for specific content indicators
    if (content.includes('calculator') || content.includes('converter')) {
      subPattern = 'Calculators & Converters';
    } else if (content.includes('guide') || content.includes('how to')) {
      subPattern = 'Guides & How-To';
    } else if (content.includes('api') || content.includes('endpoint')) {
      subPattern = 'API & Technical';
    } else if (content.includes('pricing') || content.includes('plan')) {
      subPattern = 'Pricing & Plans';
    } else if (content.includes('feature') || content.includes('capability')) {
      subPattern = 'Features & Capabilities';
    } else {
      subPattern = parentCategory;
    }

    const key =
      subPattern === parentCategory ? parentCategory : `${parentCategory} - ${subPattern}`;

    if (!contentPatterns.has(key)) {
      contentPatterns.set(key, []);
    }
    contentPatterns.get(key)!.push(page);
  });

  // Only create subcategories if we have meaningful divisions
  if (contentPatterns.size > 1) {
    return contentPatterns;
  } else {
    subclusters.set(parentCategory, pages);
    return subclusters;
  }
}

/**
 * Finalizes clusters by merging small ones and creating better names
 */
function finalizeClusters(clusters: Map<string, SelectedPage[]>): Map<string, SelectedPage[]> {
  const final = new Map<string, SelectedPage[]>();
  const smallClusters: Array<[string, SelectedPage[]]> = [];

  // Separate large and small clusters
  clusters.forEach((pages, category) => {
    if (pages.length >= 3) {
      final.set(category, pages);
    } else {
      smallClusters.push([category, pages]);
    }
  });

  // Merge small clusters into "Additional Resources" if we have multiple small clusters
  if (smallClusters.length > 2) {
    const additionalPages: SelectedPage[] = [];
    smallClusters.forEach(([, pages]) => {
      additionalPages.push(...pages);
    });
    if (additionalPages.length > 0) {
      final.set('Additional Resources', additionalPages);
    }
  } else {
    // Keep small clusters as is if there are only a few
    smallClusters.forEach(([category, pages]) => {
      final.set(category, pages);
    });
  }

  // Sort categories by importance
  const sortedFinal = new Map<string, SelectedPage[]>();
  const categoryOrder = [
    'Main Pages',
    'Products & Services',
    'Features & Capabilities',
    'Documentation',
    'API Reference',
    'Guides & Tutorials',
    'Tools & Utilities',
    'Blog & Articles',
    'News & Updates',
    'Pricing & Plans',
    'Resources',
    'About & Company',
    'Support & Help',
    'Contact & Support',
    'Legal & Policies',
    'Additional Resources',
    'General Content',
  ];

  // Add categories in priority order
  categoryOrder.forEach((cat) => {
    if (final.has(cat)) {
      sortedFinal.set(cat, final.get(cat)!);
      final.delete(cat);
    }
  });

  // Add any remaining categories
  final.forEach((pages, category) => {
    sortedFinal.set(category, pages);
  });

  return sortedFinal;
}

function generateLlmTxtContent(
  baseUrl: string,
  selectedPages: SelectedPage[],
  excludedPages: SelectedPage[] = [],
  allDiscoveredPages: DiscoveredPage[] = [],
  analysisMetadata: any = {}
): string {
  const createdDate = new Date().toISOString().split('T')[0];
  const totalFound = analysisMetadata?.totalPagesFound || allDiscoveredPages.length;
  const analyzed = allDiscoveredPages.length;
  const excluded = excludedPages.length;

  // Sprint 15: Auto-filter legal/boilerplate pages to Optional section
  const legalPattern = /\/(privacy|terms|cookies|cookie-policy|legal|tos|gdpr|disclaimer|imprint)/i;
  const legalPages: SelectedPage[] = [];
  const contentPages = selectedPages.filter(page => {
    try {
      const pathname = new URL(page.url).pathname;
      if (legalPattern.test(pathname)) {
        legalPages.push(page);
        return false;
      }
    } catch { /* keep page if URL parse fails */ }
    return true;
  });

  // Phase 6: Apply content quality improvements before clustering
  const descEnhancedPages = enhancePageDescriptions(contentPages);

  // Phase 7: Differentiate identical titles (critical for CSR/SPA sites)
  const titleFixedPages = differentiateIdenticalTitles(descEnhancedPages);

  // Sprint 15: Final dedup — rewrite any remaining duplicate descriptions using URL path
  const enhancedPages = deduplicateDescriptions(titleFixedPages);

  // Generate comprehensive site summary (using enhanced pages)
  const siteSummary = generateSiteSummary(baseUrl, enhancedPages, allDiscoveredPages);

  // Phase 5: Enhanced Metadata Extraction (using enhanced pages)
  const avgQuality = calculateAverageQuality(enhancedPages);
  const estimatedWordCount = estimateTotalWordCount(enhancedPages);
  const siteStructure = analyzeSiteStructure(enhancedPages);
  const commonTags = getCommonSemanticTags(enhancedPages);
  const technicalIndicators = analyzeTechnicalIndicators(enhancedPages);

  // Build technical indicators summary
  const techFeatures: string[] = [];
  if (technicalIndicators.hasInteractiveElements) techFeatures.push('Interactive Tools');
  if (technicalIndicators.hasFormElements) techFeatures.push('Forms');
  if (technicalIndicators.hasApiEndpoints) techFeatures.push('API Documentation');
  if (technicalIndicators.hasAuthRequiredPages) techFeatures.push('Authenticated Content');
  if (technicalIndicators.hasBetaFeatures) techFeatures.push('Beta Features');

  // Extract site name from baseUrl
  const siteName = new URL(baseUrl).hostname.replace(/^www\./, '');

  const header = `# ${siteName}

> ${siteSummary}

`;

  // Cluster pages into dynamic categories (using enhanced pages)
  const clusteredPages = clusterPagesIntoCategories(enhancedPages);

  // Generate content with category headers and markdown links (official format)
  let content = '';
  if (clusteredPages.size > 1) {
    // Multiple categories - organize by sections with intelligent sequencing within each cluster
    clusteredPages.forEach((pages, category) => {
      content += `## ${category}\n\n`;

      // Apply intelligent sequencing WITHIN this cluster
      const sequencedPages = intelligentPageSequencing(pages);

      content += sequencedPages
        .map((page) => {
          const tags = generateSemanticTags(page);
          const tagString = tags.length > 0 ? `${tags.join(' ')} ` : '';
          return `- [${page.title}](${page.url}): ${tagString}${page.description}`;
        })
        .join('\n');
      content += '\n\n';
    });
  } else {
    // Single category or no clear categorization - apply intelligent sequencing to all pages
    const sequencedPages = intelligentPageSequencing(enhancedPages);

    // Add default "Resources" section header if no categories
    content = `## Resources\n\n`;
    content += sequencedPages
      .map((page) => {
        const tags = generateSemanticTags(page);
        const tagString = tags.length > 0 ? `${tags.join(' ')} ` : '';
        return `- [${page.title}](${page.url}): ${tagString}${page.description}`;
      })
      .join('\n');
    content += '\n\n';
  }

  // Add metadata as spec-compliant content
  // Per llmstxt.org spec: H2 sections must only contain list items with [name](url) format.
  // Analysis metadata goes as plain text BEFORE the H2 sections (allowed by spec),
  // and resource links go in a proper H2 "Optional" section with correct list format.

  // Build metadata block as plain text (inserted before first H2 section per spec)
  let metadataBlock = '';
  metadataBlock += `Generated by [LLM.txt Mastery](https://llmtxtmastery.com) on ${createdDate}. `;
  metadataBlock += `${totalFound} ${totalFound === 1 ? 'page' : 'pages'} found, ${analyzed} analyzed, ${enhancedPages.length} included. `;
  metadataBlock += `Average quality: ${avgQuality}/10. `;
  const clusterLabel = siteStructure.clusterCount === 1 ? 'cluster' : 'clusters';
  metadataBlock += `${siteStructure.clusterCount} content ${clusterLabel}, ~${estimatedWordCount.toLocaleString()} words total.`;
  metadataBlock += '\n\n';

  // Add Optional section with resource links (spec-compliant H2 with proper list items)
  let optionalSection = `## Optional\n\n`;
  optionalSection += `- [llms.txt Specification](https://llmstxt.org/): Official llmstxt.org format specification\n`;
  // Sprint 15: Include auto-filtered legal pages in Optional
  for (const page of legalPages) {
    const label = page.description && page.description.length >= 10 ? page.description : page.title;
    optionalSection += `- [${page.title}](${page.url}): ${label}\n`;
  }
  if (excludedPages.length > 0) {
    // Differentiate identical titles on excluded pages too
    const titleFixedExcluded = differentiateIdenticalTitles(excludedPages);
    const topExcluded = titleFixedExcluded.slice(0, 10);
    for (const page of topExcluded) {
      // Use the page's actual description instead of a generic label
      let pageLabel = page.description || '';
      if (!pageLabel || pageLabel.length < 10) {
        // Generate minimal description from URL path
        try {
          const urlObj = new URL(page.url);
          const segments = urlObj.pathname.split('/').filter((s) => s.length > 0);
          if (segments.length > 0) {
            pageLabel = segments[segments.length - 1]
              .replace(/-/g, ' ')
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());
          } else {
            pageLabel = 'Additional site content';
          }
        } catch {
          pageLabel = 'Additional site content';
        }
      }
      optionalSection += `- [${page.title}](${page.url}): ${pageLabel}\n`;
    }
    if (excluded > 10) {
      optionalSection += `- ${excluded - 10} additional excluded pages not shown\n`;
    }
  }
  optionalSection += '\n';

  // Insert metadata block between header (H1 + blockquote) and content (H2 sections)
  return header + metadataBlock + content + optionalSection;
}

/**
 * Sprint 12: Generate llms-full.txt format
 * Complete markdown extraction with full page content for LLM ingestion
 */
function generateLlmFullTxtContent(
  baseUrl: string,
  selectedPages: SelectedPage[],
  allDiscoveredPages: DiscoveredPage[] = [],
  analysisMetadata: any = {}
): string {
  const createdDate = new Date().toISOString().split('T')[0];
  const siteName = new URL(baseUrl).hostname.replace(/^www\./, '');
  const enhancedPages = differentiateIdenticalTitles(enhancePageDescriptions(selectedPages));
  const siteSummary = generateSiteSummary(baseUrl, enhancedPages, allDiscoveredPages);
  const avgQuality = calculateAverageQuality(enhancedPages);

  let output = `# ${siteName}\n\n`;
  output += `> ${siteSummary}\n\n`;
  output += `Generated by [LLM.txt Mastery](https://llmtxtmastery.com) on ${createdDate}. `;
  output += `Full content extraction of ${enhancedPages.length} pages. Average quality: ${avgQuality}/10.\n\n`;

  // Cluster pages for organization
  const clusteredPages = clusterPagesIntoCategories(enhancedPages);

  // Build a map of bodyContent from allDiscoveredPages for enrichment
  const bodyContentMap = new Map(
    allDiscoveredPages.filter(dp => dp.bodyContent).map(dp => [dp.url, dp.bodyContent])
  );

  clusteredPages.forEach((pages, category) => {
    output += `## ${category}\n\n`;

    const sequencedPages = intelligentPageSequencing(pages);
    for (const page of sequencedPages) {
      output += `### ${page.title}\n\n`;
      output += `**URL**: ${page.url}\n`;
      if (page.qualityScore) output += `**Quality Score**: ${page.qualityScore}/10\n`;
      output += `\n${page.description}\n\n`;
      // Sprint 15: Include actual page body content if available
      const pageBodyContent = page.bodyContent || bodyContentMap.get(page.url);
      if (pageBodyContent && pageBodyContent.length > 100) {
        output += `#### Content\n\n${pageBodyContent}\n\n`;
      }
      output += `---\n\n`;
    }
  });

  output += `## Optional\n\n`;
  output += `- [llms.txt Specification](https://llmstxt.org/): Official llmstxt.org format specification\n`;
  output += `- [llms.txt (standard version)](${baseUrl}/llms.txt): Compact summary version\n`;

  return output;
}

/**
 * Sprint 12: Generate llms-mini.txt format
 * Token-constrained minimal version — title, 2-sentence description, top 5 URLs
 */
function generateLlmMiniTxtContent(
  baseUrl: string,
  selectedPages: SelectedPage[],
  allDiscoveredPages: DiscoveredPage[] = [],
  analysisMetadata: any = {}
): string {
  const siteName = new URL(baseUrl).hostname.replace(/^www\./, '');
  const enhancedPages = differentiateIdenticalTitles(enhancePageDescriptions(selectedPages));

  // Sort by quality score descending, take top 5
  const topPages = [...enhancedPages]
    .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
    .slice(0, 5);

  // Generate concise 2-sentence summary
  const siteSummary = generateSiteSummary(baseUrl, enhancedPages, allDiscoveredPages);
  const shortSummary = siteSummary.split('.').slice(0, 2).join('.') + '.';

  let output = `# ${siteName}\n\n`;
  output += `> ${shortSummary}\n\n`;
  output += `## Resources\n\n`;

  for (const page of topPages) {
    // Truncate description to 80 chars for mini format
    const shortDesc = page.description.length > 80
      ? page.description.substring(0, 77) + '...'
      : page.description;
    output += `- [${page.title}](${page.url}): ${shortDesc}\n`;
  }

  return output;
}

// Helper function to get today's usage (imported from usage service)
import { getTodayUsage } from './services/usage';
