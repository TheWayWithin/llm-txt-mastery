/**
 * API v1 processAnalysis pipeline tests (LTM-ISS-5).
 *
 * The pipeline was broken against the current sitemap/analyzer APIs (it read
 * SitemapResult.pages/.found/.source and passed a tier where the analyzer
 * expects an identity, so every /api/v1 analysis crashed at the first metadata
 * update). These tests pin the repaired contract:
 *  - sitemap fields read via entries/sitemapFound/analysisMethod
 *  - analyzer called with (entries, consumer identity, tier) and its
 *    { pages, metrics } result destructured
 *  - completed/failed statuses stored with well-formed metadata
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockUpdateAnalysis = vi.fn();

vi.mock('../../server/storage', () => ({
  storage: {
    updateAnalysis: (...args: unknown[]) => mockUpdateAnalysis(...args),
  },
}));

const mockFetchSitemap = vi.fn();
vi.mock('../../server/services/sitemap', () => ({
  fetchSitemap: (...args: unknown[]) => mockFetchSitemap(...args),
}));

const mockAnalyze = vi.fn();
vi.mock('../../server/services/sitemap-enhanced', () => ({
  analyzeDiscoveredPagesWithCache: (...args: unknown[]) => mockAnalyze(...args),
}));

const mockConsumeApiJsRenders = vi.fn();
vi.mock('../../server/services/usage', () => ({
  checkApiJsRenderQuota: vi.fn(),
  consumeApiJsRenders: (...args: unknown[]) => mockConsumeApiJsRenders(...args),
  getApiJsRenderQuotaStatus: vi.fn(),
  getApiTierLimits: vi.fn(),
}));

// Middleware pulled in by the route module; not exercised by these tests
vi.mock('../../server/middleware/api-auth', () => ({
  apiAuthChain: [],
  apiKeyAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  trackApiUsage: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../../server/utils/api-key-generator', () => ({
  getApiKeyStats: vi.fn(),
}));

import { processAnalysis } from '../../server/routes/api-v1';

const sitemapResult = {
  entries: [
    { url: 'https://example.com/a' },
    { url: 'https://example.com/b' },
    { url: 'https://example.com/c' },
  ],
  sitemapFound: true,
  analysisMethod: 'sitemap' as const,
  message: 'Found sitemap',
};

const analyzedPages = [
  { url: 'https://example.com/a', title: 'A', description: 'a', qualityScore: 7, category: 'Docs' },
  { url: 'https://example.com/b', title: 'B', description: 'b', qualityScore: 6, category: 'Docs' },
];

describe('API v1 processAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateAnalysis.mockResolvedValue(undefined);
  });

  it('runs the repaired pipeline end-to-end and stores a completed analysis', async () => {
    mockFetchSitemap.mockResolvedValue(sitemapResult);
    mockAnalyze.mockResolvedValue({ pages: analyzedPages, metrics: { totalPages: 2 } });

    await processAnalysis(42, 'https://example.com', 2, {
      userTier: 'growth',
      jsRenderingEnabled: false,
      apiKeyId: 7,
      externalUserId: 'anonymous',
      consumer: 'aimpactscanner',
    });

    // Sitemap metadata written with the real SitemapResult field names
    expect(mockUpdateAnalysis).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        analysisMetadata: expect.objectContaining({
          siteType: 'multi-page',
          sitemapFound: true,
          analysisMethod: 'sitemap',
          totalPagesFound: 3,
        }),
      })
    );

    // Analyzer called with (entries limited by maxPages, consumer identity, tier)
    expect(mockAnalyze).toHaveBeenCalledWith(
      sitemapResult.entries.slice(0, 2),
      'aimpactscanner',
      'growth'
    );

    // Completed status stored with the analyzer's pages array
    expect(mockUpdateAnalysis).toHaveBeenLastCalledWith(
      42,
      expect.objectContaining({
        status: 'completed',
        discoveredPages: analyzedPages,
        analysisMetadata: expect.objectContaining({
          message: 'Analysis completed successfully',
          totalPagesFound: 2,
        }),
      })
    );

    // No JS rendering requested -> no quota consumption
    expect(mockConsumeApiJsRenders).not.toHaveBeenCalled();
  });

  it('falls back to an api-key-derived identity when no consumer is given', async () => {
    mockFetchSitemap.mockResolvedValue(sitemapResult);
    mockAnalyze.mockResolvedValue({ pages: analyzedPages, metrics: {} });

    await processAnalysis(43, 'https://example.com', 50, {
      userTier: 'scale',
      jsRenderingEnabled: false,
      apiKeyId: 9,
      externalUserId: 'user-1',
    });

    expect(mockAnalyze).toHaveBeenCalledWith(sitemapResult.entries, 'api-key-9', 'scale');
  });

  it('consumes JS render quota when rendering was enabled', async () => {
    mockFetchSitemap.mockResolvedValue(sitemapResult);
    mockAnalyze.mockResolvedValue({ pages: analyzedPages, metrics: {} });

    await processAnalysis(44, 'https://example.com', 50, {
      userTier: 'scale',
      jsRenderingEnabled: true,
      apiKeyId: 9,
      externalUserId: 'user-1',
    });

    expect(mockConsumeApiJsRenders).toHaveBeenCalledWith(9, 'user-1', analyzedPages.length);
  });

  it('marks the analysis failed when the sitemap fetch throws', async () => {
    mockFetchSitemap.mockRejectedValue(new Error('DNS lookup failed'));

    await processAnalysis(45, 'https://broken.example', 50, {
      userTier: 'starter',
      jsRenderingEnabled: false,
      apiKeyId: 7,
      externalUserId: 'anonymous',
    });

    expect(mockUpdateAnalysis).toHaveBeenLastCalledWith(
      45,
      expect.objectContaining({
        status: 'failed',
        analysisMetadata: expect.objectContaining({
          message: 'Analysis failed: DNS lookup failed',
        }),
      })
    );
  });
});
