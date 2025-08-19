// Test production flow exactly as it happens in routes.ts
import fetch from 'node-fetch';

// Copy the exact timeout wrapper function from sitemap.ts
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

// Test the timeout and Promise.race logic specifically
async function testProductionTimeoutLogic() {
  console.log('=== Testing Production Timeout Logic ===\n');
  
  const baseUrl = 'https://freecalchub.com';
  
  try {
    console.log('Testing with actual timeout wrapper...');
    
    // Simulate the exact fetchSitemap logic
    const SITEMAP_TIMEOUT = 90 * 1000; // 90 seconds maximum for sitemap discovery
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Sitemap discovery timeout: exceeded ${SITEMAP_TIMEOUT / 1000}s limit`));
      }, SITEMAP_TIMEOUT);
    });

    // Simplified version of performSitemapDiscovery
    async function testSitemapDiscovery(baseUrl) {
      const urlObj = new URL(baseUrl);
      const rootDomain = `${urlObj.protocol}//${urlObj.hostname}`;
      
      console.log(`Testing sitemap discovery for: ${rootDomain}`);
      
      const sitemapUrl = `${rootDomain}/sitemap.xml`;
      console.log(`Trying sitemap URL: ${sitemapUrl}`);
      
      try {
        const response = await fetchWithTimeout(sitemapUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }, 15000); // 15 seconds timeout

        if (response.ok) {
          console.log(`✅ Successfully fetched sitemap from: ${sitemapUrl}`);
          const xml = await response.text();
          console.log(`XML content length: ${xml.length}`);
          
          // Quick parse test
          if (xml.includes('<urlset') || xml.includes('<sitemapindex')) {
            console.log(`✅ Valid XML sitemap structure detected`);
            
            // Estimate URL count
            const urlCount = (xml.match(/<loc>/g) || []).length;
            console.log(`Estimated URLs in sitemap: ${urlCount}`);
            
            return {
              entries: new Array(urlCount).fill(0).map((_, i) => ({ url: `example-${i}` })), // Mock entries
              sitemapFound: true,
              analysisMethod: "sitemap",
              message: `Found sitemap with ${urlCount} pages`
            };
          } else {
            console.log(`❌ Invalid XML content`);
            return { entries: [], sitemapFound: false, analysisMethod: "error", message: "Invalid XML" };
          }
        } else {
          console.log(`❌ HTTP ${response.status} for ${sitemapUrl}`);
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Error fetching sitemap: ${error.message}`);
        throw error;
      }
    }

    console.log('\n--- Testing Promise.race with timeout ---');
    const result = await Promise.race([
      testSitemapDiscovery(baseUrl),
      timeoutPromise
    ]);

    console.log('\n=== PRODUCTION FLOW RESULT ===');
    console.log(`Analysis Method: ${result.analysisMethod}`);
    console.log(`Sitemap Found: ${result.sitemapFound}`);
    console.log(`Pages Discovered: ${result.entries.length}`);
    console.log(`Message: ${result.message}`);
    
    if (result.entries.length === 0) {
      console.log('❌ CRITICAL: Production flow returns 0 pages!');
    } else {
      console.log('✅ Production flow correctly discovers pages');
    }
    
  } catch (error) {
    console.error('❌ Production flow error:');
    console.error(`Message: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    
    console.log('\n--- This error would trigger fallback crawling ---');
  }
}

// Test with a shorter timeout to see if timeout is the issue
async function testWithShortTimeout() {
  console.log('\n\n=== Testing With Short Timeout (5s) ===\n');
  
  const baseUrl = 'https://freecalchub.com';
  
  try {
    const SHORT_TIMEOUT = 5 * 1000; // 5 seconds to force timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`SHORT timeout test: exceeded ${SHORT_TIMEOUT / 1000}s limit`));
      }, SHORT_TIMEOUT);
    });

    const result = await Promise.race([
      fetch('https://freecalchub.com/sitemap.xml'),
      timeoutPromise
    ]);

    console.log('✅ Request completed within 5s timeout');
    
  } catch (error) {
    console.log(`❌ Request timed out or failed: ${error.message}`);
    console.log('This suggests the production timeout might be the issue');
  }
}

async function runAllTests() {
  await testProductionTimeoutLogic();
  await testWithShortTimeout();
}

runAllTests().catch(console.error);