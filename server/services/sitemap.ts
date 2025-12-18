import { parseStringPromise } from 'xml2js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import {
  DiscoveredPage,
  SPADetectionResult,
  SPAFrameworkIndicators,
  ContentCoverageEstimate,
  RenderingStrategy,
} from '@shared/schema';
import { analyzePageContent } from './openai';
import { connectionPool } from './connection-pool';

// Helper function to implement fetch with timeout using AbortController
async function fetchWithTimeout(
  url: string,
  options: any = {},
  timeoutMs: number = 10000
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Use connection pool for HTTPS URLs if not already specified
    let fetchOptions = { ...options, signal: controller.signal };

    if (url.startsWith('https') && !options.agent) {
      fetchOptions.agent = connectionPool.getAgent(url);
    }

    const response = await fetch(url, fetchOptions);
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

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export interface SitemapResult {
  entries: SitemapEntry[];
  sitemapFound: boolean;
  analysisMethod: 'sitemap' | 'robots.txt' | 'homepage-only' | 'fallback-crawl';
  message: string;
  // Enhanced SPA detection data (Sprint 1: Phase 1)
  spaDetection?: SPADetectionResult;
}

export async function fetchSitemap(baseUrl: string): Promise<SitemapResult> {
  // Add timeout protection to prevent infinite hanging during sitemap discovery
  const SITEMAP_TIMEOUT = 90 * 1000; // 90 seconds maximum for sitemap discovery (increased for slow sites)
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Sitemap discovery timeout: exceeded ${SITEMAP_TIMEOUT / 1000}s limit`));
    }, SITEMAP_TIMEOUT);
  });

  try {
    return await Promise.race([performSitemapDiscovery(baseUrl), timeoutPromise]);
  } catch (error) {
    console.error('Sitemap discovery failed:', error);

    // CRITICAL FIX: Instead of returning empty results on error/timeout,
    // attempt basic crawling as a fallback to discover pages
    console.log('Attempting fallback crawling due to sitemap discovery failure...');

    try {
      // Extract root domain for crawling
      const urlObj = new URL(baseUrl);
      const rootDomain = `${urlObj.protocol}//${urlObj.hostname}`;

      // Use basic crawling as ultimate fallback
      const fallbackEntries = await basicCrawlFallback(rootDomain);

      if (fallbackEntries.length > 0) {
        console.log(
          `Fallback crawling discovered ${fallbackEntries.length} pages after sitemap failure`
        );
        return {
          entries: fallbackEntries,
          sitemapFound: false,
          analysisMethod: 'fallback-crawl',
          message: `Sitemap discovery failed (${error.message}). Found ${fallbackEntries.length} pages through fallback crawling.`,
        };
      }
    } catch (crawlError) {
      console.error('Fallback crawling also failed:', crawlError);
    }

    // Only return empty if both sitemap discovery AND fallback crawling fail
    return {
      entries: [],
      sitemapFound: false,
      analysisMethod: 'fallback-crawl',
      message: `Sitemap discovery failed: ${error.message}. Fallback crawling also failed. No pages could be discovered.`,
    };
  }
}

async function performSitemapDiscovery(baseUrl: string): Promise<SitemapResult> {
  // Extract root domain for sitemap discovery
  const urlObj = new URL(baseUrl);
  const rootDomain = `${urlObj.protocol}//${urlObj.hostname}`;

  console.log(`Searching for sitemap for baseUrl: ${baseUrl}, rootDomain: ${rootDomain}`);

  // CRITICAL FIX: Always run SPA detection early so it's available for all return paths
  // This was only running when no sitemap was found, missing sites with sitemaps
  console.log('Running SPA detection analysis...');
  let spaDetection: SPADetectionResult | undefined;
  try {
    spaDetection = await analyzeHomepage(baseUrl);
    console.log(`SPA detection complete: ${spaDetection.framework.framework} (${spaDetection.framework.renderingStrategy}), coverage: ${spaDetection.contentCoverage.estimatedCoverage}%`);
  } catch (error) {
    console.log('SPA detection failed (non-blocking):', error.message);
    // Don't fail the whole analysis, just skip SPA detection
  }

  // Check if we need to handle redirects first
  let redirectPath = '';
  try {
    const rootResponse = await fetchWithTimeout(
      `${rootDomain}/sitemap.xml`,
      {
        method: 'HEAD',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      },
      5000
    );

    if (!rootResponse.ok) {
      // Try to detect redirect pattern by checking the homepage
      const homepageResponse = await fetchWithTimeout(
        rootDomain,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        },
        5000
      );

      if (homepageResponse.ok) {
        const html = await homepageResponse.text();
        const redirectMatch = html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
        if (redirectMatch) {
          redirectPath = redirectMatch[1];
          console.log(`Detected redirect pattern to: ${redirectPath}`);
        }
      }
    }
  } catch (error) {
    console.log('Error checking for redirects:', error.message);
  }

  const sitemapUrls = [
    `${rootDomain}/sitemap.xml`,
    `${rootDomain}/sitemap_index.xml`,
    `${rootDomain}/sitemap/sitemap.xml`,
    `${rootDomain}/sitemaps/sitemap.xml`,
    `${rootDomain}/wp-sitemap.xml`,
    `${rootDomain}/sitemap-index.xml`,
    `${rootDomain}/post-sitemap.xml`,
  ];

  // Add redirect-based sitemap URLs if we found a redirect
  if (redirectPath) {
    const redirectBase = redirectPath.startsWith('/')
      ? `${rootDomain}${redirectPath}`
      : `${rootDomain}/${redirectPath}`;
    sitemapUrls.unshift(
      `${redirectBase}/sitemap.xml`,
      `${redirectBase}/sitemap_index.xml`,
      `${redirectBase}/sitemap/sitemap.xml`,
      `${redirectBase}/sitemaps/sitemap.xml`
    );
  }

  for (const sitemapUrl of sitemapUrls) {
    try {
      console.log(`Trying sitemap URL: ${sitemapUrl}`);
      const response = await fetchWithTimeout(
        sitemapUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        },
        15000
      ); // Increased timeout to 15 seconds for slow sites

      if (response.ok) {
        console.log(`Successfully fetched sitemap from: ${sitemapUrl}`);
        const xml = await response.text();

        // Log first 200 characters to debug content
        console.log(`Sitemap content preview: ${xml.substring(0, 200)}...`);

        const entries = await parseSitemap(xml);
        console.log(`Parsed ${entries.length} entries from sitemap`);

        // If we got 0 entries from a successful response, something is wrong
        if (entries.length === 0) {
          console.log(`Warning: Sitemap returned 0 entries, likely HTML redirect or invalid XML`);
          // Continue to try other sitemap locations
        } else {
          // Ensure homepage is always included in the entries
          const homepageUrl = rootDomain.endsWith('/') ? rootDomain : rootDomain + '/';
          const hasHomepage = entries.some((entry) => {
            const entryUrl = entry.url.endsWith('/') ? entry.url : entry.url + '/';
            return entryUrl === homepageUrl;
          });

          if (!hasHomepage) {
            console.log(`Adding missing homepage to sitemap entries: ${homepageUrl}`);
            entries.unshift({ url: homepageUrl, lastmod: new Date().toISOString() });
          }

          return {
            entries,
            sitemapFound: true,
            analysisMethod: 'sitemap',
            message: `Found sitemap with ${entries.length} pages (including homepage)`,
            spaDetection, // Include SPA detection for all sites (even with sitemaps)
          };
        }
      } else {
        console.log(`HTTP ${response.status} for ${sitemapUrl}`);
      }
    } catch (error) {
      console.log(`Failed to fetch ${sitemapUrl}:`, error.message);
    }
  }

  // Fallback: try to discover pages from robots.txt
  try {
    const robotsResponse = await fetchWithTimeout(`${rootDomain}/robots.txt`, {}, 5000);
    if (robotsResponse.ok) {
      const robotsText = await robotsResponse.text();
      const sitemapMatch = robotsText.match(/Sitemap:\s*(.+)/i);
      if (sitemapMatch) {
        const sitemapUrl = sitemapMatch[1].trim();
        console.log(`Found sitemap in robots.txt: ${sitemapUrl}`);
        const response = await fetchWithTimeout(
          sitemapUrl,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
          },
          10000
        );
        if (response.ok) {
          const xml = await response.text();
          const entries = await parseSitemap(xml);
          console.log(`Successfully parsed sitemap from robots.txt: ${entries.length} entries`);
          return {
            entries,
            sitemapFound: true,
            analysisMethod: 'robots.txt',
            message: `Found sitemap via robots.txt with ${entries.length} pages`,
            spaDetection, // Include SPA detection for all sites
          };
        }
      }
    }
  } catch (error) {
    console.log('Robots.txt fallback failed:', error.message);
  }

  // Check if this is a single-page site (spaDetection already ran earlier)
  if (spaDetection?.isSinglePage) {
    console.log('Detected single-page site, analyzing homepage only');
    return {
      entries: [{ url: baseUrl, lastmod: new Date().toISOString() }],
      sitemapFound: false,
      analysisMethod: 'homepage-only',
      message: spaDetection.contentCoverageWarning ||
        `No sitemap found. This appears to be a single-page site (${spaDetection.framework.framework}). Analysis includes homepage only.`,
      // Include SPA detection data for metadata
      spaDetection,
    };
  }

  // Final fallback: basic page crawling for multi-page sites
  console.log('No sitemap found, using aggressive crawling fallback');
  const fallbackEntries = await basicCrawlFallback(rootDomain);

  // CRITICAL: If fallback only found 1-2 pages, try a more aggressive crawl
  if (fallbackEntries.length <= 2) {
    console.log(`Only found ${fallbackEntries.length} pages, trying deeper crawl...`);

    // Try crawling each found page for more links
    const secondLevelUrls = new Set<string>();
    for (const entry of fallbackEntries) {
      try {
        const moreLinks = await crawlPageForLinks(entry.url, rootDomain);
        moreLinks.forEach((link) => secondLevelUrls.add(link));
      } catch (error) {
        console.log(`Failed to deep crawl ${entry.url}: ${error.message}`);
      }
    }

    // Validate second level URLs
    const additionalPages = [];
    for (const url of Array.from(secondLevelUrls).slice(0, 50)) {
      // Limit to 50 for performance
      if (!fallbackEntries.find((e) => e.url === url)) {
        try {
          const response = await fetchWithTimeout(
            url,
            {
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
            },
            5000
          );

          if (response.ok) {
            additionalPages.push({
              url: url,
              lastmod: response.headers.get('last-modified') || undefined,
              changefreq: 'weekly',
              priority: '0.6',
            });
          }
        } catch (error) {
          // Ignore individual failures
        }
      }
    }

    fallbackEntries.push(...additionalPages);
    console.log(
      `Deep crawl found ${additionalPages.length} additional pages, total: ${fallbackEntries.length}`
    );
  }

  return {
    entries: fallbackEntries,
    sitemapFound: false,
    analysisMethod: 'fallback-crawl',
    message: `No sitemap found. Discovered ${fallbackEntries.length} pages through deep crawling. Some pages may be missing.`,
    spaDetection, // Include SPA detection for all sites
  };
}

// ===================================================================
// ENHANCED SPA DETECTION HELPER FUNCTIONS (Sprint 1: Phase 1)
// ===================================================================

type CheerioAPI = ReturnType<typeof cheerio.load>;

/**
 * Detect SSR indicators in HTML content
 */
function detectSSRIndicators($: CheerioAPI): { hasNextData: boolean; hasNuxtData: boolean; hasGatsbyData: boolean } {
  const html = $.html();

  // Check for Next.js SSR/SSG indicators:
  // - Pages Router: __NEXT_DATA__ script tag
  // - App Router: self.__next_f streaming data OR /_next/static/ chunks
  const hasNextDataScript = $('#__NEXT_DATA__').length > 0;
  const hasNextAppRouter = html.includes('self.__next_f') || html.includes('self.__next_');
  const hasNextChunks = html.includes('/_next/static/chunks/');
  const hasNextData = hasNextDataScript || hasNextAppRouter || hasNextChunks;

  // Check for Nuxt SSR indicators (window.__NUXT__ is set server-side)
  const hasNuxtData = html.includes('__NUXT__') || html.includes('__NUXT_DATA__');

  // Check for Gatsby SSG indicator
  const hasGatsbyData = $('#___gatsby').length > 0;

  return { hasNextData, hasNuxtData, hasGatsbyData };
}

/**
 * Detect CSR indicators in HTML content
 */
function detectCSRIndicators($: CheerioAPI): { rootEmpty: boolean; hasLoadingIndicators: boolean } {
  // Check if root containers are empty (common CSR pattern)
  const root = $('#root, #app, [data-reactroot]');
  const rootEmpty = root.length > 0 && root.children().length === 0;

  // Check for loading/skeleton indicators
  const loadingSelectors = [
    '.spinner', '.loading', '.loader',
    '.skeleton', '.placeholder',
    '[aria-busy="true"]', '[data-loading="true"]',
    '.shimmer', '.pulse-animation'
  ];
  const hasLoadingIndicators = loadingSelectors.some(sel => $(sel).length > 0);

  return { rootEmpty, hasLoadingIndicators };
}

/**
 * Calculate content metrics from HTML
 */
function calculateContentMetrics($: CheerioAPI, html: string): { textLength: number; htmlSize: number; ratio: number } {
  // Get all visible text content
  const bodyText = $('body').text() || '';
  const textLength = bodyText.replace(/\s+/g, ' ').trim().length;

  // Get HTML structure size
  const htmlSize = html.length;

  // Calculate ratio (text / HTML)
  const ratio = htmlSize > 0 ? textLength / htmlSize : 0;

  return { textLength, htmlSize, ratio };
}

/**
 * Determine framework and rendering strategy
 */
function determineFramework(
  $: CheerioAPI,
  ssrIndicators: { hasNextData: boolean; hasNuxtData: boolean; hasGatsbyData: boolean },
  csrIndicators: { rootEmpty: boolean; hasLoadingIndicators: boolean }
): SPAFrameworkIndicators {
  const indicators: string[] = [];
  let framework: SPAFrameworkIndicators['framework'] = 'unknown';
  let renderingStrategy: RenderingStrategy = 'UNKNOWN';

  // Check for React indicators
  const hasReact = $('#root, [data-reactroot], .react-app, [data-react-]').length > 0;

  // Check for Vue indicators
  const hasVue = $('#app, [data-v-], .vue-app, [data-vue]').length > 0;

  // Check for Angular indicators (modern Angular v2+ and AngularJS)
  // Modern Angular uses: <app-root>, ng-version attribute, _ngcontent-* attributes
  // Also check for Angular scripts in the HTML
  const html = $.html();
  const hasAngularElement = $('[ng-app], [data-ng-app], app-root, [ng-version]').length > 0;
  const hasAngularAttributes = html.includes('_ngcontent-') || html.includes('_nghost-');
  const hasAngularScripts = html.includes('@angular') || html.includes('/angular/') || html.includes('angular.min.js');
  const hasAngular = hasAngularElement || hasAngularAttributes || hasAngularScripts;

  // Check for Svelte indicators
  const hasSvelte = $('[class*="svelte-"]').length > 0;

  // Check for Astro indicators
  // Astro uses: <astro-island> elements, data-astro-* attributes, /_astro/ paths
  const hasAstroIsland = $('astro-island').length > 0;
  const hasAstroAttributes = html.includes('data-astro-cid-') || html.includes('data-astro-source');
  const hasAstroScripts = html.includes('/_astro/') || html.includes('/astro/');
  const hasAstro = hasAstroIsland || hasAstroAttributes || hasAstroScripts;

  // Check for WordPress indicators
  // WordPress uses: meta[name="generator"], /wp-includes/, /wp-content/ paths, wp-* body classes
  const wpGenerator = $('meta[name="generator"]').attr('content') || '';
  const hasWPGenerator = wpGenerator.toLowerCase().includes('wordpress');
  const hasWPPaths = html.includes('/wp-includes/') || html.includes('/wp-content/');
  const hasWPBodyClasses = $('body').attr('class')?.includes('wp-') || false;
  const hasWordPress = hasWPGenerator || hasWPPaths || hasWPBodyClasses;

  // Determine specific framework (most specific first)
  if (ssrIndicators.hasNextData) {
    framework = 'next';
    // Add specific indicator based on detection method (html already defined above)
    if ($('#__NEXT_DATA__').length > 0) {
      indicators.push('__NEXT_DATA__');
    } else if (html.includes('self.__next_f')) {
      indicators.push('next-app-router');
    } else if (html.includes('/_next/static/chunks/')) {
      indicators.push('next-chunks');
    }
    // Next.js means SSR or SSG
    renderingStrategy = 'SSR';
  } else if (ssrIndicators.hasNuxtData) {
    framework = 'nuxt';
    indicators.push('__NUXT__');
    renderingStrategy = 'SSR';
  } else if (ssrIndicators.hasGatsbyData) {
    framework = 'gatsby';
    indicators.push('___gatsby');
    renderingStrategy = 'SSG';
  } else if (hasReact) {
    framework = 'react';
    indicators.push('react-app');
    // React without SSR data is likely CSR
    renderingStrategy = csrIndicators.rootEmpty ? 'CSR' : 'HYBRID';
  } else if (hasVue) {
    framework = 'vue';
    indicators.push('vue-app');
    renderingStrategy = csrIndicators.rootEmpty ? 'CSR' : 'HYBRID';
  } else if (hasAngular) {
    framework = 'angular';
    // Add specific indicator based on detection method
    if (hasAngularElement) {
      if ($('[ng-version]').length > 0) {
        indicators.push('ng-version');
      } else if ($('app-root').length > 0) {
        indicators.push('app-root');
      } else {
        indicators.push('ng-app');
      }
    } else if (hasAngularAttributes) {
      indicators.push('_ngcontent');
    } else if (hasAngularScripts) {
      indicators.push('angular-scripts');
    }
    // Angular is typically CSR
    renderingStrategy = 'CSR';
  } else if (hasSvelte) {
    framework = 'svelte';
    indicators.push('svelte-app');
    renderingStrategy = 'HYBRID'; // Svelte can be SSR or CSR
  } else if (hasAstro) {
    framework = 'astro';
    // Add specific indicator based on detection method
    if (hasAstroIsland) {
      indicators.push('astro-island');
    } else if (hasAstroAttributes) {
      indicators.push('astro-cid');
    } else if (hasAstroScripts) {
      indicators.push('astro-scripts');
    }
    // Astro is primarily SSG (static site generator)
    renderingStrategy = 'SSG';
  } else if (hasWordPress) {
    framework = 'wordpress';
    // Add specific indicator based on detection method
    if (hasWPGenerator) {
      indicators.push('wp-generator');
    } else if (hasWPPaths) {
      indicators.push('wp-paths');
    } else if (hasWPBodyClasses) {
      indicators.push('wp-body-classes');
    }
    // WordPress is server-side rendered (PHP)
    renderingStrategy = 'SSR';
  }

  // Add CSR indicators
  if (csrIndicators.rootEmpty) indicators.push('empty-root');
  if (csrIndicators.hasLoadingIndicators) indicators.push('loading-indicators');

  // If we found loading indicators but no framework, it's likely CSR
  if (framework === 'unknown' && csrIndicators.hasLoadingIndicators) {
    renderingStrategy = 'CSR';
  }

  return { framework, renderingStrategy, indicators };
}

/**
 * Estimate content coverage based on signals
 */
function estimateContentCoverage(
  ssrIndicators: { hasNextData: boolean; hasNuxtData: boolean; hasGatsbyData: boolean },
  contentMetrics: { textLength: number; htmlSize: number; ratio: number },
  csrIndicators: { rootEmpty: boolean; hasLoadingIndicators: boolean },
  renderingStrategy: RenderingStrategy
): ContentCoverageEstimate {
  const { ratio, textLength, htmlSize } = contentMetrics;

  let estimatedCoverage = 0;
  let confidence: 'high' | 'medium' | 'low' = 'medium';

  // Base coverage from text-to-HTML ratio
  if (ratio > 0.15) {
    // High text content relative to HTML = likely SSR/SSG
    estimatedCoverage = 95;
    confidence = 'high';
  } else if (ratio > 0.08) {
    // Moderate text content
    estimatedCoverage = 70;
    confidence = 'medium';
  } else if (ratio > 0.03) {
    // Low text content
    estimatedCoverage = 40;
    confidence = 'medium';
  } else {
    // Very low text content = likely CSR shell
    estimatedCoverage = 15;
    confidence = 'high';
  }

  // Adjust based on SSR indicators (BOOST coverage)
  const hasSSRData = ssrIndicators.hasNextData || ssrIndicators.hasNuxtData || ssrIndicators.hasGatsbyData;
  if (hasSSRData) {
    estimatedCoverage = Math.max(estimatedCoverage, 85);
    confidence = 'high';
  }

  // Boost coverage for SSG/SSR frameworks (e.g., Astro, detected via framework analysis)
  // These render full content in initial HTML even if text-to-HTML ratio is low
  if (renderingStrategy === 'SSG' || renderingStrategy === 'SSR') {
    estimatedCoverage = Math.max(estimatedCoverage, 90);
    confidence = 'high';
  }

  // Adjust based on CSR indicators (LOWER coverage) - only if not already detected as SSG/SSR
  if ((csrIndicators.rootEmpty || csrIndicators.hasLoadingIndicators) &&
      renderingStrategy !== 'SSG' && renderingStrategy !== 'SSR') {
    estimatedCoverage = Math.min(estimatedCoverage, 30);
    confidence = 'high';
  }

  // Absolute minimum if we have any text
  if (textLength > 1000 && estimatedCoverage < 50) {
    estimatedCoverage = 50;
    confidence = 'low';
  }

  return {
    estimatedCoverage,
    confidence,
    signals: {
      textToHtmlRatio: Math.round(ratio * 1000) / 1000, // Round to 3 decimals
      hasSSRData,
      hasSkeletonUI: csrIndicators.hasLoadingIndicators,
      bodyContentLength: textLength,
      htmlStructureSize: htmlSize,
    },
  };
}

/**
 * Generate user-facing warning for low content coverage
 */
function generateCoverageWarning(
  coverage: ContentCoverageEstimate,
  framework: SPAFrameworkIndicators
): string | undefined {
  if (coverage.estimatedCoverage >= 70) {
    return undefined;
  }

  const strategyExplanation: Record<RenderingStrategy, string> = {
    'CSR': 'client-side rendered (CSR)',
    'SSR': 'server-side rendered (SSR)',
    'SSG': 'statically generated (SSG)',
    'HYBRID': 'partially server-rendered',
    'UNKNOWN': 'dynamically rendered',
  };

  const strategy = strategyExplanation[framework.renderingStrategy] || 'JavaScript-heavy';
  const frameworkName = framework.framework !== 'unknown' ? ` (${framework.framework.charAt(0).toUpperCase() + framework.framework.slice(1)})` : '';

  return `⚠️ This site appears to be ${strategy}${frameworkName} with an estimated ${coverage.estimatedCoverage}% initial content coverage. The llms.txt file may be incomplete as it only captures the initial HTML.`;
}

/**
 * Create default SPA detection result for error cases
 */
function createDefaultSPAResult(indicators: string[]): SPADetectionResult {
  return {
    isSinglePage: false,
    framework: {
      framework: 'unknown',
      renderingStrategy: 'UNKNOWN',
      indicators,
    },
    contentCoverage: {
      estimatedCoverage: 50,
      confidence: 'low',
      signals: {
        textToHtmlRatio: 0,
        hasSSRData: false,
        hasSkeletonUI: false,
        bodyContentLength: 0,
        htmlStructureSize: 0,
      },
    },
  };
}

/**
 * Enhanced homepage analysis for SPA detection
 * Returns comprehensive detection result including rendering strategy and content coverage
 */
export async function analyzeHomepage(url: string): Promise<SPADetectionResult> {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      },
      10000
    );

    if (!response.ok) {
      return createDefaultSPAResult(['failed-to-fetch']);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Step 1: Detect SSR indicators
    const ssrIndicators = detectSSRIndicators($);

    // Step 2: Detect CSR indicators
    const csrIndicators = detectCSRIndicators($);

    // Step 3: Calculate content metrics
    const contentMetrics = calculateContentMetrics($, html);

    // Step 4: Determine framework and rendering strategy
    const framework = determineFramework($, ssrIndicators, csrIndicators);

    // Step 5: Estimate content coverage (pass rendering strategy for accurate estimation)
    const contentCoverage = estimateContentCoverage(ssrIndicators, contentMetrics, csrIndicators, framework.renderingStrategy);

    // Step 6: Generate warning if needed
    const contentCoverageWarning = generateCoverageWarning(contentCoverage, framework);

    // Determine if single-page (backward compatibility)
    const isSinglePage = framework.framework !== 'unknown' &&
      (framework.renderingStrategy === 'CSR' || contentCoverage.estimatedCoverage < 50);

    console.log(
      `Enhanced SPA detection for ${url}: framework=${framework.framework}, ` +
      `strategy=${framework.renderingStrategy}, coverage=${contentCoverage.estimatedCoverage}%, ` +
      `indicators=[${framework.indicators.join(', ')}]`
    );

    return {
      isSinglePage,
      framework,
      contentCoverage,
      contentCoverageWarning,
    };
  } catch (error: any) {
    console.log(`Enhanced SPA detection failed for ${url}:`, error.message);
    return createDefaultSPAResult(['analysis-failed']);
  }
}

async function basicCrawlFallback(baseUrl: string): Promise<SitemapEntry[]> {
  console.log(`Starting enhanced crawling fallback for ${baseUrl}`);

  const discoveredUrls = new Set<string>();
  const pages: SitemapEntry[] = [];

  // Step 1: Extract root domain for consistent URL handling
  const urlObj = new URL(baseUrl);
  const rootDomain = `${urlObj.protocol}//${urlObj.hostname}`;

  // Step 2: Crawl the homepage first to discover internal links
  try {
    const homepageUrls = await crawlPageForLinks(baseUrl, rootDomain);
    homepageUrls.forEach((url) => discoveredUrls.add(url));
    console.log(`Discovered ${homepageUrls.length} links from homepage`);
  } catch (error) {
    console.log(`Homepage crawling failed: ${error.message}`);
  }

  // Step 3: Try common paths
  const commonPaths = [
    '/',
    '/docs',
    '/documentation',
    '/doc',
    '/api',
    '/api-docs',
    '/api/docs',
    '/guides',
    '/guide',
    '/tutorials',
    '/tutorial',
    '/help',
    '/support',
    '/faq',
    '/about',
    '/about-us',
    '/getting-started',
    '/quickstart',
    '/start',
    '/reference',
    '/refs',
    '/examples',
    '/example',
    '/demos',
    '/demo',
    '/blog',
    '/posts',
    '/articles',
    '/news',
    '/updates',
    '/changelog',
    '/releases',
    '/roadmap',
    '/plans',
    '/contact',
    '/contacts',
    '/team',
    '/company',
    '/pricing',
    '/plans',
    '/features',
    '/capabilities',
    '/download',
    '/downloads',
  ];

  for (const path of commonPaths) {
    const url = `${rootDomain}${path}`;
    if (!discoveredUrls.has(url)) {
      discoveredUrls.add(url);
    }
  }

  console.log(`Total URLs to check: ${discoveredUrls.size}`);

  // Step 4: Validate discovered URLs (increased limit for better coverage)
  const maxUrlsToValidate = 500; // Increased to handle sites with many pages like calculator sites
  const validationPromises = Array.from(discoveredUrls)
    .slice(0, maxUrlsToValidate)
    .map(async (url) => {
      try {
        // CRITICAL FIX: Use GET instead of HEAD for better compatibility
        // Many sites block HEAD requests or return different status codes
        const response = await fetchWithTimeout(
          url,
          {
            method: 'GET',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          },
          8000
        ); // Increased timeout since GET takes longer than HEAD

        // Accept 200-299 (OK) and 206 (Partial Content) as valid responses
        if ((response.status >= 200 && response.status < 300) || response.status === 206) {
          return {
            url: url,
            lastmod: response.headers.get('last-modified') || undefined,
            changefreq: 'weekly',
            priority:
              url === baseUrl || url === rootDomain || url === `${rootDomain}/` ? '1.0' : '0.8',
          };
        }
      } catch (error) {
        // Log but ignore errors for individual pages - might be transient
        console.log(`Failed to validate ${url}: ${error.message}`);
      }
      return null;
    });

  const validationResults = await Promise.all(validationPromises);
  const validPages = validationResults.filter((page) => page !== null);
  pages.push(...validPages);

  console.log(`Enhanced crawling found ${pages.length} valid pages`);

  if (pages.length === 0) {
    console.log('WARNING: No pages found through crawling - using homepage as fallback');
    // At minimum, include the original URL
    pages.push({
      url: baseUrl,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: '1.0',
    });
  } else if (pages.length < 5) {
    console.log(
      `WARNING: Only found ${pages.length} pages - site may have JavaScript-rendered content or access restrictions`
    );
  }

  return pages;
}

async function crawlPageForLinks(url: string, rootDomain: string): Promise<string[]> {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      },
      10000
    );

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const links: string[] = [];

    // Extract all internal links (be more aggressive for calculator/tool sites)
    $('a[href], link[href][rel="canonical"], area[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          let fullUrl: string;

          if (href.startsWith('http')) {
            // Absolute URL - only include if same domain
            const linkUrl = new URL(href);
            if (linkUrl.hostname === new URL(rootDomain).hostname) {
              fullUrl = href;
            } else {
              return; // Skip external links
            }
          } else if (href.startsWith('/')) {
            // Relative to root
            fullUrl = `${rootDomain}${href}`;
          } else if (
            href.startsWith('#') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.startsWith('javascript:') ||
            href.startsWith('data:')
          ) {
            // Skip anchors and non-HTTP links
            return;
          } else {
            // Relative to current page
            const baseUrl = new URL(url);
            fullUrl = new URL(href, baseUrl.href).href;
          }

          // Clean up URL (remove fragments, normalize)
          const cleanUrl = new URL(fullUrl);
          cleanUrl.hash = '';
          const finalUrl = cleanUrl.href;

          // Filter out unwanted file types and paths
          if (
            !finalUrl.match(
              /\.(jpg|jpeg|png|gif|pdf|zip|doc|docx|xls|xlsx|ppt|pptx|mp3|mp4|avi|mov)$/i
            ) &&
            !finalUrl.includes('/wp-admin/') &&
            !finalUrl.includes('/admin/') &&
            !finalUrl.includes('/login') &&
            !finalUrl.includes('/logout')
          ) {
            links.push(finalUrl);
          }
        } catch (error) {
          // Skip malformed URLs
        }
      }
    });

    // Return unique links, sorted by URL length (shorter = likely more important)
    const uniqueLinks = [...new Set(links)];
    return uniqueLinks.sort((a, b) => a.length - b.length); // Remove duplicates
  } catch (error) {
    console.log(`Failed to crawl ${url} for links: ${error.message}`);
    return [];
  }
}

export async function parseSitemap(xml: string): Promise<SitemapEntry[]> {
  try {
    // Check if the response is HTML instead of XML (common redirect pattern)
    if (xml.trim().startsWith('<!DOCTYPE html') || xml.trim().startsWith('<html')) {
      console.log('Received HTML instead of XML sitemap, likely a redirect');
      return [];
    }

    const result = await parseStringPromise(xml);
    const entries: SitemapEntry[] = [];

    // Handle sitemap index
    if (result.sitemapindex && result.sitemapindex.sitemap) {
      const sitemaps = Array.isArray(result.sitemapindex.sitemap)
        ? result.sitemapindex.sitemap
        : [result.sitemapindex.sitemap];

      for (const sitemap of sitemaps) {
        const sitemapUrl = sitemap.loc[0];
        try {
          const response = await fetchWithTimeout(sitemapUrl, {}, 10000);
          if (response.ok) {
            const sitemapXml = await response.text();
            const subEntries = await parseSitemap(sitemapXml);
            entries.push(...subEntries);
          }
        } catch (error) {
          console.log(`Failed to fetch sub-sitemap ${sitemapUrl}:`, error.message);
        }
      }
    }

    // Handle regular sitemap
    if (result.urlset && result.urlset.url) {
      const urls = Array.isArray(result.urlset.url) ? result.urlset.url : [result.urlset.url];

      for (const url of urls) {
        entries.push({
          url: url.loc[0],
          lastmod: url.lastmod?.[0],
          changefreq: url.changefreq?.[0],
          priority: url.priority?.[0],
        });
      }
    }

    return entries;
  } catch (error) {
    throw new Error(`Failed to parse sitemap: ${error.message}`);
  }
}

export async function fetchPageContent(url: string): Promise<string> {
  // Updated user agents with more recent browser versions (2024/2025)
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  ];

  const maxRetries = 3;
  let lastError: Error | null = null;

  // Use connection pool for HTTPS URLs only
  const agent = url.startsWith('https') ? connectionPool.getAgent(url) : undefined;

  // Extract domain for Referer header (makes requests look more natural)
  let referer: string;
  try {
    const urlObj = new URL(url);
    referer = `${urlObj.protocol}//${urlObj.hostname}/`;
  } catch {
    referer = url;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Progressive delay between retries (exponential backoff)
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000); // Increased max to 8 seconds
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.log(`Retry attempt ${attempt + 1} for ${url} after ${delay}ms delay`);
      }

      // Rotate user agents to appear more natural
      const userAgent = userAgents[attempt % userAgents.length];

      const response = await fetchWithTimeout(
        url,
        {
          agent, // Use connection pool agent for HTTPS, undefined for HTTP
          headers: {
            'User-Agent': userAgent,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            Referer: referer, // Added Referer header - many sites check this
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin', // Changed from 'none' to look more natural
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            Connection: 'keep-alive',
            DNT: '1', // Do Not Track - common browser header
          },
        },
        15000
      ); // Increased timeout to 15 seconds

      if (!response.ok) {
        // Handle rate limiting specifically
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
          console.log(`Rate limited (429) for ${url}, waiting ${waitTime}ms before retry`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          throw new Error(`Rate limited (HTTP ${response.status})`);
        }

        // For other 4xx/5xx errors, still retry as they might be temporary
        throw new Error(`HTTP ${response.status}`);
      }

      const content = await response.text();

      // Success - log if this was a retry or connection pool usage
      if (attempt > 0) {
        console.log(
          `Successfully fetched ${url} on attempt ${attempt + 1} ${agent ? '(with connection pool)' : '(standard fetch)'}`
        );
      } else if (agent) {
        // Only log connection pool usage on first attempt to avoid spam
        const hostname = new URL(url).hostname;
        console.log(`Fetched ${hostname} using connection pool`);
      }

      return content;
    } catch (error) {
      lastError = error as Error;
      console.log(
        `Fetch attempt ${attempt + 1} failed for ${url}: ${error.message} ${agent ? '(with connection pool)' : '(standard fetch)'}`
      );

      // Don't retry on certain errors that won't be fixed by retrying
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        break;
      }
    }
  }

  // All retries failed
  throw new Error(
    `Failed to fetch ${url} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

export function filterRelevantPages(entries: SitemapEntry[], tier?: string): SitemapEntry[] {
  // For paid tiers, use less aggressive filtering
  const isPaidTier = tier && ['coffee', 'growth', 'scale'].includes(tier);

  const excludePatterns = [
    /\.(jpg|jpeg|png|gif|pdf|zip|xml|json|css|js|woff|woff2|ttf|eot|ico|svg)$/i,
    /\/wp-admin\//i,
    /\/admin\//i,
    /\/login/i,
    /\/register/i,
    /\/cart/i,
    /\/checkout/i,
    /\/account/i,
    /\/dashboard/i,
    /\/tag\//i,
    /\/category\//i,
    /\/page\/\d+/i,
    /\/\d{4}\/\d{2}\/\d{2}\//i, // Date-based URLs
    /\/author\//i,
    /\/user\//i,
    /\/profile\//i,
    /\/wp-content\//i,
    /\/assets\//i,
    /\/static\//i,
    /\/images\//i,
    /\/css\//i,
    /\/js\//i,
    /\/fonts\//i,
    /\/media\//i,
  ];

  // Only apply /search/ filter for free tier
  if (!isPaidTier) {
    excludePatterns.push(/\/search/i);
  }

  const highPriorityPatterns = [
    /\/docs?\//i,
    /\/documentation/i,
    /\/guide/i,
    /\/tutorial/i,
    /\/help/i,
    /\/api/i,
    /\/reference/i,
    /\/manual/i,
    /\/faq/i,
    /\/about/i,
    /\/support/i,
    /\/getting-started/i,
    /\/best-practices/i,
    /\/troubleshooting/i,
    /\/changelog/i,
    /\/roadmap/i,
    /\/features/i,
    /\/pricing/i,
    /\/contact/i,
    /\/learn/i,
    /\/how-to/i,
    /\/examples?/i,
    /\/resources?/i,
    /\/templates?/i,
    /\/integrations?/i,
    /\/tools?/i,
    /\/sdk/i,
    /\/cli/i,
    /\/quickstart/i,
    /\/overview/i,
    /\/introduction/i,
  ];

  const mediumPriorityPatterns = [
    /\/blog/i,
    /\/articles?/i,
    /\/news/i,
    /\/updates/i,
    /\/release-notes/i,
    /\/announcements/i,
    /\/case-studies/i,
    /\/stories/i,
    /\/solutions/i,
    /\/products?/i,
    /\/services?/i,
    /\/platform/i,
    /\/security/i,
    /\/privacy/i,
    /\/legal/i,
    /\/terms/i,
    /\/compliance/i,
    /\/enterprise/i,
    /\/business/i,
    /\/developers?/i,
    /\/community/i,
    /\/partners?/i,
    /\/careers?/i,
    /\/company/i,
    /\/team/i,
    /\/mission/i,
    /\/vision/i,
    /\/values/i,
  ];

  const filtered = entries.filter((entry) => {
    const url = entry.url.toLowerCase();

    // Exclude unwanted patterns
    if (excludePatterns.some((pattern) => pattern.test(url))) {
      return false;
    }

    // Skip URLs with query parameters or fragments
    if (url.includes('?') || url.includes('#')) {
      return false;
    }

    return true;
  });

  // For paid tiers, return all filtered pages without prioritization
  if (isPaidTier) {
    console.log(`🎯 Paid tier (${tier}): returning all ${filtered.length} filtered pages`);
    return filtered;
  }

  // Helper function to identify homepage URLs
  const isHomepage = (url: string): boolean => {
    const urlLower = url.toLowerCase();
    // Root domain or root domain with trailing slash
    return (
      urlLower === urlLower.match(/^https?:\/\/[^\/]+/)?.[0] ||
      urlLower === urlLower.match(/^https?:\/\/[^\/]+/)?.[0] + '/'
    );
  };

  // Sort by priority: homepage first, then high priority, then medium, then others
  const prioritized = filtered.sort((a, b) => {
    const urlA = a.url.toLowerCase();
    const urlB = b.url.toLowerCase();

    // Homepage always comes first (highest priority)
    const isHomepageA = isHomepage(a.url);
    const isHomepageB = isHomepage(b.url);

    if (isHomepageA && !isHomepageB) return -1;
    if (!isHomepageA && isHomepageB) return 1;

    const isHighPriorityA = highPriorityPatterns.some((pattern) => pattern.test(urlA));
    const isHighPriorityB = highPriorityPatterns.some((pattern) => pattern.test(urlB));

    if (isHighPriorityA && !isHighPriorityB) return -1;
    if (!isHighPriorityA && isHighPriorityB) return 1;

    const isMediumPriorityA = mediumPriorityPatterns.some((pattern) => pattern.test(urlA));
    const isMediumPriorityB = mediumPriorityPatterns.some((pattern) => pattern.test(urlB));

    if (isMediumPriorityA && !isMediumPriorityB) return -1;
    if (!isMediumPriorityA && isMediumPriorityB) return 1;

    return 0;
  });

  return prioritized;
}

/**
 * Helper function to add delay between requests
 * Prevents overwhelming servers with too many concurrent requests
 */
async function delayedFetch(
  entry: SitemapEntry,
  index: number,
  useAI: boolean,
  baseDelay: number = 200
): Promise<{
  url: string;
  title: string;
  description: string;
  qualityScore: number;
  category: string;
  lastModified?: string;
  success: boolean;
}> {
  // Stagger requests within batch to avoid rate limiting
  // Each request waits (index * baseDelay) ms before starting
  await new Promise((resolve) => setTimeout(resolve, index * baseDelay));

  try {
    const content = await fetchPageContent(entry.url);
    const analysis = await analyzePageContent(entry.url, content, useAI);

    return {
      url: entry.url,
      title: analysis.title,
      description: analysis.description,
      qualityScore: analysis.qualityScore,
      category: analysis.category,
      lastModified: entry.lastmod,
      success: true,
    };
  } catch (error) {
    console.log(`Failed to analyze ${entry.url}:`, error.message);
    return {
      url: entry.url,
      title: 'Analysis Failed',
      description: 'Unable to analyze this page',
      qualityScore: 1,
      category: 'Error',
      lastModified: entry.lastmod,
      success: false,
    };
  }
}

export async function analyzeDiscoveredPages(
  entries: SitemapEntry[],
  useAI: boolean = false,
  maxPagesLimit: number = 200,
  tier?: string
): Promise<DiscoveredPage[]> {
  const relevantPages = filterRelevantPages(entries, tier);
  const pages: DiscoveredPage[] = [];

  // Use tier-based limit instead of hardcoded 200
  const maxPages = Math.min(maxPagesLimit, relevantPages.length);
  const pagesToAnalyze = relevantPages.slice(0, maxPages);

  console.log(`Analyzing ${pagesToAnalyze.length} pages from ${entries.length} discovered pages`);

  // Track consecutive failures to detect bot protection
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 10;

  // IMPROVED: Smaller batch size with staggered requests to avoid rate limiting
  // This is critical for sites like WordPress.org that have aggressive rate limiting
  const batchSize = 5; // Reduced from 20 to 5 for better rate limit compliance
  const intraRequestDelay = 300; // 300ms between requests within a batch

  for (let i = 0; i < pagesToAnalyze.length; i += batchSize) {
    const batch = pagesToAnalyze.slice(i, i + batchSize);

    // Process batch with staggered delays to avoid overwhelming the server
    const batchPromises = batch.map((entry, index) =>
      delayedFetch(entry, index, useAI, intraRequestDelay)
    );

    const batchResults = await Promise.allSettled(batchPromises);

    let batchFailures = 0;
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { success, ...pageData } = result.value;
        pages.push(pageData);

        if (!success) {
          batchFailures++;
          consecutiveFailures++;
        } else {
          consecutiveFailures = 0; // Reset on success
        }
      }
    });

    // Log progress for visibility
    const successCount = batchResults.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    console.log(
      `Batch ${Math.floor(i / batchSize) + 1}: ${successCount}/${batch.length} pages succeeded`
    );

    // Early exit if we detect bot protection (all pages failing)
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.log(
        `Detected potential bot protection (${consecutiveFailures} consecutive failures). Stopping analysis.`
      );
      break;
    }

    // IMPROVED: Longer delay between batches to respect rate limits
    if (i + batchSize < pagesToAnalyze.length) {
      const interBatchDelay = batchFailures > 0 ? 2000 : 1000; // Longer delay if failures detected
      await new Promise((resolve) => setTimeout(resolve, interBatchDelay));
    }
  }

  return pages.sort((a, b) => b.qualityScore - a.qualityScore);
}
