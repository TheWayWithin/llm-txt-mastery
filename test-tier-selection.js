import { chromium } from 'playwright';

/**
 * THE TESTER - Tier Selection Flow Verification
 * 
 * Specifically tests the email → tier selection flow
 */

async function testTierSelection() {
  console.log('🧪 Testing Tier Selection Flow...\n');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(2000);
    
    console.log('🔍 Step 1: Finding email input...');
    const emailInput = await page.locator('input[type="email"]').first();
    const isEmailVisible = await emailInput.isVisible();
    console.log(`Email input visible: ${isEmailVisible}`);
    
    if (!isEmailVisible) {
      console.log('❌ Email input not found, cannot proceed');
      return;
    }
    
    console.log('🔍 Step 2: Filling email and submitting...');
    await emailInput.fill('test@example.com');
    
    // Look for submit button or enter key
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /submit|continue|next/i }).first();
    const hasSubmitButton = await submitButton.isVisible({ timeout: 1000 });
    
    if (hasSubmitButton) {
      console.log('📤 Found submit button, clicking...');
      await submitButton.click();
    } else {
      console.log('⌨️  No submit button found, trying Enter key...');
      await emailInput.press('Enter');
    }
    
    await page.waitForTimeout(2000);
    
    console.log('🔍 Step 3: Looking for tier selection options...');
    
    // More comprehensive search for tier options
    const tierSelectors = [
      '[data-testid="tier-card"]',
      '.tier-card',
      '[class*="tier"]',
      'button:has-text("Free")',
      'button:has-text("Coffee")',
      'button:has-text("Test Drive")',
      'button:has-text("Solopreneur")',
      '[data-tier]',
      '.pricing-card'
    ];
    
    let foundTiers = false;
    let tierElements = [];
    
    for (const selector of tierSelectors) {
      try {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
          console.log(`✅ Found ${count} tier elements with selector: ${selector}`);
          tierElements = await elements.allTextContents();
          foundTiers = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!foundTiers) {
      console.log('🔍 Step 4: Debugging - What\'s actually on the page?');
      
      // Get all visible content
      const pageContent = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements
          .filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   el.offsetWidth > 0 && 
                   el.offsetHeight > 0 &&
                   el.textContent.trim().length > 0;
          })
          .map(el => ({
            tag: el.tagName,
            text: el.textContent?.trim().slice(0, 100),
            classes: el.className,
            id: el.id,
            dataAttrs: Array.from(el.attributes)
              .filter(attr => attr.name.startsWith('data-'))
              .map(attr => `${attr.name}="${attr.value}"`)
              .join(' ')
          }))
          .filter(item => item.text && item.text.length > 5)
          .slice(0, 20);
      });
      
      console.log('Visible page content:');
      pageContent.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.tag}: "${item.text}"`);
      });
      
      // Check the current state machine state
      const stateInfo = await page.evaluate(() => {
        // Try to access React dev tools or console logs
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => {
          logs.push(args.join(' '));
          originalLog.apply(console, args);
        };
        return { logs: logs.slice(-10) };
      });
      
      console.log('Recent console activity:', stateInfo.logs);
    } else {
      console.log('✅ Tier selection elements found:');
      tierElements.forEach((text, idx) => {
        console.log(`   ${idx + 1}. "${text}"`);
      });
    }
    
    console.log('\n🔍 Final State Analysis:');
    
    // Check URL
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check if any forms or inputs are visible
    const formElements = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form, input, button, select'));
      return forms
        .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0)
        .map(el => ({
          tag: el.tagName,
          type: el.type || 'N/A',
          text: el.textContent?.trim().slice(0, 50) || el.placeholder || el.value,
          name: el.name || '',
          id: el.id || ''
        }));
    });
    
    console.log('Visible form elements:');
    formElements.forEach((el, idx) => {
      console.log(`   ${idx + 1}. ${el.tag}[${el.type}]: "${el.text}" (name: ${el.name}, id: ${el.id})`);
    });
    
  } catch (error) {
    console.log(`❌ Error during testing: ${error.message}`);
  } finally {
    console.log('\n📊 Test complete. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

testTierSelection().catch(console.error);