import { test, expect } from '@playwright/test';

test('Debug DOM structure after generation', async ({ page }) => {
  console.log('🔍 Debugging DOM structure after SiteSpeakAI generation');

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://sitespeak.ai/tools/llms-txt-generator');
  
  await page.locator('input[placeholder*="website"]').fill('https://example.com');
  await page.locator('button:has-text("Generate")').click();
  await page.waitForTimeout(5000);

  // Get the full page HTML to analyze structure
  const pageHTML = await page.content();
  
  // Look for the gray box content more systematically
  console.log('Searching page HTML for key content...');
  
  // Check if content exists in HTML at all
  const hasExampleContent = pageHTML.includes('example.com');
  const hasLlmsTxt = pageHTML.includes('llms.txt');
  const hasHashContent = pageHTML.includes('# example');
  
  console.log(`Content check: example.com=${hasExampleContent}, llms.txt=${hasLlmsTxt}, hash=${hasHashContent}`);
  
  if (hasExampleContent && hasLlmsTxt) {
    console.log('✅ Content exists in HTML, finding container...');
    
    // Use JavaScript to find the container
    const contentInfo = await page.evaluate(() => {
      // Look for text nodes containing our content
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const results = [];
      let node;
      
      while (node = walker.nextNode()) {
        const text = node.textContent || '';
        if (text.includes('example.com') && text.includes('llms.txt') && text.length > 20) {
          const parent = node.parentElement;
          results.push({
            text: text.substring(0, 200),
            tagName: parent?.tagName,
            className: parent?.className,
            id: parent?.id,
            innerHTML: parent?.innerHTML?.substring(0, 300)
          });
        }
      }
      
      return results;
    });
    
    console.log(`Found ${contentInfo.length} text nodes with our content:`);
    contentInfo.forEach((info, i) => {
      console.log(`\nResult ${i + 1}:`);
      console.log(`  Tag: ${info.tagName}`);
      console.log(`  Class: "${info.className}"`);
      console.log(`  ID: "${info.id}"`);
      console.log(`  Text: "${info.text}"`);
      console.log(`  HTML: "${info.innerHTML}"`);
    });
    
    // Also try to get all elements that might contain gray box styling
    const grayBoxInfo = await page.evaluate(() => {
      const potentialContainers = document.querySelectorAll('div[class*="bg-"], div[class*="p-4"], div[class*="rounded"]');
      const results = [];
      
      for (const container of potentialContainers) {
        const text = container.textContent || '';
        if (text.includes('example.com') && text.length > 50 && text.length < 1000) {
          results.push({
            tagName: container.tagName,
            className: container.className,
            textLength: text.length,
            textSample: text.substring(0, 150),
            outerHTML: container.outerHTML.substring(0, 400)
          });
        }
      }
      
      return results;
    });
    
    console.log(`\nFound ${grayBoxInfo.length} potential gray box containers:`);
    grayBoxInfo.forEach((info, i) => {
      console.log(`\nContainer ${i + 1}:`);
      console.log(`  Tag: ${info.tagName}`);
      console.log(`  Class: "${info.className}"`);
      console.log(`  Text Length: ${info.textLength}`);
      console.log(`  Sample: "${info.textSample}"`);
      console.log(`  HTML: "${info.outerHTML}"`);
    });
    
  } else {
    console.log('❌ Content not found in page HTML');
    
    // Check what the page actually contains
    const pageText = await page.textContent('body');
    console.log('Page text sample:', pageText?.substring(0, 500));
  }
});