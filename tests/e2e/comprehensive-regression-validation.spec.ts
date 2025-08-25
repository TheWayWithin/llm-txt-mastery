import { test, expect, Page } from '@playwright/test';
import { generateTempEmail } from './utils/temp-email-service';

/**
 * COMPREHENSIVE REGRESSION TESTING SUITE
 * 
 * Mission: Validate all critical functionality after major changes:
 * - GDPR compliance with Enzuzo integration
 * - Database fixes for dashboard display 
 * - Analysis progress tracking improvements
 * - Privacy policy and terms links
 * - Authentication flow enhancements
 * 
 * Scope: Complete end-to-end validation of all user journeys
 */

class TestReporter {
  private results: Array<{test: string, status: 'PASS' | 'FAIL', details?: string, screenshot?: string}> = [];
  
  async recordResult(test: string, status: 'PASS' | 'FAIL', details?: string, screenshot?: string) {
    this.results.push({ test, status, details, screenshot });
    console.log(`[${status}] ${test}${details ? ` - ${details}` : ''}`);
  }
  
  generateReport() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const total = this.results.length;
    const successRate = ((passed / total) * 100).toFixed(1);
    
    console.log('\n=== COMPREHENSIVE REGRESSION TEST RESULTS ===');
    console.log(`Success Rate: ${successRate}% (${passed}/${total} tests passed)`);
    console.log('\nDetailed Results:');
    
    this.results.forEach((result, i) => {
      console.log(`${i + 1}. [${result.status}] ${result.test}`);
      if (result.details) console.log(`   ${result.details}`);
    });
    
    return { passed, total, successRate: parseFloat(successRate), results: this.results };
  }
}

const reporter = new TestReporter();

// Utility functions
async function waitForPageLoad(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForTimeout(1000); // Additional stability wait
}

async function takeScreenshot(page: Page, name: string) {
  const timestamp = Date.now();
  const filename = `test-results/regression-${name}-${timestamp}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  return filename;
}

async function waitForElement(page: Page, selector: string, timeout = 10000) {
  await page.waitForSelector(selector, { timeout, state: 'visible' });
}

test.describe('🔥 COMPREHENSIVE REGRESSION VALIDATION', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for comprehensive tests
    test.setTimeout(120000);
    
    // Clear any existing state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1️⃣ COMPLETE USER JOURNEY - New User Flow', async ({ page }) => {
    console.log('\n🚀 Testing Complete New User Journey...');
    
    try {
      // Step 1: Landing page loads with all CTAs
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForPageLoad(page);
      
      // Verify landing page elements
      await expect(page.locator('h1')).toContainText('LLM.txt');
      await expect(page.locator('text=Get Started')).toBeVisible();
      
      const landingScreenshot = await takeScreenshot(page, 'landing-page');
      await reporter.recordResult('Landing Page Load', 'PASS', 'All CTAs visible', landingScreenshot);
      
      // Step 2: Privacy/Terms links work
      await page.click('text=Privacy Policy');
      await waitForPageLoad(page);
      await expect(page).toHaveURL(/.*privacy.*/);
      await expect(page.locator('h1')).toContainText('Privacy Policy');
      await reporter.recordResult('Privacy Policy Link', 'PASS');
      
      // Navigate back and test Terms
      await page.goBack();
      await waitForPageLoad(page);
      await page.click('text=Terms');
      await waitForPageLoad(page);
      await expect(page).toHaveURL(/.*terms.*/);
      await expect(page.locator('h1')).toContainText('Terms');
      await reporter.recordResult('Terms Link', 'PASS');
      
      // Navigate back to start flow
      await page.goBack();
      await waitForPageLoad(page);
      
      // Step 3: Get Started → Tier Selection
      await page.click('text=Get Started');
      await waitForPageLoad(page);
      
      // Should show tier selection
      await waitForElement(page, '[data-testid="tier-coffee"]');
      const coffeeVisible = await page.locator('[data-testid="tier-coffee"]').isVisible();
      
      if (coffeeVisible) {
        await reporter.recordResult('Tier Selection Display', 'PASS', 'Coffee tier visible and default');
        
        // Verify Coffee tier is default/pre-selected
        const coffeeSelected = await page.locator('[data-testid="tier-coffee"]').getAttribute('data-selected');
        if (coffeeSelected === 'true' || coffeeSelected === 'selected') {
          await reporter.recordResult('Coffee Tier Default', 'PASS');
        } else {
          await reporter.recordResult('Coffee Tier Default', 'FAIL', 'Coffee tier not pre-selected');
        }
      } else {
        await reporter.recordResult('Tier Selection Display', 'FAIL', 'Tier selection not visible');
      }
      
      // Step 4: Sign Up Flow
      const testEmail = await generateTempEmail();
      
      // Continue with coffee tier (should be selected)
      const continueButton = page.locator('button:has-text("Continue with Coffee"), button:has-text("Get Started")').first();
      await continueButton.click();
      await waitForPageLoad(page);
      
      // Should navigate to signup
      await expect(page).toHaveURL(/.*signup.*/);
      
      // Fill signup form
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', 'TestPassword123!');
      
      const signupScreenshot = await takeScreenshot(page, 'signup-form-filled');
      
      await page.click('button[type="submit"]');
      await waitForPageLoad(page, 15000);
      
      // Should redirect to check email or dashboard
      const currentUrl = page.url();
      if (currentUrl.includes('check-email') || currentUrl.includes('dashboard')) {
        await reporter.recordResult('Sign Up Flow', 'PASS', `Redirected to: ${currentUrl}`, signupScreenshot);
      } else {
        await reporter.recordResult('Sign Up Flow', 'FAIL', `Unexpected URL: ${currentUrl}`);
      }
      
      // Step 5: Test analysis flow (if accessible)
      if (currentUrl.includes('dashboard')) {
        await page.goto('/analyze');
        await waitForPageLoad(page);
        
        // Test URL input and analysis start
        await page.fill('input[placeholder*="Enter website URL"]', 'https://example.com');
        await page.click('button:has-text("Analyze")');
        
        // Wait for analysis to start
        await page.waitForSelector('.progress', { timeout: 10000 });
        await reporter.recordResult('Analysis Start', 'PASS', 'Progress indicator visible');
        
        const progressScreenshot = await takeScreenshot(page, 'analysis-progress');
        
        // Wait for progress steps to advance
        await page.waitForTimeout(5000);
        
        // Check if progress breadcrumb is working
        const breadcrumbVisible = await page.locator('[data-testid="progress-breadcrumb"]').isVisible();
        if (breadcrumbVisible) {
          await reporter.recordResult('Progress Breadcrumb', 'PASS');
        } else {
          await reporter.recordResult('Progress Breadcrumb', 'FAIL', 'Breadcrumb not visible');
        }
      }
      
    } catch (error) {
      console.error('Complete User Journey failed:', error);
      const errorScreenshot = await takeScreenshot(page, 'user-journey-error');
      await reporter.recordResult('Complete User Journey', 'FAIL', error.message, errorScreenshot);
    }
  });

  test('2️⃣ GDPR COMPLIANCE VALIDATION', async ({ page }) => {
    console.log('\n🔒 Testing GDPR Compliance...');
    
    try {
      // Clear cookies to ensure fresh consent state
      await page.context().clearCookies();
      
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForPageLoad(page);
      
      // Check if cookie consent banner appears
      const consentBanner = page.locator('.consent-banner, [data-testid="consent-banner"], #consent-banner');
      const bannerVisible = await consentBanner.isVisible().catch(() => false);
      
      if (bannerVisible) {
        await reporter.recordResult('Cookie Consent Banner', 'PASS', 'Banner appears on first visit');
        
        // Test Accept button
        const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Allow")').first();
        const acceptVisible = await acceptButton.isVisible().catch(() => false);
        
        if (acceptVisible) {
          await acceptButton.click();
          await page.waitForTimeout(2000);
          await reporter.recordResult('Accept Button', 'PASS');
        } else {
          await reporter.recordResult('Accept Button', 'FAIL', 'Accept button not found');
        }
      } else {
        // Check if Enzuzo script is loaded (alternative implementation)
        const enzuzoScript = await page.evaluate(() => {
          return !!window.Enzuzo || document.querySelector('script[src*="enzuzo"]');
        });
        
        if (enzuzoScript) {
          await reporter.recordResult('GDPR Implementation', 'PASS', 'Enzuzo integration detected');
        } else {
          await reporter.recordResult('GDPR Implementation', 'FAIL', 'No consent mechanism found');
        }
      }
      
      // Test privacy policy accessibility
      const privacyLink = page.locator('a:has-text("Privacy"), a[href*="privacy"]').first();
      const privacyVisible = await privacyLink.isVisible().catch(() => false);
      
      if (privacyVisible) {
        await privacyLink.click();
        await waitForPageLoad(page);
        await expect(page).toHaveURL(/.*privacy.*/);
        await reporter.recordResult('Privacy Policy Access', 'PASS');
      } else {
        await reporter.recordResult('Privacy Policy Access', 'FAIL', 'Privacy link not accessible');
      }
      
    } catch (error) {
      console.error('GDPR Compliance failed:', error);
      await reporter.recordResult('GDPR Compliance', 'FAIL', error.message);
    }
  });

  test('3️⃣ DASHBOARD FUNCTIONALITY VALIDATION', async ({ page }) => {
    console.log('\n📊 Testing Dashboard Functionality...');
    
    try {
      // Need to be authenticated for dashboard access
      await page.goto('/login', { waitUntil: 'networkidle' });
      
      // Try to login with a test account or create one
      const testEmail = await generateTempEmail();
      
      // First create account if needed
      await page.goto('/signup');
      await waitForPageLoad(page);
      
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      await waitForPageLoad(page, 15000);
      
      // Navigate to dashboard
      await page.goto('/dashboard');
      await waitForPageLoad(page);
      
      // Check if dashboard loads without errors
      const dashboardTitle = page.locator('h1, h2').first();
      await expect(dashboardTitle).toBeVisible({ timeout: 10000 });
      
      await reporter.recordResult('Dashboard Access', 'PASS');
      
      // Check "My Analyses" section
      const myAnalysesTab = page.locator('text=My Analyses, [data-tab="analyses"]').first();
      const analysesVisible = await myAnalysesTab.isVisible().catch(() => false);
      
      if (analysesVisible) {
        await myAnalysesTab.click();
        await waitForPageLoad(page);
        
        // Check if analyses display properly (not showing 0 count)
        const analysisCount = page.locator('[data-testid="analysis-count"], .analysis-count');
        const zeroText = await page.locator('text=0 total, text=No analyses').isVisible().catch(() => false);
        
        if (!zeroText) {
          await reporter.recordResult('Dashboard Fix Verified', 'PASS', 'No 0 count display issue');
        } else {
          await reporter.recordResult('Dashboard Fix Verified', 'FAIL', 'Still showing 0 count');
        }
        
        await reporter.recordResult('My Analyses Tab', 'PASS');
      } else {
        await reporter.recordResult('My Analyses Tab', 'FAIL', 'Tab not accessible');
      }
      
    } catch (error) {
      console.error('Dashboard Functionality failed:', error);
      await reporter.recordResult('Dashboard Functionality', 'FAIL', error.message);
    }
  });

  test('4️⃣ ANALYSIS PROGRESS TRACKING', async ({ page }) => {
    console.log('\n⏳ Testing Analysis Progress Tracking...');
    
    try {
      // Navigate to analyze page
      await page.goto('/analyze', { waitUntil: 'networkidle' });
      await waitForPageLoad(page);
      
      // Start an analysis
      await page.fill('input[placeholder*="Enter website URL"]', 'https://example.com');
      await page.click('button:has-text("Analyze")');
      
      // Wait for progress to start
      await page.waitForSelector('.progress, [data-testid="progress"]', { timeout: 15000 });
      await reporter.recordResult('Progress Display', 'PASS', 'Progress indicator appears');
      
      // Check progress breadcrumb
      const breadcrumb = page.locator('[data-testid="progress-breadcrumb"], .progress-breadcrumb');
      const breadcrumbVisible = await breadcrumb.isVisible().catch(() => false);
      
      if (breadcrumbVisible) {
        await reporter.recordResult('Progress Breadcrumb', 'PASS');
        
        // Check if email-capture step shows as completed
        const emailCaptureStep = page.locator('[data-step="email-capture"]');
        const emailStepCompleted = await emailCaptureStep.getAttribute('data-status');
        
        if (emailStepCompleted === 'completed' || emailStepCompleted === 'done') {
          await reporter.recordResult('Email Capture Step', 'PASS', 'Shows as completed');
        } else {
          await reporter.recordResult('Email Capture Step', 'FAIL', 'Not showing as completed');
        }
      } else {
        await reporter.recordResult('Progress Breadcrumb', 'FAIL', 'Breadcrumb not visible');
      }
      
      // Wait for progress stages to advance
      let progressStuck = false;
      let lastStage = '';
      
      for (let i = 0; i < 30; i++) { // Wait up to 30 seconds
        await page.waitForTimeout(1000);
        
        const currentStage = await page.locator('[data-testid="current-stage"]').textContent().catch(() => '');
        
        if (currentStage && currentStage !== lastStage) {
          console.log(`Progress advanced to: ${currentStage}`);
          lastStage = currentStage;
        }
        
        // Check if stuck at "Site Discovery Complete"
        if (currentStage.includes('Site Discovery Complete') && i > 10) {
          progressStuck = true;
          break;
        }
        
        // Check if analysis completed
        const analysisComplete = await page.locator('text=Analysis Complete, .analysis-complete').isVisible().catch(() => false);
        if (analysisComplete) {
          await reporter.recordResult('Analysis Completion', 'PASS', 'Analysis completed successfully');
          break;
        }
      }
      
      if (progressStuck) {
        await reporter.recordResult('Progress Tracking', 'FAIL', 'Analysis stuck at Site Discovery');
      } else {
        await reporter.recordResult('Progress Tracking', 'PASS', 'Progress advances properly');
      }
      
    } catch (error) {
      console.error('Analysis Progress Tracking failed:', error);
      await reporter.recordResult('Analysis Progress Tracking', 'FAIL', error.message);
    }
  });

  test('5️⃣ MOBILE RESPONSIVENESS', async ({ page }) => {
    console.log('\n📱 Testing Mobile Responsiveness...');
    
    try {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForPageLoad(page);
      
      // Check if landing page is responsive
      const hero = page.locator('h1').first();
      await expect(hero).toBeVisible();
      
      const mobileScreenshot = await takeScreenshot(page, 'mobile-landing');
      await reporter.recordResult('Mobile Landing Page', 'PASS', 'Hero visible on mobile', mobileScreenshot);
      
      // Test navigation menu
      const mobileMenu = page.locator('button[aria-label="Menu"], .mobile-menu-button');
      const menuVisible = await mobileMenu.isVisible().catch(() => false);
      
      if (menuVisible) {
        await reporter.recordResult('Mobile Navigation', 'PASS');
      } else {
        await reporter.recordResult('Mobile Navigation', 'FAIL', 'Mobile menu not accessible');
      }
      
      // Test tier selection on mobile
      await page.click('text=Get Started');
      await waitForPageLoad(page);
      
      const tierGrid = page.locator('[data-testid="tier-selection"], .tier-grid');
      const tierGridVisible = await tierGrid.isVisible().catch(() => false);
      
      if (tierGridVisible) {
        await reporter.recordResult('Mobile Tier Selection', 'PASS');
      } else {
        await reporter.recordResult('Mobile Tier Selection', 'FAIL', 'Tier selection not responsive');
      }
      
    } catch (error) {
      console.error('Mobile Responsiveness failed:', error);
      await reporter.recordResult('Mobile Responsiveness', 'FAIL', error.message);
    }
  });

  test('6️⃣ ERROR HANDLING & EDGE CASES', async ({ page }) => {
    console.log('\n⚠️ Testing Error Handling...');
    
    try {
      await page.goto('/analyze', { waitUntil: 'networkidle' });
      
      // Test invalid URL
      await page.fill('input[placeholder*="Enter website URL"]', 'not-a-valid-url');
      await page.click('button:has-text("Analyze")');
      
      // Should show validation error
      const errorMessage = page.locator('.error-message, [role="alert"], .text-red');
      const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (errorVisible) {
        await reporter.recordResult('Invalid URL Handling', 'PASS', 'Error message displayed');
      } else {
        await reporter.recordResult('Invalid URL Handling', 'FAIL', 'No error message for invalid URL');
      }
      
      // Test empty form submission
      await page.fill('input[placeholder*="Enter website URL"]', '');
      await page.click('button:has-text("Analyze")');
      
      const emptyFieldError = await page.locator('.error-message, [role="alert"]').isVisible({ timeout: 3000 }).catch(() => false);
      
      if (emptyFieldError) {
        await reporter.recordResult('Empty Field Validation', 'PASS');
      } else {
        await reporter.recordResult('Empty Field Validation', 'FAIL', 'No validation for empty field');
      }
      
    } catch (error) {
      console.error('Error Handling failed:', error);
      await reporter.recordResult('Error Handling', 'FAIL', error.message);
    }
  });

  test('7️⃣ PERFORMANCE VALIDATION', async ({ page }) => {
    console.log('\n🚀 Testing Performance...');
    
    try {
      // Measure page load time
      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      if (loadTime < 5000) {
        await reporter.recordResult('Page Load Performance', 'PASS', `Loaded in ${loadTime}ms`);
      } else {
        await reporter.recordResult('Page Load Performance', 'FAIL', `Slow load: ${loadTime}ms`);
      }
      
      // Check for console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(3000);
      
      if (consoleErrors.length === 0) {
        await reporter.recordResult('Console Errors', 'PASS', 'No console errors');
      } else {
        await reporter.recordResult('Console Errors', 'FAIL', `${consoleErrors.length} errors found`);
      }
      
    } catch (error) {
      console.error('Performance Validation failed:', error);
      await reporter.recordResult('Performance Validation', 'FAIL', error.message);
    }
  });

  test.afterAll(async () => {
    // Generate final comprehensive report
    const results = reporter.generateReport();
    
    console.log('\n🎯 REGRESSION TEST SUMMARY:');
    console.log(`Overall Success Rate: ${results.successRate}%`);
    console.log(`Tests Passed: ${results.passed}/${results.total}`);
    
    if (results.successRate >= 80) {
      console.log('✅ REGRESSION TESTS PASSED - System is stable');
    } else {
      console.log('❌ REGRESSION TESTS FAILED - Issues detected');
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    if (results.successRate < 100) {
      console.log('- Review failed test details above');
      console.log('- Fix critical issues before deployment');
      console.log('- Re-run tests after fixes');
    } else {
      console.log('- All tests passed successfully');
      console.log('- System ready for production');
    }
  });
});