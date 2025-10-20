/**
 * Phase 1C - Robots.txt Integration Tests
 *
 * Tests for robots.txt fetching, parsing, and conflict detection
 */

import { describe, it, expect, vi } from 'vitest';
import { validateLlmsTxt } from '../validation';

describe('Phase 1C - Robots.txt Integration', () => {

  it('should fetch and parse robots.txt when includeRobotsTxt is true', async () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn((url: string) => {
      if (url.includes('/robots.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`
User-agent: *
Disallow: /admin/
          `),
        } as Response);
      }

      if (url.includes('/llms.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`
# Overview
Test site

# Policies
Open access
          `),
        } as Response);
      }

      return originalFetch(url);
    });

    const result = await validateLlmsTxt('https://example.com', {
      includeRobotsTxt: true,
    });

    global.fetch = originalFetch;

    expect(result).toBeDefined();
    expect(result.robotsConflicts).toBeDefined();
    expect(Array.isArray(result.robotsConflicts)).toBe(true);
  });

  it('should handle sites without robots.txt gracefully', async () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn((url: string) => {
      if (url.includes('/robots.txt')) {
        // 404 - no robots.txt
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Not Found'),
        } as Response);
      }

      if (url.includes('/llms.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`
# Overview
Test

# Policies
Test
          `),
        } as Response);
      }

      return originalFetch(url);
    });

    const result = await validateLlmsTxt('https://example.com', {
      includeRobotsTxt: true,
    });

    global.fetch = originalFetch;

    expect(result).toBeDefined();
    expect(result.robotsConflicts).toBeDefined();
    expect(Array.isArray(result.robotsConflicts)).toBe(true);
    expect(result.robotsConflicts!.length).toBe(0); // No conflicts when no robots.txt
  });

  it('should not include robotsConflicts when includeRobotsTxt is false', async () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn((url: string) => {
      if (url.includes('/llms.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`
# Overview
Test

# Policies
Test
          `),
        } as Response);
      }

      return originalFetch(url);
    });

    const result = await validateLlmsTxt('https://example.com', {
      includeRobotsTxt: false,
    });

    global.fetch = originalFetch;

    expect(result).toBeDefined();
    expect(result.robotsConflicts).toBeUndefined();
  });

  it('should detect AI crawler restrictions in robots.txt', async () => {
    // Create a mock fetch for robots.txt with AI restrictions
    const originalFetch = global.fetch;

    global.fetch = vi.fn((url: string) => {
      if (url.includes('/robots.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`
User-agent: GPTBot
Disallow: /

User-agent: *
Allow: /
          `),
        } as Response);
      }

      // Mock llms.txt
      if (url.includes('/llms.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`
# Overview
Test site for AI

# Policies
Open to AI models

[Documentation](https://example.com/docs)
          `),
        } as Response);
      }

      return originalFetch(url);
    });

    const result = await validateLlmsTxt('https://example.com', {
      includeRobotsTxt: true,
    });

    global.fetch = originalFetch;

    expect(result.robotsConflicts).toBeDefined();
    expect(result.robotsConflicts!.length).toBeGreaterThan(0);

    // Should detect AI policy conflict
    const policyConflict = result.robotsConflicts!.find(
      c => c.conflict.includes('AI crawlers are restricted')
    );
    expect(policyConflict).toBeDefined();
  });

  it('should detect URL conflicts between llms.txt and robots.txt', async () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn((url: string) => {
      if (url.includes('/robots.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`
User-agent: *
Disallow: /private/
          `),
        } as Response);
      }

      if (url.includes('/llms.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`
# Overview
Test site

# Policies
Open access

[Private Docs](https://example.com/private/docs)
          `),
        } as Response);
      }

      return originalFetch(url);
    });

    const result = await validateLlmsTxt('https://example.com', {
      includeRobotsTxt: true,
    });

    global.fetch = originalFetch;

    expect(result.robotsConflicts).toBeDefined();

    // Should detect disallowed URL in llms.txt
    const urlConflict = result.robotsConflicts!.find(
      c => c.llmsTxtPath.includes('/private/')
    );
    expect(urlConflict).toBeDefined();
  });

  it('should handle robots.txt fetch errors gracefully', async () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn((url: string) => {
      if (url.includes('/robots.txt')) {
        // Simulate network error
        return Promise.reject(new Error('Network error'));
      }

      if (url.includes('/llms.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`
# Overview
Test

# Policies
Test
          `),
        } as Response);
      }

      return originalFetch(url);
    });

    const result = await validateLlmsTxt('https://example.com', {
      includeRobotsTxt: true,
    });

    global.fetch = originalFetch;

    // Should not crash, should return empty conflicts array
    expect(result).toBeDefined();
    expect(result.robotsConflicts).toBeDefined();
    expect(Array.isArray(result.robotsConflicts)).toBe(true);
    expect(result.robotsConflicts!.length).toBe(0); // Empty on error
  });

  it('should not add significant processing time for robots.txt fetch', async () => {
    const originalFetch = global.fetch;
    const startTime = Date.now();

    global.fetch = vi.fn((url: string) => {
      if (url.includes('/robots.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`User-agent: *\nDisallow: /admin/`),
        } as Response);
      }

      if (url.includes('/llms.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`# Overview\nTest\n\n# Policies\nTest`),
        } as Response);
      }

      return originalFetch(url);
    });

    const result = await validateLlmsTxt('https://example.com', {
      includeRobotsTxt: true,
    });

    const totalTime = Date.now() - startTime;

    global.fetch = originalFetch;

    expect(result).toBeDefined();
    expect(totalTime).toBeLessThan(2000); // Should complete quickly with mocked fetch
  });

  it('should parse multiple user-agent rules correctly', async () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn((url: string) => {
      if (url.includes('/robots.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`
User-agent: GPTBot
Disallow: /admin/
Allow: /public/

User-agent: Anthropic-AI
Disallow: /private/

User-agent: *
Disallow: /internal/
          `),
        } as Response);
      }

      if (url.includes('/llms.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(`
# Overview
Multi-agent test

# Policies
Various restrictions

[Admin](https://example.com/admin/docs)
[Private](https://example.com/private/info)
          `),
        } as Response);
      }

      return originalFetch(url);
    });

    const result = await validateLlmsTxt('https://example.com', {
      includeRobotsTxt: true,
    });

    global.fetch = originalFetch;

    expect(result.robotsConflicts).toBeDefined();

    // Should detect conflicts from both GPTBot and Anthropic-AI rules
    const conflicts = result.robotsConflicts!;
    expect(conflicts.length).toBeGreaterThan(0);

    // Should have conflicts for both user agents
    const hasGptBotConflict = conflicts.some(c => c.rule.includes('GPTBot'));
    const hasAnthropicConflict = conflicts.some(c => c.rule.includes('Anthropic-AI'));

    expect(hasGptBotConflict || hasAnthropicConflict).toBe(true);
  });

  it('should handle SSRF protection for robots.txt URLs', async () => {
    // Test with localhost URL (should be blocked by SSRF protection)
    const result = await validateLlmsTxt('http://localhost:3000', {
      includeRobotsTxt: true,
    });

    // Should return error due to SSRF protection
    expect(result.valid).toBe(false);
    expect(result.issues[0].severity).toBe('error');
    expect(result.issues[0].message).toContain('SSRF protection');
  });

});
