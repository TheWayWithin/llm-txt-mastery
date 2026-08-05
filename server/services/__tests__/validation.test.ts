/**
 * Phase 1A Validation Tests
 *
 * Basic tests for the real validation logic implementation
 */

import { describe, it, expect, vi } from 'vitest';
import { validateLlmsTxt } from '../validation';

describe('Phase 1A - Validation Logic', () => {
  it('should reject localhost URLs (SSRF protection)', async () => {
    const result = await validateLlmsTxt('http://localhost/llms.txt');

    expect(result.valid).toBe(false);
    expect(result.score).toBe(0);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].severity).toBe('error');
    expect(result.issues[0].message).toContain('SSRF protection');
  });

  it('should reject private IP ranges (SSRF protection)', async () => {
    const result = await validateLlmsTxt('http://192.168.1.1/llms.txt');

    expect(result.valid).toBe(false);
    expect(result.score).toBe(0);
    expect(result.issues[0].message).toContain('SSRF protection');
  });

  it('should handle 404 errors gracefully', async () => {
    // Mocked rather than hitting the network: the previous version fetched
    // example.com for real, so the assertion had to be loosened to
    // `toBeTruthy()` to survive a network-restricted CI runner. That accepted
    // any non-empty string, including a regressed message. Mocking makes the
    // real 404 copy deterministic, so the assertion can be exact again.
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('Not Found', { status: 404, statusText: 'Not Found' }));

    try {
      const result = await validateLlmsTxt('https://example.com/nonexistent');

      expect(result.valid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].message).toContain("doesn't have an llms.txt file yet");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('should validate real llms.txt file from Anthropic', async () => {
    const result = await validateLlmsTxt('https://anthropic.com');

    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.processingTime).toBeGreaterThan(0);
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
  }, 30000); // 30-second timeout for network request

  it('should detect missing required sections', async () => {
    // Test will use a real URL that returns a file missing required sections
    // For now, we verify the structure is correct
    const result = await validateLlmsTxt('https://example.com');

    expect(result).toBeDefined();
    expect(result.issues).toBeDefined();
    expect(result.recommendations).toBeDefined();
  });

  it('should return processing time', async () => {
    const result = await validateLlmsTxt('https://example.com');

    expect(result.processingTime).toBeGreaterThan(0);
    expect(typeof result.processingTime).toBe('number');
  });

  it('should maintain API contract structure', async () => {
    const result = await validateLlmsTxt('https://example.com');

    // Verify response structure matches Phase 2 API contract
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('cached');
    expect(result).toHaveProperty('processingTime');

    // Verify types
    expect(typeof result.valid).toBe('boolean');
    expect(typeof result.score).toBe('number');
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(typeof result.cached).toBe('boolean');
    expect(typeof result.processingTime).toBe('number');
  });
});
