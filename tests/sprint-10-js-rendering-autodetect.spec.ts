import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Environment constants
// ---------------------------------------------------------------------------

// Backend URL — defaults to production, override with BACKEND_URL env var
function getBackendUrl(): string {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  return 'https://llm-txt-mastery-production.up.railway.app';
}

// Known test URLs
const KNOWN_SPA_URL = 'https://reactrouter.com';
const KNOWN_SSR_URL = 'https://vercel.com';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function gotoAnalyzePage(page: Page): Promise<void> {
  // Uses Playwright's baseURL from config (staging or production)
  await page.goto('/analyze', { waitUntil: 'networkidle', timeout: 30_000 });
}

// ---------------------------------------------------------------------------
// Sprint 10 — JS Rendering Auto-Detection Tests
// ---------------------------------------------------------------------------

test.describe('Sprint 10: JS Rendering Auto-Detection', () => {

  // Test 1: Backend health check
  test('1. Backend health endpoint returns OK', async ({ request }) => {
    const response = await request.get(`${getBackendUrl()}/health`, {
      timeout: 10_000,
    });
    expect(response.ok(), `Expected 200 from ${getBackendUrl()}/health`).toBeTruthy();
    const body = await response.json().catch(() => ({}));
    const isHealthy =
      body.status === 'ok' || body.status === 'OK' || body.healthy === true ||
      body.message?.toLowerCase().includes('ok') || response.status() === 200;
    expect(isHealthy, `Health response: ${JSON.stringify(body)}`).toBeTruthy();
  });

  // Test 2: Analyze page — Enhanced JS Rendering checkbox is absent
  test('2. Analyze page does not contain "Enhanced JS Rendering" checkbox', async ({ page }) => {
    await gotoAnalyzePage(page);

    const checkboxById = page.locator('#enhanced-rendering');
    const checkboxByName = page.locator('input[name="enhancedRendering"], input[name="enhanced-rendering"]');
    const checkboxByLabel = page.getByLabel(/enhanced js rendering/i);

    await expect(checkboxById, 'Checkbox #enhanced-rendering must not exist').toHaveCount(0);
    await expect(checkboxByName, 'Checkbox with name enhancedRendering must not exist').toHaveCount(0);
    await expect(checkboxByLabel, 'Label "Enhanced JS Rendering" must not exist').toHaveCount(0);

    const pageText = await page.content();
    expect(
      pageText.includes('Enhanced JS Rendering'),
      'Page HTML must not contain the string "Enhanced JS Rendering"'
    ).toBeFalsy();
  });

  // Test 3: Analyze page source contains no reference to "enhancedRendering"
  test('3. Analyze page source contains no reference to "enhancedRendering"', async ({ page }) => {
    await gotoAnalyzePage(page);
    const html = await page.content();
    expect(
      html.includes('enhancedRendering'),
      'Rendered HTML must not reference enhancedRendering'
    ).toBeFalsy();
    expect(
      html.includes('enhanced_rendering'),
      'Rendered HTML must not reference enhanced_rendering'
    ).toBeFalsy();
  });

  // Test 4: API contract — /api/analyze accepts request without enhancedRendering
  test('4. POST /api/analyze does not require enhancedRendering field', async ({ request }) => {
    const response = await request.post(`${getBackendUrl()}/api/analyze`, {
      data: { url: KNOWN_SSR_URL },
      headers: { 'Content-Type': 'application/json' },
      timeout: 15_000,
    });

    const status = response.status();
    let body: Record<string, unknown> = {};
    try { body = await response.json(); } catch { /* non-JSON OK */ }

    // Any of these statuses are acceptable; 422 is not.
    const acceptableStatuses = [200, 201, 202, 400, 401, 403];
    expect(
      acceptableStatuses.includes(status),
      `Expected status in [${acceptableStatuses.join(', ')}] but got ${status}. Body: ${JSON.stringify(body)}`
    ).toBeTruthy();

    // If we got a 400 validation error, make sure it's NOT about enhancedRendering
    if (status === 400) {
      const errorText = JSON.stringify(body).toLowerCase();
      expect(
        errorText.includes('enhancedrendering') || errorText.includes('enhanced_rendering'),
        `400 error must not complain about enhancedRendering. Got: ${JSON.stringify(body)}`
      ).toBeFalsy();
    }
  });

  // Test 5: Sending legacy enhancedRendering param does not crash the server
  test('5. POST /api/analyze with legacy enhancedRendering param does not crash (500)', async ({ request }) => {
    const response = await request.post(`${getBackendUrl()}/api/analyze`, {
      data: { url: KNOWN_SSR_URL, enhancedRendering: true },
      headers: { 'Content-Type': 'application/json' },
      timeout: 15_000,
    });

    const status = response.status();
    let body: Record<string, unknown> = {};
    try { body = await response.json(); } catch { /* non-JSON OK */ }

    expect(
      status !== 500,
      `Server returned 500 when receiving legacy enhancedRendering field. Body: ${JSON.stringify(body)}`
    ).toBeTruthy();
  });

  // Test 6: Authenticated response includes auto-detection fields (requires TEST_AUTH_TOKEN)
  test('6. Authenticated /api/analyze response includes jsRenderingAutoDetected and spaDetected', async ({ request }) => {
    const authToken = process.env.TEST_AUTH_TOKEN;
    if (!authToken) {
      test.skip(true, 'Skipped: TEST_AUTH_TOKEN environment variable not set.');
      return;
    }

    const response = await request.post(`${getBackendUrl()}/api/analyze`, {
      data: { url: KNOWN_SPA_URL },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      timeout: 60_000,
    });

    expect(response.ok(), `Expected 2xx, got ${response.status()}`).toBeTruthy();
    const body = await response.json();

    expect('jsRenderingAutoDetected' in body,
      `Response must include jsRenderingAutoDetected. Keys: ${JSON.stringify(Object.keys(body))}`
    ).toBeTruthy();
    expect('spaDetected' in body,
      `Response must include spaDetected. Keys: ${JSON.stringify(Object.keys(body))}`
    ).toBeTruthy();
    expect(typeof body.jsRenderingAutoDetected).toBe('boolean');
    expect(typeof body.spaDetected).toBe('boolean');
  });

  // Test 7: SSR site should not trigger SPA detection (requires TEST_AUTH_TOKEN)
  test('7. Authenticated /api/analyze for SSR site reports spaDetected: false', async ({ request }) => {
    const authToken = process.env.TEST_AUTH_TOKEN;
    if (!authToken) {
      test.skip(true, 'Skipped: TEST_AUTH_TOKEN environment variable not set.');
      return;
    }

    const response = await request.post(`${getBackendUrl()}/api/analyze`, {
      data: { url: KNOWN_SSR_URL },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      timeout: 60_000,
    });

    expect(response.ok(), `Expected 2xx, got ${response.status()}`).toBeTruthy();
    const body = await response.json();

    expect('spaDetected' in body, 'Response must include spaDetected').toBeTruthy();
    expect(body.jsRenderingAutoDetected).toBe(false);
  });

  // Test 8: Regression — analyze page still loads without errors
  test('8. Analyze page core elements present after Sprint 10 changes', async ({ page }) => {
    await gotoAnalyzePage(page);

    const title = await page.title();
    expect(title.length > 0, 'Page must have a non-empty title').toBeTruthy();

    const pageContent = await page.content();
    const looksLikeError =
      (pageContent.includes('404') && pageContent.includes('not found')) ||
      (pageContent.includes('500') && pageContent.includes('server error')) ||
      pageContent.includes('Application Error');
    expect(looksLikeError, 'Analyze page must not render a 404/500/error page').toBeFalsy();
  });
});
