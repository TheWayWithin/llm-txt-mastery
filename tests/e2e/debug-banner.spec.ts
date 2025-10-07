import { test, expect } from '@playwright/test';

test.describe('Debug Email Verification Banner', () => {
  test('inspect DOM for banner element', async ({ page }) => {
    const testEmail = `debug-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Set longer timeout
    test.setTimeout(90000);

    // Capture console logs
    const consoleLogs: any[] = [];
    page.on('console', async (msg) => {
      const text = msg.text();
      consoleLogs.push({ text, type: msg.type() });

      if (
        text.includes('EmailVerificationBanner') ||
        text.includes('Banner will show') ||
        text.includes('emailVerified')
      ) {
        console.log(`[${msg.type()}] ${text}`);
      }
    });

    // Go to production site
    await page.goto('https://www.llmtxtmastery.com', {
      timeout: 60000,
      waitUntil: 'domcontentloaded',
    });

    await page.waitForTimeout(2000);

    // Find and click user icon
    const userIconSelectors = [
      'button:has(svg[class*="lucide-user"])',
      'button:has([aria-label*="User"])',
      'header button:has(svg)',
      'nav button:has(svg)',
      '[aria-label="User account"]',
    ];

    let clicked = false;
    for (const selector of userIconSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click();
          clicked = true;
          console.log(`✓ Clicked user icon: ${selector}`);
          break;
        }
      } catch {
        // Try next
      }
    }

    if (!clicked) {
      throw new Error('Could not find user icon button');
    }

    // Wait for auth modal
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Click Sign Up
    await page.locator('text=Sign up').click();
    await page.waitForTimeout(500);

    // Fill registration form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    // Fill confirm password
    const confirmField = page.locator('input[type="password"]').nth(1);
    await confirmField.fill(testPassword);

    // Submit
    await page.locator('button:has-text("Sign up")').click();

    // Wait for registration
    await page.waitForTimeout(3000);

    // Now inspect the DOM for any Alert elements
    console.log('\n=== DOM Inspection ===');

    // Check for Alert role
    const alertElements = await page.locator('[role="alert"]').count();
    console.log(`Elements with role="alert": ${alertElements}`);

    if (alertElements > 0) {
      for (let i = 0; i < alertElements; i++) {
        const element = page.locator('[role="alert"]').nth(i);
        const isVisible = await element.isVisible();
        const computedStyle = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            position: styles.position,
            top: styles.top,
            left: styles.left,
            width: styles.width,
            height: styles.height,
            zIndex: styles.zIndex,
            className: el.className,
            innerHTML: el.innerHTML.substring(0, 200),
          };
        });
        console.log(`Alert ${i + 1} visible: ${isVisible}`);
        console.log('Computed styles:', computedStyle);
      }
    }

    // Check for banner-specific classes
    const bannerClasses = ['.border-amber-200', '.bg-amber-50', '.text-amber-800'];

    for (const cls of bannerClasses) {
      const count = await page.locator(cls).count();
      console.log(`Elements with ${cls}: ${count}`);
      if (count > 0) {
        const element = page.locator(cls).first();
        const boundingBox = await element.boundingBox();
        const text = await element.textContent();
        console.log(`  - Bounding box:`, boundingBox);
        console.log(`  - Text content: "${text?.substring(0, 100)}..."`);
      }
    }

    // Check if React component is in the DOM
    const reactComponentCheck = await page.evaluate(() => {
      // Try to find any element with text containing "Verify"
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);

      const verifyNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent && node.textContent.toLowerCase().includes('verify')) {
          const parent = (node as any).parentElement;
          verifyNodes.push({
            text: node.textContent.trim(),
            parentTag: parent?.tagName,
            parentClass: parent?.className,
            parentId: parent?.id,
            isVisible: parent
              ? parent.offsetWidth > 0 &&
                parent.offsetHeight > 0 &&
                window.getComputedStyle(parent).display !== 'none'
              : false,
          });
        }
      }
      return verifyNodes;
    });

    console.log('\n=== Text nodes containing "verify" ===');
    console.log(JSON.stringify(reactComponentCheck, null, 2));

    // Take screenshot
    await page.screenshot({
      path: 'test-results/debug-banner-dom.png',
      fullPage: true,
    });

    // Print console logs summary
    console.log('\n=== Console Logs Summary ===');
    const bannerLogs = consoleLogs.filter(
      (log) => log.text.includes('EmailVerificationBanner') || log.text.includes('Banner will show')
    );
    bannerLogs.forEach((log) => console.log(`[${log.type}] ${log.text}`));

    // Get the full HTML to check if component is there
    const bodyHTML = await page.locator('body').innerHTML();
    const containsVerifyText = bodyHTML.toLowerCase().includes('verify your email');
    const containsAlertRole = bodyHTML.includes('role="alert"');

    console.log('\n=== HTML Analysis ===');
    console.log('Contains "verify your email":', containsVerifyText);
    console.log('Contains role="alert":', containsAlertRole);

    // Final assertion
    expect(alertElements).toBeGreaterThan(0);
  });
});
