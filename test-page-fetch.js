// Test page fetching from freecalchub.com to see if bot protection is the issue
import fetch from 'node-fetch';

// Copy the timeout function from sitemap.ts
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
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

// Copy of the fetchPageContent function from sitemap.ts (simplified)
async function fetchPageContent(url) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.log(`Retry attempt ${attempt + 1} for ${url} after ${delay}ms delay`);
      }

      const userAgent = userAgents[attempt % userAgents.length];

      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            'User-Agent': userAgent,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            Connection: 'keep-alive',
          },
        },
        15000
      );

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
          console.log(`Rate limited (429) for ${url}, waiting ${waitTime}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          throw new Error(`Rate limited (HTTP ${response.status})`);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const content = await response.text();
      if (attempt > 0) {
        console.log(`Successfully fetched ${url} on attempt ${attempt + 1}`);
      }
      return content;
    } catch (error) {
      lastError = error;
      console.log(`Fetch attempt ${attempt + 1} failed for ${url}: ${error.message}`);

      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        break;
      }
    }
  }

  throw new Error(
    `Failed to fetch ${url} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

async function testMultiplePageFetches() {
  console.log('=== Testing Multiple Page Fetches from freecalchub.com ===\n');

  // Test various pages from the sitemap
  const testUrls = [
    'https://freecalchub.com/',
    'https://freecalchub.com/finance/',
    'https://freecalchub.com/math/',
    'https://freecalchub.com/finance/investment/compound-interest-calculator/',
    'https://freecalchub.com/about/',
    'https://freecalchub.com/contact/',
    'https://freecalchub.com/blog/',
  ];

  let successCount = 0;
  let failureCount = 0;
  const results = [];

  console.log(`Testing ${testUrls.length} pages to detect bot protection...\n`);

  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`[${i + 1}/${testUrls.length}] Testing: ${url}`);

    try {
      const startTime = Date.now();
      const content = await fetchPageContent(url);
      const duration = Date.now() - startTime;

      console.log(`✅ Success: ${content.length} chars, ${duration}ms`);
      successCount++;
      results.push({ url, success: true, contentLength: content.length, duration });
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      failureCount++;
      results.push({ url, success: false, error: error.message });
    }

    console.log('');
  }

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Total pages tested: ${testUrls.length}`);
  console.log(
    `Successful: ${successCount} (${((successCount / testUrls.length) * 100).toFixed(1)}%)`
  );
  console.log(`Failed: ${failureCount} (${((failureCount / testUrls.length) * 100).toFixed(1)}%)`);

  if (failureCount === testUrls.length) {
    console.log('❌ CRITICAL: All pages failed - indicates complete bot protection');
  } else if (failureCount > testUrls.length * 0.5) {
    console.log('⚠️ WARNING: High failure rate - likely bot protection');
  } else if (failureCount > 0) {
    console.log('⚠️ PARTIAL: Some pages failed - possible selective bot protection');
  } else {
    console.log('✅ SUCCESS: All pages accessible - bot protection not the issue');
  }

  // Show failures
  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    console.log('\n=== FAILURES ===');
    failures.forEach((f) => {
      console.log(`❌ ${f.url}: ${f.error}`);
    });
  }

  return { successCount, failureCount, successRate: (successCount / testUrls.length) * 100 };
}

testMultiplePageFetches().catch(console.error);
