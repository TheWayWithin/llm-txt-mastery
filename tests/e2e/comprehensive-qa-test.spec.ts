import { test, expect, Page } from '@playwright/test';

// Test credentials provided
const TEST_CREDENTIALS = {
  freeTier1: 'foywzcntdwbcfstaxo@xfavaj.com',
  freeTier2: 'dbgfxomstshxiutyyq@nesopf.com',
  coffeeTier: 'jamie.watters.mail@icloud.com',
};

// Production URL
const BASE_URL = 'https://www.llmtxtmastery.com';

// Bug tracking array
const bugs: Array<{
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'Navigation' | 'UI' | 'Functionality' | 'Performance' | 'Security';
  description: string;
  steps: string[];
  expected: string;
  actual: string;
  url?: string;
}> = [];

function reportBug(
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
  category: 'Navigation' | 'UI' | 'Functionality' | 'Performance' | 'Security',
  description: string,
  steps: string[],
  expected: string,
  actual: string,
  url?: string
) {
  bugs.push({ severity, category, description, steps, expected, actual, url });
}

test.describe('LLM.txt Mastery - Comprehensive QA Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for network operations
    page.setDefaultTimeout(30000);

    // Clear any existing state
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('1. Navigation Links - Header, Footer, and Buttons', async ({ page }) => {
    console.log('🔍 Testing Navigation Links...');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Test header navigation
    const headerLinks = await page.locator('header a, nav a').all();
    for (const link of headerLinks) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();

      if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
        try {
          await link.click({ timeout: 5000 });
          await page.waitForLoadState('networkidle', { timeout: 10000 });

          const currentUrl = page.url();
          const statusCode = await page.evaluate(() => {
            return fetch(window.location.href, { method: 'HEAD' })
              .then((res) => res.status)
              .catch(() => 0);
          });

          if (statusCode === 404) {
            reportBug(
              'HIGH',
              'Navigation',
              '404 Error on navigation link',
              [`Click on "${text}" link in header`],
              'Link should navigate to valid page',
              `Got 404 error`,
              currentUrl
            );
          }

          // Go back to main page for next test
          await page.goto(BASE_URL);
          await page.waitForLoadState('networkidle');
        } catch (error) {
          reportBug(
            'HIGH',
            'Navigation',
            `Navigation link "${text}" failed`,
            [`Click on "${text}" link`],
            'Should navigate successfully',
            `Error: ${error}`
          );
        }
      }
    }

    // Test footer links
    const footerLinks = await page.locator('footer a').all();
    for (const link of footerLinks) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();

      if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
        try {
          await link.click({ timeout: 5000 });
          await page.waitForLoadState('networkidle', { timeout: 10000 });

          const statusCode = await page.evaluate(() => {
            return fetch(window.location.href, { method: 'HEAD' })
              .then((res) => res.status)
              .catch(() => 0);
          });

          if (statusCode === 404) {
            reportBug(
              'MEDIUM',
              'Navigation',
              '404 Error on footer link',
              [`Click on "${text}" link in footer`],
              'Link should navigate to valid page',
              `Got 404 error`
            );
          }

          await page.goto(BASE_URL);
          await page.waitForLoadState('networkidle');
        } catch (error) {
          reportBug(
            'MEDIUM',
            'Navigation',
            `Footer link "${text}" failed`,
            [`Click on "${text}" link`],
            'Should navigate successfully',
            `Error: ${error}`
          );
        }
      }
    }
  });

  test('2. Free Tier Complete Flow - URL Entry to Download', async ({ page }) => {
    console.log('🔍 Testing Free Tier Flow...');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Step 1: Enter URL for analysis
    const urlInput = page
      .locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="website"]')
      .first();
    if ((await urlInput.count()) === 0) {
      reportBug(
        'CRITICAL',
        'Functionality',
        'URL input field not found on homepage',
        ['Navigate to homepage', 'Look for URL input field'],
        'Should have visible URL input field',
        'No URL input field found'
      );
      return;
    }

    await urlInput.fill('https://example.com');

    // Find and click analyze button
    const analyzeButton = page
      .locator('button:has-text("Analyze"), button:has-text("Start"), button[type="submit"]')
      .first();
    if ((await analyzeButton.count()) === 0) {
      reportBug(
        'CRITICAL',
        'Functionality',
        'Analyze button not found',
        ['Enter URL in input field', 'Look for analyze/submit button'],
        'Should have analyze button',
        'No analyze button found'
      );
      return;
    }

    await analyzeButton.click();
    await page.waitForTimeout(2000);

    // Step 2: Handle tier selection if it appears
    const tierSelection = page.locator(
      'text="Free Tier", text="Coffee Tier", button:has-text("Free")'
    );
    if ((await tierSelection.count()) > 0) {
      const freeTierButton = page
        .locator('button:has-text("Free"), button:has-text("Select Free")')
        .first();
      if ((await freeTierButton.count()) > 0) {
        await freeTierButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Step 3: Email capture
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
    if ((await emailInput.count()) > 0) {
      await emailInput.fill(TEST_CREDENTIALS.freeTier1);

      const submitEmailButton = page
        .locator('button:has-text("Continue"), button:has-text("Submit"), button[type="submit"]')
        .first();
      if ((await submitEmailButton.count()) > 0) {
        await submitEmailButton.click();
        await page.waitForTimeout(3000);
      }
    }

    // Step 4: Wait for analysis to complete
    let analysisComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max wait

    while (!analysisComplete && attempts < maxAttempts) {
      await page.waitForTimeout(10000); // Wait 10 seconds
      attempts++;

      // Check for completion indicators
      const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download")');
      const errorMessage = page.locator('text="Error", text="Failed", text="Problem"');
      const completeIndicator = page.locator('text="Complete", text="Ready", text="Finished"');

      if ((await downloadButton.count()) > 0 || (await completeIndicator.count()) > 0) {
        analysisComplete = true;
      } else if ((await errorMessage.count()) > 0) {
        const errorText = await errorMessage.first().textContent();
        reportBug(
          'HIGH',
          'Functionality',
          'Analysis failed with error',
          ['Enter URL', 'Select free tier', 'Enter email', 'Wait for analysis'],
          'Analysis should complete successfully',
          `Got error: ${errorText}`
        );
        return;
      }
    }

    if (!analysisComplete) {
      reportBug(
        'HIGH',
        'Performance',
        'Analysis taking too long or hanging',
        ['Enter URL', 'Select free tier', 'Enter email', 'Wait for analysis'],
        'Analysis should complete within reasonable time',
        'Analysis did not complete after 5 minutes'
      );
      return;
    }

    // Step 5: Test download functionality
    const downloadButton = page
      .locator('button:has-text("Download"), a:has-text("Download")')
      .first();
    if ((await downloadButton.count()) === 0) {
      reportBug(
        'HIGH',
        'Functionality',
        'Download button not available after analysis',
        ['Complete analysis flow'],
        'Should have download button available',
        'No download button found'
      );
      return;
    }

    // Test download
    const downloadPromise = page.waitForDownload();
    await downloadButton.click();
    const download = await downloadPromise;

    if (!download) {
      reportBug(
        'HIGH',
        'Functionality',
        'Download did not start',
        ['Click download button'],
        'Should start file download',
        'No download initiated'
      );
    } else {
      const filename = download.suggestedFilename();
      if (!filename.includes('.txt')) {
        reportBug(
          'MEDIUM',
          'Functionality',
          'Downloaded file has wrong extension',
          ['Download file'],
          'Should download .txt file',
          `Downloaded: ${filename}`
        );
      }
    }
  });

  test('3. Coffee Tier Recognition and Login Prompt', async ({ page }) => {
    console.log('🔍 Testing Coffee Tier Recognition...');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Enter URL and start analysis
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"]').first();
    if ((await urlInput.count()) > 0) {
      await urlInput.fill('https://example.com');

      const analyzeButton = page
        .locator('button:has-text("Analyze"), button[type="submit"]')
        .first();
      if ((await analyzeButton.count()) > 0) {
        await analyzeButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Look for tier selection and select Free first
    const freeTierButton = page.locator('button:has-text("Free")').first();
    if ((await freeTierButton.count()) > 0) {
      await freeTierButton.click();
      await page.waitForTimeout(1000);
    }

    // Enter coffee tier email
    const emailInput = page.locator('input[type="email"]').first();
    if ((await emailInput.count()) > 0) {
      await emailInput.fill(TEST_CREDENTIALS.coffeeTier);

      const submitButton = page
        .locator('button:has-text("Continue"), button[type="submit"]')
        .first();
      if ((await submitButton.count()) > 0) {
        await submitButton.click();
        await page.waitForTimeout(3000);
      }

      // Check if login prompt appears for coffee tier user
      const loginPrompt = page.locator('text="Login", text="Sign in", text="Authentication"');
      const dashboardRedirect = page.locator('text="Dashboard", text="Welcome back"');

      if ((await loginPrompt.count()) === 0 && (await dashboardRedirect.count()) === 0) {
        reportBug(
          'MEDIUM',
          'Functionality',
          'Coffee tier email not recognized',
          ['Enter coffee tier email'],
          'Should prompt for login or redirect to dashboard',
          'No recognition of coffee tier status'
        );
      }
    }
  });

  test('4. Mobile Responsiveness - 375px Width', async ({ page }) => {
    console.log('🔍 Testing Mobile Responsiveness...');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Test navigation is accessible on mobile
    const mobileMenu = page.locator('button:has-text("Menu"), [aria-label*="menu"], .hamburger');
    const navLinks = page.locator('nav a, header a');

    if ((await navLinks.count()) > 0) {
      const firstLink = navLinks.first();
      const isVisible = await firstLink.isVisible();

      if (!isVisible && (await mobileMenu.count()) === 0) {
        reportBug(
          'HIGH',
          'UI',
          'Navigation not accessible on mobile',
          ['Resize to 375px width'],
          'Should have visible nav or mobile menu',
          'Navigation hidden and no mobile menu found'
        );
      }
    }

    // Test form elements are usable on mobile
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"]').first();
    if ((await urlInput.count()) > 0) {
      const boundingBox = await urlInput.boundingBox();
      if (boundingBox && boundingBox.width < 200) {
        reportBug(
          'MEDIUM',
          'UI',
          'URL input too narrow on mobile',
          ['Resize to mobile width', 'Check URL input field'],
          'Input should be adequately sized',
          `Input width: ${boundingBox.width}px`
        );
      }
    }

    // Test buttons are tappable (minimum 44px)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();

      if (boundingBox && (boundingBox.height < 44 || boundingBox.width < 44)) {
        const buttonText = await button.textContent();
        reportBug(
          'MEDIUM',
          'UI',
          `Button too small for mobile touch: "${buttonText}"`,
          ['Check button size on mobile'],
          'Buttons should be minimum 44px touch target',
          `Size: ${boundingBox.width}x${boundingBox.height}px`
        );
      }
    }
  });

  test('5. Error Handling - Invalid URLs and Network Errors', async ({ page }) => {
    console.log('🔍 Testing Error Handling...');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Test invalid URL handling
    const invalidUrls = [
      'not-a-url',
      'http://',
      'ftp://example.com',
      'javascript:alert(1)',
      'https://nonexistent-domain-12345.com',
    ];

    for (const invalidUrl of invalidUrls) {
      const urlInput = page.locator('input[type="url"], input[placeholder*="URL"]').first();
      if ((await urlInput.count()) > 0) {
        await urlInput.fill(invalidUrl);

        const analyzeButton = page
          .locator('button:has-text("Analyze"), button[type="submit"]')
          .first();
        if ((await analyzeButton.count()) > 0) {
          await analyzeButton.click();
          await page.waitForTimeout(2000);

          // Check for appropriate error handling
          const errorMessage = page.locator('.error, .alert-error, text="Invalid", text="Error"');
          if ((await errorMessage.count()) === 0) {
            reportBug(
              'MEDIUM',
              'Functionality',
              `No error shown for invalid URL: ${invalidUrl}`,
              [`Enter invalid URL: ${invalidUrl}`, 'Click analyze'],
              'Should show error message',
              'No error handling visible'
            );
          }
        }

        // Reset for next test
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
      }
    }

    // Test empty form submission
    const analyzeButton = page.locator('button:has-text("Analyze"), button[type="submit"]').first();
    if ((await analyzeButton.count()) > 0) {
      await analyzeButton.click();
      await page.waitForTimeout(1000);

      const validationError = page.locator('text="required", text="Please enter", .form-error');
      if ((await validationError.count()) === 0) {
        reportBug(
          'LOW',
          'Functionality',
          'No validation error for empty form',
          ['Click analyze without entering URL'],
          'Should show validation error',
          'No validation feedback'
        );
      }
    }
  });

  test('6. Pricing Page and Tier Information', async ({ page }) => {
    console.log('🔍 Testing Pricing Page...');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find and navigate to pricing page
    const pricingLink = page
      .locator('a:has-text("Pricing"), a:has-text("Plans"), a[href*="pricing"]')
      .first();

    if ((await pricingLink.count()) > 0) {
      await pricingLink.click();
      await page.waitForLoadState('networkidle');

      // Check for pricing tiers
      const tiers = page.locator('.tier, .plan, .pricing-card');
      if ((await tiers.count()) === 0) {
        reportBug(
          'HIGH',
          'Functionality',
          'No pricing tiers visible on pricing page',
          ['Navigate to pricing page'],
          'Should show pricing tiers',
          'No pricing information displayed'
        );
      }

      // Check for essential pricing information
      const priceElements = page.locator('text="$", text="free", text="Free"');
      if ((await priceElements.count()) === 0) {
        reportBug(
          'HIGH',
          'Functionality',
          'No price information visible',
          ['Check pricing page content'],
          'Should display prices',
          'No pricing details found'
        );
      }

      // Check for feature comparisons
      const features = page.locator(
        'text="feature", text="included", text="unlimited", text="limited"'
      );
      if ((await features.count()) < 3) {
        reportBug(
          'MEDIUM',
          'UI',
          'Insufficient feature information on pricing page',
          ['Review pricing page features'],
          'Should clearly show tier differences',
          'Limited feature comparison available'
        );
      }
    } else {
      reportBug(
        'MEDIUM',
        'Navigation',
        'Pricing page link not found',
        ['Look for pricing link in navigation'],
        'Should have accessible pricing page',
        'No pricing link found'
      );
    }
  });

  test('7. Form Validation and Input Handling', async ({ page }) => {
    console.log('🔍 Testing Form Validation...');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Test URL input validation
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"]').first();
    if ((await urlInput.count()) > 0) {
      // Test required field validation
      const analyzeButton = page
        .locator('button:has-text("Analyze"), button[type="submit"]')
        .first();
      if ((await analyzeButton.count()) > 0) {
        await analyzeButton.click();
        await page.waitForTimeout(1000);

        // Should show validation
        const isValid = await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[required], input[type="url"]');
          return Array.from(inputs).every((input) => (input as HTMLInputElement).checkValidity());
        });

        if (isValid) {
          reportBug(
            'LOW',
            'Functionality',
            'Form submits without required URL',
            ['Submit form without URL'],
            'Should prevent submission',
            'Form allows empty submission'
          );
        }
      }

      // Test email validation if email field exists
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Trigger email form
      if ((await urlInput.count()) > 0) {
        await urlInput.fill('https://example.com');
        if ((await analyzeButton.count()) > 0) {
          await analyzeButton.click();
          await page.waitForTimeout(2000);

          const emailInput = page.locator('input[type="email"]').first();
          if ((await emailInput.count()) > 0) {
            // Test invalid email
            await emailInput.fill('invalid-email');
            const submitButton = page
              .locator('button:has-text("Continue"), button[type="submit"]')
              .first();
            if ((await submitButton.count()) > 0) {
              await submitButton.click();
              await page.waitForTimeout(1000);

              const emailValid = await page.evaluate(() => {
                const emailInputs = document.querySelectorAll('input[type="email"]');
                return Array.from(emailInputs).every((input) =>
                  (input as HTMLInputElement).checkValidity()
                );
              });

              if (emailValid) {
                reportBug(
                  'LOW',
                  'Functionality',
                  'Invalid email accepted',
                  ['Enter invalid email format'],
                  'Should show email validation error',
                  'Invalid email passes validation'
                );
              }
            }
          }
        }
      }
    }
  });

  test('8. Payment/Stripe Integration Buttons', async ({ page }) => {
    console.log('🔍 Testing Payment Integration...');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for upgrade buttons or payment calls-to-action
    const upgradeButtons = page.locator(
      'button:has-text("Upgrade"), button:has-text("Buy"), a:has-text("Get Started"), button:has-text("Coffee")'
    );
    const upgradeCount = await upgradeButtons.count();

    if (upgradeCount > 0) {
      for (let i = 0; i < Math.min(upgradeCount, 3); i++) {
        const button = upgradeButtons.nth(i);
        const buttonText = await button.textContent();

        try {
          await button.click({ timeout: 5000 });
          await page.waitForTimeout(2000);

          // Check if it leads to Stripe or payment page
          const currentUrl = page.url();
          const stripeIndicator = page.locator('text="Stripe", [src*="stripe"], text="Payment"');

          if (currentUrl.includes('stripe') || (await stripeIndicator.count()) > 0) {
            console.log(`✓ Payment button "${buttonText}" leads to payment system`);
          } else {
            reportBug(
              'LOW',
              'Functionality',
              `Payment button "${buttonText}" may not lead to payment`,
              [`Click "${buttonText}" button`],
              'Should lead to payment system',
              `Led to: ${currentUrl}`
            );
          }

          // Go back
          await page.goBack();
          await page.waitForLoadState('networkidle');
        } catch (error) {
          reportBug(
            'MEDIUM',
            'Functionality',
            `Payment button "${buttonText}" not clickable`,
            [`Click "${buttonText}" button`],
            'Button should be clickable',
            `Error: ${error}`
          );
        }
      }
    }
  });

  test('9. Performance and Loading Times', async ({ page }) => {
    console.log('🔍 Testing Performance...');

    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    if (loadTime > 5000) {
      reportBug(
        'MEDIUM',
        'Performance',
        'Page load time too slow',
        ['Navigate to homepage'],
        'Should load within 5 seconds',
        `Loaded in ${loadTime}ms`
      );
    }

    // Test image loading
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);

        if (naturalWidth === 0) {
          const src = await img.getAttribute('src');
          reportBug(
            'LOW',
            'Performance',
            `Image failed to load: ${src}`,
            ['Check page images'],
            'All images should load',
            `Image not loaded: ${src}`
          );
        }
      }
    }
  });

  test.afterAll(async () => {
    // Generate final bug report
    console.log('\n🐛 COMPREHENSIVE QA TEST RESULTS');
    console.log('='.repeat(50));

    if (bugs.length === 0) {
      console.log('✅ No bugs found! Application appears to be functioning well.');
    } else {
      console.log(`Found ${bugs.length} issues:\n`);

      const criticalBugs = bugs.filter((b) => b.severity === 'CRITICAL');
      const highBugs = bugs.filter((b) => b.severity === 'HIGH');
      const mediumBugs = bugs.filter((b) => b.severity === 'MEDIUM');
      const lowBugs = bugs.filter((b) => b.severity === 'LOW');

      console.log(`🔴 CRITICAL: ${criticalBugs.length}`);
      console.log(`🟠 HIGH: ${highBugs.length}`);
      console.log(`🟡 MEDIUM: ${mediumBugs.length}`);
      console.log(`🟢 LOW: ${lowBugs.length}\n`);

      // Show detailed reports for critical and high severity bugs
      [...criticalBugs, ...highBugs].forEach((bug, index) => {
        console.log(`\n${index + 1}. [${bug.severity}] ${bug.description}`);
        console.log(`Category: ${bug.category}`);
        console.log(`Steps: ${bug.steps.join(' → ')}`);
        console.log(`Expected: ${bug.expected}`);
        console.log(`Actual: ${bug.actual}`);
        if (bug.url) console.log(`URL: ${bug.url}`);
        console.log('-'.repeat(40));
      });

      // Remediation priority
      console.log('\n🔧 REMEDIATION PRIORITY:');
      if (criticalBugs.length > 0) {
        console.log('1. Address CRITICAL bugs immediately - these block core functionality');
      }
      if (highBugs.length > 0) {
        console.log('2. Fix HIGH severity bugs - these significantly impact user experience');
      }
      if (mediumBugs.length > 0) {
        console.log("3. Resolve MEDIUM bugs - these cause inconvenience but don't block usage");
      }
      if (lowBugs.length > 0) {
        console.log('4. Address LOW priority bugs when time permits');
      }
    }
  });
});
