import { DiscoveredPage } from "@shared/schema";

export interface DeduplicationResult {
  uniquePages: DiscoveredPage[];
  duplicatesRemoved: number;
  redirectsResolved: number;
}

/**
 * Smart link deduplication and filtering
 */
export async function deduplicateAndFilterPages(pages: DiscoveredPage[]): Promise<DeduplicationResult> {
  let uniquePages: DiscoveredPage[] = [];
  let duplicatesRemoved = 0;
  let redirectsResolved = 0;
  
  // Step 1: Normalize URLs and remove obvious duplicates
  const normalizedPages = new Map<string, DiscoveredPage>();
  
  for (const page of pages) {
    const normalizedUrl = normalizeUrl(page.url);
    
    // If we already have this URL, keep the one with higher quality score
    if (normalizedPages.has(normalizedUrl)) {
      const existingPage = normalizedPages.get(normalizedUrl)!;
      if (page.qualityScore > existingPage.qualityScore) {
        normalizedPages.set(normalizedUrl, page);
        duplicatesRemoved++;
      } else {
        duplicatesRemoved++;
      }
    } else {
      normalizedPages.set(normalizedUrl, page);
    }
  }
  
  // Step 2: Detect near-duplicate content by title similarity
  const finalPages: DiscoveredPage[] = [];
  const processedPages = Array.from(normalizedPages.values());
  
  for (let i = 0; i < processedPages.length; i++) {
    const currentPage = processedPages[i];
    let isDuplicate = false;
    
    // Check against already processed pages
    for (const existingPage of finalPages) {
      if (arePagesNearDuplicates(currentPage, existingPage)) {
        // Keep the one with higher quality score
        if (currentPage.qualityScore > existingPage.qualityScore) {
          // Replace existing page
          const existingIndex = finalPages.indexOf(existingPage);
          finalPages[existingIndex] = currentPage;
        }
        isDuplicate = true;
        duplicatesRemoved++;
        break;
      }
    }
    
    if (!isDuplicate) {
      finalPages.push(currentPage);
    }
  }
  
  // Step 3: Filter out low-value pages
  uniquePages = finalPages.filter(isValidPage);
  
  return {
    uniquePages,
    duplicatesRemoved,
    redirectsResolved // Note: redirect resolution would require HTTP calls, keeping 0 for now
  };
}

/**
 * Normalize URLs for comparison
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove trailing slash
    let pathname = urlObj.pathname;
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }
    
    // Remove common query parameters that don't affect content
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source'];
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
    
    // Normalize fragment (remove it as it typically doesn't affect content)
    urlObj.hash = '';
    
    return `${urlObj.protocol}//${urlObj.host}${pathname}${urlObj.search}`;
  } catch (error) {
    return url; // Return original if URL parsing fails
  }
}

/**
 * Check if two pages are near-duplicates based on title and URL similarity
 */
function arePagesNearDuplicates(page1: DiscoveredPage, page2: DiscoveredPage): boolean {
  // Don't consider pages duplicates if they're in different categories
  if (page1.category !== page2.category && 
      page1.category !== 'General' && 
      page2.category !== 'General') {
    return false;
  }
  
  // Check title similarity (remove common words and compare)
  const title1 = normalizeTitle(page1.title);
  const title2 = normalizeTitle(page2.title);
  
  if (title1 === title2) {
    return true;
  }
  
  // Check for very similar titles (80% similarity threshold)
  const similarity = calculateStringSimilarity(title1, title2);
  if (similarity > 0.8) {
    return true;
  }
  
  // Check for URL path similarity (same path with minor variations)
  if (areUrlPathsSimilar(page1.url, page2.url)) {
    return true;
  }
  
  return false;
}

/**
 * Normalize titles for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/g, '') // Remove common words
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate string similarity using Jaccard similarity
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(str2.split(' ').filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Check if URL paths are similar (accounting for variations)
 */
function areUrlPathsSimilar(url1: string, url2: string): boolean {
  try {
    const path1 = new URL(url1).pathname;
    const path2 = new URL(url2).pathname;
    
    // Remove trailing slashes and normalize
    const normPath1 = path1.replace(/\/$/, '').toLowerCase();
    const normPath2 = path2.replace(/\/$/, '').toLowerCase();
    
    // Exact match
    if (normPath1 === normPath2) {
      return true;
    }
    
    // Check for common variations (index files)
    const indexVariations = ['/index', '/index.html', '/index.php'];
    for (const variation of indexVariations) {
      if ((normPath1 === normPath2 + variation) || 
          (normPath2 === normPath1 + variation)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Filter out low-value pages
 */
function isValidPage(page: DiscoveredPage): boolean {
  const url = page.url.toLowerCase();
  const title = page.title.toLowerCase();
  
  // Remove file downloads
  if (url.match(/\.(pdf|doc|docx|xls|xlsx|zip|tar|gz|rar)$/)) {
    return false;
  }
  
  // Remove admin and login pages
  if (url.includes('/admin') || url.includes('/login') || 
      url.includes('/wp-admin') || url.includes('/dashboard')) {
    return false;
  }
  
  // Remove obvious navigation/menu pages with very short titles
  if (title.length < 5 || title === 'home' || title === 'menu' || title === 'navigation') {
    return false;
  }
  
  // Remove pages with very low quality scores (likely navigation or error pages)
  if (page.qualityScore <= 1) {
    return false;
  }
  
  // Remove pages with generic error titles
  if (title.includes('404') || title.includes('not found') || 
      title.includes('error') || title.includes('forbidden')) {
    return false;
  }
  
  return true;
}

/**
 * Check if a URL is likely broken (basic validation)
 * Note: Full HTTP checking would require actual requests
 */
export function isLikelyBrokenUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Check for malformed URLs
    if (!urlObj.protocol.startsWith('http')) {
      return true;
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /localhost/,
      /127\.0\.0\.1/,
      /\.\./,
      /\s/,
      /[<>]/
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(url));
  } catch (error) {
    return true; // Invalid URL
  }
}

/**
 * Enhanced filtering for affiliate and low-value links
 */
export function removeAffiliateAndLowValueLinks(pages: DiscoveredPage[]): DiscoveredPage[] {
  return pages.filter(page => {
    const url = page.url.toLowerCase();
    
    // Remove affiliate links
    const affiliatePatterns = [
      /[?&]affiliate(_id)?=/,
      /[?&]ref=/,
      /[?&]referrer=/,
      /\/go\//,
      /\/out\//,
      /\/track\//,
      /\/aff\//,
      /amzn\.to/,
      /bit\.ly/,
      /tinyurl/
    ];
    
    if (affiliatePatterns.some(pattern => pattern.test(url))) {
      return false;
    }
    
    // Remove "read more" teasers and pagination
    if (page.description.toLowerCase().includes('read more') && 
        page.description.length < 100) {
      return false;
    }
    
    // Remove pagination pages
    if (url.includes('/page/') || url.includes('/p/') || 
        url.match(/[?&]page=\d+/)) {
      return false;
    }
    
    return true;
  });
}