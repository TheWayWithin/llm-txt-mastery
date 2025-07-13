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
  const sitemapUrls = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap/sitemap.xml`,
    `${baseUrl}/sitemaps/sitemap.xml`
  ];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'LLM.txt Mastery Bot 1.0'
        },
        timeout: 10000
      });

      if (response.ok) {
        const xml = await response.text();
        return await parseSitemap(xml);
      }
    } catch (error) {
      console.log(`Failed to fetch ${sitemapUrl}:`, error.message);
    }
  }

  // Fallback: try to discover pages from robots.txt
  try {
    const robotsResponse = await fetch(`${baseUrl}/robots.txt`);
    if (robotsResponse.ok) {
      const robotsText = await robotsResponse.text();
      const sitemapMatch = robotsText.match(/Sitemap:\s*(.+)/i);
      if (sitemapMatch) {
        const sitemapUrl = sitemapMatch[1].trim();
        const response = await fetch(sitemapUrl);
        if (response.ok) {
          const xml = await response.text();
          return await parseSitemap(xml);
        }
      }
    }
  } catch (error) {
    console.log("Robots.txt fallback failed:", error.message);
  }

  throw new Error("Could not find or parse sitemap.xml");
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
    /\.(jpg|jpeg|png|gif|pdf|zip|xml|json)$/i,
    /\/wp-admin\//i,
    /\/admin\//i,
    /\/login/i,
    /\/register/i,
    /\/cart/i,
    /\/checkout/i,
    /\/account/i,
    /\/dashboard/i,
    /\?/,
    /#/,
    /\/search/i,
    /\/tag\//i,
    /\/category\//i,
    /\/page\/\d+/i
  ];

  const includePatterns = [
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
    /\/blog/i,
    /\/articles?/i,
    /\/resources?/i,
    /\/examples?/i,
    /\/getting-started/i,
    /\/best-practices/i,
    /\/troubleshooting/i,
    /\/changelog/i,
    /\/roadmap/i
  ];

  return entries.filter(entry => {
    const url = entry.url.toLowerCase();
    
    // Exclude unwanted patterns
    if (excludePatterns.some(pattern => pattern.test(url))) {
      return false;
    }

    // Prefer pages with include patterns
    if (includePatterns.some(pattern => pattern.test(url))) {
      return true;
    }

    // Include main pages and paths without file extensions
    return !url.includes('.') || url.endsWith('/');
  });
}

export async function analyzeDiscoveredPages(entries: SitemapEntry[]): Promise<DiscoveredPage[]> {
  const relevantPages = filterRelevantPages(entries);
  const pages: DiscoveredPage[] = [];

  // Process pages in batches to avoid overwhelming the server
  const batchSize = 10;
  for (let i = 0; i < relevantPages.length; i += batchSize) {
    const batch = relevantPages.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (entry) => {
      try {
        const content = await fetchPageContent(entry.url);
        const analysis = await analyzePageContent(entry.url, content);
        
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

    // Add delay between batches to be respectful
    if (i + batchSize < relevantPages.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return pages.sort((a, b) => b.qualityScore - a.qualityScore);
}
