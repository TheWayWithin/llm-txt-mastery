import { test, expect } from '@playwright/test';

test('SiteSpeakAI - working output capture', async ({ page }) => {
  console.log('🎯 Working test to capture SiteSpeakAI output from JavaScript');

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://sitespeak.ai/tools/llms-txt-generator');
  
  await page.locator('input[placeholder*="website"]').fill('https://example.com');
  await page.locator('button:has-text("Generate")').click();
  await page.waitForTimeout(5000);

  // Extract the content from the JavaScript variable
  const llmsContent = await page.evaluate(() => {
    // Look for script tags containing our content
    const scripts = document.querySelectorAll('script');
    
    for (const script of scripts) {
      const scriptText = script.textContent || '';
      if (scriptText.includes('llmsContent') && scriptText.includes('example.com')) {
        // Extract the content from the JavaScript
        const match = scriptText.match(/llmsContent:\s*"([^"]+)"/);
        if (match) {
          // Decode the content (handle escaped characters)
          let content = match[1];
          content = content.replace(/\\n/g, '\n');
          content = content.replace(/\\u003E/g, '>');
          content = content.replace(/\\u003C/g, '<');
          content = content.replace(/\\\"/g, '"');
          return content;
        }
      }
    }
    
    return null;
  });

  if (llmsContent) {
    console.log('🎉 Successfully extracted llms.txt content from JavaScript!');
    console.log(`Content length: ${llmsContent.length} characters`);
    console.log('Full content:');
    console.log('---');
    console.log(llmsContent);
    console.log('---');
    
    // Quality analysis
    const hasMetadata = llmsContent.includes('#') || llmsContent.includes('>');
    const hasUrls = llmsContent.includes('https://') || llmsContent.includes('http://');
    const hasStructure = llmsContent.includes('-') || llmsContent.includes('*');
    
    console.log(`Quality analysis:`);
    console.log(`  - Has metadata: ${hasMetadata}`);
    console.log(`  - Has URLs: ${hasUrls}`);
    console.log(`  - Has structure: ${hasStructure}`);
    console.log(`  - Length: ${llmsContent.length} characters`);
    
    // Count pages/links
    const urlMatches = llmsContent.match(/https?:\/\/[^\s\)]+/g);
    const pageCount = urlMatches ? urlMatches.length : 0;
    console.log(`  - Pages found: ${pageCount}`);
    
    // Assertions
    expect(llmsContent).toBeTruthy();
    expect(llmsContent.length).toBeGreaterThan(50);
    expect(llmsContent).toContain('example.com');
    expect(llmsContent).toContain('llms.txt');
    
    console.log('✅ All assertions passed!');
    
    // Simulate what our analyzer would capture
    const result = {
      competitor: 'SiteSpeakAI',
      url: 'https://sitespeak.ai/tools/llms-txt-generator',
      testUrl: 'https://example.com',
      status: 'success',
      outputContent: llmsContent,
      fileSize: llmsContent.length,
      pagesFound: pageCount,
      contentStructure: {
        hasMetadata,
        hasPageList: hasUrls,
        hasContent: llmsContent.length > 100,
        qualityScore: (hasMetadata ? 25 : 0) + (hasUrls ? 25 : 0) + (hasStructure ? 25 : 0) + (llmsContent.length > 100 ? 25 : 0)
      }
    };
    
    console.log('\n📊 Analysis result:', JSON.stringify(result, null, 2));
    
  } else {
    console.log('❌ Could not extract content from JavaScript');
    
    // Debug: show all script content
    const allScripts = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      return Array.from(scripts).map((script, i) => ({
        index: i,
        hasContent: (script.textContent || '').includes('example.com'),
        length: (script.textContent || '').length,
        sample: (script.textContent || '').substring(0, 100)
      }));
    });
    
    console.log('All scripts:', allScripts);
    expect(false).toBe(true); // Force test failure for debugging
  }
});