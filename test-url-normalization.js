// Test URL normalization issue
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

// Test different URL formats that might be causing issues
async function testUrlNormalization() {
  console.log('=== Testing URL Normalization Impact ===\n');
  
  const testUrls = [
    'https://freecalchub.com',      // Normalized (no trailing slash)
    'https://freecalchub.com/',     // With trailing slash
    'http://freecalchub.com',       // HTTP instead of HTTPS
    'www.freecalchub.com',          // Without protocol
    'freecalchub.com',              // Domain only
  ];
  
  for (const testUrl of testUrls) {
    console.log(`\n--- Testing URL: "${testUrl}" ---`);
    
    try {
      // Simulate the exact normalization from routes.ts
      const normalizedUrl = testUrl.endsWith('/') ? testUrl.slice(0, -1) : testUrl;
      console.log(`Normalized to: "${normalizedUrl}"`);
      
      // Test sitemap discovery with this URL
      await testSitemapDiscovery(normalizedUrl);
      
    } catch (error) {
      console.log(`❌ Error with URL "${testUrl}":`, error.message);
    }
  }
}

async function testSitemapDiscovery(baseUrl) {
  try {
    // Handle URLs without protocol
    let fullUrl = baseUrl;
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      fullUrl = `https://${baseUrl}`;
      console.log(`Added protocol: ${fullUrl}`);
    }
    
    const urlObj = new URL(fullUrl);
    const rootDomain = `${urlObj.protocol}//${urlObj.hostname}`;
    
    console.log(`Root domain: ${rootDomain}`);
    
    const sitemapUrl = `${rootDomain}/sitemap.xml`;
    console.log(`Testing: ${sitemapUrl}`);
    
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const xml = await response.text();
      console.log(`Content length: ${xml.length}`);
      
      if (xml.includes('<urlset') || xml.includes('<sitemapindex')) {
        const urlCount = (xml.match(/<loc>/g) || []).length;
        console.log(`✅ Found ${urlCount} URLs in sitemap`);
        return urlCount;
      } else {
        console.log(`❌ Invalid XML content`);
        return 0;
      }
    } else {
      console.log(`❌ Failed to fetch sitemap`);
      return 0;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return 0;
  }
}

// Test the exact URL that would be sent in production
async function testProductionScenario() {
  console.log('\n\n=== Production Scenario Test ===\n');
  
  // This is what a user would typically enter
  const userInput = 'https://freecalchub.com';
  console.log(`User input: "${userInput}"`);
  
  // This is the normalization from routes.ts
  const normalizedUrl = userInput.endsWith('/') ? userInput.slice(0, -1) : userInput;
  console.log(`Normalized URL: "${normalizedUrl}"`);
  
  // Test the fetchSitemap logic with this exact URL
  const result = await testSitemapDiscovery(normalizedUrl);
  
  if (result === 0) {
    console.log('❌ CRITICAL: Production scenario returns 0 pages');
    console.log('This confirms the bug exists in the URL handling');
  } else {
    console.log('✅ Production scenario works correctly');
    console.log('The bug must be elsewhere in the system');
  }
}

async function runTests() {
  await testUrlNormalization();
  await testProductionScenario();
}

runTests().catch(console.error);