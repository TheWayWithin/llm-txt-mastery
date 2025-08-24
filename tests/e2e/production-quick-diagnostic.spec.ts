import { test, expect, Page } from '@playwright/test';

test.describe('Production Site Diagnostic', () => {
  test('should verify site is loading and main elements are present', async ({ page }) => {
    console.log('=== PRODUCTION SITE DIAGNOSTIC ===');
    
    // Navigate to production site
    await page.goto('https://www.llmtxtmastery.com');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'diagnostic-homepage.png', fullPage: true });
    
    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    expect(title).toContain('LLM');
    
    // Check main heading (h2, not h1)
    const mainHeading = page.locator('h2:has-text("Get Found by AI")');
    await expect(mainHeading).toBeVisible();
    console.log('✅ Main heading found');
    
    // Check for Get Started button
    const getStartedBtn = page.locator('button:has-text("Get Started")');
    await expect(getStartedBtn).toBeVisible();
    console.log('✅ Get Started button found');
    
    // Check for URL input area (might be on analyze page)
    const hasUrlInput = await page.locator('input[type="url"]').isVisible();
    console.log(`URL input on homepage: ${hasUrlInput}`);
    
    // Try clicking Get Started to go to analyze page
    await getStartedBtn.click();
    await page.waitForLoadState('networkidle');
    
    // Check if we're on analyze page
    const currentUrl = page.url();
    console.log(`Current URL after Get Started: ${currentUrl}`);
    
    // Check for URL input on analyze page
    const urlInputVisible = await page.locator('input[type="url"]').isVisible();
    console.log(`URL input on analyze page: ${urlInputVisible}`);
    
    if (urlInputVisible) {
      console.log('✅ Successfully navigated to analyze page');
    }
    
    // Take another screenshot of analyze page
    await page.screenshot({ path: 'diagnostic-analyze-page.png', fullPage: true });
    
    console.log('=== DIAGNOSTIC COMPLETE ===');
  });
  
  test('should test basic analysis flow to understand form structure', async ({ page }) => {
    console.log('=== BASIC ANALYSIS FLOW TEST ===');
    
    // Go directly to analyze page
    await page.goto('https://www.llmtxtmastery.com');
    
    // Click Get Started
    await page.click('button:has-text("Get Started")');
    await page.waitForLoadState('networkidle');
    
    // Fill URL input if visible
    const urlInput = page.locator('input[type="url"]');
    if (await urlInput.isVisible()) {
      await urlInput.fill('https://docs.python.org');
      console.log('✅ URL input filled');
      
      // Look for analyze button
      const analyzeBtn = page.locator('button:has-text("Analyze"), button:has-text("Start")');
      if (await analyzeBtn.isVisible()) {
        await analyzeBtn.click();
        console.log('✅ Analyze button clicked');
        
        // Wait to see what happens next
        await page.waitForTimeout(3000);
        
        // Check for email input
        const emailInput = page.locator('input[type="email"]');
        if (await emailInput.isVisible()) {
          console.log('✅ Email capture form appeared');
          
          // Fill test email
          await emailInput.fill('diagnostic-test@example.com');
          
          // Look for tier selection
          const freeTier = page.locator('[data-testid="tier-free"], button:has-text("Free"), .tier-card:has-text("Free")');
          if (await freeTier.isVisible()) {
            console.log('✅ Tier selection visible');
            await freeTier.click();
            
            // Look for submit button
            const submitBtn = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Start Analysis")');
            if (await submitBtn.isVisible()) {
              console.log('✅ Submit button found');
              // Don't actually submit to avoid creating test data
            } else {
              console.log('⚠️ Submit button not found');
              // Show available buttons
              const buttons = await page.locator('button').allTextContents();
              console.log('Available buttons:', buttons);
            }
          } else {
            console.log('⚠️ Tier selection not found');
            // Show page structure
            const headings = await page.locator('h1, h2, h3').allTextContents();
            console.log('Page headings:', headings);
          }
        } else {
          console.log('⚠️ Email input not found after analyze click');
          const currentUrl = page.url();
          console.log(`Current URL: ${currentUrl}`);
        }
      } else {
        console.log('⚠️ Analyze button not found');
        const buttons = await page.locator('button').allTextContents();
        console.log('Available buttons:', buttons);
      }
    } else {
      console.log('⚠️ URL input not found on analyze page');
      const inputs = await page.locator('input').count();
      console.log(`Total inputs found: ${inputs}`);
    }
    
    // Take screenshot of current state
    await page.screenshot({ path: 'diagnostic-flow-end.png', fullPage: true });
    
    console.log('=== BASIC FLOW TEST COMPLETE ===');
  });
});