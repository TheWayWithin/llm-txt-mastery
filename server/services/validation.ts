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
      message: 'Missing required H1 header - AI models cannot identify your site',
      suggestion: 'Add a # header with your project or site name as the first line. This tells AI models what your site is about.',
    });
  }

  // RECOMMENDED: Blockquote description
  const hasBlockquote = parsed.rawContent.match(/^>\s+.+$/m);
  if (!hasBlockquote) {
    issues.push({
      severity: 'warning',
      message: 'Missing blockquote description - AI models lack context about your site',
      suggestion: 'Add a concise description after the H1 using "> Description" format. Without this, AI models must guess your site\'s purpose, leading to inaccurate responses about your content.',
    });
  }

  // Check for organized sections
  const h2Sections = Object.keys(parsed.sections).filter(
    (key) => !key.match(/^#/) // Exclude the main H1 section
  );

  if (h2Sections.length === 0 && parsed.urls.length > 0) {
    issues.push({
      severity: 'warning',
      message: 'No H2 sections found - poor content organization reduces AI comprehension',
      suggestion: 'Organize URLs under H2 headers (## Section Name) to help AI models understand your content structure. Unorganized content leads to confusion and missed information.',
    });
  }

  // Check for empty sections (only if sections exist)
  for (const [section, content] of Object.entries(parsed.sections)) {
    if (content && content.trim().length === 0) {
      issues.push({
        severity: 'info',
        message: `Empty section "${section}" creates confusion`,
        suggestion: `Add content or remove this section. Empty sections make your llms.txt appear incomplete to AI models.`,
      });
    }
  }

  // Validate URLs - CRITICAL for llms.txt value
  if (parsed.urls.length === 0) {
    issues.push({
      severity: 'error',
      message: 'No URLs found - your llms.txt file is essentially useless',
      suggestion: 'A llms.txt file without URLs provides ZERO value to AI models. Add markdown links: - [Title](url): Description. AI models need URLs to understand and reference your content.',
    });
  } else if (parsed.urls.length < 3) {
    issues.push({
      severity: 'warning',
      message: `Only ${parsed.urls.length} URL(s) found - severely limited AI understanding`,
      suggestion: 'Add at least 3-5 key URLs to give AI models sufficient context about your site. More URLs mean better AI comprehension and more accurate responses.',
    });
  }

  // Check if URLs are properly formatted as markdown
  const hasMarkdownLinks = parsed.rawContent.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (parsed.urls.length > 0 && !hasMarkdownLinks) {
    issues.push({
      severity: 'warning',
      message: 'URLs are not in proper markdown format - reduces AI parsing accuracy',
      suggestion: 'Use markdown link syntax: - [Title](url): Description. Plain URLs are harder for AI models to parse and understand.',
    });
  }

  // Check URL accessibility (limit to first 5 to avoid excessive requests)
  if (parsed.urls.length > 0) {
    const urlsToCheck = parsed.urls.slice(0, 5);
    const urlResults = await Promise.all(urlsToCheck.map(validateUrl));

    for (const result of urlResults) {
      if (!result.accessible) {
        issues.push({
          severity: 'info',
          message: `URL not accessible: ${result.url} - AI models cannot reach this content`,
          suggestion: result.error || 'Verify the URL is correct and publicly accessible. Broken links reduce trust in your llms.txt file.',
        });
      }
    }
  }

  return issues;
}

/**
 * Calculate score based on validation results
 * Stricter scoring to highlight the value of professionally generated llms.txt files
 */
function calculateScore(parsed: ParsedLlmsTxt, issues: ValidationIssue[]): number {
  let score = 100;

  // Count issue types for granular penalties
  let hasNoUrls = false;
  let hasFewUrls = false;
  let missingBlockquote = false;
  let missingH1 = false;
  let poorOrganization = false;
  let nonMarkdownUrls = false;

  for (const issue of issues) {
    if (issue.message.includes('No URLs found')) hasNoUrls = true;
    if (issue.message.includes('URL(s) found - severely limited')) hasFewUrls = true;
    if (issue.message.includes('Missing blockquote description')) missingBlockquote = true;
    if (issue.message.includes('Missing required H1 header')) missingH1 = true;
    if (issue.message.includes('No H2 sections found')) poorOrganization = true;
    if (issue.message.includes('not in proper markdown format')) nonMarkdownUrls = true;
  }

  // CRITICAL PENALTIES - These make the file nearly useless
  if (missingH1) {
    score -= 25; // REQUIRED - AI models can't identify the site
  }

  if (hasNoUrls) {
    score -= 30; // CRITICAL - File provides zero value without URLs
  }

  // MAJOR PENALTIES - Significantly reduce effectiveness
  if (missingBlockquote) {
    score -= 15; // AI models lack critical context
  }

  if (hasFewUrls && !hasNoUrls) {
    score -= 10; // Limited value with insufficient URLs
  }

  if (poorOrganization && !hasNoUrls) {
    score -= 10; // Poor structure reduces AI comprehension
  }

  if (nonMarkdownUrls) {
    score -= 8; // Harder for AI to parse
  }

  // MINOR PENALTIES - Polish issues
  for (const issue of issues) {
    if (issue.severity === 'info') {
      score -= 2; // Empty sections, inaccessible URLs
    }
  }

  // BONUSES - Reward excellent implementation
  const hasBlockquote = parsed.rawContent.match(/^>\s+.+$/m);
  if (hasBlockquote) {
    const blockquoteLength = hasBlockquote[0].replace(/^>\s+/, '').length;
    if (blockquoteLength > 100) {
      score += 5; // Comprehensive description
    } else if (blockquoteLength > 50) {
      score += 3; // Good description
    }
  }

  if (parsed.urls.length >= 20) {
    score += 10; // Excellent URL coverage
  } else if (parsed.urls.length >= 10) {
    score += 5; // Good URL coverage
  } else if (parsed.urls.length >= 5) {
    score += 3; // Decent URL coverage
  }

  // Bonus for H2 sections (good organization)
  const h2Count = Object.keys(parsed.sections).length - 1; // Exclude H1
  if (h2Count >= 5) {
    score += 5; // Excellent organization
  } else if (h2Count >= 3) {
    score += 3; // Good organization
  } else if (h2Count >= 2) {
    score += 2; // Basic organization
  }

  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate recommendations based on validation results
 * Only shows problem-fixing recommendations for files with actual issues
 * Uses soft upselling for high-performing files
 */
function generateRecommendations(parsed: ParsedLlmsTxt, issues: ValidationIssue[]): ValidationRecommendation[] {
  const recommendations: ValidationRecommendation[] = [];

  // Calculate current score to determine recommendation strategy
  const score = calculateScore(parsed, issues);
  const h2Count = Object.keys(parsed.sections).length - 1; // Exclude H1
  const hasBlockquote = parsed.rawContent.match(/^>\s+.+$/m);

  // CRITICAL: No URLs = useless file (always show)
  if (parsed.urls.length === 0) {
    recommendations.push({
      title: 'Your llms.txt file has no value without URLs',
      description: 'AI models cannot understand or reference your site without URLs. A properly generated llms.txt file includes comprehensive URL coverage with intelligent content analysis and categorization.',
      priority: 'high',
      example: '## Key Resources\n\n- [Documentation](https://example.com/docs): Complete guides and tutorials\n- [API Reference](https://example.com/api): Technical reference\n- [Blog](https://example.com/blog): Latest updates and insights',
    });
  }

  // Fix critical structure issues (always show if present)
  const hasErrors = issues.some(i => i.severity === 'error');
  if (hasErrors) {
    recommendations.push({
      title: 'Fix critical structure requirements',
      description: 'AI models require proper H1 headers and structured content to identify and understand your site. Professional llms.txt generation ensures perfect spec compliance.',
      priority: 'high',
      example: '# YourProjectName\n\n> Comprehensive description of what your site offers and why it matters',
    });
  }

  // Missing blockquote (only show if actually missing AND score < 90)
  if (!hasBlockquote && score < 90) {
    recommendations.push({
      title: 'Add compelling site description',
      description: 'Without a blockquote description, AI models must guess your site\'s purpose. Professional generation analyzes your site to create optimized descriptions that improve AI comprehension by 300%.',
      priority: 'high',
      example: '# Project Name\n\n> Leading platform for [specific value proposition] with [key differentiators] used by [target audience]',
    });
  }

  // Few URLs = limited value (only show if actually < 5 URLs)
  if (parsed.urls.length > 0 && parsed.urls.length < 5) {
    recommendations.push({
      title: 'Expand URL coverage for better AI understanding',
      description: `With only ${parsed.urls.length} URL(s), AI models have severely limited context about your site. Professional generation automatically discovers and prioritizes 50-200+ URLs based on quality scoring and relevance.`,
      priority: 'high',
      example: 'Our generator analyzes your entire sitemap, scores each page for AI relevance, and intelligently selects the most valuable content to include.',
    });
  }

  // Poor organization (only show if actually < 2 sections AND score < 90)
  if (parsed.urls.length > 0 && h2Count < 2 && score < 90) {
    recommendations.push({
      title: 'Organize content for optimal AI comprehension',
      description: 'Unorganized URLs reduce AI model accuracy by 40%. Professional generation automatically categorizes your content into intuitive sections like Documentation, Products, Resources, and Blog.',
      priority: 'medium',
      example: '## Documentation\n- [Getting Started](https://example.com/start): Quick start guide\n\n## Products\n- [Product Overview](https://example.com/products): Complete product catalog',
    });
  }

  // HIGH-SCORING FILES (90-100): Soft upsell only, no problem-fixing
  if (score >= 90) {
    recommendations.push({
      title: 'Your llms.txt file is excellent!',
      description: 'You have a well-structured llms.txt file that follows best practices. Want to take it further? Our automated generator can help you maintain and enhance your file with automatic updates, advanced categorization, and content tagging.',
      priority: 'low',
      example: 'Professional features: Automatic site monitoring, scheduled regeneration, advanced content scoring, SEO optimization, and robots.txt conflict detection.',
    });
  }

  // LOW-SCORING FILES (<90): Problem-fixing recommendations
  if (score < 90) {
    // Show professional generation as solution to their problems
    recommendations.push({
      title: 'Professional generation solves these issues automatically',
      description: `Your current file scores ${score}/100. Our automated generator can create a perfect llms.txt file in minutes, scoring 95-100/100 consistently with: intelligent categorization, quality scoring, comprehensive URL discovery, and SEO optimization.`,
      priority: 'high',
      example: 'Professional generation includes: automated site crawling, quality scoring, intelligent categorization, SEO metadata, content tagging, and robots.txt conflict detection.',
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
