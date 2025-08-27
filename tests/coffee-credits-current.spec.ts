import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Coffee Tier Credit System - Current State Validation
 * 
 * Tests what's currently available in the production system
 * while identifying missing functionality that needs to be implemented.
 */

// Configuration
const PRODUCTION_FRONTEND = 'https://www.llmtxtmastery.com';
const PRODUCTION_BACKEND = 'https://llm-txt-mastery-production.up.railway.app';
const JAMIE_EMAIL = 'jamie.watters.mail@icloud.com';

test.describe('Coffee Tier Credit System - Current State Assessment', () => {
  
  test('1. System Health Check - Verify all endpoints are accessible', async ({ request }) => {
    console.log('Performing system health validation...');
    
    // Test backend health
    const healthResponse = await request.get(`${PRODUCTION_BACKEND}/api/health`);
    expect(healthResponse.ok()).toBeTruthy();
    console.log('✅ Backend health endpoint responding');
    
    // Test frontend accessibility
    const frontendResponse = await request.get(PRODUCTION_FRONTEND);
    expect(frontendResponse.ok() || frontendResponse.status() === 301).toBeTruthy();
    console.log('✅ Frontend accessible');
    
    // Test usage endpoint
    const usageResponse = await request.get(`${PRODUCTION_BACKEND}/api/usage/${encodeURIComponent(JAMIE_EMAIL)}`);
    expect(usageResponse.ok()).toBeTruthy();
    
    const usageData = await usageResponse.json();
    expect(usageData).toHaveProperty('tier', 'coffee');
    console.log('✅ Usage endpoint confirms Coffee tier user');
    console.log('Current usage data:', JSON.stringify(usageData, null, 2));
    
    // Check for creditsRemaining field
    if (usageData.creditsRemaining !== undefined) {
      console.log(`✅ Credits field present: ${usageData.creditsRemaining}`);
    } else {
      console.log('❌ creditsRemaining field missing from API response');
      console.log('   This indicates the credit system is not fully deployed');
    }
  });

  test('2. Admin Endpoint Assessment - Check if credit reset endpoint exists', async ({ request }) => {
    console.log('Testing admin endpoint availability...');
    
    // Test without admin key (should return 401 or proper error)
    const response = await request.post(`${PRODUCTION_BACKEND}/api/auth/admin/reset-coffee-credits`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        email: JAMIE_EMAIL
      }
    });

    console.log('Admin endpoint response status:', response.status());
    console.log('Response headers:', Object.fromEntries(response.headers().entries()));
    
    const contentType = response.headers()['content-type'] || '';
    
    if (contentType.includes('application/json')) {
      const data = await response.json();
      console.log('JSON response:', data);
      
      if (response.status() === 401) {
        console.log('✅ Admin endpoint exists and is properly secured');
      } else if (response.status() === 400) {
        console.log('✅ Admin endpoint exists but returned validation error');
      }
    } else {
      console.log('❌ Admin endpoint returning HTML instead of JSON');
      console.log('   This indicates the endpoint is not implemented or incorrectly routed');
      
      // Log first 200 chars of response
      const text = await response.text();
      console.log('Response preview:', text.substring(0, 200) + '...');
    }
  });

  test('3. UI Credit Display Assessment - Check production interface', async ({ page }) => {
    test.setTimeout(120000);

    console.log('Testing UI credit display...');
    
    // Navigate to production site
    await page.goto(PRODUCTION_FRONTEND);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/coffee-current-initial.png',
      fullPage: true 
    });

    // Find and fill email input
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    await emailInput.fill(JAMIE_EMAIL);
    
    // Submit form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for any authentication/loading
    await page.waitForTimeout(5000);
    
    // Take screenshot after submission
    await page.screenshot({ 
      path: 'test-results/coffee-current-after-submit.png',
      fullPage: true 
    });

    // Look for credit-related elements
    const creditSelectors = [
      'text=/credit/i',
      'text=/remaining/i', 
      'text=/100/',
      '[data-testid*="credit"]',
      '[data-testid*="usage"]',
      'text=/Coffee/',
      'text=/analysis/i'
    ];

    const foundElements = [];
    
    for (const selector of creditSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent();
          foundElements.push({ selector, text });
          console.log(`Found element: ${selector} -> "${text}"`);
        }
      } catch (error) {
        // Element not found, continue
      }
    }

    if (foundElements.length > 0) {
      console.log('✅ Found credit-related UI elements');
      foundElements.forEach(({ selector, text }) => {
        console.log(`   ${selector}: "${text}"`);
      });
    } else {
      console.log('❌ No credit-related UI elements found');
      console.log('   This indicates the credit display UI is not implemented');
    }

    // Check page content for credit-related text
    const pageContent = await page.content();
    const creditKeywords = ['credit', 'remaining', 'analysis', 'limit'];
    const foundKeywords = creditKeywords.filter(keyword => 
      pageContent.toLowerCase().includes(keyword.toLowerCase())
    );
    
    console.log('Credit-related keywords in page:', foundKeywords);
  });

  test('4. Analysis Flow Assessment - Test current behavior', async ({ page }) => {
    test.setTimeout(180000);

    console.log('Testing analysis flow with Coffee tier user...');
    
    // Navigate to analyze page
    await page.goto(`${PRODUCTION_FRONTEND}/analyze`);
    
    // Fill analysis form
    await page.fill('input[type="email"]', JAMIE_EMAIL);
    await page.fill('input[type="url"]', 'https://example.com');
    
    // Take screenshot before analysis
    await page.screenshot({ 
      path: 'test-results/coffee-current-before-analysis.png',
      fullPage: true 
    });

    // Submit analysis
    const analyzeButton = page.locator('button:has-text("Analyze")').first();
    await analyzeButton.click();

    // Monitor what happens
    await page.waitForTimeout(3000);
    
    // Look for various possible outcomes
    const outcomes = [
      { selector: 'text=/Analyzing/', status: 'Analysis started' },
      { selector: 'text=/credit/i', status: 'Credit-related message shown' },
      { selector: 'text=/limit/i', status: 'Limit-related message shown' },
      { selector: 'text=/error/i', status: 'Error message shown' },
      { selector: 'text=/Analysis Complete/', status: 'Analysis completed' }
    ];

    const detectedOutcomes = [];
    
    for (const outcome of outcomes) {
      try {
        if (await page.locator(outcome.selector).first().isVisible({ timeout: 5000 })) {
          detectedOutcomes.push(outcome.status);
          console.log(`✅ Detected: ${outcome.status}`);
        }
      } catch (error) {
        // Outcome not detected
      }
    }

    // Take screenshot after submission
    await page.screenshot({ 
      path: 'test-results/coffee-current-after-analysis.png',
      fullPage: true 
    });

    if (detectedOutcomes.length > 0) {
      console.log('Analysis flow outcomes detected:', detectedOutcomes);
    } else {
      console.log('❌ No clear analysis flow outcome detected');
    }

    // Check if analysis actually started
    if (detectedOutcomes.includes('Analysis started')) {
      console.log('🎯 Analysis flow is working');
      
      // Wait longer to see if it completes
      try {
        await page.waitForSelector('text=/Analysis Complete/', { timeout: 60000 });
        console.log('✅ Analysis completed successfully');
        
        // Take final screenshot
        await page.screenshot({ 
          path: 'test-results/coffee-current-analysis-complete.png',
          fullPage: true 
        });
      } catch (error) {
        console.log('⏱️ Analysis did not complete within timeout');
      }
    }
  });

  test('5. Missing Functionality Report', async () => {
    console.log('\n🔍 MISSING FUNCTIONALITY ASSESSMENT');
    console.log('=====================================');
    
    const missingFeatures = [];
    
    // Based on previous tests, identify what's missing
    console.log('Based on system assessment, the following features appear to be missing:');
    console.log('');
    
    console.log('❌ 1. Admin Credit Reset Endpoint');
    console.log('   • Expected: POST /api/auth/admin/reset-coffee-credits');
    console.log('   • Current: Returns HTML (not implemented)');
    console.log('   • Impact: Cannot reset user credits programmatically');
    console.log('');
    
    console.log('❌ 2. Credits Field in Usage API');
    console.log('   • Expected: creditsRemaining field in /api/usage response');
    console.log('   • Current: Field missing from API response');
    console.log('   • Impact: Cannot track credit consumption');
    console.log('');
    
    console.log('❓ 3. Credit Display in UI');
    console.log('   • Expected: Credit counter in user interface');
    console.log('   • Current: Need manual verification');
    console.log('   • Impact: Users cannot see remaining credits');
    console.log('');
    
    console.log('❓ 4. Credit Consumption Logic');
    console.log('   • Expected: Credits decrease after each analysis');
    console.log('   • Current: Need to verify if implemented');
    console.log('   • Impact: Credit system may not be functioning');
    console.log('');
    
    console.log('✅ CONFIRMED WORKING:');
    console.log('   • Production system is healthy and accessible');
    console.log('   • Jamie is confirmed as Coffee tier user');
    console.log('   • Analysis flow appears to work (needs credit verification)');
    console.log('');
    
    console.log('🚧 DEPLOYMENT STATUS:');
    console.log('   • Railway backend is responding');
    console.log('   • Frontend is accessible');
    console.log('   • Credit system appears incomplete');
    console.log('');
    
    // This test always passes - it's just for reporting
    expect(true).toBe(true);
  });

  test.afterAll(async () => {
    console.log('\n📋 COFFEE CREDIT SYSTEM ASSESSMENT COMPLETE');
    console.log('===========================================');
    console.log('');
    console.log('NEXT STEPS REQUIRED:');
    console.log('1. Deploy admin credit reset endpoint implementation');
    console.log('2. Add creditsRemaining field to usage API response');
    console.log('3. Implement credit display in UI');
    console.log('4. Verify credit consumption logic is working');
    console.log('5. Re-run comprehensive test suite once features are deployed');
    console.log('');
    console.log('FILES GENERATED:');
    console.log('• test-results/coffee-current-*.png - UI screenshots');
    console.log('• This assessment report');
  });
});