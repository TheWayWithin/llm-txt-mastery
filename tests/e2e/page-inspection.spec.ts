import { test, expect } from '@playwright/test';

/**
 * Page Inspection Test
 *
 * This test is designed to inspect the actual page content and structure
 * to help us understand what elements are available for testing.
 */

test.describe('Page Inspection', () => {
  test('Inspect homepage content and structure', async ({ page }) => {
    console.log('🔍 Inspecting homepage content...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Give React time to fully load

    // Take a screenshot to see what the page looks like
    await page.screenshot({
      path: 'test-results/homepage-inspection.png',
      fullPage: true,
    });

    // Get the page title
    const title = await page.title();
    console.log('📄 Page title:', title);

    // Check if root element is present
    const rootElement = page.locator('#root');
    const rootExists = await rootElement.isVisible();
    console.log('🎯 Root element visible:', rootExists);

    // Get all text content
    const bodyText = await page.locator('body').textContent();
    console.log('📝 Body text (first 500 chars):', bodyText?.substring(0, 500));

    // Look for common form elements
    const inputs = await page.locator('input').count();
    console.log('📊 Number of input elements:', inputs);

    // Look for buttons
    const buttons = await page.locator('button').count();
    console.log('🔘 Number of button elements:', buttons);

    // Get all input placeholders
    const inputElements = page.locator('input');
    const inputCount = await inputElements.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputElements.nth(i);
      const placeholder = await input.getAttribute('placeholder');
      const type = await input.getAttribute('type');
      console.log(`📝 Input ${i + 1}: type="${type}", placeholder="${placeholder}"`);
    }

    // Get all button text
    const buttonElements = page.locator('button');
    const buttonCount = await buttonElements.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttonElements.nth(i);
      const text = await button.textContent();
      console.log(`🔘 Button ${i + 1}: "${text}"`);
    }

    // Look for headings
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    const h3Count = await page.locator('h3').count();
    console.log(`📰 Headings: h1=${h1Count}, h2=${h2Count}, h3=${h3Count}`);

    if (h1Count > 0) {
      const h1Text = await page.locator('h1').first().textContent();
      console.log('🎯 First H1 text:', h1Text);
    }

    // Look for navigation or main content areas
    const navCount = await page.locator('nav').count();
    const mainCount = await page.locator('main').count();
    console.log(`🧭 Structure: nav=${navCount}, main=${mainCount}`);

    // Check for common text patterns that might indicate this is the LLM.txt app
    const pageContent = await page.content();
    const hasLLMText = pageContent.includes('llm') || pageContent.includes('LLM');
    const hasMasteryText = pageContent.includes('mastery') || pageContent.includes('Mastery');
    const hasAnalysisText = pageContent.includes('analysis') || pageContent.includes('Analysis');

    console.log('🔍 Content indicators:');
    console.log('  - Contains LLM text:', hasLLMText);
    console.log('  - Contains Mastery text:', hasMasteryText);
    console.log('  - Contains Analysis text:', hasAnalysisText);

    // Save the full HTML for manual inspection
    const html = await page.content();
    require('fs').writeFileSync('test-results/homepage-content.html', html);
    console.log('💾 Full HTML saved to test-results/homepage-content.html');

    // This test always passes - it's just for inspection
    expect(rootExists).toBe(true);
  });
});
