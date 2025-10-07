// Debug script to find the exact issue with Coffee tier returning 0 pages

import { fetchSitemap, filterRelevantPages } from './server/services/sitemap';

async function debugIssue() {
  const sites = ['https://freecalchub.com', 'https://home.cern'];

  console.log('=== DEBUGGING COFFEE TIER 0 PAGES ISSUE ===\n');

  for (const site of sites) {
    console.log(`Testing ${site}:`);
    console.log('='.repeat(60));

    // Test 1: Basic sitemap fetch
    console.log('\n1. Basic sitemap fetch:');
    const result1 = await fetchSitemap(site);
    console.log(`   Entries found: ${result1.entries.length}`);
    console.log(`   Method: ${result1.analysisMethod}`);
    console.log(`   Message: ${result1.message}`);

    if (result1.entries.length === 0) {
      console.log('\n❌ PROBLEM: fetchSitemap returned 0 entries!');
      console.log('   This would cause the analysis to fail immediately.');
    }

    // Test 2: Test with www prefix
    const wwwSite = site.replace('https://', 'https://www.');
    console.log(`\n2. Testing with www prefix (${wwwSite}):`);
    const result2 = await fetchSitemap(wwwSite);
    console.log(`   Entries found: ${result2.entries.length}`);

    // Test 3: Filter for different tiers
    if (result1.entries.length > 0) {
      console.log('\n3. Testing filtering:');
      const starterFiltered = filterRelevantPages(result1.entries, 'starter');
      const coffeeFiltered = filterRelevantPages(result1.entries, 'coffee');
      console.log(`   Starter tier: ${starterFiltered.length} pages`);
      console.log(`   Coffee tier: ${coffeeFiltered.length} pages`);

      if (coffeeFiltered.length === 0 && result1.entries.length > 0) {
        console.log('\n❌ PROBLEM: Coffee tier filtering removes ALL pages!');
      }
    }

    console.log('\n');
  }

  // Test 4: Check if there's an issue with URL normalization
  console.log('4. Testing URL variations:');
  const urlVariations = [
    'https://freecalchub.com',
    'https://freecalchub.com/',
    'https://www.freecalchub.com',
    'https://www.freecalchub.com/',
    'http://freecalchub.com',
    'freecalchub.com',
  ];

  for (const url of urlVariations) {
    try {
      const result = await fetchSitemap(url);
      console.log(`   ${url}: ${result.entries.length} pages`);
    } catch (error: any) {
      console.log(`   ${url}: ERROR - ${error.message}`);
    }
  }
}

debugIssue().catch(console.error);
