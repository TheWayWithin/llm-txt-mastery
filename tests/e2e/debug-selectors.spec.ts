import { test, expect } from '@playwright/test';

test('Debug SiteSpeakAI selectors', async ({ page }) => {
  console.log('🔍 Debugging selectors for SiteSpeakAI output');

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://sitespeak.ai/tools/llms-txt-generator');

  await page.locator('input[placeholder*="website"]').fill('https://example.com');
  await page.locator('button:has-text("Generate")').click();
  await page.waitForTimeout(5000);

  // Check all possible elements that might contain our content
  const contentToFind = 'example.com llms.txt';

  console.log('Looking for elements containing:', contentToFind);

  // Get all elements that contain this text
  const elementsWithText = await page.locator(`:has-text("${contentToFind}")`).all();
  console.log(`Found ${elementsWithText.length} elements containing the target text`);

  for (let i = 0; i < elementsWithText.length; i++) {
    const element = elementsWithText[i];
    try {
      const tagName = await element.evaluate((el) => el.tagName);
      const className = await element.evaluate((el) => el.className);
      const textContent = await element.textContent();

      console.log(`Element ${i + 1}:`);
      console.log(`  Tag: ${tagName}`);
      console.log(`  Class: "${className}"`);
      console.log(`  Text length: ${textContent?.length}`);
      console.log(`  Sample: ${textContent?.substring(0, 100)}...`);
      console.log('---');
    } catch (error) {
      console.log(`Element ${i + 1}: Error - ${error}`);
    }
  }

  // Also check for specific patterns
  const codeBlocks = await page
    .locator('div[class*="bg-"], div[class*="p-"], div[class*="rounded"]')
    .all();
  console.log(`\nFound ${codeBlocks.length} potential code blocks`);

  for (let i = 0; i < Math.min(codeBlocks.length, 5); i++) {
    const block = codeBlocks[i];
    try {
      const className = await block.evaluate((el) => el.className);
      const textContent = await block.textContent();

      if (textContent && textContent.includes('example.com') && textContent.length > 50) {
        console.log(`\n🎯 POTENTIAL MATCH ${i + 1}:`);
        console.log(`  Class: "${className}"`);
        console.log(`  Text length: ${textContent.length}`);
        console.log(`  Content: ${textContent}`);

        // Generate a potential selector
        const selector = `.${className.split(' ').join('.')}`;
        console.log(`  Suggested selector: "${selector}"`);
      }
    } catch (error) {
      console.log(`Code block ${i + 1}: Error - ${error}`);
    }
  }
});
