import { test, expect } from '@playwright/test';

test('Debug SiteSpeakAI selectors v2', async ({ page }) => {
  console.log('🔍 Debugging selectors for SiteSpeakAI output - v2');

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://sitespeak.ai/tools/llms-txt-generator');

  await page.locator('input[placeholder*="website"]').fill('https://example.com');
  await page.locator('button:has-text("Generate")').click();
  await page.waitForTimeout(5000);

  // Look for the specific content patterns
  const targetPatterns = [
    '# example.com llms.txt',
    'To serve as a reserved domain',
    'Example Domain Usage',
  ];

  console.log('Looking for specific content patterns...');

  for (const pattern of targetPatterns) {
    console.log(`\nSearching for: "${pattern}"`);

    // Find elements containing this pattern
    const elements = await page.locator(`:has-text("${pattern}")`).all();
    console.log(`Found ${elements.length} elements`);

    for (let i = 0; i < Math.min(elements.length, 3); i++) {
      const element = elements[i];
      try {
        const tagName = await element.evaluate((el) => el.tagName);
        const className = await element.evaluate((el) => el.className);
        const textContent = await element.textContent();

        console.log(`  Element ${i + 1}: ${tagName}.${className}`);
        console.log(`    Length: ${textContent?.length}`);

        // Check if this looks like the actual content container
        if (
          textContent &&
          textContent.length > 50 &&
          textContent.length < 500 &&
          textContent.includes('example.com') &&
          textContent.includes('llms.txt')
        ) {
          console.log(`    🎯 THIS LOOKS LIKE THE CONTENT!`);
          console.log(`    Content: "${textContent}"`);
          console.log(`    Selector suggestion: ${tagName.toLowerCase()}[class="${className}"]`);
        }
      } catch (error) {
        console.log(`    Error: ${error}`);
      }
    }
  }

  // Also try to find elements with gray/background styling that might contain code
  console.log('\nLooking for code-style containers...');

  const codeStyleSelectors = [
    'div[class*="bg-gray"]',
    'div[class*="bg-muted"]',
    'div[class*="rounded"]',
    'pre',
    'code',
    '[class*="font-mono"]',
    '[class*="text-sm"]',
  ];

  for (const selector of codeStyleSelectors) {
    try {
      const elements = await page.locator(selector).all();

      for (const element of elements) {
        const textContent = await element.textContent();
        if (
          textContent &&
          textContent.includes('example.com llms.txt') &&
          textContent.length > 50 &&
          textContent.length < 1000
        ) {
          const tagName = await element.evaluate((el) => el.tagName);
          const className = await element.evaluate((el) => el.className);

          console.log(`🎯 FOUND WITH SELECTOR: ${selector}`);
          console.log(`  Tag: ${tagName}, Class: "${className}"`);
          console.log(`  Content length: ${textContent.length}`);
          console.log(`  Content: "${textContent}"`);
          break;
        }
      }
    } catch (error) {
      // Continue
    }
  }
});
