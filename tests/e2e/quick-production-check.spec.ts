import { test, expect } from '@playwright/test';

/**
 * Quick Production Health Check
 * Focused tests to validate key issues found in comprehensive testing
 */

test.describe('Quick Production Health Check', () => {
  test('should load homepage and capture current state', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Capture full page screenshot
    await page.screenshot({
      path: 'playwright-report/homepage-current-state.png',
      fullPage: true,
    });

    // Check what's actually on the page
    const pageTitle = await page.title();
    console.log('Page Title:', pageTitle);

    const pageContent = await page.locator('body').textContent();
    console.log('Page Content Preview:', pageContent?.substring(0, 500));

    // Check for main elements
    const h1Elements = await page.locator('h1').allTextContents();
    console.log('H1 Elements:', h1Elements);

    // Check for form elements
    const emailInputs = await page.locator('input[type="email"]').count();
    console.log('Email inputs found:', emailInputs);

    const buttons = await page.locator('button').allTextContents();
    console.log('Buttons found:', buttons);

    // Check navigation
    const navLinks = await page.locator('nav a, header a').allTextContents();
    console.log('Navigation links:', navLinks);
  });

  test('should check each MVP page accessibility', async ({ page }) => {
    const pages = ['/about', '/docs', '/contact', '/privacy', '/terms', '/blog'];

    for (const pagePath of pages) {
      console.log(`Checking page: ${pagePath}`);

      const response = await page.goto(pagePath);
      const status = response?.status();

      console.log(`${pagePath} - Status: ${status}`);

      if (status === 200) {
        const title = await page.title();
        const h1 = await page
          .locator('h1')
          .first()
          .textContent()
          .catch(() => 'No H1 found');
        console.log(`${pagePath} - Title: ${title}, H1: ${h1}`);

        // Take screenshot
        await page.screenshot({
          path: `playwright-report/page-${pagePath.replace('/', '')}.png`,
        });
      } else {
        console.log(`${pagePath} - ERROR: Status ${status}`);
      }
    }
  });

  test('should check for React Router context error', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    console.log('Console errors found:', errors);

    // Check if there's a React Router context error
    const routerErrors = errors.filter(
      (error) =>
        error.includes('useContext') || error.includes('basename') || error.includes('Router')
    );

    if (routerErrors.length > 0) {
      console.log('CRITICAL: React Router context errors detected:', routerErrors);
    }
  });
});
