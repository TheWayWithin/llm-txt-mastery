/**
 * llms.txt Validation Service
 *
 * IMPORTANT: This is a MOCK implementation for Phase 2 testing.
 * Full validation logic will be implemented in Phase 1 (assumed complete but not yet built).
 *
 * This mock provides:
 * - Basic llms.txt file fetching and parsing
 * - Simple validation scoring
 * - SSRF protection (real implementation in full version)
 * - Response structure matching Phase 1 specification
 *
 * TODO: Replace with actual Phase 1 implementation when available
 */

import { createHash } from 'crypto';

export interface ValidationOptions {
  includeRobotsTxt?: boolean;
  bustCache?: boolean;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  suggestion?: string;
}

export interface ValidationRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  example?: string;
}

export interface RobotsConflict {
  rule: string;
  llmsTxtPath: string;
  conflict: string;
  recommendation: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  recommendations: ValidationRecommendation[];
  robotsConflicts?: RobotsConflict[];
  cached: boolean;
  processingTime: number;
}

/**
 * Validate llms.txt file at given URL
 *
 * MOCK IMPLEMENTATION - Returns simulated validation results
 * Real implementation will:
 * - Fetch llms.txt from URL/llms.txt
 * - Parse and validate format
 * - Check robots.txt conflicts
 * - Calculate comprehensive score
 * - Cache results for 24 hours
 */
export async function validateLlmsTxt(
  url: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const startTime = Date.now();

  try {
    // SSRF Protection: Validate URL (also validated by Zod schema)
    const urlObj = new URL(url);
    const privateRanges = [
      /^localhost$/i,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^169\.254\./,
    ];

    if (privateRanges.some(regex => regex.test(urlObj.hostname))) {
      throw new Error('SSRF protection: Private or localhost URLs not allowed');
    }

    // Mock validation logic
    // TODO: Replace with actual Phase 1 implementation

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock validation result - simulates finding some common issues
    const issues: ValidationIssue[] = [
      {
        severity: 'warning',
        message: 'No "Owner" section found - recommended for credibility',
        suggestion: 'Add # Owner section with name and contact'
      }
    ];

    const recommendations: ValidationRecommendation[] = [
      {
        title: 'Add structured metadata',
        description: 'Consider adding structured data sections like # Purpose, # Owner, and # Usage',
        priority: 'medium',
        example: '# Owner: name\n# Purpose: description\n# Usage: guidelines'
      }
    ];

    // Mock score calculation
    const score = 75; // Mock score - real implementation will calculate based on checks

    // Mock robots.txt conflicts if requested
    let robotsConflicts: RobotsConflict[] | undefined;
    if (options.includeRobotsTxt) {
      robotsConflicts = []; // Empty array = no conflicts found
    }

    const processingTime = Date.now() - startTime;

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      score,
      issues,
      recommendations,
      robotsConflicts,
      cached: false, // Mock never uses cache
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Return error result
    return {
      valid: false,
      score: 0,
      issues: [
        {
          severity: 'error',
          message: error instanceof Error ? error.message : 'Validation failed',
          suggestion: 'Check URL and try again'
        }
      ],
      recommendations: [],
      cached: false,
      processingTime,
    };
  }
}

/**
 * Get cached validation result if available and not expired
 *
 * MOCK IMPLEMENTATION - Always returns null (no cache)
 * Real implementation will query validation_cache table
 */
export async function getCachedValidation(
  urlHash: string
): Promise<ValidationResult | null> {
  // Mock: No cache support yet
  return null;
}

/**
 * Save validation result to cache
 *
 * MOCK IMPLEMENTATION - Does nothing
 * Real implementation will save to validation_cache table
 */
export async function cacheValidation(
  urlHash: string,
  result: ValidationResult
): Promise<void> {
  // Mock: No cache support yet
  return;
}
