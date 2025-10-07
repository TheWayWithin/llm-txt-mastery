import {
  fetchSitemap,
  filterRelevantPages,
  analyzeDiscoveredPages,
} from './server/services/sitemap';

async function testCoffeeTierAnalysis() {
  console.log('=== TESTING COFFEE TIER ANALYSIS ===\n');

  const testSites = ['https://freecalchub.com', 'https://home.cern'];

  for (const site of testSites) {
    console.log(`\nTesting ${site}:`);
    console.log('='.repeat(50));

    try {
      // Step 1: Fetch sitemap
      const sitemapResult = await fetchSitemap(site);
      console.log(`1. Sitemap discovery: ${sitemapResult.entries.length} pages found`);

      // Step 2: Filter for coffee tier
      const coffeeFiltered = filterRelevantPages(sitemapResult.entries, 'coffee');
      console.log(`2. Coffee tier filtering: ${coffeeFiltered.length} pages after filter`);

      // Step 3: Analyze pages (simulate)
      console.log(`3. Starting page analysis for coffee tier...`);
      const analyzed = await analyzeDiscoveredPages(
        sitemapResult.entries,
        false, // useAI (set to false for testing)
        200, // maxPagesLimit
        'coffee' // tier
      );
      console.log(`4. Analysis complete: ${analyzed.length} pages analyzed`);

      // Show first few pages
      if (analyzed.length > 0) {
        console.log('\nFirst 5 analyzed pages:');
        analyzed.slice(0, 5).forEach((page, i) => {
          console.log(`  ${i + 1}. ${page.url}`);
          console.log(`     Title: ${page.title}`);
          console.log(`     Score: ${page.qualityScore}`);
        });
      } else {
        console.log('\n❌ NO PAGES ANALYZED!');
      }
    } catch (error: any) {
      console.error(`Error testing ${site}:`, error.message);
    }
  }
}

// Set OpenAI key for testing
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test';

testCoffeeTierAnalysis().catch(console.error);
