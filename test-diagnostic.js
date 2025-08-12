#!/usr/bin/env node

import { chromium } from 'playwright';

async function diagnosticTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🔍 Running diagnostic test...\n');
  
  try {
    // 1. Check if site is up
    console.log('1. Checking if site is accessible...');
    const response = await page.goto('https://www.llmtxtmastery.com', { waitUntil: 'networkidle' });
    console.log(`   Status: ${response.status()}`);
    console.log(`   URL: ${page.url()}\n`);
    
    // 2. Check for main elements
    console.log('2. Looking for main UI elements...');
    
    const elements = {
      'Get Started button': page.getByRole('button', { name: /get started/i }),
      'Hero title': page.locator('h1'),
      'URL input': page.locator('input[placeholder*="website"], input[placeholder*="URL"], input[type="url"]'),
      'Analyze button': page.getByRole('button', { name: /analyze/i }),
      'Any button': page.locator('button'),
      'Any input': page.locator('input')
    };
    
    for (const [name, element] of Object.entries(elements)) {
      const count = await element.count();
      const isVisible = count > 0 ? await element.first().isVisible() : false;
      console.log(`   ${name}: ${count} found, ${isVisible ? 'visible' : 'not visible'}`);
      
      if (count > 0 && isVisible) {
        const text = await element.first().textContent().catch(() => 'N/A');
        if (text && text !== 'N/A') {
          console.log(`     Text: "${text.substring(0, 50)}..."`);
        }
      }
    }
    
    // 3. Check console errors
    console.log('\n3. Checking for console errors...');
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`   ❌ Console error: ${msg.text()}`);
      }
    });
    
    // 4. Try the initial flow
    console.log('\n4. Testing initial user flow...');
    
    // Look for Get Started or Enter URL
    const getStarted = page.getByRole('button', { name: /get started/i }).first();
    if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   Found "Get Started" button, clicking...');
      await getStarted.click();
      await page.waitForTimeout(2000);
    }
    
    // Check what's visible now
    console.log('\n5. Current page state after interaction...');
    
    const urlInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
    if (await urlInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ URL input is visible');
      const placeholder = await urlInput.getAttribute('placeholder');
      console.log(`   Placeholder: "${placeholder}"`);
    } else {
      console.log('   ❌ URL input not found');
    }
    
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Email input is visible');
    } else {
      console.log('   ❌ Email input not found');
    }
    
    // 6. Check for any error messages
    console.log('\n6. Checking for error messages...');
    const errorPatterns = [
      page.locator('text=/error/i'),
      page.locator('text=/failed/i'),
      page.locator('text=/not found/i'),
      page.locator('.error'),
      page.locator('[class*="error"]')
    ];
    
    for (const pattern of errorPatterns) {
      if (await pattern.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        const text = await pattern.first().textContent();
        console.log(`   ⚠️ Found error: "${text.substring(0, 100)}..."`);
      }
    }
    
    // 7. Take a screenshot
    console.log('\n7. Taking screenshot...');
    await page.screenshot({ path: 'diagnostic-screenshot.png', fullPage: true });
    console.log('   Screenshot saved as diagnostic-screenshot.png');
    
    console.log('\n✅ Diagnostic complete! Check the screenshot for visual inspection.');
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error.message);
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Run diagnostic
diagnosticTest().catch(console.error);