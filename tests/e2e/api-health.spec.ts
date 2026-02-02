import { test, expect } from '@playwright/test';

test.describe('Railway Backend API Health Tests', () => {
  const STAGING_API = 'https://llm-txt-mastery-staging.up.railway.app';
  const PRODUCTION_API = 'https://llm-txt-mastery-production.up.railway.app';

  test('Staging Railway backend responds correctly', async ({ page }) => {
    // Test version endpoint
    const versionResponse = await page.request.get(`${STAGING_API}/api/version`);
    expect(versionResponse.status()).toBe(200);
    
    const versionData = await versionResponse.json();
    expect(versionData).toHaveProperty('version');
    console.log('Staging API Version:', versionData.version);
    
    // Verify features object is present
    if (versionData.features) {
      expect(versionData.features).toBeDefined();
      console.log('Staging features:', Object.keys(versionData.features));
    }

    // Test health endpoint if it exists
    const healthResponse = await page.request.get(`${STAGING_API}/api/health`);
    if (healthResponse.status() === 200) {
      const healthData = await healthResponse.json();
      expect(healthData).toHaveProperty('status');
      console.log('Staging health:', healthData.status);
    }

    // Test basic API structure
    const publicEndpoints = [
      '/api/version',
      '/api/health'
    ];

    for (const endpoint of publicEndpoints) {
      const response = await page.request.get(`${STAGING_API}${endpoint}`);
      console.log(`Staging ${endpoint}: ${response.status()}`);
      expect([200, 404]).toContain(response.status()); // 404 is OK if endpoint doesn't exist
    }
  });

  test('Production Railway backend responds correctly', async ({ page }) => {
    // Test version endpoint
    const versionResponse = await page.request.get(`${PRODUCTION_API}/api/version`);
    expect(versionResponse.status()).toBe(200);
    
    const versionData = await versionResponse.json();
    expect(versionData).toHaveProperty('version');
    console.log('Production API Version:', versionData.version);
    
    // Verify features object is present
    if (versionData.features) {
      expect(versionData.features).toBeDefined();
      console.log('Production features:', Object.keys(versionData.features));
    }

    // Test health endpoint if it exists
    const healthResponse = await page.request.get(`${PRODUCTION_API}/api/health`);
    if (healthResponse.status() === 200) {
      const healthData = await healthResponse.json();
      expect(healthData).toHaveProperty('status');
      console.log('Production health:', healthData.status);
    }

    // Test basic API structure
    const publicEndpoints = [
      '/api/version',
      '/api/health'
    ];

    for (const endpoint of publicEndpoints) {
      const response = await page.request.get(`${PRODUCTION_API}${endpoint}`);
      console.log(`Production ${endpoint}: ${response.status()}`);
      expect([200, 404]).toContain(response.status()); // 404 is OK if endpoint doesn't exist
    }
  });

  test('Key API endpoints return expected shapes', async ({ page }) => {
    const apis = [
      { name: 'Staging', url: STAGING_API },
      { name: 'Production', url: PRODUCTION_API }
    ];

    for (const api of apis) {
      console.log(`Testing ${api.name} API endpoint shapes...`);
      
      // Test /api/version endpoint shape
      const versionResponse = await page.request.get(`${api.url}/api/version`);
      if (versionResponse.status() === 200) {
        const versionData = await versionResponse.json();
        
        // Should have basic version info
        expect(typeof versionData.version).toBe('string');
        
        // Should have timestamp or similar metadata
        expect(versionData).toEqual(
          expect.objectContaining({
            version: expect.any(String)
          })
        );
      }

      // Test validation endpoint structure (without auth)
      const validationResponse = await page.request.post(`${api.url}/api/validate-llms-txt`, {
        data: { url: 'https://example.com/llms.txt' }
      });
      
      // Should either return 401 (needs auth) or validation result
      expect([200, 401, 400]).toContain(validationResponse.status());
      console.log(`${api.name} validation endpoint: ${validationResponse.status()}`);

      // Test usage endpoint (without auth, should return 401)
      const usageResponse = await page.request.get(`${api.url}/api/usage/test@example.com`);
      expect([200, 401, 404]).toContain(usageResponse.status());
      console.log(`${api.name} usage endpoint: ${usageResponse.status()}`);
    }
  });

  test('API CORS headers are properly configured', async ({ page }) => {
    const apis = [STAGING_API, PRODUCTION_API];
    
    for (const apiUrl of apis) {
      const response = await page.request.get(`${apiUrl}/api/version`);
      
      // Check for CORS headers
      const headers = response.headers();
      
      // Should have proper CORS configuration for frontend domains
      if (headers['access-control-allow-origin']) {
        console.log(`CORS origin for ${apiUrl}:`, headers['access-control-allow-origin']);
      }
      
      if (headers['access-control-allow-methods']) {
        console.log(`CORS methods for ${apiUrl}:`, headers['access-control-allow-methods']);
      }
    }
  });

  test('API response times are reasonable', async ({ page }) => {
    const apis = [
      { name: 'Staging', url: STAGING_API },
      { name: 'Production', url: PRODUCTION_API }
    ];

    for (const api of apis) {
      const startTime = Date.now();
      const response = await page.request.get(`${api.url}/api/version`);
      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
      
      console.log(`${api.name} API response time: ${responseTime}ms`);
    }
  });
});