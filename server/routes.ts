import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { urlAnalysisSchema, insertSitemapAnalysisSchema, insertLlmTextFileSchema, emailCaptureSchema, DiscoveredPage, SelectedPage, UserTier } from "@shared/schema";
import { fetchSitemap } from "./services/sitemap";
import { analyzeDiscoveredPagesWithCache } from "./services/sitemap-enhanced";
import { storage } from "./storage";
import { checkUsageLimits, trackUsage, getUserTier, estimateAnalysisCost, checkCoffeeCredits, consumeCoffeeCredit, getUserTierFromAuth } from "./services/usage";
import { TIER_LIMITS } from "./services/cache";
import { apiLimiter, analysisLimiter, fileGenerationLimiter } from "./middleware/rate-limit";
import { optionalAuth } from "./middleware/auth";
import { registerStripeRoutes } from "./routes/stripe";
import authRoutes from "./routes/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Register authentication routes
  app.use("/api/auth", authRoutes);
  
  // Debug tier lookup (temporary endpoint)
  app.post("/api/debug-tier", async (req, res) => {
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

  // Manual Coffee tier fix for existing customers (temporary endpoint)
  app.post("/api/fix-coffee-tier", async (req, res) => {
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
  app.post("/api/email-capture", apiLimiter, async (req, res) => {
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
  
  // Check usage limits before analysis
  app.post("/api/check-limits", async (req, res) => {
    try {
      const { email, url } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }
      
      // Fetch sitemap to count pages
      const sitemapResult = await fetchSitemap(url);
      const pageCount = Math.min(sitemapResult.entries.length, 1000);
      
      // Check usage limits
      const usageCheck = await checkUsageLimits(email, pageCount);
      const tier = await getUserTier(email);
      const tierLimits = TIER_LIMITS[tier];
      
      // Estimate cost
      const estimatedCost = estimateAnalysisCost(pageCount, tier);
      
      res.json({
        allowed: usageCheck.allowed,
        reason: usageCheck.reason,
        pageCount,
        tier,
        limits: usageCheck.limits,
        currentUsage: usageCheck.currentUsage,
        estimatedCost,
        suggestedUpgrade: usageCheck.suggestedUpgrade
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
      const userEmail = user?.email || email;
      
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
        const creditCheck = await checkCoffeeCredits(user.id);
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
          // CRITICAL FIX: Track usage even for cached results to enforce limits
          await trackUsage(
            userEmail,
            existingAnalysis.discoveredPages?.length || 0,
            0, // No AI calls for cached results
            0, // No HTML extractions for cached results
            1, // This counts as a cache hit
            0  // No cost for cached results
          );
          
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
        analysisMetadata: { userEmail: email } as any
      });

      // Start analysis process (async with proper error handling)
      analyzeWebsiteEnhanced(analysis.id, normalizedUrl, email, tier)
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
              userEmail: email,
              tier,
              error: error.message
            }
          }).catch(updateError => {
            console.error(`🚨 CRITICAL: Failed to update analysis status:`, updateError);
          });
          
          // Track usage even for completely failed analyses
          trackUsage(email, 0, 0, 0, 0, 0).catch(trackError => {
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

  // Usage statistics endpoint
  app.get("/api/usage/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const tier = await getUserTier(email);
      const todayUsage = await getTodayUsage(email);
      const limits = TIER_LIMITS[tier];
      
      res.json({
        tier,
        usage: {
          analysesToday: todayUsage?.analysesCount || 0,
          pagesProcessedToday: todayUsage?.pagesProcessed || 0,
          cacheHitsToday: todayUsage?.cacheHits || 0,
          costToday: todayUsage?.totalCost || 0
        },
        limits: {
          dailyAnalyses: limits.dailyAnalyses,
          maxPagesPerAnalysis: limits.maxPagesPerAnalysis,
          aiPagesLimit: limits.aiPagesLimit
        },
        features: limits.features
      });
    } catch (error) {
      console.error("Get usage error:", error);
      res.status(500).json({ message: "Failed to get usage data" });
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
    
    // Track usage
    await trackUsage(
      userEmail,
      metrics.analyzedPages + metrics.cachedPages,
      metrics.aiCallsUsed,
      metrics.htmlExtractionsUsed,
      metrics.cachedPages,
      metrics.estimatedCost
    );
    
    // Consume coffee credit if user is on coffee tier
    // Note: Coffee tier credit consumption is handled in the payment flow
    // This is a placeholder for future credit-based analysis tracking
    if (tier === 'coffee') {
      console.log(`Coffee tier analysis completed for ${userEmail}`);
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