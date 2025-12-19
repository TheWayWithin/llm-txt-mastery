/**
 * Sprint 6: Proof-of-Concept Browser Rendering Test
 *
 * Tests Playwright's ability to render JavaScript-heavy sites
 * and measures resource usage for Railway deployment feasibility.
 *
 * Usage: npx tsx scripts/poc-browser-render.ts
 */

import { chromium, Browser, Page } from '@playwright/test';

interface RenderResult {
  url: string;
  success: boolean;
  htmlLength: number;
  textLength: number;
  renderTimeMs: number;
  memoryUsageMB: number;
  error?: string;
  contentPreview?: string;
}

interface TestSuite {
  name: string;
  url: string;
  type: 'CSR' | 'SSR' | 'Static';
  expectedImprovement: string;
}

// Test sites - mix of CSR (needs JS) and SSR (baseline)
const TEST_SITES: TestSuite[] = [
  {
    name: 'Angular.dev (CSR)',
    url: 'https://angular.dev',
    type: 'CSR',
    expectedImprovement: 'Should see full content vs empty shell'
  },
  {
    name: 'React.dev (SSR/SSG)',
    url: 'https://react.dev',
    type: 'SSR',
    expectedImprovement: 'Baseline - already renders server-side'
  },
  {
    name: 'Vue.js Docs (SSG)',
    url: 'https://vuejs.org',
    type: 'SSR',
    expectedImprovement: 'Baseline - static site'
  }
];

function getMemoryUsageMB(): number {
  const used = process.memoryUsage();
  return Math.round(used.heapUsed / 1024 / 1024);
}

async function renderPage(browser: Browser, url: string, timeoutMs: number = 15000): Promise<RenderResult> {
  const startTime = Date.now();
  const startMemory = getMemoryUsageMB();

  let page: Page | null = null;

  try {
    page = await browser.newPage();

    // Set realistic viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate and wait for network to settle
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: timeoutMs
    });

    // Additional wait for JS frameworks to hydrate
    await page.waitForTimeout(2000);

    // Auto-scroll to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(500);

    // Extract content
    const html = await page.content();
    const text = await page.evaluate(() => document.body?.innerText || '');

    const renderTime = Date.now() - startTime;
    const memoryUsed = getMemoryUsageMB() - startMemory;

    return {
      url,
      success: true,
      htmlLength: html.length,
      textLength: text.length,
      renderTimeMs: renderTime,
      memoryUsageMB: memoryUsed,
      contentPreview: text.substring(0, 200).replace(/\s+/g, ' ').trim()
    };

  } catch (error) {
    return {
      url,
      success: false,
      htmlLength: 0,
      textLength: 0,
      renderTimeMs: Date.now() - startTime,
      memoryUsageMB: getMemoryUsageMB() - startMemory,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

async function runPocTest(): Promise<void> {
  console.log('='.repeat(60));
  console.log('SPRINT 6: Browser Rendering Proof-of-Concept');
  console.log('='.repeat(60));
  console.log(`Start time: ${new Date().toISOString()}`);
  console.log(`Initial memory: ${getMemoryUsageMB()} MB\n`);

  let browser: Browser | null = null;

  try {
    // Launch browser with resource-conscious settings
    console.log('Launching headless Chromium...');
    const launchStart = Date.now();

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // Important for Docker/Railway
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check'
        // Note: --single-process removed - causes instability
      ]
    });

    const launchTime = Date.now() - launchStart;
    console.log(`Browser launched in ${launchTime}ms`);
    console.log(`Memory after launch: ${getMemoryUsageMB()} MB\n`);

    // Run tests
    const results: RenderResult[] = [];

    for (const site of TEST_SITES) {
      console.log(`\nTesting: ${site.name}`);
      console.log(`URL: ${site.url}`);
      console.log(`Type: ${site.type}`);
      console.log('-'.repeat(40));

      const result = await renderPage(browser, site.url);
      results.push(result);

      if (result.success) {
        console.log(`Status: SUCCESS`);
        console.log(`Render time: ${result.renderTimeMs}ms`);
        console.log(`HTML size: ${(result.htmlLength / 1024).toFixed(1)} KB`);
        console.log(`Text extracted: ${(result.textLength / 1024).toFixed(1)} KB`);
        console.log(`Memory delta: +${result.memoryUsageMB} MB`);
        console.log(`Preview: "${result.contentPreview?.substring(0, 100)}..."`);
      } else {
        console.log(`Status: FAILED`);
        console.log(`Error: ${result.error}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const avgRenderTime = successful.length > 0
      ? Math.round(successful.reduce((sum, r) => sum + r.renderTimeMs, 0) / successful.length)
      : 0;

    console.log(`Tests passed: ${successful.length}/${results.length}`);
    console.log(`Average render time: ${avgRenderTime}ms`);
    console.log(`Peak memory usage: ${getMemoryUsageMB()} MB`);
    console.log(`Browser launch time: ${launchTime}ms`);

    // Railway feasibility assessment
    console.log('\n' + '='.repeat(60));
    console.log('RAILWAY FEASIBILITY ASSESSMENT');
    console.log('='.repeat(60));

    const peakMemory = getMemoryUsageMB();
    const memoryOk = peakMemory < 400; // Railway gives ~512MB-1GB
    const timeOk = avgRenderTime < 20000; // 20 second threshold

    console.log(`Memory usage: ${peakMemory} MB ${memoryOk ? '✅' : '⚠️'} (Railway limit: ~512MB-1GB)`);
    console.log(`Render time: ${avgRenderTime}ms ${timeOk ? '✅' : '⚠️'} (Target: <20s)`);
    console.log(`Browser launch: ${launchTime}ms ${launchTime < 5000 ? '✅' : '⚠️'} (Target: <5s)`);

    if (memoryOk && timeOk) {
      console.log('\n✅ VERDICT: Playwright on Railway is FEASIBLE at $0 cost');
      console.log('   Recommended: Limit to 1-2 concurrent renders');
    } else {
      console.log('\n⚠️ VERDICT: May need optimization or Railway plan upgrade');
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    if (browser) {
      console.log('\nClosing browser...');
      await browser.close();
      console.log(`Final memory: ${getMemoryUsageMB()} MB`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete');
  console.log('='.repeat(60));
}

// Run the test
runPocTest().catch(console.error);
