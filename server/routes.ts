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
import authRoutes from "./routes/auth";
import simpleUsageRoutes from "./routes/simple-usage";
import { incrementSimpleUsage, getSimpleUsage } from "./services/simple-tracker";
import { connectionPool } from "./services/connection-pool";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply smart bot protection to all routes for intelligent bot detection
  app.use(smartBotProtection);
  
  // Register authentication routes
  app.use("/api/auth", authRoutes);
  
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
      if (tier === 'coffee' && user?.id) {
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
      analyzeWebsiteEnhanced(analysis.id, normalizedUrl, userEmail, tier)
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

  const httpServer = createServer(app);
  return httpServer;
}

// Enhanced website analysis with caching and tier support
async function analyzeWebsiteEnhanced(
  analysisId: number, 
  url: string, 
  userEmail: string,
  tier: UserTier
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
      performAnalysisWithTimeout(analysisId, url, userEmail, tier),
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
  tier: UserTier
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
        
        // Resolve user ID from email
        const userId = await resolveUserFromEmail(userEmail);
        if (!userId) {
          console.error(`[CREDIT] Failed to resolve userId for ${userEmail}`);
        } else {
          // Consume one credit
          const creditConsumed = await consumeCoffeeCredit(userId.toString());
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
  
  const header = `# LLM.txt File for ${baseUrl}
# Generated by LLM.txt Mastery (https://llmtxt.com)
# Created: ${createdDate}
#
# === ANALYSIS SUMMARY ===
# Pages Found: ${totalFound} (discovered in sitemap and crawling)
# Pages Analyzed: ${analyzed} (successfully fetched and scored)
# Pages Included: ${selectedPages.length} (selected for LLM.txt file)
# Pages Excluded: ${excluded} (filtered out during review)
#
# Note: ${totalFound - analyzed} pages were skipped due to access restrictions,
# errors during fetching, or content filtering (file downloads, admin pages, etc.)
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

  const content = selectedPages
    .map(page => `${page.url}: ${page.title} - ${page.description}`)
    .join('\n\n');

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

  return header + content + excludedSection;
}

// Helper function to get today's usage (imported from usage service)
import { getTodayUsage } from "./services/usage";