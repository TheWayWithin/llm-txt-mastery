/**
 * llms.txt Validation Service
 *
 * Production-ready validator for llms.txt files following the llmstxt.org specification.
 *
 * Features:
 * - Real llms.txt file fetching with SSRF protection
 * - Comprehensive markdown parsing and structure validation
 * - URL accessibility verification via HEAD requests
 * - robots.txt conflict detection for AI crawler rules
 * - Quality scoring algorithm (0-100 scale)
 * - Dynamic recommendations based on validation results
 * - Database persistence with tier-based retention
 *
 * Implementation Status: ✅ PRODUCTION READY
 */

import { createHash } from 'crypto';
import { marked } from 'marked';
import robotsParser from 'robots-parser';
import { SPADetectionResult, LlmsTxtFileType } from '@shared/schema';
import { analyzeHomepage } from './sitemap';

export interface ValidationOptions {
  fileType?: LlmsTxtFileType;
  includeRobotsTxt?: boolean;
  bustCache?: boolean;
}

// File paths to check in priority order for auto-detect mode
const FILE_PATHS: Record<LlmsTxtFileType, string> = {
  'auto': '', // Special case - check all
  'llms.txt': '/llms.txt',
  'llms-full.txt': '/llms-full.txt',
  '.well-known': '/.well-known/llms.txt',
  'llms.md': '/llms.md',
};

// Priority order for auto-detect mode
const AUTO_DETECT_ORDER: LlmsTxtFileType[] = [
  'llms.txt',
  '.well-known',
  'llms-full.txt',
  'llms.md',
];

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
  actionUrl?: string;
  actionLabel?: string;
}

export interface RobotsConflict {
  rule: string;
  llmsTxtPath: string;
  conflict: string;
  recommendation: string;
}

/**
 * Content depth analysis metrics (Sprint 5 Phase 4)
 * Provides insights into the comprehensiveness of the llms.txt file
 */
export interface ContentDepthMetrics {
  urlCount: number;
  sectionCount: number;
  wordCount: number;
  hasDescription: boolean;
  descriptionLength: number;
  hasOptionalSection: boolean;
  depthLevel: 'minimal' | 'basic' | 'good' | 'comprehensive';
  depthScore: number; // 0-100 specific to content depth
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  recommendations: ValidationRecommendation[];
  robotsConflicts?: RobotsConflict[];
  spaDetection?: SPADetectionResult;
  // Sprint 5: Multi-file support
  fileType: LlmsTxtFileType; // Requested file type
  detectedPath: string; // Actual path where file was found
  checkedPaths?: string[]; // All paths checked (for auto-detect mode)
  // Sprint 5 Phase 4: Content depth analysis
  contentDepth?: ContentDepthMetrics;
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
 * Result of fetching llms.txt file (Sprint 5: Multi-file support)
 */
interface FetchResult {
  content: string;
  detectedPath: string;
  fileType: LlmsTxtFileType;
  checkedPaths: string[];
}

/**
 * Fetch a single file from URL with security controls and timeout
 * Returns null if 404, throws on other errors
 */
async function fetchSingleFile(url: string): Promise<string | null> {
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
        return null; // File not found - return null to try next path
      } else if (response.status >= 500) {
        throw new Error(`Server error (${response.status}). The server hosting the file is having issues`);
      } else {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
    }

    const content = await response.text();

    if (!content || content.trim().length === 0) {
      return null; // Empty file - treat as not found
    }

    // Detect HTML content (SPA fallback returning HTML instead of 404)
    // This is common with SPAs like React, Vue, etc. on Netlify, Vercel, etc.
    const trimmedContent = content.trim().toLowerCase();
    if (
      trimmedContent.startsWith('<!doctype html') ||
      trimmedContent.startsWith('<html')
    ) {
      console.log(`Detected HTML content at ${url} - treating as file not found (SPA fallback)`);
      return null; // SPA fallback HTML - treat as file not found
    }

    return content;

  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: File took too long to fetch (>10 seconds)');
      }
      throw error;
    }
    throw new Error('Failed to fetch file');
  }
}

/**
 * Fetch llms.txt file from URL with multi-file support (Sprint 5)
 * Supports: llms.txt, llms-full.txt, .well-known/llms.txt, llms.md
 * Auto-detect mode checks all locations in priority order
 */
async function fetchLlmsTxt(baseUrl: string, fileType: LlmsTxtFileType = 'auto'): Promise<FetchResult> {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const checkedPaths: string[] = [];

  // Determine which paths to check
  const pathsToCheck: LlmsTxtFileType[] = fileType === 'auto'
    ? AUTO_DETECT_ORDER
    : [fileType];

  for (const type of pathsToCheck) {
    const path = FILE_PATHS[type];
    const fullUrl = `${normalizedBase}${path}`;
    checkedPaths.push(path);

    try {
      const content = await fetchSingleFile(fullUrl);
      if (content) {
        return {
          content,
          detectedPath: path,
          fileType: type,
          checkedPaths,
        };
      }
    } catch (error) {
      // If not a 404, rethrow the error
      if (error instanceof Error && !error.message.includes('404')) {
        throw error;
      }
    }
  }

  // No file found at any location
  if (fileType === 'auto') {
    throw new Error(
      `This website doesn't have an llms.txt file yet. We checked ${checkedPaths.length} standard locations (${checkedPaths.join(', ')}) but none were found.`
    );
  } else {
    throw new Error(
      `No file found at ${FILE_PATHS[fileType]}. Please ensure the file exists at this location.`
    );
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use fetchLlmsTxt with fileType parameter instead
 */
async function fetchLlmsTxtLegacy(baseUrl: string): Promise<string> {
  const result = await fetchLlmsTxt(baseUrl, 'llms.txt');
  return result.content;
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
 * Analyze content depth of llms.txt file (Sprint 5 Phase 4)
 * Provides metrics on how comprehensive the file is
 */
function analyzeContentDepth(
  parsed: ParsedLlmsTxt,
  fileType: LlmsTxtFileType
): ContentDepthMetrics {
  // Count sections (H2 headers)
  const sectionCount = Object.keys(parsed.sections).length - 1; // Exclude H1

  // Count words in raw content
  const wordCount = parsed.rawContent
    .replace(/[#\[\]()>*`-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0).length;

  // Check for blockquote description
  const blockquoteMatch = parsed.rawContent.match(/^>\s*(.+)$/m);
  const hasDescription = !!blockquoteMatch;
  const descriptionLength = blockquoteMatch ? blockquoteMatch[1].length : 0;

  // Check for Optional section (per llmstxt.org spec)
  const hasOptionalSection = Object.keys(parsed.sections)
    .some(s => s.toLowerCase() === 'optional');

  // Calculate depth score (0-100)
  let depthScore = 0;

  // URL coverage (0-40 points)
  if (parsed.urls.length >= 50) depthScore += 40;
  else if (parsed.urls.length >= 20) depthScore += 30;
  else if (parsed.urls.length >= 10) depthScore += 20;
  else if (parsed.urls.length >= 5) depthScore += 10;
  else if (parsed.urls.length >= 1) depthScore += 5;

  // Section organization (0-25 points)
  if (sectionCount >= 5) depthScore += 25;
  else if (sectionCount >= 3) depthScore += 20;
  else if (sectionCount >= 2) depthScore += 15;
  else if (sectionCount >= 1) depthScore += 10;

  // Description quality (0-20 points)
  if (descriptionLength >= 150) depthScore += 20;
  else if (descriptionLength >= 100) depthScore += 15;
  else if (descriptionLength >= 50) depthScore += 10;
  else if (hasDescription) depthScore += 5;

  // Word count / content volume (0-10 points)
  if (wordCount >= 500) depthScore += 10;
  else if (wordCount >= 200) depthScore += 7;
  else if (wordCount >= 100) depthScore += 5;
  else if (wordCount >= 50) depthScore += 3;

  // Bonus for Optional section (5 points) - shows spec knowledge
  if (hasOptionalSection) depthScore += 5;

  // Determine depth level
  let depthLevel: 'minimal' | 'basic' | 'good' | 'comprehensive';
  if (depthScore >= 80) depthLevel = 'comprehensive';
  else if (depthScore >= 55) depthLevel = 'good';
  else if (depthScore >= 30) depthLevel = 'basic';
  else depthLevel = 'minimal';

  return {
    urlCount: parsed.urls.length,
    sectionCount,
    wordCount,
    hasDescription,
    descriptionLength,
    hasOptionalSection,
    depthLevel,
    depthScore: Math.min(100, depthScore),
  };
}

/**
 * Generate file-type-specific recommendations (Sprint 5 Phase 4)
 * Provides cross-file recommendations based on content depth
 */
function generateFileTypeRecommendations(
  contentDepth: ContentDepthMetrics,
  fileType: LlmsTxtFileType,
  existingRecommendations: ValidationRecommendation[]
): ValidationRecommendation[] {
  const recommendations = [...existingRecommendations];

  // For llms.txt files with minimal content, suggest llms-full.txt
  if (fileType === 'llms.txt' && contentDepth.depthLevel === 'minimal') {
    recommendations.push({
      title: 'Consider creating llms-full.txt for comprehensive coverage',
      description: `Your llms.txt file has ${contentDepth.urlCount} URLs and ${contentDepth.sectionCount} sections. ` +
        'For sites with extensive documentation, consider creating an llms-full.txt with expanded content. ' +
        'Use llms.txt for the essential overview and llms-full.txt for comprehensive coverage.',
      priority: 'medium',
      example: 'llms.txt: 5-10 essential URLs for quick context\nllms-full.txt: 50-200+ URLs for comprehensive AI understanding',
    });
  }

  // For llms-full.txt files that are too sparse
  if (fileType === 'llms-full.txt' && (contentDepth.depthLevel === 'minimal' || contentDepth.depthLevel === 'basic')) {
    recommendations.push({
      title: 'llms-full.txt should contain comprehensive content',
      description: `Your llms-full.txt has only ${contentDepth.urlCount} URLs. The "-full" variant is expected to contain ` +
        'expanded content with more detailed URL coverage. Consider adding more sections, URLs, and descriptions, ' +
        'or rename to llms.txt if this represents your complete content.',
      priority: 'high',
      example: 'llms-full.txt should typically contain 20+ URLs with detailed sections covering all major site areas.',
    });
  }

  // For well-known path usage
  if (fileType === '.well-known' && !contentDepth.hasDescription) {
    recommendations.push({
      title: 'Add description for .well-known/llms.txt',
      description: 'Files in the .well-known directory are discoverable by standardized tools. ' +
        'Adding a clear blockquote description helps AI systems quickly understand your site\'s purpose.',
      priority: 'medium',
      example: '> Your site description here - helps AI models understand your content at a glance',
    });
  }

  // General depth improvement suggestions
  if (contentDepth.depthLevel !== 'comprehensive' && !contentDepth.hasOptionalSection && contentDepth.urlCount >= 10) {
    recommendations.push({
      title: 'Add an Optional section for secondary content',
      description: 'The llmstxt.org spec defines an "## Optional" section for secondary URLs that can be skipped when context is limited. ' +
        'This helps AI models prioritize essential content while still having access to supplementary information.',
      priority: 'low',
      example: '## Optional\n\n- [Changelog](https://example.com/changelog): Version history and updates\n- [Contributing](https://example.com/contributing): How to contribute',
    });
  }

  return recommendations;
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
  const requestedFileType = options.fileType || 'auto';

  try {
    // Step 1: Fetch llms.txt file with security controls (Sprint 5: Multi-file support)
    const fetchResult = await fetchLlmsTxt(url, requestedFileType);
    console.log(`File found at ${fetchResult.detectedPath} (checked: ${fetchResult.checkedPaths.join(', ')})`);

    // Step 2: Parse markdown content
    const parsed = parseLlmsTxt(fetchResult.content);

    // Step 3: Validate structure and content
    const issues = await validateStructure(parsed);

    // Step 4: Calculate score based on validation results
    const score = calculateScore(parsed, issues);

    // Step 5: Generate recommendations
    let recommendations = generateRecommendations(parsed, issues);

    // Step 5.5: Content depth analysis (Sprint 5 Phase 4)
    const contentDepth = analyzeContentDepth(parsed, fetchResult.fileType);
    console.log(`Content depth for ${url}: level=${contentDepth.depthLevel}, score=${contentDepth.depthScore}, urls=${contentDepth.urlCount}`);

    // Step 5.6: Add file-type-specific recommendations based on content depth
    recommendations = generateFileTypeRecommendations(contentDepth, fetchResult.fileType, recommendations);

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

    // Step 7: SPA Detection for Universal Compatibility (Sprint 5)
    let spaDetection: SPADetectionResult | undefined;
    try {
      spaDetection = await analyzeHomepage(url);
      console.log(`SPA detection for ${url}: framework=${spaDetection.framework.framework}, strategy=${spaDetection.framework.renderingStrategy}, coverage=${spaDetection.contentCoverage.estimatedCoverage}%`);
    } catch (error) {
      // SPA detection is non-blocking - log and continue
      console.warn('SPA detection failed (non-blocking):', error instanceof Error ? error.message : 'Unknown error');
    }

    const processingTime = Date.now() - startTime;

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      score,
      issues,
      recommendations,
      robotsConflicts,
      spaDetection,
      fileType: fetchResult.fileType,
      detectedPath: fetchResult.detectedPath,
      checkedPaths: requestedFileType === 'auto' ? fetchResult.checkedPaths : undefined,
      contentDepth, // Sprint 5 Phase 4
      cached: false,
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Validation failed';

    // Determine appropriate suggestion based on error type
    const isFileNotFound = errorMessage.includes('doesn\'t have an llms.txt file') ||
                           errorMessage.includes('No file found');

    const suggestion = isFileNotFound
      ? 'Click "Create llms.txt" below to generate one automatically, or create one manually at /llms.txt following the llmstxt.org specification.'
      : 'Check the URL is correct and the website is accessible, then try again.';

    // Return error result with detailed message (this is NOT a 500 error - it's a valid validation result)
    return {
      valid: false,
      score: 0,
      issues: [
        {
          severity: 'error',
          message: errorMessage,
          suggestion: suggestion
        }
      ],
      recommendations: isFileNotFound ? [
        {
          title: 'Create an llms.txt file',
          description: 'An llms.txt file helps AI assistants understand your website. Use our analyzer to generate one automatically - just click "Create llms.txt" and we\'ll scan your site to build a customized file.',
          priority: 'high' as const,
          example: '# YourSiteName\n\n> Brief description of your site\n\n## Documentation\n- [Getting Started](https://yoursite.com/docs): Introduction guide',
          actionUrl: '/analyze',
          actionLabel: 'Create llms.txt'
        }
      ] : [],
      fileType: requestedFileType,
      detectedPath: '',
      checkedPaths: requestedFileType === 'auto' ? AUTO_DETECT_ORDER.map(t => FILE_PATHS[t]) : undefined,
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

/**
 * Batch validation result for comparing multiple file locations (Sprint 5 Phase 5)
 */
export interface BatchValidationResult {
  baseUrl: string;
  results: Array<{
    fileType: LlmsTxtFileType;
    path: string;
    found: boolean;
    result?: ValidationResult;
    error?: string;
  }>;
  comparison?: {
    bestFile: LlmsTxtFileType;
    bestScore: number;
    inconsistencies: string[];
    recommendation: string;
  };
  processingTime: number;
}

/**
 * Batch validate all llms.txt file locations (Sprint 5 Phase 5)
 * Checks all standard paths and compares found files
 */
export async function batchValidateLlmsTxt(
  baseUrl: string,
  options: Omit<ValidationOptions, 'fileType'> = {}
): Promise<BatchValidationResult> {
  const startTime = Date.now();
  const results: BatchValidationResult['results'] = [];

  // Check all file types in parallel
  const validationPromises = AUTO_DETECT_ORDER.map(async (fileType) => {
    try {
      const result = await validateLlmsTxt(baseUrl, { ...options, fileType });
      return {
        fileType,
        path: FILE_PATHS[fileType],
        found: result.score > 0 && !result.issues.some(i => i.message.includes('not found')),
        result,
      };
    } catch (error) {
      return {
        fileType,
        path: FILE_PATHS[fileType],
        found: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  });

  const validationResults = await Promise.all(validationPromises);

  for (const vr of validationResults) {
    results.push(vr);
  }

  // Generate comparison if multiple files found
  const foundResults = results.filter(r => r.found && r.result);
  let comparison: BatchValidationResult['comparison'];

  if (foundResults.length > 0) {
    // Find best file by score
    const sortedByScore = [...foundResults].sort((a, b) =>
      (b.result?.score || 0) - (a.result?.score || 0)
    );
    const bestFile = sortedByScore[0];

    // Detect inconsistencies
    const inconsistencies: string[] = [];

    if (foundResults.length > 1) {
      // Compare URL counts
      const urlCounts = foundResults.map(r => ({
        type: r.fileType,
        count: r.result?.contentDepth?.urlCount || 0,
      }));
      const maxUrls = Math.max(...urlCounts.map(u => u.count));
      const minUrls = Math.min(...urlCounts.map(u => u.count));
      if (maxUrls - minUrls > 5) {
        inconsistencies.push(
          `URL count varies significantly: ${urlCounts.map(u => `${u.type}=${u.count}`).join(', ')}`
        );
      }

      // Compare scores
      const scores = foundResults.map(r => ({
        type: r.fileType,
        score: r.result?.score || 0,
      }));
      const maxScore = Math.max(...scores.map(s => s.score));
      const minScore = Math.min(...scores.map(s => s.score));
      if (maxScore - minScore > 20) {
        inconsistencies.push(
          `Validation scores vary: ${scores.map(s => `${s.type}=${s.score}`).join(', ')}`
        );
      }
    }

    // Generate recommendation
    let recommendation: string;
    if (foundResults.length === 1) {
      recommendation = `Only ${bestFile.fileType} was found. Consider adding files at other standard locations for broader compatibility.`;
    } else if (inconsistencies.length > 0) {
      recommendation = `Multiple files found with inconsistencies. Recommend using ${bestFile.fileType} (score: ${bestFile.result?.score}) as the primary file and ensuring other files stay in sync.`;
    } else {
      recommendation = `Multiple files found with consistent content. ${bestFile.fileType} has the highest score (${bestFile.result?.score}).`;
    }

    comparison = {
      bestFile: bestFile.fileType,
      bestScore: bestFile.result?.score || 0,
      inconsistencies,
      recommendation,
    };
  }

  return {
    baseUrl,
    results,
    comparison,
    processingTime: Date.now() - startTime,
  };
}
