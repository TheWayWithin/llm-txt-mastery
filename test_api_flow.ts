import { fetchSitemap } from './server/services/sitemap';
import { analyzeDiscoveredPagesWithCache } from './server/services/sitemap-enhanced';
import { getUserTier, getUserTierFromAuth } from './server/services/usage';
import { storage } from './server/storage';

async function testApiFlow() {
  const testEmail = 'jamie.watters.mail@icloud.com';
  const testUrl = 'https://freecalchub.com';

  console.log('=== TESTING EXACT API FLOW ===\n');

  // Step 1: Check tier detection
  console.log('1. Testing tier detection:');
  const directTier = await getUserTier(testEmail);
  console.log(`   Direct getUserTier: ${directTier}`);

  const authTier = await getUserTierFromAuth(undefined, testEmail);
  console.log(`   getUserTierFromAuth (no user): ${authTier}`);

  // Step 2: Check email capture
  console.log('\n2. Checking email capture:');
  const emailCapture = await storage.getEmailCapture(testEmail);
  console.log(`   Email capture tier: ${emailCapture?.tier || 'not found'}`);
  console.log(
    `   Email capture data:`,
    emailCapture
      ? {
          id: emailCapture.id,
          email: emailCapture.email,
          tier: emailCapture.tier,
          createdAt: emailCapture.createdAt,
        }
      : null
  );

  // Step 3: Fetch sitemap
  console.log('\n3. Fetching sitemap:');
  const sitemapResult = await fetchSitemap(testUrl);
  console.log(`   Found ${sitemapResult.entries.length} pages`);
  console.log(`   Method: ${sitemapResult.analysisMethod}`);

  // Step 4: Analyze with cache (this is where the issue might be)
  console.log('\n4. Testing analyzeDiscoveredPagesWithCache:');
  console.log(`   Calling with tier: "${authTier}"`);

  try {
    const { pages, metrics } = await analyzeDiscoveredPagesWithCache(
      sitemapResult.entries,
      testEmail,
      authTier as any // Cast to UserTier type
    );

    console.log(`   Result: ${pages.length} pages analyzed`);
    console.log(`   Metrics:`, {
      totalPages: metrics.totalPages,
      analyzedPages: metrics.analyzedPages,
      cachedPages: metrics.cachedPages,
      aiCallsUsed: metrics.aiCallsUsed,
    });

    if (pages.length === 0) {
      console.log('\n❌ PROBLEM FOUND: analyzeDiscoveredPagesWithCache returned 0 pages!');
      console.log('   This is the exact issue the user is experiencing.');
    } else {
      console.log('\n✅ Analysis worked correctly!');
      console.log('   First 3 pages:');
      pages.slice(0, 3).forEach((page, i) => {
        console.log(`     ${i + 1}. ${page.url}`);
      });
    }
  } catch (error: any) {
    console.error('\n❌ Error during analysis:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Set environment variables for testing
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://...';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test';

testApiFlow().catch(console.error);
