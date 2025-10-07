import { chromium } from 'playwright';

const testBusinessEvents = async () => {
  console.log('🚀 Testing Business Event Tracking...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to production site
    console.log('📍 Navigating to production site...');
    await page.goto('https://www.llmtxtmastery.com', { waitUntil: 'networkidle' });

    // Wait for analytics initialization
    await page.waitForTimeout(3000);

    // Check initial GTM state
    console.log('📊 Initial GTM state...');
    const initialDataLayer = await page.evaluate(() => {
      return {
        exists: !!window.dataLayer,
        length: window.dataLayer ? window.dataLayer.length : 0,
        events: window.dataLayer ? window.dataLayer.slice(-5) : [],
      };
    });
    console.log('Initial dataLayer:', initialDataLayer);

    // Test 1: Navigate to signup page where tier selection is visible
    console.log('\n🎯 Test 1: Navigate to signup page for tier selection...');

    // Navigate to signup page
    await page.goto('https://www.llmtxtmastery.com/signup', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Wait for tier selection dropdown to be visible on signup page
    await page.waitForSelector('select#tier', { timeout: 10000 });

    // Test 2: Select coffee tier (should trigger tier_selected event)
    console.log('☕ Selecting coffee tier from dropdown...');
    await page.selectOption('select#tier', 'coffee');
    await page.waitForTimeout(2000);

    // Check dataLayer after tier selection
    const afterTierSelection = await page.evaluate(() => {
      return {
        length: window.dataLayer ? window.dataLayer.length : 0,
        newEvents: window.dataLayer ? window.dataLayer.slice(-3) : [],
      };
    });
    console.log('📊 After coffee tier selection:', afterTierSelection);

    // Test 3: Select different tier (should trigger another tier_selected event)
    console.log('\n🆓 Selecting starter tier...');
    await page.selectOption('select#tier', 'starter');
    await page.waitForTimeout(2000);

    // Check dataLayer after second tier selection
    const afterSecondTierSelection = await page.evaluate(() => {
      return {
        length: window.dataLayer ? window.dataLayer.length : 0,
        newEvents: window.dataLayer ? window.dataLayer.slice(-2) : [],
      };
    });
    console.log('📊 After starter tier selection:', afterSecondTierSelection);

    // Test 4: Fill form and attempt signup (should trigger form submission event)
    console.log('\n📝 Testing form interaction...');

    // Make sure coffee tier is selected
    await page.selectOption('select#tier', 'coffee');
    await page.waitForTimeout(1000);

    // Fill in email field
    await page.fill('input#email', 'test' + Date.now() + '@example.com');
    await page.waitForTimeout(1000);

    // Check current URL (should still be signup page)
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);

    // Test 5: Check for custom events in dataLayer
    console.log('\n🔍 Searching for custom business events...');
    const customEvents = await page.evaluate(() => {
      if (!window.dataLayer) return [];

      return window.dataLayer.filter((item) => {
        return (
          item.event && !['gtm.js', 'gtm.dom', 'gtm.load', 'gtm.scrollDepth'].includes(item.event)
        );
      });
    });

    console.log('🎯 Custom business events found:', customEvents);

    // Summary
    console.log('\n📈 Business Event Tracking Summary:');
    console.log(`✅ GTM DataLayer active: ${customEvents.length > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Custom business events: ${customEvents.length}`);

    if (customEvents.length > 0) {
      console.log('🏆 SUCCESS: Business events are firing!');
      customEvents.forEach((event, i) => {
        console.log(`  ${i + 1}. ${event.event} - ${JSON.stringify(event)}`);
      });
    } else {
      console.log('⚠️  No custom business events detected yet');
      console.log("   This might be normal if user interactions haven't triggered them");
    }

    // Take screenshot
    await page.screenshot({ path: 'business-events-test.png', fullPage: false });
    console.log('📸 Screenshot saved as business-events-test.png');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
};

testBusinessEvents();
