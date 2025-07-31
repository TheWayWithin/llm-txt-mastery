import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { urlAnalysisSchema, insertSitemapAnalysisSchema, insertLlmTextFileSchema, emailCaptureSchema, DiscoveredPage, SelectedPage, UserTier } from "@shared/schema";
import { fetchSitemap } from "./services/sitemap";
import { analyzeDiscoveredPagesWithCache } from "./services/sitemap-enhanced";
import { storage } from "./storage";
import { checkUsageLimits, trackUsage, getUserTier, estimateAnalysisCost } from "./services/usage";
import { TIER_LIMITS } from "./services/cache";
import { requireAuth, optionalAuth } from "./middleware/auth";
import authRoutes from "./routes/auth";
import { trackAnalysisCompleted, triggerUpgradeSequence, isConvertKitConfigured, getConvertKitConfig } from "./services/convertkit";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.use('/api/auth', authRoutes);
  
  // ConvertKit configuration status endpoint
  app.get("/api/convertkit/status", async (req, res) => {
    try {
      const config = getConvertKitConfig();
      res.json({
        status: "success",
        config
      });
    } catch (error) {
      console.error("ConvertKit status error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get ConvertKit configuration"
      });
    }
  });
  
  // Email capture endpoint for freemium model
  app.post("/api/email-capture", async (req, res) => {
    try {
      const emailData = emailCaptureSchema.parse(req.body);
      
      // Check if email already exists
      const existingCapture = await storage.getEmailCapture(emailData.email);
      if (existingCapture) {
        return res.json({ 
          message: "Email already captured", 
          capture: existingCapture,
          tier: existingCapture.tier || 'starter'
        });
      }
      
      // Create new email capture with selected tier
      const capture = await storage.createEmailCapture({
        ...emailData,
        tier: emailData.tier as any // Use the selected tier
      });
      
      res.json({ 
        message: "Email captured successfully", 
        capture,
        tier: emailData.tier
      });
    } catch (error) {
      console.error("Email capture error:", error);
      res.status(400).json({ 
        message: "Failed to capture email", 
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
  app.post("/api/analyze", requireAuth, async (req, res) => {
    try {
      const { url, force = false } = z.object({
        url: z.string(),
        force: z.boolean().optional().default(false)
      }).parse(req.body);
      
      // Use authenticated user information
      const userEmail = req.user!.email;
      const tier = req.user!.tier;
      
      // Normalize URL
      const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      
      // Quick page count check
      const sitemapResult = await fetchSitemap(normalizedUrl);
      const pageCount = sitemapResult.entries.length;
      
      // Check usage limits
      const usageCheck = await checkUsageLimits(userEmail, pageCount);
      if (!usageCheck.allowed) {
        // Trigger upgrade sequence in ConvertKit if configured
        if (isConvertKitConfigured()) {
          try {
            let limitType: 'daily_analyses' | 'page_limit' | 'ai_limit' = 'page_limit';
            if (usageCheck.reason.includes('daily')) limitType = 'daily_analyses';
            if (usageCheck.reason.includes('AI')) limitType = 'ai_limit';
            
            await triggerUpgradeSequence(userEmail, tier, limitType);
          } catch (error) {
            console.error('ConvertKit upgrade sequence failed:', error);
          }
        }
        
        return res.status(403).json({
          message: usageCheck.reason,
          currentUsage: usageCheck.currentUsage,
          limits: usageCheck.limits,
          suggestedUpgrade: usageCheck.suggestedUpgrade
        });
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
        const analysisAge = Date.now() - new Date(existingAnalysis.createdAt).getTime();
        const maxAge = TIER_LIMITS[tier].cacheDurationDays * 24 * 60 * 60 * 1000;
        
        if (analysisAge < maxAge) {
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

      // Start analysis process (async)
      analyzeWebsiteEnhanced(analysis.id, normalizedUrl, userEmail, tier);

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
  app.post("/api/generate-llm-file", requireAuth, async (req, res) => {
    try {
      const { analysisId, selectedPages } = z.object({
        analysisId: z.number(),
        selectedPages: z.array(z.object({
          url: z.string(),
          title: z.string(),
          description: z.string(),
          selected: z.boolean(),
          category: z.string().optional(),
          qualityScore: z.number().optional()
        }))
      }).parse(req.body);

      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      // Filter only selected pages
      const selectedOnly = selectedPages.filter(page => page.selected);
      
      // Generate LLM.txt content
      const llmContent = generateLlmTxtContent(analysis.url, selectedOnly);

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
  app.get("/api/llm-file/:id", requireAuth, async (req, res) => {
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
  app.get("/api/download/:id", requireAuth, async (req, res) => {
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
  try {
    const startTime = Date.now();
    
    // Fetch and parse sitemap
    const sitemapResult = await fetchSitemap(url);
    
    // Determine site type
    const siteType = determineSiteType(sitemapResult);
    
    // Update analysis with sitemap data
    await storage.updateAnalysis(analysisId, {
      sitemapContent: sitemapResult.entries,
      status: "processing"
    });

    // Analyze pages with smart caching
    const { pages, metrics } = await analyzeDiscoveredPagesWithCache(
      sitemapResult.entries,
      userEmail,
      tier
    );
    
    // Track usage
    await trackUsage(
      userEmail,
      metrics.analyzedPages + metrics.cachedPages,
      metrics.aiCallsUsed,
      metrics.htmlExtractionsUsed,
      metrics.cachedPages,
      metrics.estimatedCost
    );
    
    // Track analysis completion in ConvertKit if configured
    if (isConvertKitConfigured()) {
      try {
        await trackAnalysisCompleted(userEmail, {
          url,
          pageCount: metrics.totalPages,
          tier,
          cacheHits: metrics.cachedPages,
          analysisTime: (Date.now() - startTime) / 1000
        });
      } catch (error) {
        console.error('ConvertKit analysis tracking failed:', error);
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
    await storage.updateAnalysis(analysisId, {
      status: "failed",
      discoveredPages: []
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

function generateLlmTxtContent(baseUrl: string, selectedPages: SelectedPage[]): string {
  // Extract domain name for summary
  const domain = new URL(baseUrl).hostname;
  const domainName = domain.replace('www.', '');
  
  // Generate enhanced header with metadata
  const header = `# ${domainName}

> AI-optimized website index with ${selectedPages.length} curated pages
> Content Type: Multi-section documentation | Generated: ${new Date().toISOString().split('T')[0]}
> Analysis: LLM.txt Mastery enhanced categorization

## Quick Context
- **Domain**: ${domain}
- **Pages Analyzed**: ${selectedPages.length} selected from comprehensive analysis
- **Organization**: Hierarchical sections for optimal AI navigation

`;

  // Group pages by category and sort by quality score
  const pagesByCategory = groupPagesByCategory(selectedPages);
  
  // Generate content sections
  const sections = [];
  
  // Define section order (high priority first)
  const sectionOrder = [
    'Essential', 'Documentation', 'API Reference', 'Tutorial', 'Getting Started',
    'Guide', 'Blog', 'About', 'Product', 'Pricing', 'Support', 'General', 'Optional'
  ];

  // Process each category
  for (const category of sectionOrder) {
    if (pagesByCategory[category] && pagesByCategory[category].length > 0) {
      sections.push(generateSection(category, pagesByCategory[category]));
    }
  }
  
  // Add any remaining categories not in the predefined order
  for (const [category, pages] of Object.entries(pagesByCategory)) {
    if (!sectionOrder.includes(category) && pages.length > 0) {
      sections.push(generateSection(category, pages));
    }
  }

  return header + sections.join('\n\n');
}

function groupPagesByCategory(selectedPages: SelectedPage[]): Record<string, SelectedPage[]> {
  const grouped: Record<string, SelectedPage[]> = {};
  
  for (const page of selectedPages) {
    // Determine category - use existing category or infer from URL
    let category = page.category || inferCategoryFromUrl(page.url);
    
    // Promote high-quality pages to "Essential" section
    if (page.qualityScore && page.qualityScore >= 8) {
      // Keep track of essential pages in their original category too
      const originalCategory = category;
      category = 'Essential';
      
      // Also add to original category if it's not Essential
      if (originalCategory !== 'Essential') {
        if (!grouped[originalCategory]) grouped[originalCategory] = [];
        grouped[originalCategory].push(page);
      }
    }
    
    // Group navigation and low-quality content as Optional
    if (page.qualityScore && page.qualityScore <= 3) {
      category = 'Optional';
    }
    
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(page);
  }
  
  // Sort pages within each category by quality score (highest first)
  for (const category in grouped) {
    grouped[category].sort((a, b) => (b.qualityScore || 5) - (a.qualityScore || 5));
  }
  
  return grouped;
}

function inferCategoryFromUrl(url: string): string {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('/docs') || urlLower.includes('/documentation')) {
    return 'Documentation';
  } else if (urlLower.includes('/api')) {
    return 'API Reference';
  } else if (urlLower.includes('/guide') || urlLower.includes('/tutorial')) {
    return 'Tutorial';
  } else if (urlLower.includes('/getting-started') || urlLower.includes('/quickstart')) {
    return 'Getting Started';
  } else if (urlLower.includes('/blog')) {
    return 'Blog';
  } else if (urlLower.includes('/about')) {
    return 'About';
  } else if (urlLower.includes('/pricing') || urlLower.includes('/plans')) {
    return 'Pricing';
  } else if (urlLower.includes('/support') || urlLower.includes('/help')) {
    return 'Support';
  } else if (urlLower.includes('/product')) {
    return 'Product';
  }
  
  return 'General';
}

function generateSection(category: string, pages: SelectedPage[]): string {
  // Don't create empty sections
  if (pages.length === 0) return '';
  
  // Create section header
  let section = `## ${category}`;
  
  // Add section description for context
  const sectionDescriptions: Record<string, string> = {
    'Essential': 'Core resources and highest-priority content',
    'Documentation': 'Technical documentation and reference materials',
    'API Reference': 'API endpoints, parameters, and technical specifications',
    'Tutorial': 'Step-by-step guides and learning materials',
    'Getting Started': 'Quick start guides and initial setup instructions',
    'Blog': 'Articles, updates, and thought leadership content',
    'About': 'Company information and project background',
    'Support': 'Help resources and troubleshooting guides',
    'Optional': 'Additional resources and supplementary content'
  };
  
  if (sectionDescriptions[category]) {
    section += `\n*${sectionDescriptions[category]}*`;
  }
  
  section += '\n';
  
  // Add pages with enhanced formatting
  for (const page of pages) {
    const qualityIndicator = page.qualityScore && page.qualityScore >= 8 ? ' ⭐' : '';
    section += `- [${page.title}](${page.url}):${qualityIndicator} ${page.description}\n`;
  }
  
  return section;
}

// Helper function to get today's usage (imported from usage service)
import { getTodayUsage } from "./services/usage";