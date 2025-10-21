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
import { marked } from 'marked';
import robotsParser from 'robots-parser';

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

export interface ParsedLlmsTxt {
  sections: { [key: string]: string };
  urls: string[];
  metadata: { [key: string]: string };
  rawContent: string;
}

export interface UrlValidationResult {
  url: string;
  accessible: boolean;
  statusCode?: number;
  error?: string;
}

export interface RobotsTxtRules {
  rules: Array<{
    userAgent: string;
    disallow: string[];
    allow: string[];
  }>;
  hasAiRestrictions: boolean;
}

/**
 * SSRF Protection: Validate URL to prevent access to private/internal networks
 */
function validateUrlSecurity(url: string): void {
  const urlObj = new URL(url);

  // Block non-HTTP(S) protocols
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }

  // Block private IP ranges and localhost
  const privateRanges = [
    /^localhost$/i,
    /^127\./,
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^169\.254\./,
    /^0\.0\.0\.0$/,
    /^\[::1\]$/,
    /^\[fe80:/i,
    /^\[fc00:/i,
  ];

  if (privateRanges.some(regex => regex.test(urlObj.hostname))) {
    throw new Error('SSRF protection: Private or localhost URLs not allowed');
  }
}

/**
 * Fetch llms.txt file from URL with security controls and timeout
 */
async function fetchLlmsTxt(baseUrl: string): Promise<string> {
  // Ensure URL ends with /llms.txt
  const url = baseUrl.endsWith('/llms.txt') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/llms.txt`;

  // Validate URL security
  validateUrlSecurity(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10-second timeout

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'LLMtxtMastery/1.0 (Validator Bot)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('llms.txt file not found (404). Please ensure the file exists at /llms.txt');
      } else if (response.status >= 500) {
        throw new Error(`Server error (${response.status}). The server hosting llms.txt is having issues`);
      } else {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
    }

    const content = await response.text();

    if (!content || content.trim().length === 0) {
      throw new Error('llms.txt file is empty');
    }

    return content;

  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: llms.txt took too long to fetch (>10 seconds)');
      }
      throw error;
    }
    throw new Error('Failed to fetch llms.txt file');
  }
}

/**
 * Parse llms.txt markdown content to extract sections, URLs, and metadata
 */
function parseLlmsTxt(content: string): ParsedLlmsTxt {
  const sections: { [key: string]: string } = {};
  const urls: string[] = [];
  const metadata: { [key: string]: string } = {};

  // Parse markdown using marked
  const tokens = marked.lexer(content);

  let currentSection = '';
  let currentContent = '';

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 1) {
      // Save previous section
      if (currentSection) {
        sections[currentSection] = currentContent.trim();
      }

      // Start new section
      currentSection = token.text;
      currentContent = '';

    } else if (token.type === 'paragraph' || token.type === 'text') {
      // Add content to current section
      const text = 'text' in token ? token.text : '';
      currentContent += text + '\n';

      // Extract URLs from links
      const urlMatches = text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
      for (const match of urlMatches) {
        const url = match[2];
        if (url && !urls.includes(url)) {
          urls.push(url);
        }
      }

      // Extract metadata (key: value format)
      const metadataMatch = text.match(/^([^:]+):\s*(.+)$/);
      if (metadataMatch) {
        metadata[metadataMatch[1].trim()] = metadataMatch[2].trim();
      }
    } else if (token.type === 'list') {
      // Extract URLs from list items
      const listItems = 'items' in token ? token.items : [];
      for (const item of listItems) {
        if ('text' in item) {
          const itemText = item.text;
          currentContent += `- ${itemText}\n`;

          // Extract URLs from markdown links in list items
          const urlMatches = itemText.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
          for (const match of urlMatches) {
            const url = match[2];
            if (url && !urls.includes(url)) {
              urls.push(url);
            }
          }
        }
      }
    }
  }

  // Save last section
  if (currentSection) {
    sections[currentSection] = currentContent.trim();
  }

  return {
    sections,
    urls,
    metadata,
    rawContent: content,
  };
}

/**
 * Validate URL accessibility with HEAD request
 */
async function validateUrl(url: string): Promise<UrlValidationResult> {
  try {
    // Validate security first
    validateUrlSecurity(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      url,
      accessible: response.ok,
      statusCode: response.status,
    };

  } catch (error) {
    return {
      url,
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate structure and content of parsed llms.txt
 * Based on official llmstxt.org specification
 */
async function validateStructure(parsed: ParsedLlmsTxt): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // REQUIRED: H1 header (any title acceptable)
  const hasH1 = Object.keys(parsed.sections).length > 0;
  if (!hasH1) {
    issues.push({
      severity: 'error',
      message: 'Missing required H1 header (# Title)',
      suggestion: 'Add a # header with your project or site name as the first line',
    });
  }

  // RECOMMENDED: Blockquote description
  const hasBlockquote = parsed.rawContent.match(/^>\s+.+$/m);
  if (!hasBlockquote) {
    issues.push({
      severity: 'warning',
      message: 'Missing recommended blockquote description',
      suggestion: 'Add a short description after the H1 header using "> Description" format',
    });
  }

  // OPTIONAL: H2 sections with URLs
  const h2Sections = Object.keys(parsed.sections).filter(
    (key) => !key.match(/^#/) // Exclude the main H1 section
  );

  // Check for empty sections (only if sections exist)
  for (const [section, content] of Object.entries(parsed.sections)) {
    if (content && content.trim().length === 0) {
      issues.push({
        severity: 'info',
        message: `Section "${section}" is empty`,
        suggestion: `Add content or remove the empty ${section} section`,
      });
    }
  }

  // Validate URLs
  if (parsed.urls.length === 0) {
    issues.push({
      severity: 'warning',
      message: 'No URLs found in llms.txt',
      suggestion: 'Consider adding relevant URLs using markdown link syntax: - [Title](url): Description',
    });
  } else {
    // Check URL accessibility (limit to first 5 to avoid excessive requests)
    const urlsToCheck = parsed.urls.slice(0, 5);
    const urlResults = await Promise.all(urlsToCheck.map(validateUrl));

    for (const result of urlResults) {
      if (!result.accessible) {
        issues.push({
          severity: 'info',
          message: `URL not accessible: ${result.url}`,
          suggestion: result.error || 'Verify the URL is correct and publicly accessible',
        });
      }
    }
  }

  return issues;
}

/**
 * Calculate score based on validation results
 * Based on official llmstxt.org specification
 */
function calculateScore(parsed: ParsedLlmsTxt, issues: ValidationIssue[]): number {
  let score = 100;

  // Deduct points for issues (official spec alignment)
  for (const issue of issues) {
    if (issue.severity === 'error') {
      score -= 20; // Missing H1 header (REQUIRED)
    } else if (issue.severity === 'warning') {
      score -= 5; // Missing blockquote or no URLs (RECOMMENDED)
    } else if (issue.severity === 'info') {
      score -= 1; // Empty sections, inaccessible URLs (OPTIONAL improvements)
    }
  }

  // Bonus points for good practices
  const hasBlockquote = parsed.rawContent.match(/^>\s+.+$/m);
  if (hasBlockquote) {
    const blockquoteLength = hasBlockquote[0].replace(/^>\s+/, '').length;
    if (blockquoteLength > 50) {
      score += 5; // Detailed description
    }
  }

  if (parsed.urls.length >= 3) {
    score += 5; // Multiple relevant URLs
  }

  if (parsed.urls.length >= 10) {
    score += 5; // Comprehensive URL list
  }

  // Bonus for H2 sections (good organization)
  const h2Count = Object.keys(parsed.sections).length;
  if (h2Count >= 2) {
    score += 5; // Well-organized with sections
  }

  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate recommendations based on validation results
 * Aligned with official llmstxt.org specification
 */
function generateRecommendations(parsed: ParsedLlmsTxt, issues: ValidationIssue[]): ValidationRecommendation[] {
  const recommendations: ValidationRecommendation[] = [];

  // Fix critical issues first
  const hasErrors = issues.some(i => i.severity === 'error');
  if (hasErrors) {
    recommendations.push({
      title: 'Add H1 header',
      description: 'The H1 header (# Title) is required per the llmstxt.org specification',
      priority: 'high',
      example: '# YourProjectName\n\n> Brief description of your project',
    });
  }

  // Recommend blockquote if missing
  const hasBlockquote = parsed.rawContent.match(/^>\s+.+$/m);
  if (!hasBlockquote) {
    recommendations.push({
      title: 'Add blockquote description',
      description: 'A short description after the H1 header improves clarity for AI models',
      priority: 'medium',
      example: '# Project Name\n\n> This project provides tools and resources for...',
    });
  }

  // Recommend organizing URLs into sections
  if (parsed.urls.length > 0 && Object.keys(parsed.sections).length < 2) {
    recommendations.push({
      title: 'Organize URLs into sections',
      description: 'Group related URLs under H2 headers (## Section Name) for better organization',
      priority: 'medium',
      example: '## Documentation\n\n- [Getting Started](https://example.com/start): Quick start guide\n- [API Reference](https://example.com/api): Complete API documentation',
    });
  }

  // Recommend adding more URLs if too few
  if (parsed.urls.length < 3) {
    recommendations.push({
      title: 'Add more reference URLs',
      description: 'Include links to important pages using markdown syntax: - [Title](url): Description',
      priority: 'low',
      example: '## Resources\n\n- [Documentation](https://example.com/docs): Comprehensive guides\n- [API Reference](https://example.com/api): Technical reference',
    });
  }

  // Recommend optional section for secondary content
  const hasOptionalSection = Object.keys(parsed.sections).some(key =>
    key.toLowerCase().includes('optional') || key.toLowerCase().includes('additional')
  );
  if (parsed.urls.length > 5 && !hasOptionalSection) {
    recommendations.push({
      title: 'Consider adding Optional section',
      description: 'Per the official spec, use "## Optional" for secondary or less important content',
      priority: 'low',
      example: '## Optional\n\n- [Archive](https://example.com/archive): Historical content\n- [Blog](https://example.com/blog): Latest updates',
    });
  }

  return recommendations;
}

/**
 * Extract domain from URL and fetch robots.txt
 */
async function fetchRobotsTxt(domain: string): Promise<string | null> {
  try {
    // Extract domain from full URL if necessary
    const urlObj = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
    const robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;

    // Validate security before fetching
    validateUrlSecurity(robotsUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    const response = await fetch(robotsUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'LLMtxtMastery/1.0 (Validator Bot)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 404 is acceptable - many sites don't have robots.txt
    if (response.status === 404) {
      return null;
    }

    // Handle server errors gracefully
    if (!response.ok) {
      console.warn(`Failed to fetch robots.txt from ${robotsUrl}: HTTP ${response.status}`);
      return null;
    }

    const content = await response.text();
    return content && content.trim().length > 0 ? content : null;

  } catch (error) {
    // Network errors, timeouts, SSRF blocks - all return null gracefully
    if (error instanceof Error && error.name !== 'AbortError') {
      console.warn(`Error fetching robots.txt: ${error.message}`);
    }
    return null;
  }
}

/**
 * Parse robots.txt content using robots-parser library
 */
function parseRobotsTxt(content: string, baseUrl: string): RobotsTxtRules {
  const urlObj = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
  const robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;

  // Use robots-parser to parse the content
  const robots = robotsParser(robotsUrl, content);

  // Extract all user-agent rules manually from content
  const rules: Array<{ userAgent: string; disallow: string[]; allow: string[] }> = [];
  const lines = content.split('\n');

  let currentUserAgent = '*';
  let currentDisallow: string[] = [];
  let currentAllow: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    const lowerLine = trimmed.toLowerCase();

    if (lowerLine.startsWith('user-agent:')) {
      // Save previous rule if exists
      if (currentDisallow.length > 0 || currentAllow.length > 0) {
        rules.push({
          userAgent: currentUserAgent,
          disallow: [...currentDisallow],
          allow: [...currentAllow],
        });
      }

      // Start new user-agent block
      currentUserAgent = trimmed.substring(trimmed.indexOf(':') + 1).trim();
      currentDisallow = [];
      currentAllow = [];

    } else if (lowerLine.startsWith('disallow:')) {
      const path = trimmed.substring(trimmed.indexOf(':') + 1).trim();
      if (path) currentDisallow.push(path);

    } else if (lowerLine.startsWith('allow:')) {
      const path = trimmed.substring(trimmed.indexOf(':') + 1).trim();
      if (path) currentAllow.push(path);
    }
  }

  // Save final rule
  if (currentDisallow.length > 0 || currentAllow.length > 0) {
    rules.push({
      userAgent: currentUserAgent,
      disallow: [...currentDisallow],
      allow: [...currentAllow],
    });
  }

  // Check for AI crawler restrictions
  const aiCrawlers = [
    'gptbot',
    'chatgpt-user',
    'anthropic-ai',
    'claude-web',
    'cohere-ai',
    'google-extended',
    'omgilibot',
    'diffbot',
    'bingpreview',
  ];

  const hasAiRestrictions = rules.some(rule => {
    const userAgentLower = rule.userAgent.toLowerCase();
    return aiCrawlers.some(bot => userAgentLower.includes(bot)) && rule.disallow.length > 0;
  });

  return { rules, hasAiRestrictions };
}

/**
 * Detect conflicts between llms.txt and robots.txt
 */
function detectConflicts(
  llmsTxt: ParsedLlmsTxt,
  robotsTxt: RobotsTxtRules,
  baseUrl: string
): RobotsConflict[] {
  const conflicts: RobotsConflict[] = [];
  const urlObj = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
  const robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;

  // Create robots parser instance for path checking
  const robots = robotsParser(robotsUrl, ''); // We'll check manually

  // Check if llms.txt path itself is disallowed
  const llmsTxtPath = '/llms.txt';
  for (const rule of robotsTxt.rules) {
    if (rule.disallow.includes(llmsTxtPath) || rule.disallow.includes('/llms.txt')) {
      conflicts.push({
        rule: `User-agent: ${rule.userAgent}`,
        llmsTxtPath: llmsTxtPath,
        conflict: 'llms.txt file itself is disallowed in robots.txt',
        recommendation: 'Remove /llms.txt from Disallow rules or remove llms.txt file',
      });
    }
  }

  // Check each URL in llms.txt against robots.txt rules
  for (const url of llmsTxt.urls) {
    try {
      const urlToCheck = new URL(url);

      // Only check URLs from the same domain
      if (urlToCheck.hostname !== urlObj.hostname) continue;

      const path = urlToCheck.pathname;

      // Check against each user-agent rule
      for (const rule of robotsTxt.rules) {
        // Check if path matches any disallow rule
        const isDisallowed = rule.disallow.some(disallowPath => {
          if (disallowPath === '/') return true;
          return path.startsWith(disallowPath);
        });

        // Check if explicitly allowed (overrides disallow)
        const isAllowed = rule.allow.some(allowPath => {
          return path.startsWith(allowPath);
        });

        if (isDisallowed && !isAllowed) {
          conflicts.push({
            rule: `User-agent: ${rule.userAgent}`,
            llmsTxtPath: url,
            conflict: `URL is disallowed for ${rule.userAgent} in robots.txt`,
            recommendation: `Add "Allow: ${path}" for ${rule.userAgent} or remove URL from llms.txt`,
          });
        }
      }
    } catch (error) {
      // Invalid URL - skip it
      continue;
    }
  }

  // Check for inconsistent AI policies
  if (robotsTxt.hasAiRestrictions && llmsTxt.urls.length > 0) {
    const aiRule = robotsTxt.rules.find(rule => {
      const ua = rule.userAgent.toLowerCase();
      return (ua.includes('gptbot') || ua.includes('anthropic') || ua.includes('claude'))
        && rule.disallow.length > 0;
    });

    if (aiRule) {
      conflicts.push({
        rule: `User-agent: ${aiRule.userAgent}`,
        llmsTxtPath: 'llms.txt content policy',
        conflict: 'AI crawlers are restricted in robots.txt but llms.txt provides content for AI models',
        recommendation: 'Align your robots.txt and llms.txt policies - either allow AI crawlers or remove llms.txt',
      });
    }
  }

  return conflicts;
}

/**
 * Validate llms.txt file at given URL
 *
 * Phase 1A Implementation - Real validation logic
 * - Fetches llms.txt from URL/llms.txt with SSRF protection
 * - Parses markdown structure and extracts sections/URLs
 * - Validates structure, content, and URL accessibility
 * - Calculates comprehensive score (0-100)
 * - Generates actionable recommendations
 */
export async function validateLlmsTxt(
  url: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const startTime = Date.now();

  try {
    // Step 1: Fetch llms.txt file with security controls
    const content = await fetchLlmsTxt(url);

    // Step 2: Parse markdown content
    const parsed = parseLlmsTxt(content);

    // Step 3: Validate structure and content
    const issues = await validateStructure(parsed);

    // Step 4: Calculate score based on validation results
    const score = calculateScore(parsed, issues);

    // Step 5: Generate recommendations
    const recommendations = generateRecommendations(parsed, issues);

    // Step 6: Handle robots.txt conflicts (Phase 1C)
    let robotsConflicts: RobotsConflict[] | undefined;
    if (options.includeRobotsTxt) {
      try {
        const robotsContent = await fetchRobotsTxt(url);
        if (robotsContent) {
          const robotsRules = parseRobotsTxt(robotsContent, url);
          robotsConflicts = detectConflicts(parsed, robotsRules, url);
        } else {
          // No robots.txt found - no conflicts to detect
          robotsConflicts = [];
        }
      } catch (error) {
        // If robots.txt fetch/parse fails, return empty array (graceful degradation)
        console.warn('Failed to process robots.txt:', error instanceof Error ? error.message : 'Unknown error');
        robotsConflicts = [];
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      score,
      issues,
      recommendations,
      robotsConflicts,
      cached: false,
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Return error result with detailed message
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
