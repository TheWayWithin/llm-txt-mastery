import { chromium } from 'playwright';

// Test configuration
const TEST_EMAILS = {
  free1: 'foywzcntdwbcfstaxo@xfavaj.com',
  free2: 'dbgfxomstshxiutyyq@nesopf.com',
  coffee: 'jamie.watters.mail@icloud.com',
};

const BASE_URL = 'https://www.llmtxtmastery.com';

// Track issues found
const issues = [];

async function logIssue(severity, category, description, details = {}) {
  const issue = {
    severity, // CRITICAL, HIGH, MEDIUM, LOW
    category, // Navigation, UI, Functionality, Performance, etc.
    description,
    timestamp: new Date().toISOString(),
    ...details,
  };
  issues.push(issue);
  console.log(`❌ [${severity}] ${category}: ${description}`);
}

async function testComprehensively() {
  console.log('🚀 Starting Comprehensive QA Testing...\n');
  console.log('Test Emails:');
  console.log(`  Free Tier 1: ${TEST_EMAILS.free1}`);
  console.log(`  Free Tier 2: ${TEST_EMAILS.free2}`);
  console.log(`  Coffee Tier: ${TEST_EMAILS.coffee}\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  try {
    // ====================
    // TEST 1: NAVIGATION & LINKS
    // ====================
    console.log('\n📋 TEST 1: NAVIGATION & LINKS\n');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    console.log('✅ Homepage loaded');

    // Test header navigation
    const navLinks = await page.locator('nav a, header a').all();
    console.log(`Found ${navLinks.length} navigation links`);

    for (let i = 0; i < navLinks.length; i++) {
      const link = navLinks[i];
      const text = await link.textContent().catch(() => 'Unknown');
      const href = await link.getAttribute('href').catch(() => null);

      if (href && !href.startsWith('#') && !href.startsWith('http')) {
        console.log(`Testing nav link: ${text} -> ${href}`);
        try {
          await link.click();
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          const currentUrl = page.url();

          if (
            currentUrl.includes('404') ||
            (await page.locator('text=/404|not found/i').count()) > 0
          ) {
            await logIssue('HIGH', 'Navigation', `Broken link: ${text}`, { href, currentUrl });
          } else {
            console.log(`  ✅ Link works: ${text}`);
          }

          // Go back to homepage
          await page.goto(BASE_URL);
        } catch (error) {
          await logIssue('MEDIUM', 'Navigation', `Link navigation failed: ${text}`, {
            href,
            error: error.message,
          });
        }
      }
    }

    // Test footer links
    const footerLinks = await page.locator('footer a').all();
    console.log(`\nFound ${footerLinks.length} footer links`);

    for (let i = 0; i < footerLinks.length; i++) {
      const link = footerLinks[i];
      const text = await link.textContent().catch(() => 'Unknown');
      const href = await link.getAttribute('href').catch(() => null);

      if (href && !href.startsWith('mailto:') && !href.startsWith('#')) {
        console.log(`Testing footer link: ${text}`);

        if (href.startsWith('http')) {
          // External link - just check it exists
          console.log(`  ℹ️ External link: ${href}`);
        } else {
          try {
            await link.click();
            await page.waitForTimeout(2000);

            if (
              page.url().includes('404') ||
              (await page.locator('text=/404|not found/i').count()) > 0
            ) {
              await logIssue('MEDIUM', 'Navigation', `Broken footer link: ${text}`, { href });
            } else {
              console.log(`  ✅ Footer link works: ${text}`);
            }

            await page.goto(BASE_URL);
          } catch (error) {
            await logIssue('LOW', 'Navigation', `Footer link issue: ${text}`, {
              href,
              error: error.message,
            });
          }
        }
      }
    }

    // ====================
    // TEST 2: FREE TIER COMPLETE FLOW
    // ====================
    console.log('\n📋 TEST 2: FREE TIER COMPLETE FLOW\n');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Scroll to URL input
    await page.evaluate(() => {
      document
        .querySelector('input[placeholder*="example.com"]')
        ?.scrollIntoView({ behavior: 'smooth' });
    });
    await page.waitForTimeout(1000);

    // Enter URL
    const urlInput = page.locator('input[placeholder*="example.com"]');
    if ((await urlInput.count()) === 0) {
      await logIssue('CRITICAL', 'Functionality', 'URL input field not found');
    } else {
      await urlInput.fill('https://example.com');
      console.log('✅ Entered URL');

      // Click analyze
      const analyzeBtn = page.locator('button:has-text("Analyze Website")');
      if ((await analyzeBtn.count()) === 0) {
        await logIssue('CRITICAL', 'Functionality', 'Analyze button not found');
      } else {
        await analyzeBtn.click();
        console.log('✅ Clicked Analyze');

        // Wait for tier selection or email
        await page.waitForTimeout(3000);

        // Check for tier selection
        if ((await page.locator('text=/Choose Your Tier/i').count()) > 0) {
          console.log('✅ Tier selection displayed');

          // Select FREE tier
          const freeBtn = page.locator('button:has-text("Select FREE")').first();
          if ((await freeBtn.count()) > 0) {
            await freeBtn.click();
            console.log('✅ Selected FREE tier');
          } else {
            await logIssue('HIGH', 'UI', 'FREE tier selection button not found');
          }
        }

        // Enter email
        await page.waitForSelector('input[type="email"]', { timeout: 5000 }).catch(() => null);
        const emailInput = page.locator('input[type="email"]');
        if ((await emailInput.count()) > 0) {
          await emailInput.fill(TEST_EMAILS.free1);
          console.log(`✅ Entered email: ${TEST_EMAILS.free1}`);

          // Continue
          const continueBtn = page
            .locator(
              'button:has-text("Continue"), button:has-text("Quick Start"), button:has-text("Get Started")'
            )
            .first();
          if ((await continueBtn.count()) > 0) {
            await continueBtn.click();
            console.log('✅ Clicked continue');

            // Wait for analysis
            const analysisStarted = await page
              .waitForSelector('text=/Analyzing|Processing|Discovering/i', { timeout: 10000 })
              .catch(() => null);
            if (!analysisStarted) {
              await logIssue('HIGH', 'Functionality', 'Analysis did not start');
            } else {
              console.log('✅ Analysis started');

              // Wait for completion
              const analysisComplete = await page
                .waitForSelector('text=/found|complete|Review/i', { timeout: 60000 })
                .catch(() => null);
              if (analysisComplete) {
                console.log('✅ Analysis completed');

                // Check for "Review & Select Pages" or similar
                if ((await page.locator('text=/Review.*Select|Select.*Pages/i').count()) > 0) {
                  console.log('✅ Content review page displayed');

                  // Try to generate file
                  const generateBtn = page
                    .locator('button:has-text("Generate"), button:has-text("Create")')
                    .first();
                  if ((await generateBtn.count()) > 0) {
                    await generateBtn.click();
                    console.log('✅ Clicked Generate');

                    // Wait for file generation
                    await page.waitForTimeout(5000);

                    // Check for download button
                    const downloadBtn = page
                      .locator('button:has-text("Download"), a:has-text("Download")')
                      .first();
                    if ((await downloadBtn.count()) > 0) {
                      console.log('✅ Download button available');
                    } else {
                      await logIssue(
                        'MEDIUM',
                        'Functionality',
                        'Download button not found after generation'
                      );
                    }
                  }
                }
              } else {
                await logIssue('HIGH', 'Functionality', 'Analysis did not complete within timeout');
              }
            }
          } else {
            await logIssue('HIGH', 'UI', 'Continue button not found');
          }
        } else {
          await logIssue('CRITICAL', 'Functionality', 'Email input not found');
        }
      }
    }

    // ====================
    // TEST 3: COFFEE TIER RECOGNITION
    // ====================
    console.log('\n📋 TEST 3: COFFEE TIER RECOGNITION\n');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Scroll to URL input
    await page.evaluate(() => {
      document
        .querySelector('input[placeholder*="example.com"]')
        ?.scrollIntoView({ behavior: 'smooth' });
    });

    await page.fill('input[placeholder*="example.com"]', 'https://google.com');
    await page.click('button:has-text("Analyze Website")');

    // Wait for tier selection
    await page.waitForTimeout(3000);

    // Select FREE to enter email
    if ((await page.locator('text=/Choose Your Tier/i').count()) > 0) {
      const freeBtn = page.locator('button:has-text("Select FREE")').first();
      if ((await freeBtn.count()) > 0) {
        await freeBtn.click();
      }
    }

    // Enter Coffee tier email
    await page.waitForSelector('input[type="email"]', { timeout: 5000 }).catch(() => null);
    await page.fill('input[type="email"]', TEST_EMAILS.coffee);
    console.log(`✅ Entered Coffee tier email: ${TEST_EMAILS.coffee}`);

    // Continue
    const coffeeContBtn = page
      .locator(
        'button:has-text("Continue"), button:has-text("Quick Start"), button:has-text("Get Started")'
      )
      .first();
    await coffeeContBtn.click();

    await page.waitForTimeout(3000);

    // Check for login modal or Coffee tier recognition
    const hasLoginModal = (await page.locator('text=/Sign In|Login|Password/i').count()) > 0;
    const hasCoffeeBadge = (await page.locator('text=/Coffee.*4\.95|Unlimited/i').count()) > 0;

    if (hasLoginModal) {
      console.log('✅ Login modal displayed for Coffee tier user (expected)');
    } else if (hasCoffeeBadge) {
      console.log('✅ Coffee tier recognized');
    } else {
      await logIssue('MEDIUM', 'Authentication', 'Coffee tier user not properly recognized');
    }

    // ====================
    // TEST 4: RESPONSIVE DESIGN
    // ====================
    console.log('\n📋 TEST 4: RESPONSIVE DESIGN\n');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check if mobile menu exists
    const mobileMenu = page
      .locator(
        'button[aria-label*="menu"], button:has-text("Menu"), [class*="burger"], [class*="mobile-menu"]'
      )
      .first();
    if ((await mobileMenu.count()) > 0) {
      console.log('✅ Mobile menu found');

      // Try to open it
      await mobileMenu.click();
      await page.waitForTimeout(1000);

      // Check if menu opened
      const menuOpen =
        (await page.locator('nav:visible, [class*="menu-open"], [class*="mobile-nav"]').count()) >
        0;
      if (menuOpen) {
        console.log('✅ Mobile menu opens correctly');
      } else {
        await logIssue('MEDIUM', 'Responsive', 'Mobile menu does not open');
      }
    } else {
      await logIssue('HIGH', 'Responsive', 'No mobile menu found on mobile viewport');
    }

    // Check if content is properly scaled
    const contentWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;

    if (contentWidth > viewportWidth + 20) {
      // Allow 20px margin
      await logIssue(
        'MEDIUM',
        'Responsive',
        `Content overflows mobile viewport (${contentWidth}px vs ${viewportWidth}px)`
      );
    } else {
      console.log('✅ Content fits mobile viewport');
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // ====================
    // TEST 5: ERROR HANDLING
    // ====================
    console.log('\n📋 TEST 5: ERROR HANDLING\n');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Test with invalid URL
    await page.evaluate(() => {
      document.querySelector('input[placeholder*="example.com"]')?.scrollIntoView();
    });

    await page.fill('input[placeholder*="example.com"]', 'not-a-valid-url');
    await page.click('button:has-text("Analyze Website")');

    await page.waitForTimeout(2000);

    // Check for error message
    const errorMsg = await page.locator('text=/invalid|error|please.*valid/i').count();
    if (errorMsg > 0) {
      console.log('✅ Invalid URL error handling works');
    } else {
      await logIssue('MEDIUM', 'Error Handling', 'No error message for invalid URL');
    }

    // Test with unreachable URL
    await page.fill(
      'input[placeholder*="example.com"]',
      'https://this-domain-definitely-does-not-exist-12345.com'
    );
    await page.click('button:has-text("Analyze Website")');

    // This should proceed to tier selection even with bad URL
    await page.waitForTimeout(3000);

    // ====================
    // TEST 6: PRICING PAGE
    // ====================
    console.log('\n📋 TEST 6: PRICING PAGE\n');

    // Look for pricing link
    const pricingLink = page.locator('a:has-text("Pricing"), a[href*="pricing"]').first();
    if ((await pricingLink.count()) > 0) {
      await pricingLink.click();
      await page.waitForLoadState('networkidle');

      if (page.url().includes('pricing')) {
        console.log('✅ Pricing page loads');

        // Check for tier information
        const hasFree = (await page.locator('text=/Free.*3 analyses/i').count()) > 0;
        const hasCoffee = (await page.locator('text=/Coffee.*4\.95/i').count()) > 0;
        const hasGrowth = (await page.locator('text=/Growth.*25/i').count()) > 0;
        const hasScale = (await page.locator('text=/Scale.*99/i').count()) > 0;

        if (hasFree && hasCoffee && hasGrowth && hasScale) {
          console.log('✅ All tiers displayed on pricing page');
        } else {
          await logIssue('MEDIUM', 'Content', 'Some tiers missing from pricing page', {
            free: hasFree,
            coffee: hasCoffee,
            growth: hasGrowth,
            scale: hasScale,
          });
        }
      } else {
        await logIssue('HIGH', 'Navigation', 'Pricing page does not load');
      }
    } else {
      await logIssue('MEDIUM', 'Navigation', 'No pricing link found');
    }

    // ====================
    // SUMMARY
    // ====================
    console.log('\n' + '='.repeat(50));
    console.log('📊 TESTING COMPLETE - ISSUE SUMMARY');
    console.log('='.repeat(50) + '\n');

    if (issues.length === 0) {
      console.log('✨ No issues found! All tests passed.');
    } else {
      const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
      const highCount = issues.filter((i) => i.severity === 'HIGH').length;
      const mediumCount = issues.filter((i) => i.severity === 'MEDIUM').length;
      const lowCount = issues.filter((i) => i.severity === 'LOW').length;

      console.log(`Found ${issues.length} issues:`);
      console.log(`  🔴 CRITICAL: ${criticalCount}`);
      console.log(`  🟠 HIGH: ${highCount}`);
      console.log(`  🟡 MEDIUM: ${mediumCount}`);
      console.log(`  🟢 LOW: ${lowCount}`);

      console.log('\nDetailed Issues:');
      console.log('----------------');

      // Sort by severity
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. [${issue.severity}] ${issue.category}`);
        console.log(`   ${issue.description}`);
        if (issue.href) console.log(`   URL: ${issue.href}`);
        if (issue.error) console.log(`   Error: ${issue.error}`);
      });
    }

    // Save issues to file
    const fs = await import('fs');
    fs.writeFileSync('qa-test-results.json', JSON.stringify(issues, null, 2));
    console.log('\n📁 Results saved to qa-test-results.json');
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    await page.screenshot({
      path: 'qa-test-failure.png',
      fullPage: true,
    });
    console.log('📸 Error screenshot saved');
  } finally {
    await browser.close();
    console.log('\n🏁 Browser closed');
  }
}

// Run the comprehensive tests
testComprehensively().catch(console.error);
