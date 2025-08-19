// Test XML parsing specifically
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

async function testXmlParsing() {
  console.log('=== Testing XML Parsing for freecalchub.com ===\n');
  
  const sitemapUrl = 'https://freecalchub.com/sitemap.xml';
  
  try {
    console.log(`Fetching sitemap: ${sitemapUrl}`);
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xml = await response.text();
    console.log(`\nXML Content Length: ${xml.length}`);
    console.log(`\nFirst 1000 chars of XML:\n${xml.substring(0, 1000)}\n`);
    
    // Test the actual parsing logic from sitemap.ts
    console.log('Testing XML parsing...');
    
    // Check if HTML instead of XML
    if (xml.trim().startsWith('<!DOCTYPE html') || xml.trim().startsWith('<html')) {
      console.log('❌ Received HTML instead of XML sitemap');
      return;
    }
    
    // Parse the XML
    const result = await parseStringPromise(xml);
    console.log('✅ XML parsed successfully');
    
    console.log('\nParsed structure:');
    console.log('Keys in result:', Object.keys(result));
    
    const entries = [];
    
    // Handle sitemap index
    if (result.sitemapindex && result.sitemapindex.sitemap) {
      console.log('Found sitemapindex structure');
      const sitemaps = Array.isArray(result.sitemapindex.sitemap) 
        ? result.sitemapindex.sitemap 
        : [result.sitemapindex.sitemap];
      console.log(`Number of sub-sitemaps: ${sitemaps.length}`);
      
      for (const sitemap of sitemaps) {
        console.log(`Sub-sitemap URL: ${sitemap.loc[0]}`);
      }
    }
    
    // Handle regular sitemap
    if (result.urlset && result.urlset.url) {
      console.log('Found urlset structure');
      const urls = Array.isArray(result.urlset.url) 
        ? result.urlset.url 
        : [result.urlset.url];
      
      console.log(`Number of URLs found: ${urls.length}`);
      
      // Show first 10 URLs
      console.log('\nFirst 10 URLs:');
      urls.slice(0, 10).forEach((url, index) => {
        entries.push({
          url: url.loc[0],
          lastmod: url.lastmod?.[0],
          changefreq: url.changefreq?.[0],
          priority: url.priority?.[0]
        });
        
        console.log(`${index + 1}. ${url.loc[0]}`);
        if (url.lastmod?.[0]) console.log(`   Last Modified: ${url.lastmod[0]}`);
        if (url.priority?.[0]) console.log(`   Priority: ${url.priority[0]}`);
      });
      
      console.log(`\n✅ Successfully parsed ${entries.length} entries from sitemap`);
      
      if (entries.length === 0) {
        console.log('❌ CRITICAL: Parsed 0 entries despite finding URLs in XML structure');
        console.log('This indicates a parsing logic issue!');
      }
    } else {
      console.log('❌ No urlset.url found in parsed XML');
      console.log('Parsed result structure:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error during XML parsing test:', error.message);
    console.error(error.stack);
  }
}

testXmlParsing().catch(console.error);