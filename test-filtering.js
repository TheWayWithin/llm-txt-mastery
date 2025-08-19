// Test filtering logic with freecalchub.com URLs
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

// Copy of the filtering logic from sitemap.ts
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

  console.log(`Filtering with isPaidTier: ${isPaidTier}, tier: ${tier}`);
  console.log(`Number of exclude patterns: ${excludePatterns.length}`);
  
  const filtered = entries.filter(entry => {
    const url = entry.url.toLowerCase();
    
    // Exclude unwanted patterns
    const isExcluded = excludePatterns.some(pattern => pattern.test(url));
    if (isExcluded) {
      console.log(`❌ Excluded: ${entry.url} (matched exclusion pattern)`);
      return false;
    }

    // Skip URLs with query parameters or fragments
    if (url.includes('?') || url.includes('#')) {
      console.log(`❌ Excluded: ${entry.url} (has query params or fragments)`);
      return false;
    }

    console.log(`✅ Included: ${entry.url}`);
    return true;
  });
  
  console.log(`\nFiltering complete: ${entries.length} -> ${filtered.length} pages`);
  return filtered;
}

async function testFiltering() {
  console.log('=== Testing Filtering Logic with freecalchub.com ===\n');
  
  try {
    // Fetch and parse the sitemap
    const sitemapUrl = 'https://freecalchub.com/sitemap.xml';
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xml = await response.text();
    const result = await parseStringPromise(xml);
    
    if (result.urlset && result.urlset.url) {
      const urls = Array.isArray(result.urlset.url) 
        ? result.urlset.url 
        : [result.urlset.url];
      
      const entries = urls.map(url => ({
        url: url.loc[0],
        lastmod: url.lastmod?.[0],
        changefreq: url.changefreq?.[0],
        priority: url.priority?.[0]
      }));
      
      console.log(`Original URLs from sitemap: ${entries.length}`);
      console.log('\nFirst 20 URLs:');
      entries.slice(0, 20).forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.url}`);
      });
      
      // Test with free tier
      console.log('\n\n=== TESTING FREE TIER FILTERING ===');
      const freeFiltered = filterRelevantPages(entries, 'free');
      
      console.log(`\nFree tier result: ${freeFiltered.length} pages`);
      if (freeFiltered.length > 0) {
        console.log('\nFirst 10 filtered pages:');
        freeFiltered.slice(0, 10).forEach((entry, index) => {
          console.log(`${index + 1}. ${entry.url}`);
        });
      } else {
        console.log('❌ CRITICAL: No pages passed the filtering for free tier!');
      }
      
      // Test without tier (should be same as free)
      console.log('\n\n=== TESTING NO TIER (should be same as free) ===');
      const noTierFiltered = filterRelevantPages(entries);
      console.log(`No tier result: ${noTierFiltered.length} pages`);
      
      // Test with paid tier
      console.log('\n\n=== TESTING PAID TIER (coffee) FILTERING ===');
      const paidFiltered = filterRelevantPages(entries, 'coffee');
      console.log(`Paid tier result: ${paidFiltered.length} pages`);
      
    } else {
      console.log('❌ No URLs found in sitemap');
    }
    
  } catch (error) {
    console.error('❌ Error during filtering test:', error.message);
  }
}

testFiltering().catch(console.error);