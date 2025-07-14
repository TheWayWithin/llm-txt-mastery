import { parseStringPromise } from "xml2js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { DiscoveredPage } from "@shared/schema";
import { analyzePageContent } from "./openai";

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export async function fetchSitemap(baseUrl: string): Promise<SitemapEntry[]> {
  // Extract root domain for sitemap discovery
  const urlObj = new URL(baseUrl);
  const rootDomain = `${urlObj.protocol}//${urlObj.hostname}`;
  
  console.log(`Searching for sitemap for baseUrl: ${baseUrl}, rootDomain: ${rootDomain}`);
  
  const sitemapUrls = [
    `${rootDomain}/sitemap.xml`,
    `${rootDomain}/sitemap_index.xml`,
    `${rootDomain}/sitemap/sitemap.xml`,
    `${rootDomain}/sitemaps/sitemap.xml`,
    `${rootDomain}/wp-sitemap.xml`,
    `${rootDomain}/sitemap-index.xml`,
    `${rootDomain}/post-sitemap.xml`
  ];

  for (const sitemapUrl of sitemapUrls) {
    try {
      console.log(`Trying sitemap URL: ${sitemapUrl}`);
      const response = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'LLM.txt Mastery Bot 1.0'
        },
        timeout: 10000
      });

      if (response.ok) {
        console.log(`Successfully fetched sitemap from: ${sitemapUrl}`);
        const xml = await response.text();
        const entries = await parseSitemap(xml);
        console.log(`Parsed ${entries.length} entries from sitemap`);
        return entries;
      } else {
        console.log(`HTTP ${response.status} for ${sitemapUrl}`);
      }
    } catch (error) {
      console.log(`Failed to fetch ${sitemapUrl}:`, error.message);
    }
  }

  // Fallback: try to discover pages from robots.txt
  try {
    const robotsResponse = await fetch(`${rootDomain}/robots.txt`);
    if (robotsResponse.ok) {
      const robotsText = await robotsResponse.text();
      const sitemapMatch = robotsText.match(/Sitemap:\s*(.+)/i);
      if (sitemapMatch) {
        const sitemapUrl = sitemapMatch[1].trim();
        console.log(`Found sitemap in robots.txt: ${sitemapUrl}`);
        const response = await fetch(sitemapUrl, {
          headers: {
            'User-Agent': 'LLM.txt Mastery Bot 1.0'
          },
          timeout: 10000
        });
        if (response.ok) {
          const xml = await response.text();
          const entries = await parseSitemap(xml);
          console.log(`Successfully parsed sitemap from robots.txt: ${entries.length} entries`);
          return entries;
        }
      }
    }
  } catch (error) {
    console.log("Robots.txt fallback failed:", error.message);
  }

  // Final fallback: basic page crawling
  console.log("No sitemap found, using basic crawling fallback");
  return await basicCrawlFallback(rootDomain);
}

async function basicCrawlFallback(baseUrl: string): Promise<SitemapEntry[]> {
  const commonPaths = [
    '/',
    '/docs',
    '/documentation',
    '/api',
    '/guides',
    '/guide',
    '/tutorials',
    '/tutorial',
    '/help',
    '/support',
    '/about',
    '/getting-started',
    '/quickstart',
    '/reference',
    '/examples',
    '/blog',
    '/news',
    '/faq',
    '/changelog',
    '/roadmap'
  ];

  const pages: SitemapEntry[] = [];
  
  for (const path of commonPaths) {
    const url = `${baseUrl}${path}`;
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'LLM.txt Mastery Bot 1.0'
        },
        timeout: 5000
      });

      if (response.ok) {
        pages.push({
          url: url,
          lastmod: response.headers.get('last-modified') || undefined,
          changefreq: 'weekly',
          priority: path === '/' ? '1.0' : '0.8'
        });
      }
    } catch (error) {
      // Ignore errors for individual pages
    }
  }

  if (pages.length === 0) {
    // At minimum, include the homepage
    pages.push({
      url: baseUrl,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: '1.0'
    });
  }

  return pages;
}

export async function parseSitemap(xml: string): Promise<SitemapEntry[]> {
  try {
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
          const response = await fetch(sitemapUrl);
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
      const urls = Array.isArray(result.urlset.url) 
        ? result.urlset.url 
        : [result.urlset.url];

      for (const url of urls) {
        entries.push({
          url: url.loc[0],
          lastmod: url.lastmod?.[0],
          changefreq: url.changefreq?.[0],
          priority: url.priority?.[0]
        });
      }
    }

    return entries;
  } catch (error) {
    throw new Error(`Failed to parse sitemap: ${error.message}`);
  }
}

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LLM.txt Mastery Bot 1.0'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}

export function filterRelevantPages(entries: SitemapEntry[]): SitemapEntry[] {
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
    /\/search/i,
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
    /\/media\//i
  ];

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
    /\/introduction/i
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
    /\/values/i
  ];

  const filtered = entries.filter(entry => {
    const url = entry.url.toLowerCase();
    
    // Exclude unwanted patterns
    if (excludePatterns.some(pattern => pattern.test(url))) {
      return false;
    }

    // Skip URLs with query parameters or fragments
    if (url.includes('?') || url.includes('#')) {
      return false;
    }

    return true;
  });

  // Sort by priority: high priority first, then medium, then others
  const prioritized = filtered.sort((a, b) => {
    const urlA = a.url.toLowerCase();
    const urlB = b.url.toLowerCase();
    
    const isHighPriorityA = highPriorityPatterns.some(pattern => pattern.test(urlA));
    const isHighPriorityB = highPriorityPatterns.some(pattern => pattern.test(urlB));
    
    if (isHighPriorityA && !isHighPriorityB) return -1;
    if (!isHighPriorityA && isHighPriorityB) return 1;
    
    const isMediumPriorityA = mediumPriorityPatterns.some(pattern => pattern.test(urlA));
    const isMediumPriorityB = mediumPriorityPatterns.some(pattern => pattern.test(urlB));
    
    if (isMediumPriorityA && !isMediumPriorityB) return -1;
    if (!isMediumPriorityA && isMediumPriorityB) return 1;
    
    // Homepage always comes first
    if (urlA.endsWith('/') && urlA.split('/').length <= 4) return -1;
    if (urlB.endsWith('/') && urlB.split('/').length <= 4) return 1;
    
    return 0;
  });

  return prioritized;
}

export async function analyzeDiscoveredPages(entries: SitemapEntry[], useAI: boolean = false): Promise<DiscoveredPage[]> {
  const relevantPages = filterRelevantPages(entries);
  const pages: DiscoveredPage[] = [];

  // Limit to first 50 pages for better performance but still comprehensive coverage
  const maxPages = Math.min(50, relevantPages.length);
  const pagesToAnalyze = relevantPages.slice(0, maxPages);

  console.log(`Analyzing ${pagesToAnalyze.length} pages from ${entries.length} discovered pages`);

  // Process pages in larger batches for better performance
  const batchSize = 20;
  for (let i = 0; i < pagesToAnalyze.length; i += batchSize) {
    const batch = pagesToAnalyze.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (entry) => {
      try {
        const content = await fetchPageContent(entry.url);
        const analysis = await analyzePageContent(entry.url, content, useAI);
        
        return {
          url: entry.url,
          title: analysis.title,
          description: analysis.description,
          qualityScore: analysis.qualityScore,
          category: analysis.category,
          lastModified: entry.lastmod
        };
      } catch (error) {
        console.log(`Failed to analyze ${entry.url}:`, error.message);
        return {
          url: entry.url,
          title: "Analysis Failed",
          description: "Unable to analyze this page",
          qualityScore: 1,
          category: "Error",
          lastModified: entry.lastmod
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result) => {
      if (result.status === "fulfilled") {
        pages.push(result.value);
      }
    });

    // Reduced delay between batches
    if (i + batchSize < pagesToAnalyze.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return pages.sort((a, b) => b.qualityScore - a.qualityScore);
}
