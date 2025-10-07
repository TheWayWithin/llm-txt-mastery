/**
 * COMPETITOR CONFIGURATION
 *
 * Centralized configuration for competitor analysis tests.
 * This file contains all the selectors, expectations, and test data
 * needed to analyze different LLMs.txt generator competitors.
 */

export interface CompetitorTestConfig {
  name: string;
  url: string;
  selectors: {
    urlInput: string[];
    submitButton: string[];
    loadingIndicator?: string[];
    output?: string[];
    downloadButton?: string[];
    errorMessage?: string[];
    cookieAccept?: string[];
    modalClose?: string[];
  };
  expectations: {
    maxWaitTime: number;
    expectedElements: string[];
    requiredHeaders?: string[];
  };
  specialHandling?: {
    needsCookieAccept?: boolean;
    needsScrollToSubmit?: boolean;
    hasMultipleSteps?: boolean;
    requiresRegistration?: boolean;
  };
}

export const COMPETITOR_CONFIGS: CompetitorTestConfig[] = [
  {
    name: 'SiteSpeakAI',
    url: 'https://sitespeak.ai/tools/llms-txt-generator',
    selectors: {
      urlInput: [
        'input[type="url"]',
        'input[placeholder*="website"]',
        'input[placeholder*="URL"]',
        'input[name="url"]',
        'input[name="website"]',
        'input[id*="url"]',
        'input[class*="url"]',
        'textarea[placeholder*="website"]',
      ],
      submitButton: [
        'button:has-text("Generate")',
        'button:has-text("Create")',
        'button:has-text("Build")',
        'button:has-text("Start")',
        'button[type="submit"]',
        '.btn-primary',
        '.generate-btn',
        'input[type="submit"]',
      ],
      loadingIndicator: [
        '.loading',
        '.spinner',
        '[data-loading="true"]',
        '.progress',
        '.generating',
        '[aria-label*="loading"]',
        '.loader',
      ],
      output: [
        'pre',
        'code',
        '.bg-gray-50 pre',
        '.rounded-md pre',
        '.p-4 pre',
        'div[class*="bg-gray"] pre',
        'div[class*="rounded"] pre',
        '.output',
        '.result',
        '.generated-content',
        '.llms-txt-output',
        '[data-testid*="output"]',
        '.code-block',
        'textarea[readonly]',
      ],
      downloadButton: [
        'button:has-text("Download")',
        'a:has-text("Download")',
        '.download-btn',
        '[download]',
        'button[aria-label*="download"]',
      ],
      errorMessage: [
        '.error',
        '.alert-error',
        '[role="alert"]',
        '.notification-error',
        '.message-error',
      ],
      cookieAccept: [
        'button:has-text("Accept")',
        'button:has-text("OK")',
        'button:has-text("Agree")',
        '.cookie-accept',
        '[data-cy="accept-cookies"]',
      ],
    },
    expectations: {
      maxWaitTime: 90000, // 90 seconds for generation
      expectedElements: ['urlInput', 'submitButton'],
      requiredHeaders: ['User-Agent'],
    },
    specialHandling: {
      needsCookieAccept: true,
      needsScrollToSubmit: false,
    },
  },
  {
    name: 'Writesonic',
    url: 'https://writesonic.com/free-tools/llms-txt-generator',
    selectors: {
      urlInput: [
        'input[type="url"]',
        'input[placeholder*="website"]',
        'input[placeholder*="URL"]',
        'input[name="url"]',
        'input[name="website"]',
        'input[id*="url"]',
        'textarea[placeholder*="website"]',
        'input[aria-label*="URL"]',
      ],
      submitButton: [
        'button:has-text("Generate")',
        'button:has-text("Create")',
        'button:has-text("Build")',
        'button:has-text("Start")',
        'button[type="submit"]',
        '.btn-primary',
        '.generate-btn',
        '.cta-button',
      ],
      loadingIndicator: [
        '.loading',
        '.spinner',
        '[data-loading="true"]',
        '.progress',
        '.generating',
        '.processing',
        '[aria-label*="loading"]',
      ],
      output: [
        'textarea[readonly]',
        'pre',
        'code',
        '.output',
        '.result',
        '.generated-content',
        '.response-content',
        '[data-testid*="output"]',
      ],
      downloadButton: [
        'button:has-text("Download")',
        'a:has-text("Download")',
        '.download-btn',
        '[download]',
      ],
      errorMessage: ['.error', '.alert-error', '[role="alert"]', '.notification-error'],
      cookieAccept: [
        'button:has-text("Accept")',
        'button:has-text("OK")',
        'button:has-text("Agree")',
        '.cookie-consent button',
      ],
    },
    expectations: {
      maxWaitTime: 120000, // 120 seconds - Writesonic might be slower
      expectedElements: ['urlInput', 'submitButton'],
      requiredHeaders: ['User-Agent'],
    },
    specialHandling: {
      needsCookieAccept: true,
      requiresRegistration: false, // Some tools might require this
    },
  },
  {
    name: 'LiveChatAI',
    url: 'https://livechatai.com/llms-txt-generator',
    selectors: {
      urlInput: [
        'input[type="url"]',
        'input[placeholder*="website"]',
        'input[placeholder*="URL"]',
        'input[name="url"]',
        'input[name="website"]',
        'input[id*="url"]',
        'textarea[placeholder*="website"]',
      ],
      submitButton: [
        'button:has-text("Generate")',
        'button:has-text("Create")',
        'button:has-text("Build")',
        'button:has-text("Start")',
        'button[type="submit"]',
        '.btn-primary',
        '.generate-btn',
      ],
      loadingIndicator: [
        '.loading',
        '.spinner',
        '[data-loading="true"]',
        '.progress',
        '.generating',
      ],
      output: [
        'textarea[readonly]',
        'pre',
        'code',
        '.output',
        '.result',
        '.generated-content',
        '[data-testid*="output"]',
      ],
      downloadButton: [
        'button:has-text("Download")',
        'a:has-text("Download")',
        '.download-btn',
        '[download]',
      ],
      errorMessage: ['.error', '.alert-error', '[role="alert"]', '.notification-error'],
      cookieAccept: [
        'button:has-text("Accept")',
        'button:has-text("OK")',
        'button:has-text("Agree")',
      ],
    },
    expectations: {
      maxWaitTime: 90000,
      expectedElements: ['urlInput', 'submitButton'],
    },
    specialHandling: {
      needsCookieAccept: true,
    },
  },
];

export const TEST_URLS = [
  {
    url: 'https://freecalchub.com',
    description: 'Primary test site - calculator tools website',
    expectedPages: 20, // Rough estimate
    complexity: 'medium',
  },
  {
    url: 'https://example.com',
    description: 'Simple fallback site',
    expectedPages: 1,
    complexity: 'simple',
  },
  {
    url: 'https://httpbin.org',
    description: 'HTTP testing service',
    expectedPages: 5,
    complexity: 'simple',
  },
  {
    url: 'https://jsonplaceholder.typicode.com',
    description: 'JSON API testing service',
    expectedPages: 10,
    complexity: 'medium',
  },
];

export const BROWSER_CONFIG = {
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 720 },
  extraHTTPHeaders: {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    DNT: '1',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  },
};

/**
 * Content analysis patterns for evaluating generated llms.txt files
 */
export const CONTENT_PATTERNS = {
  metadata: [
    /^#\s+/m, // Markdown headers
    /^##\s+/m, // Markdown subheaders
    /^---/m, // YAML front matter
    /^[A-Z][a-z]+:/m, // Key-value pairs like "Website:"
  ],

  pageList: [
    /https?:\/\/[^\s\n]+/g, // HTTP/HTTPS URLs
    /www\.[^\s\n]+/g, // www. URLs
    /\/[^\s\n]+/g, // Relative paths
  ],

  structure: [
    /^#\s+(.+)$/gm, // Main headers
    /^##\s+(.+)$/gm, // Sub headers
    /^\*\s+(.+)$/gm, // Bullet points
    /^\d+\.\s+(.+)$/gm, // Numbered lists
  ],

  qualityIndicators: [
    /pages?\s+found/i,
    /total\s+pages/i,
    /website\s+structure/i,
    /content\s+summary/i,
    /navigation/i,
    /sitemap/i,
  ],
};

/**
 * Expected benchmark ranges for comparison
 */
export const BENCHMARKS = {
  processingTime: {
    fast: 30000, // Under 30 seconds
    medium: 90000, // 30-90 seconds
    slow: 180000, // Over 90 seconds
  },

  contentSize: {
    minimal: 500, // Under 500 characters
    small: 2000, // 500-2000 characters
    medium: 5000, // 2000-5000 characters
    large: 10000, // Over 5000 characters
  },

  pageCount: {
    few: 5, // Under 5 pages
    some: 20, // 5-20 pages
    many: 50, // 20-50 pages
    extensive: 100, // Over 50 pages
  },
};
