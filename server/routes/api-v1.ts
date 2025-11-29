/**
 * Public API v1 Routes
 *
 * Provides versioned public API endpoints for LLM.txt Mastery.
 * All routes (except /status) are protected by API key authentication.
 *
 * Endpoints:
 * - POST /api/v1/analyze - Start website analysis
 * - GET /api/v1/analysis/:id - Get analysis status and results
 * - POST /api/v1/generate - Generate LLMs.txt file
 * - GET /api/v1/download/:id - Download generated file
 * - GET /api/v1/usage - Get API usage statistics
 * - GET /api/v1/status - Health check (no auth required)
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { fetchSitemap } from '../services/sitemap';
import { analyzeDiscoveredPagesWithCache } from '../services/sitemap-enhanced';
import { apiAuthChain, apiKeyAuth, trackApiUsage } from '../middleware/api-auth';
import { getApiKeyStats } from '../utils/api-key-generator';
import type { ApiKey } from '@shared/schema';

const router = Router();

// ===================================================================
// VALIDATION SCHEMAS
// ===================================================================

const analyzeSchema = z.object({
  url: z.string().url('Invalid URL format'),
  options: z
    .object({
      maxPages: z.number().int().positive().max(100).optional().default(50),
      force: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
});

const generateSchema = z.object({
  analysisId: z.number().int().positive('Analysis ID must be a positive integer'),
  selectedPages: z
    .array(
      z.object({
        url: z.string(),
        title: z.string(),
        description: z.string(),
        selected: z.boolean(),
        category: z.string().optional(),
        qualityScore: z.number().optional(),
      })
    )
    .optional(),
  options: z
    .object({
      includeMetadata: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
});

// ===================================================================
// HEALTH CHECK (No Auth Required)
// ===================================================================

/**
 * GET /api/v1/status
 * Health check endpoint - lightweight, no authentication required
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ===================================================================
// PROTECTED ENDPOINTS
// ===================================================================

/**
 * POST /api/v1/analyze
 * Start website analysis
 */
router.post('/analyze', apiAuthChain, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = analyzeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'INVALID_REQUEST',
        message: validationResult.error.errors[0].message,
        details: validationResult.error.errors,
      });
    }

    const { url, options } = validationResult.data;
    const apiKey = req.apiKey as ApiKey;

    // Check for existing cached analysis if not forcing refresh
    if (!options.force) {
      const existingAnalysis = await storage.getAnalysisByUrl(url);
      if (existingAnalysis && existingAnalysis.status === 'completed') {
        return res.json({
          success: true,
          cached: true,
          analysis: {
            id: existingAnalysis.id,
            url: existingAnalysis.url,
            status: existingAnalysis.status,
            createdAt: existingAnalysis.createdAt,
          },
        });
      }
    }

    // Create new analysis record
    const analysis = await storage.createAnalysis({
      url,
      userId: null, // API key based, not user based
      status: 'pending',
      analysisMetadata: {
        siteType: 'unknown',
        sitemapFound: false,
        analysisMethod: 'sitemap',
        message: 'Analysis initiated via API v1',
        totalPagesFound: 0,
        apiKeyId: apiKey.id,
        consumer: apiKey.consumer,
        tier: apiKey.tier,
      },
    });

    // Start async analysis process
    processAnalysis(analysis.id, url, options.maxPages).catch((error) => {
      console.error(`Background analysis failed for ID ${analysis.id}:`, error);
    });

    res.status(201).json({
      success: true,
      analysis: {
        id: analysis.id,
        url: analysis.url,
        status: 'processing',
        createdAt: analysis.createdAt,
        message: 'Analysis started. Poll GET /api/v1/analysis/:id for results.',
      },
    });
  } catch (error) {
    console.error('API v1 analyze error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      code: 'ANALYSIS_FAILED',
      message: 'Failed to start analysis',
    });
  }
});

/**
 * GET /api/v1/analysis/:id
 * Get analysis status and results
 */
router.get('/analysis/:id', apiAuthChain, async (req: Request, res: Response) => {
  try {
    const analysisId = parseInt(req.params.id);
    if (isNaN(analysisId)) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'INVALID_ID',
        message: 'Analysis ID must be a number',
      });
    }

    const analysis = await storage.getAnalysis(analysisId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Not Found',
        code: 'ANALYSIS_NOT_FOUND',
        message: 'Analysis not found',
      });
    }

    // Calculate progress based on status
    let progress = 0;
    if (analysis.status === 'completed') progress = 100;
    else if (analysis.status === 'analyzing') progress = 50;
    else if (analysis.status === 'pending') progress = 10;
    else if (analysis.status === 'processing') progress = 25;

    res.json({
      success: true,
      analysis: {
        id: analysis.id,
        url: analysis.url,
        status: analysis.status,
        progress,
        discoveredPages: analysis.discoveredPages || [],
        metadata: analysis.analysisMetadata,
        createdAt: analysis.createdAt,
      },
    });
  } catch (error) {
    console.error('API v1 get analysis error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      code: 'FETCH_FAILED',
      message: 'Failed to retrieve analysis',
    });
  }
});

/**
 * POST /api/v1/generate
 * Generate LLMs.txt file from analysis
 */
router.post('/generate', apiAuthChain, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = generateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'INVALID_REQUEST',
        message: validationResult.error.errors[0].message,
        details: validationResult.error.errors,
      });
    }

    const { analysisId, selectedPages, options } = validationResult.data;

    // Get the analysis
    const analysis = await storage.getAnalysis(analysisId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Not Found',
        code: 'ANALYSIS_NOT_FOUND',
        message: 'Analysis not found',
      });
    }

    if (analysis.status !== 'completed') {
      return res.status(400).json({
        error: 'Invalid State',
        code: 'ANALYSIS_NOT_COMPLETE',
        message: `Analysis is '${analysis.status}'. It must be 'completed' before generating file.`,
      });
    }

    // Use provided selected pages or all discovered pages
    const pagesToInclude =
      selectedPages ||
      (analysis.discoveredPages || []).map((p) => ({
        url: p.url,
        title: p.title,
        description: p.description,
        selected: true,
        category: p.category,
        qualityScore: p.qualityScore,
      }));

    // Generate the LLMs.txt content
    const content = generateLLMsTxtContent(analysis, pagesToInclude, options.includeMetadata);

    // Save to database
    const llmFile = await storage.createLlmFile({
      analysisId,
      userId: null, // API key based
      selectedPages: pagesToInclude,
      content,
    });

    res.status(201).json({
      success: true,
      file: {
        id: llmFile.id,
        analysisId: llmFile.analysisId,
        content: llmFile.content,
        downloadUrl: `/api/v1/download/${llmFile.id}`,
        createdAt: llmFile.createdAt,
      },
    });
  } catch (error) {
    console.error('API v1 generate error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      code: 'GENERATION_FAILED',
      message: 'Failed to generate file',
    });
  }
});

/**
 * GET /api/v1/download/:id
 * Download generated LLMs.txt file
 */
router.get('/download/:id', apiAuthChain, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    if (isNaN(fileId)) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'INVALID_ID',
        message: 'File ID must be a number',
      });
    }

    const file = await storage.getLlmFile(fileId);

    if (!file) {
      return res.status(404).json({
        error: 'Not Found',
        code: 'FILE_NOT_FOUND',
        message: 'File not found',
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="llms-${file.id}.txt"`);
    res.send(file.content);
  } catch (error) {
    console.error('API v1 download error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      code: 'DOWNLOAD_FAILED',
      message: 'Failed to download file',
    });
  }
});

/**
 * GET /api/v1/usage
 * Get API usage statistics for current API key
 */
router.get('/usage', apiAuthChain, async (req: Request, res: Response) => {
  try {
    const apiKey = req.apiKey as ApiKey;

    // Get usage stats from the utility function
    const stats = await getApiKeyStats(apiKey.id);

    if (!stats) {
      return res.status(500).json({
        error: 'Internal Server Error',
        code: 'STATS_UNAVAILABLE',
        message: 'Unable to retrieve usage statistics',
      });
    }

    // Calculate reset time (next hour)
    const resetAt = new Date();
    resetAt.setMinutes(0, 0, 0);
    resetAt.setHours(resetAt.getHours() + 1);

    res.json({
      success: true,
      usage: {
        currentPeriod: stats.requestsThisHour,
        limit: apiKey.rateLimit,
        remaining: Math.max(0, apiKey.rateLimit - stats.requestsThisHour),
        resetAt: resetAt.toISOString(),
        totalRequests: stats.totalRequests,
        averageResponseTime: stats.averageResponseTime,
        errorRate: stats.errorRate,
        lastUsed: stats.lastUsed,
      },
      apiKey: {
        name: apiKey.name,
        prefix: apiKey.keyPrefix,
        tier: apiKey.tier,
        consumer: apiKey.consumer,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    console.error('API v1 usage error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      code: 'USAGE_FAILED',
      message: 'Failed to retrieve usage statistics',
    });
  }
});

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Process analysis asynchronously (fire-and-forget)
 */
async function processAnalysis(analysisId: number, url: string, maxPages: number): Promise<void> {
  try {
    // Update status to analyzing
    await storage.updateAnalysis(analysisId, {
      status: 'analyzing',
    });

    // Fetch sitemap and discover pages
    const sitemapResult = await fetchSitemap(url);

    // Update with sitemap info
    await storage.updateAnalysis(analysisId, {
      sitemapContent: sitemapResult,
      analysisMetadata: {
        siteType: sitemapResult.pages.length > 1 ? 'multi-page' : 'single-page',
        sitemapFound: sitemapResult.found,
        analysisMethod: sitemapResult.source || 'fallback-crawl',
        message: sitemapResult.message || 'Processing',
        totalPagesFound: sitemapResult.pages.length,
      },
    });

    // Limit pages to analyze
    const pagesToAnalyze = sitemapResult.pages.slice(0, maxPages);

    // Analyze discovered pages (this uses AI/HTML extraction)
    const tier = 'partner'; // Use partner tier features for API access
    const analyzedPages = await analyzeDiscoveredPagesWithCache(pagesToAnalyze, tier);

    // Update analysis as completed
    await storage.updateAnalysis(analysisId, {
      status: 'completed',
      discoveredPages: analyzedPages,
      analysisMetadata: {
        siteType: analyzedPages.length > 1 ? 'multi-page' : 'single-page',
        sitemapFound: sitemapResult.found,
        analysisMethod: sitemapResult.source || 'fallback-crawl',
        message: 'Analysis completed successfully',
        totalPagesFound: analyzedPages.length,
      },
    });
  } catch (error) {
    console.error('Analysis processing error:', error);
    // Update status to failed
    await storage.updateAnalysis(analysisId, {
      status: 'failed',
      analysisMetadata: {
        siteType: 'unknown',
        sitemapFound: false,
        analysisMethod: 'sitemap',
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        totalPagesFound: 0,
      },
    });
  }
}

/**
 * Generate LLMs.txt content from analysis and selected pages
 */
function generateLLMsTxtContent(
  analysis: { url: string },
  selectedPages: Array<{
    url: string;
    title: string;
    description: string;
    selected: boolean;
    category?: string;
    qualityScore?: number;
  }>,
  includeMetadata: boolean
): string {
  const lines: string[] = [];

  // Header with metadata
  if (includeMetadata) {
    lines.push(`# ${new URL(analysis.url).hostname}`);
    lines.push(`# Generated by LLM.txt Mastery API v1`);
    lines.push(`# Date: ${new Date().toISOString()}`);
    lines.push('');
  }

  // Group pages by category if available
  const categorizedPages = new Map<string, typeof selectedPages>();
  for (const page of selectedPages.filter((p) => p.selected)) {
    const category = page.category || 'General';
    if (!categorizedPages.has(category)) {
      categorizedPages.set(category, []);
    }
    categorizedPages.get(category)!.push(page);
  }

  // Output pages by category
  for (const [category, pages] of categorizedPages) {
    lines.push(`## ${category}`);
    lines.push('');

    for (const page of pages) {
      lines.push(`- ${page.title}`);
      lines.push(`  URL: ${page.url}`);
      if (page.description) {
        lines.push(`  > ${page.description}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export default router;
