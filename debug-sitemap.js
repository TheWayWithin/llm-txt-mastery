// Debug script for sitemap discovery issue
import fetch from 'node-fetch';

async function debugSitemapDiscovery() {
  const testUrl = 'https://freecalchub.com';
  
  console.log('=== Debugging Sitemap Discovery for freecalchub.com ===\n');
  console.log(`Testing URL: ${testUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  // Test with compiled TypeScript version
  try {
    const { execSync } = await import('child_process');
    
    console.log('Building TypeScript first...');
    execSync('npm run build', { cwd: '/Users/jamiewatters/DevProjects/llm-txt-mastery', stdio: 'inherit' });
    
    // Import the built version
    const { fetchSitemap } = await import('./dist/server/services/sitemap.js');
    
    console.log('Testing sitemap discovery...');
    const result = await fetchSitemap(testUrl);
    
    console.log('=== RESULT ===');
    console.log(`Analysis Method: ${result.analysisMethod}`);
    console.log(`Sitemap Found: ${result.sitemapFound}`);
    console.log(`Pages Discovered: ${result.entries.length}`);
    console.log(`Message: ${result.message}\n`);
    
    if (result.entries.length > 0) {
      console.log('=== FIRST 10 PAGES ===');
      result.entries.slice(0, 10).forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.url}`);
        if (entry.lastmod) console.log(`   Last Modified: ${entry.lastmod}`);
        if (entry.priority) console.log(`   Priority: ${entry.priority}`);
        console.log('');
      });
    } else {
      console.log('⚠️  NO PAGES DISCOVERED - This is the critical issue!');
    }
    
  } catch (error) {
    console.error('=== CRITICAL ERROR ===');
    console.error(error.message);
    console.error(error.stack);
  }
}

// Manual step-by-step debugging
async function stepByStepDebug() {
  console.log('\n=== STEP-BY-STEP DEBUGGING ===\n');
  
  const baseUrl = 'https://freecalchub.com';
  const urlObj = new URL(baseUrl);
  const rootDomain = `${urlObj.protocol}//${urlObj.hostname}`;
  
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Root Domain: ${rootDomain}\n`);
  
  // Test sitemap URLs manually
  const sitemapUrls = [
    `${rootDomain}/sitemap.xml`,
    `${rootDomain}/sitemap_index.xml`,
    `${rootDomain}/sitemap/sitemap.xml`,
    `${rootDomain}/sitemaps/sitemap.xml`,
    `${rootDomain}/wp-sitemap.xml`,
    `${rootDomain}/sitemap-index.xml`,
    `${rootDomain}/post-sitemap.xml`
  ];
  
  console.log('Testing sitemap URLs:');
  for (const url of sitemapUrls) {
    try {
      console.log(`\nTesting: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.ok) {
        const content = await response.text();
        console.log(`  Content length: ${content.length}`);
        console.log(`  First 200 chars: ${content.substring(0, 200)}`);
        
        // Quick XML check
        if (content.includes('<urlset') || content.includes('<sitemapindex')) {
          console.log(`  ✅ Looks like valid XML sitemap`);
        } else if (content.includes('<!DOCTYPE html')) {
          console.log(`  ❌ HTML content (redirect/error page)`);
        } else {
          console.log(`  ❓ Unknown content type`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  // Test robots.txt
  console.log(`\n\nTesting robots.txt:`);
  try {
    const robotsUrl = `${rootDomain}/robots.txt`;
    console.log(`Testing: ${robotsUrl}`);
    const response = await fetch(robotsUrl);
    console.log(`  Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const content = await response.text();
      console.log(`  Content:\n${content}`);
      
      const sitemapMatch = content.match(/Sitemap:\s*(.+)/i);
      if (sitemapMatch) {
        console.log(`  ✅ Found sitemap reference: ${sitemapMatch[1]}`);
      } else {
        console.log(`  ❌ No sitemap reference found`);
      }
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  // Test homepage for analysis
  console.log(`\n\nTesting homepage:`);
  try {
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    console.log(`  Final URL: ${response.url}`);
    
    if (response.ok) {
      const html = await response.text();
      console.log(`  Content length: ${html.length}`);
      
      // Quick analysis
      const linkCount = (html.match(/href="/g) || []).length;
      console.log(`  Links found: ${linkCount}`);
      
      if (html.includes('react') || html.includes('React')) {
        console.log(`  🔍 Possible React app detected`);
      }
      if (html.includes('vue') || html.includes('Vue')) {
        console.log(`  🔍 Possible Vue app detected`);
      }
      if (html.includes('angular') || html.includes('Angular')) {
        console.log(`  🔍 Possible Angular app detected`);
      }
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

// Run both tests
async function runAllTests() {
  await debugSitemapDiscovery();
  await stepByStepDebug();
}

runAllTests().catch(console.error);