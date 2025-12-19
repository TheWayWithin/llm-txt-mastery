/**
 * Sprint 6: Integration Test for Browser Rendering
 *
 * Tests the browserRenderer integration with sitemap.ts
 *
 * Usage: npx tsx scripts/test-browser-integration.ts
 */

import {
  fetchPageContentEnhanced,
  shouldUseJsRendering,
  getBrowserRenderingStatus,
  EnhancedFetchOptions,
} from '../server/services/sitemap';
import { SPADetectionResult } from '../shared/schema';

// Test URLs - mix of CSR and SSR sites
const TEST_CASES = [
  {
    name: 'Angular.dev (CSR)',
    url: 'https://angular.dev',
    spaDetection: {
      isSinglePage: false,
      framework: {
        framework: 'angular' as const,
        renderingStrategy: 'CSR' as const,
        indicators: ['ng-version'],
      },
      contentCoverage: {
        estimatedCoverage: 15,
        confidence: 'high' as const,
        signals: {
          textToHtmlRatio: 0.02,
          hasSSRData: false,
          hasSkeletonUI: true,
          bodyContentLength: 500,
          htmlStructureSize: 25000,
        },
      },
    } as SPADetectionResult,
    expectJsRendering: true,
  },
  {
    name: 'React.dev (SSR)',
    url: 'https://react.dev',
    spaDetection: {
      isSinglePage: false,
      framework: {
        framework: 'next' as const,
        renderingStrategy: 'SSR' as const,
        indicators: ['__NEXT_DATA__'],
      },
      contentCoverage: {
        estimatedCoverage: 90,
        confidence: 'high' as const,
        signals: {
          textToHtmlRatio: 0.15,
          hasSSRData: true,
          hasSkeletonUI: false,
          bodyContentLength: 5000,
          htmlStructureSize: 30000,
        },
      },
    } as SPADetectionResult,
    expectJsRendering: false,
  },
];

async function runIntegrationTest() {
  console.log('='.repeat(60));
  console.log('SPRINT 6: Browser Rendering Integration Test');
  console.log('='.repeat(60));
  console.log();

  // Test 1: Check shouldUseJsRendering logic
  console.log('Test 1: shouldUseJsRendering Logic');
  console.log('-'.repeat(40));

  for (const testCase of TEST_CASES) {
    // Test without Scale tier (should NOT use JS rendering)
    const optionsStarter: EnhancedFetchOptions = {
      tier: 'starter',
      spaDetection: testCase.spaDetection,
    };
    const shouldRenderStarter = shouldUseJsRendering(optionsStarter);
    console.log(`  ${testCase.name} (Starter tier): ${shouldRenderStarter ? 'YES' : 'NO'} (expected: NO)`);

    // Test with Scale tier (should use JS rendering based on SPA detection)
    const optionsScale: EnhancedFetchOptions = {
      tier: 'scale',
      spaDetection: testCase.spaDetection,
    };
    const shouldRenderScale = shouldUseJsRendering(optionsScale);
    const expected = testCase.expectJsRendering ? 'YES' : 'NO';
    const actual = shouldRenderScale ? 'YES' : 'NO';
    const status = actual === expected ? '✅' : '❌';
    console.log(`  ${testCase.name} (Scale tier): ${actual} (expected: ${expected}) ${status}`);
  }

  console.log();

  // Test 2: Check browser availability
  console.log('Test 2: Browser Availability');
  console.log('-'.repeat(40));

  const status = getBrowserRenderingStatus();
  console.log(`  Queue Status: ${status.queueStatus.active}/${status.queueStatus.max} active, ${status.queueStatus.queued} queued`);

  const browserAvailable = await status.available;
  console.log(`  Browser Available: ${browserAvailable ? 'YES ✅' : 'NO (will use HTTP fallback)'}`);

  console.log();

  // Test 3: Live fetch test with Angular (if Scale tier simulation)
  console.log('Test 3: Live Fetch Test (Scale Tier Simulation)');
  console.log('-'.repeat(40));

  const angularTest = TEST_CASES[0];
  console.log(`  Testing ${angularTest.name}...`);

  try {
    const startTime = Date.now();
    const result = await fetchPageContentEnhanced(angularTest.url, {
      tier: 'scale',
      spaDetection: angularTest.spaDetection,
    });
    const elapsed = Date.now() - startTime;

    console.log(`  Result:`);
    console.log(`    - Content Length: ${(result.content.length / 1024).toFixed(1)} KB`);
    console.log(`    - JS Rendered: ${result.wasJsRendered ? 'YES ✅' : 'NO (HTTP fallback)'}`);
    console.log(`    - Render Time: ${result.renderTimeMs || elapsed}ms`);

    if (result.error) {
      console.log(`    - Error: ${result.error}`);
    }

    // Check content quality
    const hasAngularContent = result.content.includes('Angular') || result.content.includes('angular');
    console.log(`    - Contains Angular content: ${hasAngularContent ? 'YES ✅' : 'NO ❌'}`);
  } catch (error) {
    console.log(`  ❌ Test failed: ${error.message}`);
  }

  console.log();
  console.log('='.repeat(60));
  console.log('Integration test complete');
  console.log('='.repeat(60));
}

// Run the test
runIntegrationTest().catch(console.error);
