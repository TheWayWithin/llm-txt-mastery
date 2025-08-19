// Test the actual sitemap service after building
import { fetchSitemap } from './dist/server/services/sitemap.js';

async function testSitemapService() {
  console.log('=== Testing Built Sitemap Service ===\n');
  
  const testUrl = 'https://freecalchub.com';
  console.log(`Testing URL: ${testUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  try {
    console.log('Calling fetchSitemap...');
    const result = await fetchSitemap(testUrl);
    
    console.log('\n=== SITEMAP SERVICE RESULT ===');
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
      
      console.log(`✅ SUCCESS: Found ${result.entries.length} pages`);
    } else {
      console.log('❌ CRITICAL ISSUE: NO PAGES DISCOVERED');
      console.log('This confirms the production bug!');
    }
    
  } catch (error) {
    console.error('❌ ERROR in sitemap service:');
    console.error(`Message: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  }
}

testSitemapService().catch(console.error);