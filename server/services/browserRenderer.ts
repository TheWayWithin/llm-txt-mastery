/**
 * Browser Renderer Service - Sprint 6
 *
 * Provides JavaScript rendering capabilities for CSR/SPA websites
 * using Playwright. Scale tier exclusive feature.
 *
 * Key Features:
 * - Headless Chromium rendering
 * - Auto-scroll for lazy-loaded content
 * - Concurrent render limiting (max 2)
 * - Graceful fallback on errors
 * - 15-second timeout per page
 *
 * Cost: $0/month (runs on existing Railway backend)
 */

import { chromium, Browser, Page } from 'playwright';

// ============================================================================
// Types
// ============================================================================

export interface BrowserRenderResult {
  success: boolean;
  html: string;
  text: string;
  url: string;
  renderTimeMs: number;
  error?: string;
  wasJsRendered: boolean;
}

export interface RenderOptions {
  timeout?: number;        // Max time for rendering (default: 15000ms)
  waitForNetwork?: boolean; // Wait for network idle (default: true)
  autoScroll?: boolean;     // Scroll to trigger lazy content (default: true)
  viewport?: {
    width: number;
    height: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<RenderOptions> = {
  timeout: 15000,
  waitForNetwork: true,
  autoScroll: true,
  viewport: { width: 1280, height: 720 }
};

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',  // Important for Docker/Railway
  '--disable-gpu',
  '--no-first-run',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync',
  '--disable-translate',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check'
];

// ============================================================================
// Render Queue (Limits concurrent renders to prevent resource exhaustion)
// ============================================================================

class RenderQueue {
  private activeRenders = 0;
  private readonly maxConcurrent: number;
  private queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(maxConcurrent: number = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  async acquire(): Promise<void> {
    if (this.activeRenders < this.maxConcurrent) {
      this.activeRenders++;
      return;
    }

    // Wait in queue
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.queue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        reject(new Error('Render queue timeout - too many concurrent requests'));
      }, 60000); // 60 second queue timeout

      this.queue.push({
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject
      });
    });
  }

  release(): void {
    this.activeRenders--;

    // Process next in queue
    if (this.queue.length > 0 && this.activeRenders < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        this.activeRenders++;
        next.resolve();
      }
    }
  }

  getStatus(): { active: number; queued: number; max: number } {
    return {
      active: this.activeRenders,
      queued: this.queue.length,
      max: this.maxConcurrent
    };
  }
}

// Global render queue - limits to 2 concurrent renders
const renderQueue = new RenderQueue(2);

// ============================================================================
// Browser Management
// ============================================================================

let browserInstance: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  // Return existing browser if available and connected
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  // If browser is being launched, wait for it
  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  // Launch new browser
  browserLaunchPromise = chromium.launch({
    headless: true,
    args: BROWSER_ARGS
  });

  try {
    browserInstance = await browserLaunchPromise;
    console.log('[BrowserRenderer] Browser launched successfully');
    return browserInstance;
  } finally {
    browserLaunchPromise = null;
  }
}

/**
 * Close the browser instance (for cleanup/shutdown)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    console.log('[BrowserRenderer] Browser closed');
  }
}

// ============================================================================
// Core Render Function
// ============================================================================

/**
 * Render a page using headless Chromium with JavaScript execution
 *
 * @param url - The URL to render
 * @param options - Rendering options
 * @returns BrowserRenderResult with HTML, text, and metadata
 */
export async function renderPage(
  url: string,
  options: RenderOptions = {}
): Promise<BrowserRenderResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  // Acquire render slot (will queue if at capacity)
  try {
    await renderQueue.acquire();
  } catch (error) {
    return {
      success: false,
      html: '',
      text: '',
      url,
      renderTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Queue timeout',
      wasJsRendered: false
    };
  }

  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport
    await page.setViewportSize(opts.viewport);

    // Navigate with network idle wait
    await page.goto(url, {
      waitUntil: opts.waitForNetwork ? 'networkidle' : 'domcontentloaded',
      timeout: opts.timeout
    });

    // Additional wait for JS frameworks to hydrate
    await page.waitForTimeout(1500);

    // Auto-scroll to trigger lazy loading
    if (opts.autoScroll) {
      await autoScroll(page);
    }

    // Extract content
    const html = await page.content();
    const text = await page.evaluate(() => {
      // Remove script and style content from text extraction
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
      return clone.innerText || '';
    });

    const renderTime = Date.now() - startTime;

    console.log(`[BrowserRenderer] Rendered ${url} in ${renderTime}ms (${(html.length / 1024).toFixed(1)} KB HTML)`);

    return {
      success: true,
      html,
      text,
      url,
      renderTimeMs: renderTime,
      wasJsRendered: true
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[BrowserRenderer] Error rendering ${url}: ${errorMessage}`);

    return {
      success: false,
      html: '',
      text: '',
      url,
      renderTimeMs: Date.now() - startTime,
      error: errorMessage,
      wasJsRendered: false
    };

  } finally {
    // Always close the page and release the render slot
    if (page) {
      await page.close().catch(() => {});
    }
    renderQueue.release();
  }
}

/**
 * Auto-scroll the page to trigger lazy-loaded content
 */
async function autoScroll(page: Page): Promise<void> {
  try {
    await page.evaluate(async () => {
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;

      // Scroll in steps to trigger lazy loading
      const steps = Math.min(5, Math.ceil(scrollHeight / viewportHeight));

      for (let i = 1; i <= steps; i++) {
        const scrollTo = (scrollHeight / steps) * i;
        window.scrollTo(0, scrollTo);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Scroll back to top
      window.scrollTo(0, 0);
    });

    // Wait for any lazy content to load
    await page.waitForTimeout(500);
  } catch (error) {
    // Auto-scroll is best-effort, don't fail the render
    console.warn('[BrowserRenderer] Auto-scroll warning:', error);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if browser rendering is available (browser can be launched)
 */
export async function isBrowserAvailable(): Promise<boolean> {
  try {
    const browser = await getBrowser();
    return browser.isConnected();
  } catch {
    return false;
  }
}

/**
 * Get current render queue status
 */
export function getRenderQueueStatus(): { active: number; queued: number; max: number } {
  return renderQueue.getStatus();
}

/**
 * Render page with fallback to HTTP fetch if browser rendering fails
 */
export async function renderPageWithFallback(
  url: string,
  httpFallback: () => Promise<string>,
  options: RenderOptions = {}
): Promise<BrowserRenderResult> {
  const result = await renderPage(url, options);

  if (result.success) {
    return result;
  }

  // Fallback to HTTP fetch
  console.log(`[BrowserRenderer] Falling back to HTTP fetch for ${url}`);

  try {
    const html = await httpFallback();
    return {
      success: true,
      html,
      text: '', // Text extraction would need cheerio
      url,
      renderTimeMs: result.renderTimeMs,
      wasJsRendered: false
    };
  } catch (fallbackError) {
    return {
      success: false,
      html: '',
      text: '',
      url,
      renderTimeMs: result.renderTimeMs,
      error: `Browser and HTTP fallback both failed: ${result.error}`,
      wasJsRendered: false
    };
  }
}

// ============================================================================
// Cleanup on process exit
// ============================================================================

process.on('SIGINT', async () => {
  await closeBrowser();
});

process.on('SIGTERM', async () => {
  await closeBrowser();
});
