import { parseStringPromise } from "xml2js";
import fetch from "node-fetch";

// Helper function to implement fetch with timeout using AbortController
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
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

async function parseSitemap(xml) {
  try {
    // Check if the response is HTML instead of XML (common redirect pattern)
    if (xml.trim().startsWith('<!DOCTYPE html') || xml.trim().startsWith('<html')) {
      console.log('Received HTML instead of XML sitemap, likely a redirect');
      return [];
    }
    
    const result = await parseStringPromise(xml);
    const entries = [];

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

function filterRelevantPages(entries, tier) {
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
    /\/media\//i
  ];
  
  // Only apply /search/ filter for free tier
  if (!isPaidTier) {
    excludePatterns.push(/\/search/i);
  }

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
  
  return filtered;
}

async function performSitemapDiscovery(baseUrl) {
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
      const response = await fetchWithTimeout(sitemapUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }, 10000);

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
          return {
            entries,
            sitemapFound: true,
            analysisMethod: "sitemap",
            message: `Found sitemap with ${entries.length} pages`
          };
        }
      } else {
        console.log(`HTTP ${response.status} for ${sitemapUrl}`);
      }
    } catch (error) {
      console.log(`Failed to fetch ${sitemapUrl}:`, error.message);
    }
  }

  return {
    entries: [],
    sitemapFound: false,
    analysisMethod: "fallback-crawl",
    message: "No sitemap found"
  };
}

async function testFullSitemapFlow() {
  try {
    console.log("=== TESTING FULL SITEMAP FLOW FOR freecalchub.com ===");
    
    // Test sitemap discovery
    const sitemapResult = await performSitemapDiscovery("https://freecalchub.com");
    console.log("\n=== SITEMAP DISCOVERY RESULT ===");
    console.log("Found sitemap:", sitemapResult.sitemapFound);
    console.log("Method:", sitemapResult.analysisMethod);
    console.log("Total entries:", sitemapResult.entries.length);
    console.log("Message:", sitemapResult.message);
    
    if (sitemapResult.entries.length > 0) {
      console.log("First 5 URLs:");
      sitemapResult.entries.slice(0, 5).forEach((entry, i) => {
        console.log(`  ${i + 1}. ${entry.url}`);
      });
      
      // Test filtering for different tiers
      console.log("\n=== TESTING FILTERING FOR DIFFERENT TIERS ===");
      
      // Test starter tier (free)
      const starterFiltered = filterRelevantPages(sitemapResult.entries, 'starter');
      console.log(`Starter tier filtering: ${sitemapResult.entries.length} → ${starterFiltered.length} pages`);
      
      // Test coffee tier (paid)
      const coffeeFiltered = filterRelevantPages(sitemapResult.entries, 'coffee');
      console.log(`Coffee tier filtering: ${sitemapResult.entries.length} → ${coffeeFiltered.length} pages`);
      
      if (starterFiltered.length === 0) {
        console.log("\n🚨 PROBLEM FOUND: Starter tier filtering removes ALL URLs!");
        console.log("Checking why URLs are being filtered...");
        
        // Debug which patterns are matching
        const excludePatterns = [
          { pattern: /\.(jpg|jpeg|png|gif|pdf|zip|xml|json|css|js|woff|woff2|ttf|eot|ico|svg)$/i, name: "file extensions" },
          { pattern: /\/wp-admin\//i, name: "wp-admin" },
          { pattern: /\/admin\//i, name: "admin" },
          { pattern: /\/login/i, name: "login" },
          { pattern: /\/register/i, name: "register" },
          { pattern: /\/cart/i, name: "cart" },
          { pattern: /\/checkout/i, name: "checkout" },
          { pattern: /\/account/i, name: "account" },
          { pattern: /\/dashboard/i, name: "dashboard" },
          { pattern: /\/tag\//i, name: "tag" },
          { pattern: /\/category\//i, name: "category" },
          { pattern: /\/page\/\d+/i, name: "pagination" },
          { pattern: /\/\d{4}\/\d{2}\/\d{2}\//i, name: "date-based" },
          { pattern: /\/author\//i, name: "author" },
          { pattern: /\/user\//i, name: "user" },
          { pattern: /\/profile\//i, name: "profile" },
          { pattern: /\/wp-content\//i, name: "wp-content" },
          { pattern: /\/assets\//i, name: "assets" },
          { pattern: /\/static\//i, name: "static" },
          { pattern: /\/images\//i, name: "images" },
          { pattern: /\/css\//i, name: "css" },
          { pattern: /\/js\//i, name: "js" },
          { pattern: /\/fonts\//i, name: "fonts" },
          { pattern: /\/media\//i, name: "media" },
          { pattern: /\/search/i, name: "search (starter tier only)" }
        ];
        
        console.log("\nChecking first 10 URLs against patterns:");
        sitemapResult.entries.slice(0, 10).forEach((entry, i) => {
          const url = entry.url.toLowerCase();
          const matchingPatterns = excludePatterns.filter(p => p.pattern.test(url));
          const hasQueryOrFragment = url.includes('?') || url.includes('#');
          
          console.log(`\n${i + 1}. ${entry.url}`);
          console.log(`   Query/Fragment: ${hasQueryOrFragment}`);
          if (matchingPatterns.length > 0) {
            console.log(`   Matching patterns: ${matchingPatterns.map(p => p.name).join(', ')}`);
          } else {
            console.log(`   No patterns match - should be included!`);
          }
        });
      }
      
      if (coffeeFiltered.length !== starterFiltered.length) {
        console.log(`\nTier difference detected: ${coffeeFiltered.length - starterFiltered.length} more pages for paid tier`);
      }
    }
    
  } catch (error) {
    console.error("Error in full flow test:", error.message);
    console.error("Stack:", error.stack);
  }
}

testFullSitemapFlow();