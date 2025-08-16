import { Page, Locator } from '@playwright/test';
import { CompetitorTestConfig, BROWSER_CONFIG, CONTENT_PATTERNS, BENCHMARKS } from './competitor-config.js';

/**
 * COMPETITOR TEST HELPERS
 * 
 * Specialized utilities for testing competitor LLMs.txt generators.
 * Handles common challenges like rate limiting, CAPTCHA detection,
 * dynamic content loading, and output extraction.
 */

export interface CompetitorTestResult {
  competitor: string;
  url: string;
  testUrl: string;
  startTime: number;
  endTime?: number;
  processingTime?: number;
  pagesFound?: number;
  fileSize?: number;
  outputContent?: string;
  errors: string[];
  status: 'success' | 'failed' | 'timeout' | 'blocked' | 'captcha' | 'rate_limited';
  userFlow: {
    inputMethod: string;
    generationTrigger: string;
    outputDelivery: string;
    stepsRequired: number;
  };
  contentStructure?: {
    hasMetadata: boolean;
    hasPageList: boolean;
    hasContent: boolean;
    sections: string[];
    qualityScore: number;
  };
  performance: {
    timeToFirstByte?: number;
    domContentLoaded?: number;
    generationTime?: number;
    outputAvailable?: number;
  };
}

export class CompetitorTestHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Initialize browser for competitor testing
   */
  async initializeBrowser(): Promise<void> {
    await this.page.setViewportSize(BROWSER_CONFIG.viewport);
    await this.page.setExtraHTTPHeaders({
      'User-Agent': BROWSER_CONFIG.userAgent,
      ...BROWSER_CONFIG.extraHTTPHeaders
    });
  }

  /**
   * Navigate to competitor site with resilience
   */
  async navigateToCompetitor(config: CompetitorTestConfig): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.page.goto(config.url, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      // Handle cookie consent if needed
      if (config.specialHandling?.needsCookieAccept) {
        await this.handleCookieConsent(config);
      }
      
      // Handle any modals or overlays
      await this.handleModals(config);
      
      console.log(`✅ Successfully navigated to ${config.name} in ${Date.now() - startTime}ms`);
      
    } catch (error) {
      console.error(`❌ Failed to navigate to ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Find and interact with input elements using fallback selectors
   */
  async findAndFillInput(config: CompetitorTestConfig, testUrl: string): Promise<boolean> {
    for (const selector of config.selectors.urlInput) {
      try {
        const input = this.page.locator(selector);
        if (await input.isVisible({ timeout: 2000 })) {
          await input.fill(testUrl);
          
          // Verify the input was filled correctly
          const value = await input.inputValue();
          if (value === testUrl) {
            console.log(`✅ Successfully filled input with selector: ${selector}`);
            return true;
          }
        }
      } catch (error) {
        // Continue to next selector
        console.log(`⚠️ Input selector failed: ${selector}`);
      }
    }
    
    console.error(`❌ No working input selector found for ${config.name}`);
    return false;
  }

  /**
   * Find and click submit button using fallback selectors
   */
  async findAndClickSubmit(config: CompetitorTestConfig): Promise<boolean> {
    // Scroll if needed before trying to click
    if (config.specialHandling?.needsScrollToSubmit) {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await this.page.waitForTimeout(1000);
    }

    for (const selector of config.selectors.submitButton) {
      try {
        const button = this.page.locator(selector);
        if (await button.isVisible({ timeout: 2000 }) && await button.isEnabled()) {
          await button.click();
          console.log(`✅ Successfully clicked submit with selector: ${selector}`);
          return true;
        }
      } catch (error) {
        // Continue to next selector
        console.log(`⚠️ Submit selector failed: ${selector}`);
      }
    }
    
    console.error(`❌ No working submit selector found for ${config.name}`);
    return false;
  }

  /**
   * Wait for and capture output using multiple strategies
   */
  async captureOutput(config: CompetitorTestConfig): Promise<string | null> {
    const maxWaitTime = config.expectations.maxWaitTime;
    const checkInterval = 2000; // Check every 2 seconds
    const maxChecks = Math.floor(maxWaitTime / checkInterval);
    
    console.log(`⏳ Waiting up to ${maxWaitTime}ms for output from ${config.name}`);

    for (let check = 0; check < maxChecks; check++) {
      // Check for loading indicators first
      if (config.selectors.loadingIndicator) {
        const isLoading = await this.checkLoadingIndicators(config);
        if (isLoading) {
          console.log(`🔄 Still loading... (check ${check + 1}/${maxChecks})`);
          await this.page.waitForTimeout(checkInterval);
          continue;
        }
      }

      // Try to find output
      const output = await this.findOutput(config);
      if (output && output.length > 50) { // Minimum content threshold
        console.log(`✅ Found output: ${output.length} characters`);
        return output;
      }

      // Check for error messages
      const error = await this.checkForErrors(config);
      if (error) {
        throw new Error(`Generation error: ${error}`);
      }

      await this.page.waitForTimeout(checkInterval);
    }

    console.error(`❌ Timeout waiting for output from ${config.name}`);
    return null;
  }

  /**
   * Analyze the quality and structure of generated content
   */
  analyzeContentQuality(content: string): CompetitorTestResult['contentStructure'] {
    if (!content) {
      return {
        hasMetadata: false,
        hasPageList: false,
        hasContent: false,
        sections: [],
        qualityScore: 0
      };
    }

    const hasMetadata = CONTENT_PATTERNS.metadata.some(pattern => pattern.test(content));
    const pageMatches = content.match(CONTENT_PATTERNS.pageList[0]) || [];
    const hasPageList = pageMatches.length > 0;
    const hasContent = content.length > 100;

    // Extract sections
    const sections: string[] = [];
    CONTENT_PATTERNS.structure.forEach(pattern => {
      const matches = [...content.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1]) sections.push(match[1].trim());
      });
    });

    // Calculate quality score (0-100)
    let qualityScore = 0;
    if (hasMetadata) qualityScore += 25;
    if (hasPageList) qualityScore += 25;
    if (hasContent) qualityScore += 25;
    if (sections.length > 2) qualityScore += 15;
    if (pageMatches.length > 5) qualityScore += 10;

    return {
      hasMetadata,
      hasPageList,
      hasContent,
      sections,
      qualityScore
    };
  }

  /**
   * Take timestamped screenshot for debugging
   */
  async takeScreenshot(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results/competitor-${name}-${timestamp}.png`;
    await this.page.screenshot({ path: filename, fullPage: true });
    return filename;
  }

  /**
   * Detect if we're being rate limited or blocked
   */
  async detectBlocking(): Promise<{ blocked: boolean; reason?: string }> {
    const pageContent = await this.page.textContent('body') || '';
    
    const blockingIndicators = [
      { pattern: /rate.?limit/i, reason: 'rate_limited' },
      { pattern: /too many requests/i, reason: 'rate_limited' },
      { pattern: /captcha/i, reason: 'captcha' },
      { pattern: /blocked/i, reason: 'blocked' },
      { pattern: /access denied/i, reason: 'blocked' },
      { pattern: /forbidden/i, reason: 'blocked' },
      { pattern: /503|502|504/i, reason: 'server_error' }
    ];

    for (const indicator of blockingIndicators) {
      if (indicator.pattern.test(pageContent)) {
        return { blocked: true, reason: indicator.reason };
      }
    }

    return { blocked: false };
  }

  /**
   * Generate performance benchmark classification
   */
  classifyPerformance(processingTime: number, contentSize: number, pageCount: number): {
    timeRating: string;
    sizeRating: string;
    pageRating: string;
  } {
    let timeRating = 'slow';
    if (processingTime < BENCHMARKS.processingTime.fast) timeRating = 'fast';
    else if (processingTime < BENCHMARKS.processingTime.medium) timeRating = 'medium';

    let sizeRating = 'minimal';
    if (contentSize > BENCHMARKS.contentSize.large) sizeRating = 'large';
    else if (contentSize > BENCHMARKS.contentSize.medium) sizeRating = 'medium';
    else if (contentSize > BENCHMARKS.contentSize.small) sizeRating = 'small';

    let pageRating = 'few';
    if (pageCount > BENCHMARKS.pageCount.extensive) pageRating = 'extensive';
    else if (pageCount > BENCHMARKS.pageCount.many) pageRating = 'many';
    else if (pageCount > BENCHMARKS.pageCount.some) pageRating = 'some';

    return { timeRating, sizeRating, pageRating };
  }

  // Private helper methods

  private async handleCookieConsent(config: CompetitorTestConfig): Promise<void> {
    if (!config.selectors.cookieAccept) return;

    for (const selector of config.selectors.cookieAccept) {
      try {
        const cookieButton = this.page.locator(selector);
        if (await cookieButton.isVisible({ timeout: 3000 })) {
          await cookieButton.click();
          console.log(`✅ Accepted cookies with selector: ${selector}`);
          await this.page.waitForTimeout(1000);
          return;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
  }

  private async handleModals(config: CompetitorTestConfig): Promise<void> {
    // Generic modal close buttons
    const modalCloseSelectors = [
      '[aria-label="Close"]',
      '.modal-close',
      '[data-dismiss="modal"]',
      '.close-button',
      'button:has-text("×")',
      'button:has-text("Close")'
    ];

    for (const selector of modalCloseSelectors) {
      try {
        const closeButton = this.page.locator(selector);
        if (await closeButton.isVisible({ timeout: 2000 })) {
          await closeButton.click();
          console.log(`✅ Closed modal with selector: ${selector}`);
          await this.page.waitForTimeout(500);
        }
      } catch (error) {
        // Continue to next selector
      }
    }
  }

  private async checkLoadingIndicators(config: CompetitorTestConfig): Promise<boolean> {
    if (!config.selectors.loadingIndicator) return false;

    for (const selector of config.selectors.loadingIndicator) {
      try {
        const loading = this.page.locator(selector);
        if (await loading.isVisible({ timeout: 1000 })) {
          return true;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    return false;
  }

  private async findOutput(config: CompetitorTestConfig): Promise<string | null> {
    // First try JavaScript extraction for SiteSpeakAI-style implementations
    const jsContent = await this.extractContentFromJavaScript();
    if (jsContent) {
      return jsContent;
    }

    // Then try traditional DOM selectors
    if (!config.selectors.output) return null;

    for (const selector of config.selectors.output) {
      try {
        const output = this.page.locator(selector);
        if (await output.isVisible({ timeout: 1000 })) {
          const content = await output.textContent();
          if (content && content.trim().length > 0) {
            return content.trim();
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    return null;
  }

  /**
   * Extract llms.txt content from JavaScript variables (for SiteSpeakAI-style implementations)
   */
  private async extractContentFromJavaScript(): Promise<string | null> {
    try {
      const content = await this.page.evaluate(() => {
        // Look for script tags containing llms.txt content
        const scripts = document.querySelectorAll('script');
        
        for (const script of scripts) {
          const scriptText = script.textContent || '';
          if (scriptText.includes('llmsContent') && scriptText.includes('llms.txt')) {
            // Extract content from JavaScript variable
            const match = scriptText.match(/llmsContent:\s*"([^"]+)"/);
            if (match) {
              // Decode escaped characters
              let content = match[1];
              content = content.replace(/\\n/g, '\n');
              content = content.replace(/\\u003E/g, '>');
              content = content.replace(/\\u003C/g, '<');
              content = content.replace(/\\\"/g, '"');
              content = content.replace(/\\\//g, '/');
              return content;
            }
          }
        }
        
        // Also check for other common JavaScript patterns
        const patterns = [
          /content:\s*["']([^"']+)["']/,
          /llms[_-]?txt[_-]?content:\s*["']([^"']+)["']/i,
          /generated[_-]?content:\s*["']([^"']+)["']/i,
          /output[_-]?text:\s*["']([^"']+)["']/i
        ];
        
        for (const script of scripts) {
          const scriptText = script.textContent || '';
          for (const pattern of patterns) {
            const match = scriptText.match(pattern);
            if (match && match[1].includes('#') && match[1].length > 50) {
              let content = match[1];
              content = content.replace(/\\n/g, '\n');
              content = content.replace(/\\u003E/g, '>');
              content = content.replace(/\\u003C/g, '<');
              content = content.replace(/\\\"/g, '"');
              content = content.replace(/\\\//g, '/');
              return content;
            }
          }
        }
        
        return null;
      });
      
      return content;
    } catch (error) {
      console.log('JavaScript extraction failed:', error);
      return null;
    }
  }

  private async checkForErrors(config: CompetitorTestConfig): Promise<string | null> {
    if (!config.selectors.errorMessage) return null;

    for (const selector of config.selectors.errorMessage) {
      try {
        const error = this.page.locator(selector);
        if (await error.isVisible({ timeout: 1000 })) {
          const content = await error.textContent();
          if (content && content.trim().length > 0) {
            return content.trim();
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    return null;
  }
}