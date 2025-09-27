import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { urlAnalysisSchema, insertSitemapAnalysisSchema, insertLlmTextFileSchema, emailCaptureSchema, DiscoveredPage, SelectedPage, UserTier, users, usageTracking } from "@shared/schema";
import { fetchSitemap } from "./services/sitemap";
import { analyzeDiscoveredPagesWithCache } from "./services/sitemap-enhanced";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { checkUsageLimits, trackUsage, getUserTier, estimateAnalysisCost, checkCoffeeCredits, consumeCoffeeCredit, getUserTierFromAuth, getTodayUsage, resolveUserFromEmail } from "./services/usage";
import { authStorage } from "./services/auth-storage";
import { TIER_LIMITS } from "./services/cache";
import { apiLimiter, analysisLimiter, fileGenerationLimiter, emailCaptureLimiter } from "./middleware/rate-limit";
import { smartBotProtection } from "./middleware/smart-bot-protection";
import { optionalAuth } from "./middleware/auth";
import { registerStripeRoutes } from "./routes/stripe";
import { registerCancellationRoutes } from "./routes/cancellation";
import authRoutes from "./routes/auth";
import featureFlagRoutes from "./routes/feature-flags";
import abTestingRoutes from "./routes/ab-testing";
import semanticMonitoringRoutes from "./routes/semantic-monitoring";
import simpleUsageRoutes from "./routes/simple-usage";
import { incrementSimpleUsage, getSimpleUsage } from "./services/simple-tracker";
import { connectionPool } from "./services/connection-pool";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply smart bot protection to all routes for intelligent bot detection
  app.use(smartBotProtection);
  
  // Register authentication routes
  app.use("/api/auth", authRoutes);
  
  // Register feature flag routes
  app.use("/api/feature-flags", optionalAuth, featureFlagRoutes);
  app.use("/api/admin", featureFlagRoutes);
  
  // Register A/B testing routes
  app.use("/api/ab-testing", abTestingRoutes);
  app.use("/api/admin/ab-testing", abTestingRoutes);
  
  // Register semantic monitoring routes
  app.use("/api/semantic/metrics", semanticMonitoringRoutes);
  app.use("/api/semantic", semanticMonitoringRoutes);
  
  // Register simple usage tracking routes (robust fallback)
  app.use(simpleUsageRoutes);
  
  // Debug tier lookup (temporary endpoint) - PRODUCTION PROTECTED
  app.post("/api/debug-tier", async (req, res) => {
    // CRITICAL SECURITY: Block debug endpoints in production
    if (process.env.NODE_ENV === 'production') {
      console.warn(`🚨 SECURITY: Blocked debug endpoint access in production from ${req.ip}`);
      return res.status(404).json({ message: 'Not found' });
    }
    
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
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
        emailCapture: emailCapture ? {
          tier: emailCapture.tier,
          email: emailCapture.email,
          createdAt: emailCapture.createdAt,
          updatedAt: emailCapture.updatedAt
        } : null,
        debug: {
          timestamp: new Date().toISOString(),
          storageType: typeof storage
        }
      });
      
    } catch (error) {
      console.error("Debug tier error:", error);
      res.status(500).json({ 
        message: "Failed to debug tier", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Debug usage tracking - comprehensive database state check - PRODUCTION PROTECTED
  app.post("/api/debug-usage-tracking", async (req, res) => {
    // CRITICAL SECURITY: Block debug endpoints in production
    if (process.env.NODE_ENV === 'production') {
      console.warn(`🚨 SECURITY: Blocked debug endpoint access in production from ${req.ip}`);
      return res.status(404).json({ message: 'Not found' });
    }
    
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
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
          .where(and(
            eq(usageTracking.userId, emailCapture.userId),
            eq(usageTracking.date, today)
          ))
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
          emailCapture: emailCapture ? {
            id: emailCapture.id,
            userId: emailCapture.userId,
            tier: emailCapture.tier,
            createdAt: emailCapture.createdAt
          } : null,
          userInUsersTable: userInUsersTable ? {
            id: userInUsersTable.id,
            username: userInUsersTable.username
          } : null,
          usageRecord: usageRecord ? {
            id: usageRecord.id,
            userId: usageRecord.userId,
            date: usageRecord.date,
            analysesCount: usageRecord.analysesCount,
            pagesProcessed: usageRecord.pagesProcessed,
            cacheHits: usageRecord.cacheHits
          } : null,
          resolvedUserId,
          todayUsage: todayUsage ? {
            analysesCount: todayUsage.analysesCount,
            pagesProcessed: todayUsage.pagesProcessed,
            cacheHits: todayUsage.cacheHits
          } : null
        }
      });
      
    } catch (error) {
      console.error("Debug usage tracking error:", error);
      res.status(500).json({ 
        message: "Failed to debug usage tracking", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manual Coffee tier fix for existing customers (temporary endpoint) - PRODUCTION PROTECTED
  app.post("/api/fix-coffee-tier", async (req, res) => {
    // CRITICAL SECURITY: Block debug endpoints in production
    if (process.env.NODE_ENV === 'production') {
      console.warn(`🚨 SECURITY: Blocked debug endpoint access in production from ${req.ip}`);
      return res.status(404).json({ message: 'Not found' });
    }
    
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }
      
      // Update email capture to Coffee tier
      const existingCapture = await storage.getEmailCapture(email);
      if (existingCapture) {
        await storage.updateEmailCapture(email, { tier: 'coffee' });
        console.log(`Manually updated ${email} to Coffee tier`);
        res.json({ 
          message: "Successfully updated to Coffee tier",
          tier: 'coffee',
          previousTier: existingCapture.tier
        });
      } else {
        // Create new Coffee tier email capture
        await storage.createEmailCapture({
          email,
          tier: 'coffee',
          websiteUrl: null
        });
        console.log(`Created Coffee tier record for ${email}`);
        res.json({ 
          message: "Created Coffee tier record",
          tier: 'coffee',
          previousTier: 'none'
        });
      }
      
    } catch (error) {
      console.error("Coffee tier fix error:", error);
      res.status(500).json({ 
        message: "Failed to fix Coffee tier", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Email capture endpoint for freemium model
  app.post("/api/email-capture", emailCaptureLimiter, async (req, res) => {
    try {
      const emailData = emailCaptureSchema.parse(req.body);
      
      // Check if email already exists
      const existingCapture = await storage.getEmailCapture(emailData.email);
      if (existingCapture) {
        // CRITICAL FIX: Update tier to honor user's current selection
        const updatedCapture = await storage.updateEmailCapture(emailData.email, {
          tier: emailData.tier || 'starter',
          websiteUrl: emailData.websiteUrl
        });
        
        console.log(`🔄 Updated existing email ${emailData.email} tier: ${existingCapture.tier} → ${emailData.tier}`);
        
        return res.json({ 
          message: "Email tier updated", 
          capture: updatedCapture,
          tier: emailData.tier || 'starter'
        });
      }
      
      // Create new email capture with submitted tier
      const capture = await storage.createEmailCapture({
        ...emailData,
        tier: emailData.tier || 'starter' as any
      });
      
      console.log(`✅ Created new email capture for ${emailData.email} with tier: ${emailData.tier || 'starter'}`);
      
      res.json({ 
        message: "Email captured successfully", 
        capture,
        tier: emailData.tier || 'starter'
      });
    } catch (error) {
      console.error("Email capture error:", error);
      res.status(400).json({ 
        message: "Failed to capture email", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Check usage limits before analysis - SIMPLIFIED
  app.post("/api/check-limits", async (req, res) => {
    try {
      const { email, url } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
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
        reason: allowed ? null : `Daily limit reached (${simpleUsage.count}/${tierLimits.dailyAnalyses} analyses)`,
        pageCount,
        tier,
        limits: {
          dailyAnalyses: tierLimits.dailyAnalyses,
          maxPagesPerAnalysis: tierLimits.maxPagesPerAnalysis,
          aiPagesLimit: tierLimits.aiPagesLimit
        },
        currentUsage: {
          analysesToday: simpleUsage.count
        },
        estimatedCost: 0,
        suggestedUpgrade: allowed ? null : 'coffee'
      });
    } catch (error) {
      console.error("Limit check error:", error);
      res.status(500).json({ message: "Failed to check limits" });
    }
  });
  
  // Enhanced analyze endpoint with caching and tier support
  app.post("/api/analyze", analysisLimiter, optionalAuth, async (req, res) => {
    try {
      const { url, force = false, email } = z.object({
        url: z.string(),
        force: z.boolean().optional().default(false),
        email: z.string().optional()
      }).parse(req.body);
      
      // Get user information (authenticated or email-based)
      const user = req.user;
      
      // CRITICAL FIX: Properly handle authenticated users
      let userEmail: string;
      if (user?.email) {
        // User is authenticated via JWT - use their verified email
        userEmail = user.email;
        console.log(`🔐 Authenticated user analyzing: ${userEmail} (tier: ${user.tier})`);
      } else if (email) {
        // Unauthenticated request - verify email ownership
        const emailCapture = await storage.getEmailCapture(email);
        if (!emailCapture) {
          console.warn(`🚨 SECURITY: Attempt to analyze as unverified email ${email} from ${req.ip}`);
          return res.status(403).json({ 
            message: "Email not found. Please sign up first or log in to analyze websites." 
          });
        }
        
        // Check if email capture is recent (within 24 hours) to prevent old email abuse
        // Skip this check for users who have created accounts (userId exists)
        if (!emailCapture.userId) {
          const emailAge = emailCapture.createdAt ? 
            Date.now() - new Date(emailCapture.createdAt).getTime() : 
            Date.now();
          const maxEmailAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (emailAge > maxEmailAge) {
            console.warn(`🚨 SECURITY: Attempt to use stale email capture ${email} (${Math.floor(emailAge / 1000 / 60 / 60)}h old) from ${req.ip}`);
            return res.status(403).json({ 
              message: "Email verification expired. Please sign up again to analyze websites." 
            });
          }
        }
        
        userEmail = email;
        console.log(`📧 Email-based user analyzing: ${userEmail} (tier: ${emailCapture.tier})`);
      } else {
        userEmail = '';
      }
      
      if (!userEmail) {
        return res.status(400).json({ 
          message: "Email required for analysis. Please sign up first." 
        });
      }
      
      // Get user tier (prioritize authenticated user data)
      const tier = await getUserTierFromAuth(user, userEmail);
      
      // Normalize URL
      const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      
      // Quick page count check
      const sitemapResult = await fetchSitemap(normalizedUrl);
      const pageCount = sitemapResult.entries.length;
      
      // Check usage limits (for non-authenticated users or non-coffee tier)
      const usageCheck = await checkUsageLimits(userEmail, pageCount);
      if (!usageCheck.allowed) {
        return res.status(403).json({
          message: usageCheck.reason,
          currentUsage: usageCheck.currentUsage,
          limits: usageCheck.limits,
          suggestedUpgrade: usageCheck.suggestedUpgrade
        });
      }
      
      // For coffee tier users, check credits instead of daily limits
      if (tier === 'coffee') {
        console.log(`[ANALYZE] Coffee tier detected, user object:`, { 
          hasUser: !!user, 
          userId: user?.id, 
          userEmail: user?.email,
          userTier: user?.tier 
        });
        
        if (!user?.id) {
          console.error(`[ANALYZE] Coffee tier user but no user.id available`);
          return res.status(400).json({
            message: "Authentication required for Coffee tier. Please log in again.",
            tier: 'coffee'
          });
        }
        
        console.log(`[ANALYZE] Checking Coffee tier credits for user ${user.email} (id: ${user.id})`);
        const creditCheck = await checkCoffeeCredits(user.id.toString());
        console.log(`[ANALYZE] Credit check result:`, creditCheck);
        if (!creditCheck.hasCredits) {
          return res.status(403).json({
            message: "No coffee credits remaining. Purchase more credits or upgrade to Growth tier for unlimited analyses.",
            currentCredits: creditCheck.creditsRemaining,
            tier: 'coffee',
            suggestedUpgrade: 'growth'
          });
        }
      }
      
      // Check if already analyzing (to prevent duplicate analysis)
      const existingAnalysis = await storage.getAnalysisByUrl(normalizedUrl);
      if (existingAnalysis && existingAnalysis.status === "analyzing") {
        return res.json({ 
          analysisId: existingAnalysis.id,
          status: "analyzing"
        });
      }

      // If force flag is not set and we have a completed analysis, return it
      if (!force && existingAnalysis && existingAnalysis.status === "completed") {
        // Check if it's recent enough based on tier cache duration
        const analysisAge = existingAnalysis.createdAt ? 
          Date.now() - new Date(existingAnalysis.createdAt).getTime() : 
          Date.now();
        const maxAge = TIER_LIMITS[tier].cacheDurationDays * 24 * 60 * 60 * 1000;
        
        if (analysisAge < maxAge) {
          // ULTRA-SIMPLE: Just increment for cached results too
          const newCount = await incrementSimpleUsage(userEmail, tier);
          console.log(`📊 [USAGE] Cached result for ${userEmail}. Daily count: ${newCount}`);
          
          return res.json({ 
            analysisId: existingAnalysis.id,
            status: "completed",
            discoveredPages: existingAnalysis.discoveredPages,
            fromCache: true
          });
        }
      }

      // Create new analysis record
      const analysis = await storage.createAnalysis({
        url: normalizedUrl,
        status: "analyzing",
        sitemapContent: null,
        discoveredPages: [],
        // Store user email for tracking
        analysisMetadata: { userEmail: userEmail } as any
      });

      // Start analysis process (async with proper error handling)
      // Pass user.id for Coffee tier credit consumption
      analyzeWebsiteEnhanced(analysis.id, normalizedUrl, userEmail, tier, user?.id?.toString())
        .catch(error => {
          console.error(`🚨 CRITICAL: Unhandled analysis error for ${normalizedUrl}:`, error);
          // Ensure the analysis is marked as failed even on unhandled errors
          storage.updateAnalysis(analysis.id, {
            status: "failed",
            discoveredPages: [],
            analysisMetadata: {
              siteType: "unknown",
              sitemapFound: false,
              analysisMethod: "error",
              message: "Analysis failed due to unexpected error",
              totalPagesFound: 0,
              userEmail: userEmail,
              tier,
              error: error.message
            }
          }).catch(updateError => {
            console.error(`🚨 CRITICAL: Failed to update analysis status:`, updateError);
          });
          
          // Track usage even for completely failed analyses
          trackUsage(userEmail, 0, 0, 0, 0, 0).catch(trackError => {
            console.error(`🚨 CRITICAL: Failed to track usage for failed analysis:`, trackError);
          });
        });

      res.json({ 
        analysisId: analysis.id,
        status: "analyzing",
        estimatedDuration: Math.min(300, pageCount * 0.5), // 0.5 seconds per page estimate
        pageCount: Math.min(pageCount, TIER_LIMITS[tier].maxPagesPerAnalysis)
      });
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to analyze website"
      });
    }
  });

  // Get analysis status and results with metrics
  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      const analysis = await storage.getAnalysis(analysisId);
      
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      const response: any = {
        id: analysis.id,
        url: analysis.url,
        status: analysis.status,
        discoveredPages: analysis.discoveredPages || [],
        siteType: analysis.analysisMetadata?.siteType || "unknown",
        sitemapFound: analysis.analysisMetadata?.sitemapFound || false,
        analysisMethod: analysis.analysisMetadata?.analysisMethod || "unknown",
        message: analysis.analysisMetadata?.message || "Analysis completed",
        totalPagesFound: analysis.analysisMetadata?.totalPagesFound || 0
      };
      
      // Include metrics if available
      if (analysis.analysisMetadata?.metrics) {
        response.metrics = analysis.analysisMetadata.metrics;
      }
      
      res.json(response);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ message: "Failed to get analysis" });
    }
  });

  // Usage statistics endpoint - SIMPLIFIED
  app.get("/api/usage/:email", async (req, res) => {
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
      
      // CRITICAL FIX: Get credits for Coffee tier users
      let creditsRemaining = 0;
      if (tier === 'coffee') {
        try {
          // Check auth_users table for credits
          const authUser = await authStorage.getUserByEmail(email);
          if (authUser && authUser.tier === 'coffee') {
            creditsRemaining = authUser.creditsRemaining || 0;
            console.log(`[USAGE API] Coffee tier user ${email} has ${creditsRemaining} credits`);
          }
        } catch (e) {
          console.debug('Could not fetch coffee credits:', e);
        }
      }
      
      const limits = TIER_LIMITS[tier];
      
      const responseData = {
        tier,
        usage: {
          analysesToday: simpleUsage.count,
          pagesProcessedToday: pagesProcessed,
          cacheHitsToday: cacheHits,
          costToday: cacheHits * 0.001 // Estimated cost saved
        },
        limits: {
          dailyAnalyses: limits.dailyAnalyses,
          maxPagesPerAnalysis: limits.maxPagesPerAnalysis,
          aiPagesLimit: limits.aiPagesLimit
        },
        features: limits.features
      };

      // Add credits for Coffee tier
      if (tier === 'coffee') {
        responseData.creditsRemaining = creditsRemaining;
      }
      
      res.json(responseData);
    } catch (error) {
      console.error("Get usage error:", error);
      // ALWAYS return something valid
      res.json({
        tier: 'starter',
        usage: { analysesToday: 0 },
        limits: { dailyAnalyses: 3, maxPagesPerAnalysis: 20, aiPagesLimit: 20 },
        features: {}
      });
    }
  });

  // Version endpoint to check deployment status
  app.get("/api/version", (req, res) => {
    res.json({
      version: "2.0.0-enhanced",
      features: {
        blockquoteSummary: true,
        dynamicClustering: true,
        semanticTags: true,
        intelligentSequencing: true,
        enhancedMetadata: true,
        contentQuality: true
      },
      deployedAt: new Date().toISOString(),
      debugMode: true,
      message: "Enhanced LLMs.txt generation with all 6 phases active"
    });
  });

  // Keep existing endpoints
  app.post("/api/generate-llm-file", fileGenerationLimiter, async (req, res) => {
    try {
      const { analysisId, selectedPages } = z.object({
        analysisId: z.number(),
        selectedPages: z.array(z.object({
          url: z.string(),
          title: z.string(),
          description: z.string(),
          selected: z.boolean()
        }))
      }).parse(req.body);

      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      // Filter only selected pages
      const selectedOnly = selectedPages.filter(page => page.selected);
      const excludedPages = selectedPages.filter(page => !page.selected);
      
      // Generate LLM.txt content with analysis metadata
      const llmContent = generateLlmTxtContent(
        analysis.url, 
        selectedOnly, 
        excludedPages, 
        analysis.discoveredPages || [], 
        { ...analysis.analysisMetadata, analysisId }
      );

      // Save generated file
      const llmFile = await storage.createLlmFile({
        analysisId,
        selectedPages: selectedOnly,
        content: llmContent
      });

      res.json({
        id: llmFile.id,
        content: llmContent,
        pageCount: selectedOnly.length,
        fileSize: Buffer.byteLength(llmContent, 'utf8')
      });
    } catch (error) {
      console.error("Generate file error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to generate LLM.txt file"
      });
    }
  });

  // Get LLM file data
  app.get("/api/llm-file/:id", async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const llmFile = await storage.getLlmFile(fileId);
      
      if (!llmFile) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json({
        id: llmFile.id,
        content: llmFile.content,
        pageCount: llmFile.selectedPages?.length || 0,
        fileSize: Buffer.byteLength(llmFile.content, 'utf8')
      });
    } catch (error) {
      console.error("Get file error:", error);
      res.status(500).json({ message: "Failed to get file data" });
    }
  });

  // Download LLM.txt file
  app.get("/api/download/:id", async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const llmFile = await storage.getLlmFile(fileId);
      
      if (!llmFile) {
        return res.status(404).json({ message: "File not found" });
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="llms.txt"');
      res.send(llmFile.content);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Connection pool monitoring endpoint
  app.get("/api/admin/connection-pool-stats", async (req, res) => {
    try {
      // Simple security check for production
      if (process.env.NODE_ENV === 'production') {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }
      
      const stats = connectionPool.getStats();
      res.json({
        connectionPool: stats,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error("Connection pool stats error:", error);
      res.status(500).json({ message: "Failed to get connection pool stats" });
    }
  });

  // Register Stripe payment routes
  registerStripeRoutes(app);
  
  // Register cancellation and refund routes
  registerCancellationRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}

// Enhanced website analysis with caching and tier support
async function analyzeWebsiteEnhanced(
  analysisId: number, 
  url: string, 
  userEmail: string,
  tier: UserTier,
  authUserId?: string
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
      performAnalysisWithTimeout(analysisId, url, userEmail, tier, authUserId),
      timeoutPromise
    ]);
  } catch (error) {
    console.error("Website analysis failed:", error);
    
    // CRITICAL FIX: Track usage even for exception-based failures to prevent unlimited retries
    await trackUsage(
      userEmail,
      0, // No pages processed
      0, // No AI calls
      0, // No HTML extractions
      0, // No cache hits
      0  // No cost
    );
    
    await storage.updateAnalysis(analysisId, {
      status: "failed",
      discoveredPages: [],
      analysisMetadata: {
        siteType: "unknown",
        sitemapFound: false,
        analysisMethod: "error",
        message: error.message || "Analysis failed due to unexpected error",
        totalPagesFound: 0,
        userEmail,
        tier,
        error: error.message
      }
    });
  }
}

// Separate function to perform the actual analysis
async function performAnalysisWithTimeout(
  analysisId: number, 
  url: string, 
  userEmail: string,
  tier: UserTier,
  authUserId?: string
) {
  try {
    const startTime = Date.now();
    
    // Fetch and parse sitemap
    console.log(`Starting sitemap analysis for ${url}`);
    const sitemapResult = await fetchSitemap(url);
    console.log(`Sitemap result: found=${sitemapResult.sitemapFound}, method=${sitemapResult.analysisMethod}, entries=${sitemapResult.entries.length}`);
    
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
        0  // No cost
      );
      
      await storage.updateAnalysis(analysisId, {
        status: "failed",
        discoveredPages: [],
        analysisMetadata: {
          siteType: "unknown",
          sitemapFound: false,
          analysisMethod: sitemapResult.analysisMethod,
          message: sitemapResult.message || "No pages could be discovered for analysis",
          totalPagesFound: 0,
          userEmail,
          tier
        }
      });
      return; // Exit early to prevent infinite loop
    }
    
    // Determine site type
    const siteType = determineSiteType(sitemapResult);
    
    // Update analysis with sitemap data
    await storage.updateAnalysis(analysisId, {
      sitemapContent: sitemapResult.entries,
      status: "processing"
    });

    // Analyze pages with smart caching
    console.log(`Starting page analysis for ${sitemapResult.entries.length} pages`);
    const { pages, metrics } = await analyzeDiscoveredPagesWithCache(
      sitemapResult.entries,
      userEmail,
      tier
    );
    console.log(`Page analysis completed: ${pages.length} pages analyzed, ${metrics.aiCallsUsed} AI calls, ${metrics.cachedPages} cached`);
    
    // ULTRA-SIMPLE TRACKING: Just increment the counter
    const newCount = await incrementSimpleUsage(userEmail, tier);
    console.log(`📊 [USAGE] Analysis ${analysisId} completed for ${userEmail}. Daily count: ${newCount}`);
    
    // Keep the complex tracking for backwards compatibility but don't rely on it
    trackUsage(
      userEmail,
      metrics.analyzedPages + metrics.cachedPages,
      metrics.aiCallsUsed,
      metrics.htmlExtractionsUsed,
      metrics.cachedPages,
      metrics.estimatedCost
    ).catch(error => {
      // Silently fail - we don't care if complex tracking fails
      console.debug(`[USAGE] Complex tracking failed (ignored):`, error.message);
    });
    
    // Consume coffee credit if user is on coffee tier
    if (tier === 'coffee') {
      try {
        console.log(`[CREDIT] Consuming coffee credit for ${userEmail}`);
        
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
            console.log(`[CREDIT] Successfully consumed 1 credit for ${userEmail} (userId: ${userId})`);
          } else {
            console.error(`[CREDIT] Failed to consume credit for ${userEmail} (userId: ${userId}) - user may be out of credits`);
          }
        }
      } catch (error) {
        // Don't fail the analysis if credit consumption fails
        console.error(`[CREDIT] Credit consumption failed for ${userEmail}:`, error);
      }
    }
    
    // Update analysis with results and metrics
    await storage.updateAnalysis(analysisId, {
      discoveredPages: pages,
      status: "completed",
      analysisMetadata: {
        siteType,
        sitemapFound: sitemapResult.sitemapFound,
        analysisMethod: sitemapResult.analysisMethod,
        message: sitemapResult.message,
        totalPagesFound: sitemapResult.entries.length,
        userEmail,
        tier,
        metrics,
        processingTime: (Date.now() - startTime) / 1000
      }
    });

    console.log(`Analysis completed for ${url}: ${metrics.totalPages} pages (${metrics.cachedPages} cached, ${metrics.analyzedPages} analyzed)`);

  } catch (error) {
    console.error("Website analysis failed:", error);
    
    // CRITICAL FIX: Track usage even for exception-based failures to prevent unlimited retries
    await trackUsage(
      userEmail,
      0, // No pages processed
      0, // No AI calls
      0, // No HTML extractions
      0, // No cache hits
      0  // No cost
    );
    
    await storage.updateAnalysis(analysisId, {
      status: "failed",
      discoveredPages: [],
      analysisMetadata: {
        siteType: "unknown",
        sitemapFound: false,
        analysisMethod: "error",
        message: error.message || "Analysis failed due to unexpected error",
        totalPagesFound: 0,
        userEmail,
        tier,
        error: error.message
      }
    });
  }
}

function determineSiteType(sitemapResult: any): "single-page" | "multi-page" | "unknown" {
  if (sitemapResult.analysisMethod === "homepage-only") {
    return "single-page";
  }
  if (sitemapResult.entries.length === 1) {
    return "single-page";
  }
  if (sitemapResult.entries.length > 1) {
    return "multi-page";
  }
  return "unknown";
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
  
  // Content type tags
  if (url.includes('/blog') || url.includes('/article') || url.includes('/post') || 
      title.includes('blog') || content.includes('article')) {
    tags.push('[article]');
  } else if (url.includes('/product') || url.includes('/shop') || 
             content.includes('product') || content.includes('buy') || content.includes('purchase')) {
    tags.push('[product]');
  } else if (url.includes('/tool') || url.includes('/calculator') || url.includes('/converter') ||
             content.includes('calculator') || content.includes('tool') || content.includes('converter')) {
    tags.push('[tool]');
  } else if (url.includes('/guide') || url.includes('/tutorial') || url.includes('/how-to') ||
             content.includes('guide') || content.includes('tutorial') || content.includes('how to')) {
    tags.push('[guide]');
  } else if (url.includes('/api') || url.includes('/docs') || url.includes('/documentation') ||
             content.includes('api') || content.includes('documentation')) {
    tags.push('[api-doc]');
  } else if (url === '/' || url.includes('/home') || url.includes('/index') ||
             title.includes('home') || title.includes('welcome')) {
    tags.push('[landing]');
  } else if (url.includes('/category') || url.includes('/section') || 
             content.includes('category') || content.includes('section')) {
    tags.push('[category]');
  }
  
  // Interaction tags
  if (content.includes('form') || content.includes('submit') || content.includes('contact') ||
      url.includes('/contact') || url.includes('/form')) {
    tags.push('[form]');
  } else if (content.includes('calculator') || content.includes('interactive') || 
             content.includes('simulator') || url.includes('/calc')) {
    tags.push('[interactive]');
  } else if (content.includes('calculate') && !tags.includes('[interactive]')) {
    tags.push('[calculator]');
  } else {
    tags.push('[static]');
  }
  
  // Purpose tags
  if (content.includes('learn') || content.includes('education') || content.includes('tutorial') ||
      content.includes('course') || content.includes('training')) {
    tags.push('[educational]');
  } else if (content.includes('buy') || content.includes('purchase') || content.includes('order') ||
             content.includes('checkout') || content.includes('pricing')) {
    tags.push('[transactional]');
  } else if (content.includes('about') || content.includes('information') || content.includes('overview') ||
             content.includes('details') || url.includes('/about')) {
    tags.push('[informational]');
  } else if (content.includes('navigate') || content.includes('menu') || content.includes('directory') ||
             url.includes('/sitemap') || url.includes('/directory')) {
    tags.push('[navigational]');
  }
  
  // Technical tags
  if (content.includes('login') || content.includes('signin') || content.includes('account') ||
      content.includes('dashboard') || url.includes('/login') || url.includes('/account')) {
    tags.push('[requires-auth]');
  } else {
    tags.push('[public]');
  }
  
  if (content.includes('beta') || content.includes('preview') || content.includes('experimental') ||
      url.includes('/beta') || url.includes('/preview')) {
    tags.push('[beta]');
  }
  
  if (content.includes('deprecated') || content.includes('obsolete') || content.includes('legacy') ||
      url.includes('/deprecated') || url.includes('/legacy')) {
    tags.push('[deprecated]');
  }
  
  // Remove duplicates and limit to most relevant tags
  const uniqueTags = [...new Set(tags)];
  
  // Prioritize tags: content type > interaction > purpose > technical
  const priorityOrder = ['[article]', '[product]', '[tool]', '[guide]', '[api-doc]', '[landing]', '[category]',
                        '[interactive]', '[form]', '[calculator]', '[static]',
                        '[educational]', '[transactional]', '[informational]', '[navigational]',
                        '[requires-auth]', '[public]', '[beta]', '[deprecated]'];
  
  const sortedTags = uniqueTags.sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a);
    const bIndex = priorityOrder.indexOf(b);
    return (aIndex === -1 ? 1000 : aIndex) - (bIndex === -1 ? 1000 : bIndex);
  });
  
  // Return top 3 most relevant tags
  return sortedTags.slice(0, 3);
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
  if (semanticTags.includes('[landing]') || 
      url === '/' || url.includes('/home') || url.includes('/index') ||
      title.includes('home') || title.includes('welcome')) {
    return 100;
  }
  
  // Navigation hubs (category pages, section indexes) - Score 80
  if (semanticTags.includes('[category]') ||
      url.includes('/category') || url.includes('/section') || 
      url.includes('/products') || url.includes('/services') ||
      title.includes('category') || title.includes('section') ||
      description.includes('browse') || description.includes('explore')) {
    return 80;
  }
  
  // Core content (main products/services/articles) - Score 60
  if (semanticTags.includes('[product]') || semanticTags.includes('[tool]') ||
      semanticTags.includes('[article]') || semanticTags.includes('[api-doc]') ||
      url.includes('/product') || url.includes('/tool') || url.includes('/blog') ||
      url.includes('/api') || url.includes('/docs')) {
    return 60;
  }
  
  // Supporting content (help, FAQ, guides) - Score 40
  if (semanticTags.includes('[guide]') || semanticTags.includes('[educational]') ||
      url.includes('/help') || url.includes('/support') || url.includes('/faq') ||
      url.includes('/guide') || url.includes('/tutorial') ||
      title.includes('help') || title.includes('guide') || title.includes('tutorial')) {
    return 40;
  }
  
  // Auxiliary pages (legal, admin, archives) - Score 20
  if (url.includes('/legal') || url.includes('/privacy') || url.includes('/terms') ||
      url.includes('/admin') || url.includes('/archive') || url.includes('/old') ||
      title.includes('privacy') || title.includes('terms') || title.includes('legal') ||
      semanticTags.includes('[deprecated]')) {
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
    const segments = urlObj.pathname.split('/').filter(s => s.length > 0);
    return segments.length;
  } catch {
    return 999; // Invalid URLs go to end
  }
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
    '[deprecated]': -10
  };
  
  let maxScore = 0;
  tags.forEach(tag => {
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
  const enhancedPages = pages.map(page => ({ ...page }));
  
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
        const pageIndex = enhancedPages.findIndex(p => p.url === page.url);
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
 * Detects pages with duplicate or very similar descriptions
 */
function detectDuplicateDescriptions(pages: SelectedPage[]): Map<string, SelectedPage[]> {
  const descriptionMap = new Map<string, SelectedPage[]>();
  
  pages.forEach(page => {
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
    const pageSegments = pageUrl.pathname.split('/').filter(s => s.length > 0);
    
    allPages.forEach(otherPage => {
      if (otherPage.url === page.url) return; // Skip self
      
      try {
        const otherUrl = new URL(otherPage.url);
        const otherSegments = otherUrl.pathname.split('/').filter(s => s.length > 0);
        
        // Check for URL pattern relationships
        const hasCommonParent = pageSegments.length > 0 && otherSegments.length > 0 && 
                               pageSegments[0] === otherSegments[0];
        
        const isParentChild = pageSegments.length > 0 && otherSegments.length > 0 &&
                             (pageSegments.every((seg, i) => seg === otherSegments[i]) ||
                              otherSegments.every((seg, i) => seg === pageSegments[i]));
        
        // Check for content similarity
        const titleSimilarity = page.title && otherPage.title && 
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
    // No related pages, enhance with URL context to differentiate from duplicates
    try {
      const url = new URL(page.url);
      const segments = url.pathname.split('/').filter(s => s.length > 0);
      
      if (segments.length > 1) {
        const section = segments[segments.length - 2] || segments[0];
        const cleanSection = section.replace(/-/g, ' ').replace(/_/g, ' ');
        return `${originalDescription} (${cleanSection} section)`;
      } else if (segments.length === 1) {
        const section = segments[0].replace(/-/g, ' ').replace(/_/g, ' ');
        return `${originalDescription} (${section} page)`;
      }
    } catch {
      // If URL parsing fails, add generic context
      return `${originalDescription} (specific page content)`;
    }
  }
  
  // Add context based on relationships
  const relationships: string[] = [];
  
  relatedPages.forEach(relatedPage => {
    try {
      const pageUrl = new URL(page.url);
      const relatedUrl = new URL(relatedPage.url);
      const pageSegments = pageUrl.pathname.split('/').filter(s => s.length > 0);
      const relatedSegments = relatedUrl.pathname.split('/').filter(s => s.length > 0);
      
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
      const seeAlso = relatedPages.map(p => p.title || 'related page').join(', ');
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
  const homePage = selectedPages.find(p => {
    const url = new URL(p.url);
    return url.pathname === '/' || url.pathname === '';
  }) || allDiscoveredPages.find(p => {
    const url = new URL(p.url);
    return url.pathname === '/' || url.pathname === '';
  });

  // If we have a homepage with a good description, use it as the base
  if (homePage && homePage.description && homePage.description.length > 50) {
    // Enhance the homepage description with site-wide context
    const domain = new URL(baseUrl).hostname;
    const pageTypes = analyzePageTypes(selectedPages);
    const primaryContent = identifyPrimaryContent(selectedPages);
    
    let summary = homePage.description;
    
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
  
  // Fallback: Generate a summary from all available page data
  const domain = new URL(baseUrl).hostname;
  const pageCount = selectedPages.length;
  const categories = extractCategories(selectedPages);
  const pageTypes = analyzePageTypes(selectedPages);
  
  // Build a comprehensive summary from available data
  let summary = `${domain} is a comprehensive website featuring ${pageCount} pages`;
  
  if (categories.length > 0) {
    summary += ` covering ${categories.slice(0, 3).join(', ')}`;
    if (categories.length > 3) {
      summary += ` and ${categories.length - 3} more categories`;
    }
  }
  
  if (pageTypes.length > 0) {
    summary += `. The site provides ${pageTypes.join(', ')}`;
  }
  
  summary += ', serving users with organized, accessible content optimized for both human readers and AI systems.';
  
  return summary;
}

/**
 * Analyzes the types of pages present on the site
 */
function analyzePageTypes(pages: SelectedPage[]): string[] {
  const types = new Set<string>();
  
  pages.forEach(page => {
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
  
  pages.forEach(page => {
    const content = `${page.title} ${page.description}`.toLowerCase();
    
    // Common themes to detect
    const themeKeywords = {
      'financial services': ['finance', 'investment', 'banking', 'mortgage', 'loan'],
      'educational content': ['learn', 'tutorial', 'guide', 'course', 'education'],
      'software tools': ['tool', 'calculator', 'converter', 'generator', 'analyzer'],
      'e-commerce': ['product', 'shop', 'buy', 'cart', 'checkout'],
      'technical documentation': ['api', 'sdk', 'library', 'framework', 'developer'],
      'news and articles': ['news', 'article', 'blog', 'story', 'update'],
      'community resources': ['forum', 'community', 'discussion', 'support', 'help']
    };
    
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      keywords.forEach(keyword => {
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
  
  pages.forEach(page => {
    // Extract from URL path segments
    const url = new URL(page.url);
    const segments = url.pathname.split('/').filter(s => s.length > 0);
    
    if (segments.length > 0) {
      // First segment often indicates category
      const category = segments[0]
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .toLowerCase();
      
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
  const depths = pages.map(page => getUrlDepth(page.url)).filter(d => d < 999);
  const clusters = clusterPagesIntoCategories(pages);
  
  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
  const avgDepth = depths.length > 0 ? Math.round((depths.reduce((a, b) => a + b, 0) / depths.length) * 10) / 10 : 0;
  
  return {
    maxDepth,
    avgDepth,
    clusterCount: clusters.size,
    depthDistribution: getDepthDistribution(depths),
    largestClusterSize: Math.max(...Array.from(clusters.values()).map(cluster => cluster.length))
  };
}

/**
 * Gets the most common semantic tags across all pages
 */
function getCommonSemanticTags(pages: SelectedPage[]): string[] {
  const tagCounts = new Map<string, number>();
  
  pages.forEach(page => {
    const tags = generateSemanticTags(page);
    tags.forEach(tag => {
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
  
  pages.forEach(page => {
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
    hasBetaFeatures
  };
}

/**
 * Gets distribution of URL depths
 */
function getDepthDistribution(depths: number[]): Record<number, number> {
  const distribution: Record<number, number> = {};
  depths.forEach(depth => {
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
  
  pages.forEach(page => {
    try {
      const url = new URL(page.url);
      const segments = url.pathname.split('/').filter(s => s.length > 0);
      
      // Determine cluster based on URL structure
      let clusterKey = 'General Content';
      
      if (segments.length === 0 || (segments.length === 1 && segments[0] === 'index.html')) {
        clusterKey = 'Main Pages';
      } else if (segments.length > 0) {
        // Use the first meaningful segment as the initial cluster
        const firstSegment = segments[0].toLowerCase();
        
        // Map common URL patterns to readable categories
        const categoryMappings: Record<string, string> = {
          'blog': 'Blog & Articles',
          'posts': 'Blog & Articles',
          'articles': 'Blog & Articles',
          'news': 'News & Updates',
          'products': 'Products & Services',
          'services': 'Products & Services',
          'docs': 'Documentation',
          'documentation': 'Documentation',
          'api': 'API Reference',
          'guides': 'Guides & Tutorials',
          'tutorials': 'Guides & Tutorials',
          'about': 'About & Company',
          'company': 'About & Company',
          'team': 'About & Company',
          'support': 'Support & Help',
          'help': 'Support & Help',
          'faq': 'Support & Help',
          'tools': 'Tools & Utilities',
          'calculators': 'Tools & Utilities',
          'resources': 'Resources',
          'legal': 'Legal & Policies',
          'privacy': 'Legal & Policies',
          'terms': 'Legal & Policies',
          'pricing': 'Pricing & Plans',
          'contact': 'Contact & Support'
        };
        
        // Check if we have a mapping for this segment
        if (categoryMappings[firstSegment]) {
          clusterKey = categoryMappings[firstSegment];
        } else {
          // Create a readable category from the segment
          clusterKey = firstSegment
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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
function refineClustersByContent(clusters: Map<string, SelectedPage[]>): Map<string, SelectedPage[]> {
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
function subdivideByContent(pages: SelectedPage[], parentCategory: string): Map<string, SelectedPage[]> {
  const subclusters = new Map<string, SelectedPage[]>();
  
  // Analyze content patterns
  const contentPatterns = new Map<string, SelectedPage[]>();
  
  pages.forEach(page => {
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
    
    const key = subPattern === parentCategory ? parentCategory : `${parentCategory} - ${subPattern}`;
    
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
    'General Content'
  ];
  
  // Add categories in priority order
  categoryOrder.forEach(cat => {
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
  console.log('[DEBUG] generateLlmTxtContent called with:');
  console.log('[DEBUG] - baseUrl:', baseUrl);
  console.log('[DEBUG] - selectedPages count:', selectedPages.length);
  console.log('[DEBUG] - allDiscoveredPages count:', allDiscoveredPages.length);
  console.log('[DEBUG] - analysisMetadata keys:', Object.keys(analysisMetadata));
  
  const createdDate = new Date().toISOString().split('T')[0];
  const totalFound = analysisMetadata?.totalPagesFound || allDiscoveredPages.length;
  const analyzed = allDiscoveredPages.length;
  const excluded = excludedPages.length;
  
  // Phase 6: Apply content quality improvements before clustering
  console.log('[DEBUG] Phase 6: Enhancing page descriptions...');
  const enhancedPages = enhancePageDescriptions(selectedPages);
  console.log('[DEBUG] Enhanced pages count:', enhancedPages.length);
  
  // Generate comprehensive site summary (using enhanced pages)
  console.log('[DEBUG] Phase 1: Generating site summary...');
  const siteSummary = generateSiteSummary(baseUrl, enhancedPages, allDiscoveredPages);
  console.log('[DEBUG] Site summary generated:', siteSummary.substring(0, 100) + '...');
  
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
  
  console.log('[DEBUG] Building header with blockquote summary...');
  console.log('[DEBUG] Summary starts with:', siteSummary.substring(0, 50));
  const header = `# LLM.txt File for ${baseUrl}

> ${siteSummary}

# Generated by LLM.txt Mastery (https://llmtxt.com)
# Created: ${createdDate}
#
# === ANALYSIS SUMMARY ===
# Pages Found: ${totalFound} (discovered in sitemap and crawling)
# Pages Analyzed: ${analyzed} (successfully fetched and scored)
# Pages Included: ${enhancedPages.length} (selected for LLM.txt file)
# Pages Excluded: ${excluded} (filtered out during review)
#
# Note: ${totalFound - analyzed} pages were skipped due to access restrictions,
# errors during fetching, or content filtering (file downloads, admin pages, etc.)
#
# === ENHANCED METADATA ===
# Average Quality Score: ${avgQuality}/10 (${avgQuality >= 7 ? 'High' : avgQuality >= 5 ? 'Medium' : 'Improving'} overall quality)
# Estimated Total Content: ~${estimatedWordCount.toLocaleString()} words across all pages
# Site Architecture: ${siteStructure.clusterCount} content clusters, max depth ${siteStructure.maxDepth} levels
# Content Distribution: ${siteStructure.largestClusterSize} pages in largest cluster
# Common Content Types: ${commonTags.join(', ') || 'Mixed content'}
# Technical Features: ${techFeatures.length > 0 ? techFeatures.join(', ') : 'Standard web content'}
#
# === QUALITY SCORING REFERENCE ===
# Quality scores range from 1-10 based on AI analysis of:
# - Content relevance and depth (30%)
# - Technical documentation quality (25%)
# - SEO optimization and structure (20%)
# - Information architecture (15%)
# - User experience indicators (10%)
#
# Learn more about LLM.txt format: https://llmtxt.com/docs/format
# Understanding quality scores: https://llmtxt.com/docs/quality-scoring
#
# === INCLUDED PAGES ===
# The following pages were selected for inclusion based on quality scores
# and content relevance for AI/LLM understanding:

`;

  // Cluster pages into dynamic categories (using enhanced pages)
  console.log('[DEBUG] Phase 2: Clustering pages into categories...');
  const clusteredPages = clusterPagesIntoCategories(enhancedPages);
  console.log('[DEBUG] Clusters found:', clusteredPages.size);
  clusteredPages.forEach((pages, category) => {
    console.log(`[DEBUG] - Category "${category}": ${pages.length} pages`);
  });
  
  // Generate content with category headers and semantic tags
  let content = '';
  if (clusteredPages.size > 1) {
    // Multiple categories - organize by sections with intelligent sequencing within each cluster
    clusteredPages.forEach((pages, category) => {
      content += `\n## ${category}\n\n`;
      
      // Apply intelligent sequencing WITHIN this cluster
      const sequencedPages = intelligentPageSequencing(pages);
      
      content += sequencedPages
        .map(page => {
          const tags = generateSemanticTags(page);
          const tagString = tags.length > 0 ? `${tags.join(' ')} ` : '';
          const inlineMetadata = getInlinePageMetadata(page);
          return `${page.url}: ${page.title}${inlineMetadata} - ${tagString}${page.description}`;
        })
        .join('\n\n');
      content += '\n';
    });
  } else {
    // Single category or no clear categorization - apply intelligent sequencing to all pages
    const sequencedPages = intelligentPageSequencing(enhancedPages);
    content = sequencedPages
      .map(page => {
        const tags = generateSemanticTags(page);
        const tagString = tags.length > 0 ? `${tags.join(' ')} ` : '';
        const inlineMetadata = getInlinePageMetadata(page);
        return `${page.url}: ${page.title}${inlineMetadata} - ${tagString}${page.description}`;
      })
      .join('\n\n');
  }

  let excludedSection = '';
  if (excludedPages.length > 0) {
    excludedSection = `

# === EXCLUDED PAGES ===
# The following ${excluded} pages were excluded due to lower quality scores,
# content duplication, or limited relevance for AI understanding:
#
${excludedPages
  .slice(0, 20) // Limit to first 20 excluded pages to keep file manageable
  .map(page => `# ${page.url}: ${page.title}`)
  .join('\n')}${excluded > 20 ? `\n# ... and ${excluded - 20} more pages` : ''}
#
# === ANALYSIS DETAILS ===
# To review the complete analysis, quality scores, and make changes:
# https://llmtxt.com/analysis/${analysisMetadata?.analysisId || 'view'}
#
# For support or questions about this analysis:
# https://llmtxt.com/contact`;
  }

  const finalOutput = header + content + excludedSection;
  console.log('[DEBUG] Final output length:', finalOutput.length);
  console.log('[DEBUG] First 500 chars of output:');
  console.log(finalOutput.substring(0, 500));
  console.log('[DEBUG] Has blockquote?', finalOutput.includes('> '));
  console.log('[DEBUG] Has category headers?', finalOutput.includes('## '));
  
  return finalOutput;
}

// Helper function to get today's usage (imported from usage service)
import { getTodayUsage } from "./services/usage";