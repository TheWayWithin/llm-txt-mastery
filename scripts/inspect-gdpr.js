#!/usr/bin/env node

/**
 * GDPR Implementation Inspector
 *
 * Quick inspection of the production site to understand
 * the actual GDPR/consent implementation before running full tests.
 */

import { chromium } from 'playwright';

const PRODUCTION_URL = 'https://www.llmtxtmastery.com';

async function inspectGDPR() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🔍 Inspecting GDPR implementation...');
  console.log(`Site: ${PRODUCTION_URL}`);
  console.log('');

  try {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    console.log('📋 Page Analysis:');
    console.log('================');

    // Check for common consent banner elements
    const consentElements = await page.evaluate(() => {
      const results = {
        foundElements: [],
        cookieRelatedText: [],
        buttons: [],
        links: [],
      };

      // Check for common consent-related IDs and classes
      const consentSelectors = [
        '[id*="consent"]',
        '[class*="consent"]',
        '[id*="cookie"]',
        '[class*="cookie"]',
        '[id*="gdpr"]',
        '[class*="gdpr"]',
        '[id*="privacy"]',
        '[class*="privacy"]',
        '[id*="enzuzo"]',
        '[class*="enzuzo"]',
      ];

      consentSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (el.offsetParent !== null) {
            // visible elements only
            results.foundElements.push({
              selector: selector,
              tagName: el.tagName,
              id: el.id,
              className: el.className,
              text: el.textContent?.substring(0, 100),
            });
          }
        });
      });

      // Check for buttons that might be consent-related
      const buttons = document.querySelectorAll('button');
      buttons.forEach((button) => {
        const text = button.textContent?.toLowerCase() || '';
        if (
          text.includes('accept') ||
          text.includes('reject') ||
          text.includes('cookie') ||
          text.includes('consent') ||
          text.includes('privacy') ||
          text.includes('decline')
        ) {
          results.buttons.push({
            text: button.textContent,
            id: button.id,
            className: button.className,
          });
        }
      });

      // Check for privacy/cookie policy links
      const links = document.querySelectorAll('a');
      links.forEach((link) => {
        const text = link.textContent?.toLowerCase() || '';
        const href = link.href?.toLowerCase() || '';
        if (
          text.includes('privacy') ||
          text.includes('cookie') ||
          href.includes('privacy') ||
          href.includes('cookie')
        ) {
          results.links.push({
            text: link.textContent,
            href: link.href,
            id: link.id,
            className: link.className,
          });
        }
      });

      // Look for text that mentions cookies or consent
      const bodyText = document.body.textContent || '';
      const cookieMatches = bodyText.match(/cookie[s]?|consent|privacy policy|gdpr/gi) || [];
      results.cookieRelatedText = cookieMatches.slice(0, 10); // First 10 matches

      return results;
    });

    console.log(`Found ${consentElements.foundElements.length} consent-related elements:`);
    consentElements.foundElements.forEach((el) => {
      console.log(`  - ${el.tagName} (${el.selector})`);
      console.log(`    ID: ${el.id || 'none'}`);
      console.log(`    Class: ${el.className || 'none'}`);
      console.log(`    Text: ${el.text || 'none'}`);
      console.log('');
    });

    console.log(`Found ${consentElements.buttons.length} consent-related buttons:`);
    consentElements.buttons.forEach((btn) => {
      console.log(`  - "${btn.text}"`);
      console.log(`    ID: ${btn.id || 'none'}`);
      console.log(`    Class: ${btn.className || 'none'}`);
      console.log('');
    });

    console.log(`Found ${consentElements.links.length} privacy/cookie links:`);
    consentElements.links.forEach((link) => {
      console.log(`  - "${link.text}" -> ${link.href}`);
      console.log(`    ID: ${link.id || 'none'}`);
      console.log(`    Class: ${link.className || 'none'}`);
      console.log('');
    });

    console.log(
      `Cookie/consent related text found: ${consentElements.cookieRelatedText.length} instances`
    );
    if (consentElements.cookieRelatedText.length > 0) {
      console.log('Sample matches:', consentElements.cookieRelatedText.slice(0, 5));
    }

    // Check current cookies
    const cookies = await context.cookies();
    console.log(`\n🍪 Current cookies: ${cookies.length}`);
    cookies.forEach((cookie) => {
      console.log(`  - ${cookie.name} (${cookie.domain})`);
    });

    // Check for Google Analytics or other tracking
    const scripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts
        .map((script) => ({
          src: script.src,
          content: script.innerHTML?.substring(0, 100),
        }))
        .filter(
          (s) =>
            s.src?.includes('google') ||
            s.src?.includes('analytics') ||
            s.content?.includes('gtag') ||
            s.content?.includes('analytics')
        );
    });

    console.log(`\n📊 Tracking scripts found: ${scripts.length}`);
    scripts.forEach((script) => {
      console.log(`  - ${script.src || 'inline script'}`);
      if (script.content) {
        console.log(`    Content: ${script.content}...`);
      }
    });

    // Take a screenshot for reference
    await page.screenshot({
      path: 'test-results/gdpr-inspection.png',
      fullPage: true,
    });
    console.log('\n📸 Screenshot saved to: test-results/gdpr-inspection.png');

    console.log('\n✅ GDPR inspection completed');

    // Wait for user interaction if in headed mode
    if (!browser.isConnected) {
      console.log('\n⏸️ Browser will remain open for manual inspection...');
      console.log('Press Ctrl+C to close when done.');
      await page.waitForTimeout(60000); // Wait 1 minute
    }
  } catch (error) {
    console.error('❌ Error during inspection:', error);
  } finally {
    await browser.close();
  }
}

inspectGDPR();
