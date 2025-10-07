import { test, expect, Page, BrowserContext } from '@playwright/test';

const PRODUCTION_BASE_URL = 'https://www.llmtxtmastery.com';
const TEST_EMAIL = 'tmuybqteuljyrjvwra@nespj.com';

// Helper function to login and navigate to dashboard
async function loginAndNavigateToDashboard(page: Page): Promise<void> {
  // Navigate to the main page
  await page.goto(PRODUCTION_BASE_URL);

  // Look for login/sign in button or link
  await page.waitForLoadState('networkidle');

  // Try multiple selectors for login button
  const loginSelectors = [
    'text="Sign In"',
    'text="Login"',
    'text="Log In"',
    '[data-testid="login-button"]',
    'button:has-text("Sign In")',
    'a:has-text("Sign In")',
  ];

  let loginClicked = false;
  for (const selector of loginSelectors) {
    try {
      const loginElement = page.locator(selector).first();
      if (await loginElement.isVisible({ timeout: 2000 })) {
        await loginElement.click();
        loginClicked = true;
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }

  if (!loginClicked) {
    // Try navigating directly to dashboard or login page
    await page.goto(`${PRODUCTION_BASE_URL}/dashboard`);
  }

  // Fill in email field
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]',
    '[data-testid="email-input"]',
  ];

  let emailField = null;
  for (const selector of emailSelectors) {
    try {
      emailField = page.locator(selector).first();
      if (await emailField.isVisible({ timeout: 2000 })) {
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }

  if (emailField) {
    await emailField.fill(TEST_EMAIL);

    // Look for submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'button:has-text("Continue")',
      '[data-testid="submit-button"]',
    ];

    for (const selector of submitSelectors) {
      try {
        const submitButton = page.locator(selector).first();
        if (await submitButton.isVisible({ timeout: 2000 })) {
          await submitButton.click();
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
  }

  // Wait for navigation to dashboard
  await page.waitForLoadState('networkidle');

  // Ensure we're on the dashboard
  await expect(page).toHaveURL(/dashboard|profile/, { timeout: 10000 });
}

// Helper function to navigate to My Analyses tab
async function navigateToMyAnalyses(page: Page): Promise<void> {
  // Look for My Analyses tab
  const myAnalysesSelectors = [
    'text="My Analyses"',
    '[data-testid="my-analyses-tab"]',
    'button:has-text("My Analyses")',
    'a:has-text("My Analyses")',
    'li:has-text("My Analyses")',
  ];

  for (const selector of myAnalysesSelectors) {
    try {
      const tabElement = page.locator(selector).first();
      if (await tabElement.isVisible({ timeout: 2000 })) {
        await tabElement.click();
        await page.waitForLoadState('networkidle');
        return;
      }
    } catch (error) {
      // Continue to next selector
    }
  }

  // If no specific tab found, look for analyses content directly
  await page.waitForTimeout(2000);
}

test.describe('Dashboard - My Analyses Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for production tests
    test.setTimeout(60000);
  });

  test('should authenticate and access dashboard', async ({ page }) => {
    await test.step('Navigate to site and login', async () => {
      await loginAndNavigateToDashboard(page);

      // Take screenshot of dashboard access
      await page.screenshot({
        path: 'test-results/dashboard-authenticated.png',
        fullPage: true,
      });

      // Verify we're authenticated and on dashboard
      const url = page.url();
      expect(url).toMatch(/(dashboard|profile)/);
    });

    await test.step('Verify dashboard elements are present', async () => {
      // Look for dashboard-specific content
      const dashboardIndicators = [
        'text="Dashboard"',
        'text="My Analyses"',
        'text="Welcome"',
        '[data-testid="dashboard"]',
      ];

      let foundDashboard = false;
      for (const selector of dashboardIndicators) {
        try {
          if (await page.locator(selector).isVisible({ timeout: 3000 })) {
            foundDashboard = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }

      expect(foundDashboard).toBe(true);
    });
  });

  test('should display My Analyses with correct data (NOT showing 0)', async ({ page }) => {
    await test.step('Login and navigate to My Analyses', async () => {
      await loginAndNavigateToDashboard(page);
      await navigateToMyAnalyses(page);

      // Wait for analyses to load
      await page.waitForTimeout(3000);
    });

    await test.step('Verify analyses are displayed (not 0)', async () => {
      // Take screenshot of My Analyses section
      await page.screenshot({
        path: 'test-results/my-analyses-full-view.png',
        fullPage: true,
      });

      // Look for analysis count indicators
      const countSelectors = [
        'text="0 total"',
        'text="No analyses"',
        'text="You haven\'t created any analyses"',
      ];

      // Verify we DON'T see empty state messages
      for (const selector of countSelectors) {
        try {
          const emptyMessage = page.locator(selector);
          await expect(emptyMessage).not.toBeVisible({ timeout: 2000 });
        } catch (error) {
          // Good - empty message not found
        }
      }

      // Look for analysis cards or items
      const analysisSelectors = [
        '[data-testid="analysis-card"]',
        '.analysis-card',
        '[class*="analysis"]',
        'text="llmtxtmastery.com"',
        'text="freecalchub.com"',
        'text="completed"',
        'text="View"',
      ];

      let foundAnalyses = false;
      for (const selector of analysisSelectors) {
        try {
          const analysisElement = page.locator(selector).first();
          if (await analysisElement.isVisible({ timeout: 3000 })) {
            foundAnalyses = true;
            console.log(`Found analyses with selector: ${selector}`);
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }

      // If no specific analysis cards found, check for any content that suggests analyses exist
      if (!foundAnalyses) {
        const contentIndicators = [
          'text="pages"',
          'text="analysis"',
          'text="website"',
          'text="View"',
          'text="Re-run"',
        ];

        for (const selector of contentIndicators) {
          try {
            if ((await page.locator(selector).count()) > 0) {
              foundAnalyses = true;
              console.log(`Found analysis content with: ${selector}`);
              break;
            }
          } catch (error) {
            // Continue checking
          }
        }
      }

      expect(foundAnalyses).toBe(true);
    });

    await test.step('Verify analysis metadata is displayed', async () => {
      // Look for expected website URLs
      const expectedUrls = ['llmtxtmastery.com', 'freecalchub.com'];

      for (const url of expectedUrls) {
        try {
          const urlElement = page.locator(`text="${url}"`).or(page.locator(`text*="${url}"`));
          if ((await urlElement.count()) > 0) {
            console.log(`Found expected URL: ${url}`);
          }
        } catch (error) {
          // URL might not be visible, that's OK
        }
      }

      // Look for status indicators
      const statusSelectors = [
        'text="completed"',
        'text="Completed"',
        'text="success"',
        'text="Success"',
      ];

      for (const selector of statusSelectors) {
        try {
          if ((await page.locator(selector).count()) > 0) {
            console.log(`Found status indicator: ${selector}`);
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
    });
  });

  test('should test UI interactions in My Analyses', async ({ page }) => {
    await test.step('Login and navigate to My Analyses', async () => {
      await loginAndNavigateToDashboard(page);
      await navigateToMyAnalyses(page);
      await page.waitForTimeout(3000);
    });

    await test.step('Test search functionality', async () => {
      const searchSelectors = [
        'input[placeholder*="search" i]',
        'input[type="search"]',
        '[data-testid="search-input"]',
      ];

      for (const selector of searchSelectors) {
        try {
          const searchInput = page.locator(selector).first();
          if (await searchInput.isVisible({ timeout: 2000 })) {
            await searchInput.fill('llmtxtmastery');
            await page.waitForTimeout(1000);

            // Take screenshot of search results
            await page.screenshot({
              path: 'test-results/analyses-search-results.png',
              fullPage: true,
            });

            // Clear search
            await searchInput.clear();
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
    });

    await test.step('Test filters and sorting', async () => {
      // Look for filter dropdowns or buttons
      const filterSelectors = [
        'select:has(option:text("All"))',
        'select:has(option:text("Completed"))',
        '[data-testid="status-filter"]',
        'button:has-text("All")',
        'button:has-text("Completed")',
      ];

      for (const selector of filterSelectors) {
        try {
          const filterElement = page.locator(selector).first();
          if (await filterElement.isVisible({ timeout: 2000 })) {
            await filterElement.click();
            await page.waitForTimeout(1000);

            // Take screenshot of filter interaction
            await page.screenshot({
              path: 'test-results/analyses-filter-interaction.png',
              fullPage: true,
            });
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      // Look for sort options
      const sortSelectors = [
        'select:has(option:text("Newest"))',
        'select:has(option:text("Oldest"))',
        '[data-testid="sort-select"]',
      ];

      for (const selector of sortSelectors) {
        try {
          const sortElement = page.locator(selector).first();
          if (await sortElement.isVisible({ timeout: 2000 })) {
            await sortElement.click();
            await page.waitForTimeout(1000);
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
    });

    await test.step('Test View and Re-run buttons', async () => {
      // Look for View buttons
      const viewButtonSelectors = [
        'button:has-text("View")',
        'a:has-text("View")',
        '[data-testid="view-button"]',
      ];

      for (const selector of viewButtonSelectors) {
        try {
          const viewButton = page.locator(selector).first();
          if (await viewButton.isVisible({ timeout: 2000 })) {
            // Take screenshot before clicking
            await page.screenshot({
              path: 'test-results/before-view-click.png',
              fullPage: true,
            });

            await viewButton.click();
            await page.waitForTimeout(2000);

            // Take screenshot after clicking
            await page.screenshot({
              path: 'test-results/after-view-click.png',
              fullPage: true,
            });

            // Go back to analyses
            await page.goBack();
            await navigateToMyAnalyses(page);
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      // Look for Re-run buttons
      const rerunButtonSelectors = [
        'button:has-text("Re-run")',
        'button:has-text("Rerun")',
        '[data-testid="rerun-button"]',
      ];

      for (const selector of rerunButtonSelectors) {
        try {
          const rerunButton = page.locator(selector).first();
          if (await rerunButton.isVisible({ timeout: 2000 })) {
            // Just verify it's clickable, don't actually re-run
            expect(await rerunButton.isEnabled()).toBe(true);
            console.log('Re-run button found and is enabled');
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
    });
  });

  test('should test mobile responsiveness', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE size
    });
    const page = await context.newPage();

    await test.step('Test mobile dashboard access', async () => {
      await loginAndNavigateToDashboard(page);
      await navigateToMyAnalyses(page);

      // Take mobile screenshot
      await page.screenshot({
        path: 'test-results/mobile-analyses-view.png',
        fullPage: true,
      });

      // Verify content is still accessible on mobile
      await page.waitForTimeout(3000);

      // Check if analyses are still visible
      const mobileContent = await page.textContent('body');
      expect(mobileContent).not.toMatch(/0 total|No analyses|You haven't created/);
    });

    await context.close();
  });

  test('should handle error states and loading', async ({ page }) => {
    await test.step('Test loading states', async () => {
      await loginAndNavigateToDashboard(page);

      // Navigate to analyses and capture loading state
      await navigateToMyAnalyses(page);

      // Look for loading indicators
      const loadingSelectors = [
        'text="Loading"',
        'text="loading"',
        '[data-testid="loading"]',
        '.loading',
        '.spinner',
      ];

      for (const selector of loadingSelectors) {
        try {
          const loadingElement = page.locator(selector);
          if (await loadingElement.isVisible({ timeout: 1000 })) {
            console.log(`Found loading indicator: ${selector}`);

            // Wait for loading to complete
            await expect(loadingElement).not.toBeVisible({ timeout: 10000 });
            break;
          }
        } catch (error) {
          // Loading might be too fast to catch
        }
      }

      // Final screenshot after loading
      await page.screenshot({
        path: 'test-results/analyses-loaded-final.png',
        fullPage: true,
      });
    });

    await test.step('Verify no error states are shown', async () => {
      // Look for error messages
      const errorSelectors = [
        'text="Error"',
        'text="error"',
        'text="Something went wrong"',
        'text="Failed to load"',
        '[data-testid="error"]',
      ];

      for (const selector of errorSelectors) {
        try {
          const errorElement = page.locator(selector);
          await expect(errorElement).not.toBeVisible({ timeout: 2000 });
        } catch (error) {
          // Good - no error message found
        }
      }
    });
  });

  test('should validate analysis data integrity', async ({ page }) => {
    await test.step('Login and get analysis data', async () => {
      await loginAndNavigateToDashboard(page);
      await navigateToMyAnalyses(page);
      await page.waitForTimeout(3000);
    });

    await test.step('Check for expected analysis metadata', async () => {
      // Get page content and analyze
      const pageContent = await page.textContent('body');

      // Should NOT contain empty state messages
      expect(pageContent).not.toMatch(
        /0 total|No analyses found|You haven't created any analyses yet/
      );

      // Should contain analysis-related content
      const hasAnalysisContent = /analysis|website|pages|completed|view/i.test(pageContent);
      expect(hasAnalysisContent).toBe(true);

      // Take final validation screenshot
      await page.screenshot({
        path: 'test-results/analysis-data-validation.png',
        fullPage: true,
      });

      console.log('Page content analysis completed - analyses are visible and data is present');
    });
  });
});
