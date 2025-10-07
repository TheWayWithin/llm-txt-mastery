// Simple debug script to test freecalchub.com manually
import fetch from 'node-fetch';

async function testFreecalchub() {
  console.log('=== Testing freecalchub.com manually ===\n');

  const baseUrl = 'https://freecalchub.com';
  const urlObj = new URL(baseUrl);
  const rootDomain = `${urlObj.protocol}//${urlObj.hostname}`;

  console.log(`Base URL: ${baseUrl}`);
  console.log(`Root Domain: ${rootDomain}\n`);

  // Test sitemap URLs
  const sitemapUrls = [
    `${rootDomain}/sitemap.xml`,
    `${rootDomain}/sitemap_index.xml`,
    `${rootDomain}/wp-sitemap.xml`,
  ];

  for (const url of sitemapUrls) {
    console.log(`\nTesting: ${url}`);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);

      if (response.ok) {
        const content = await response.text();
        console.log(`Content length: ${content.length}`);
        console.log(`First 300 chars:\n${content.substring(0, 300)}`);

        if (content.includes('<urlset') || content.includes('<sitemapindex')) {
          console.log('✅ Valid XML sitemap detected');
        } else if (content.includes('<!DOCTYPE html')) {
          console.log('❌ HTML content (not sitemap)');
        } else {
          console.log('❓ Unknown content');
        }
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  // Test robots.txt
  console.log(`\n\nTesting robots.txt:`);
  try {
    const robotsUrl = `${rootDomain}/robots.txt`;
    const response = await fetch(robotsUrl);
    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const content = await response.text();
      console.log(`Content:\n${content}`);

      const sitemapMatch = content.match(/Sitemap:\s*(.+)/i);
      if (sitemapMatch) {
        console.log(`✅ Found sitemap reference: ${sitemapMatch[1]}`);

        // Test the referenced sitemap
        const sitemapUrl = sitemapMatch[1].trim();
        console.log(`\nTesting referenced sitemap: ${sitemapUrl}`);
        try {
          const sitemapResponse = await fetch(sitemapUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          console.log(`Sitemap Status: ${sitemapResponse.status} ${sitemapResponse.statusText}`);

          if (sitemapResponse.ok) {
            const sitemapContent = await sitemapResponse.text();
            console.log(`Sitemap Content length: ${sitemapContent.length}`);
            console.log(`Sitemap First 500 chars:\n${sitemapContent.substring(0, 500)}`);
          }
        } catch (error) {
          console.log(`❌ Error fetching sitemap: ${error.message}`);
        }
      } else {
        console.log(`❌ No sitemap reference found in robots.txt`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test homepage
  console.log(`\n\nTesting homepage:`);
  try {
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Final URL: ${response.url}`);

    if (response.ok) {
      const html = await response.text();
      console.log(`Content length: ${html.length}`);

      // Count links
      const linkMatches = html.match(/href="[^"]*"/g) || [];
      const internalLinks = linkMatches.filter(
        (link) => link.includes('freecalchub.com') || link.includes('href="/')
      );

      console.log(`Total href attributes: ${linkMatches.length}`);
      console.log(`Internal links: ${internalLinks.length}`);

      // Show some internal links
      console.log(`\nSample internal links:`);
      internalLinks.slice(0, 10).forEach((link, i) => {
        console.log(`${i + 1}. ${link}`);
      });

      // Check for SPA indicators
      const spaIndicators = [];
      if (html.includes('react') || html.includes('React')) spaIndicators.push('React');
      if (html.includes('vue') || html.includes('Vue')) spaIndicators.push('Vue');
      if (html.includes('angular') || html.includes('Angular')) spaIndicators.push('Angular');

      if (spaIndicators.length > 0) {
        console.log(`\n🔍 Possible SPA frameworks detected: ${spaIndicators.join(', ')}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testFreecalchub().catch(console.error);
