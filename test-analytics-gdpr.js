import { chromium } from 'playwright';

const testAnalyticsAndGDPR = async () => {
  console.log('🧪 Testing GA4 Analytics & GDPR Compliance...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to production site
    console.log('📍 Navigating to production site...');
    await page.goto('https://www.llmtxtmastery.com', { waitUntil: 'networkidle' });
    
    // Wait for analytics initialization
    await page.waitForTimeout(2000);
    
    // Test 1: Check if consent banner appears
    console.log('🍪 Testing consent banner...');
    const consentBanner = page.locator('[role="dialog"], .consent-banner, .cookie-banner');
    const bannerVisible = await consentBanner.isVisible().catch(() => false);
    console.log(`✅ Consent banner visible: ${bannerVisible}`);
    
    // Test 2: Check GTM initialization
    console.log('📊 Testing GTM initialization...');
    const gtmInfo = await page.evaluate(() => {
      return {
        dataLayerExists: !!window.dataLayer,
        dataLayerLength: window.dataLayer ? window.dataLayer.length : 0,
        gtmStart: window.dataLayer ? window.dataLayer.find(item => item['gtm.start']) : null,
        gtmScript: !!document.querySelector('script[src*="googletagmanager.com/gtm.js"]'),
        gtmNoscript: !!document.querySelector('noscript iframe[src*="googletagmanager.com/ns.html"]'),
        containerId: window.dataLayer ? window.dataLayer.find(item => item['gtm.start']) : null
      };
    });
    console.log(`✅ GTM Status:`, gtmInfo);
    
    // Test 3: Check consent storage
    console.log('💾 Testing consent storage...');
    const consentStored = await page.evaluate(() => {
      return localStorage.getItem('llmtxt_consent') !== null;
    });
    console.log(`✅ Consent preferences stored: ${consentStored}`);
    
    // Test 4: Test consent acceptance flow
    if (bannerVisible) {
      console.log('✅ Testing consent acceptance...');
      
      // Click "Accept All" if available
      const acceptButton = page.locator('button:has-text("Accept All"), button:has-text("Accept")');
      if (await acceptButton.isVisible()) {
        await acceptButton.click();
        await page.waitForTimeout(1000);
        
        // Verify consent was accepted
        const consentAccepted = await page.evaluate(() => {
          const consent = localStorage.getItem('llmtxt_consent');
          if (consent) {
            const parsed = JSON.parse(consent);
            return parsed.analytics === 'granted';
          }
          return false;
        });
        console.log(`✅ Analytics consent granted: ${consentAccepted}`);
      }
    }
    
    // Test 5: Test business event tracking
    console.log('📈 Testing GTM business event tracking...');
    
    // Check current dataLayer state
    const currentDataLayer = await page.evaluate(() => {
      return {
        exists: !!window.dataLayer,
        length: window.dataLayer ? window.dataLayer.length : 0,
        events: window.dataLayer ? window.dataLayer.slice() : []
      };
    });
    console.log('📊 Current dataLayer state:', currentDataLayer);
    
    // Trigger tier selection event
    console.log('  🎯 Testing tier_selected event...');
    const coffeeRadio = page.locator('input[value="coffee"]').first();
    if (await coffeeRadio.isVisible().catch(() => false)) {
      await coffeeRadio.click();
      await page.waitForTimeout(1000);
    }
    
    // Check if tier selection triggered any events
    const finalDataLayer = await page.evaluate(() => {
      return {
        length: window.dataLayer ? window.dataLayer.length : 0,
        newEvents: window.dataLayer ? window.dataLayer.slice(-3) : []
      };
    });
    console.log('📊 DataLayer after interaction:', finalDataLayer);
    
    // Test 6: Test Enzuzo integration
    console.log('🛡️ Testing Enzuzo GDPR compliance...');
    const enzuzoPresent = await page.evaluate(() => {
      return typeof window.EnzuzoSDK !== 'undefined' || 
             document.querySelector('[data-enzuzo]') !== null ||
             document.querySelector('#enzuzo-sdk') !== null;
    });
    console.log(`✅ Enzuzo integration present: ${enzuzoPresent}`);
    
    // Test 7: Check privacy policy links
    console.log('📋 Testing privacy policy links...');
    const privacyLinks = await page.locator('a[href*="privacy"]').count();
    console.log(`✅ Privacy policy links found: ${privacyLinks}`);
    
    // Test 8: Test consent preferences persistence
    console.log('🔄 Testing consent persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const persistedConsent = await page.evaluate(() => {
      const consent = localStorage.getItem('llmtxt_consent');
      return consent ? JSON.parse(consent) : null;
    });
    
    console.log(`✅ Consent persisted after reload:`, persistedConsent);
    
    // Summary
    console.log('\n🎯 GDPR & Analytics Integration Summary:');
    console.log(`✅ Consent Banner: ${bannerVisible ? 'PASS' : 'FAIL'}`);
    console.log(`✅ GA4 Integration: ${ga4Present ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Consent Storage: ${consentStored ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Enzuzo Present: ${enzuzoPresent ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Privacy Links: ${privacyLinks > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ GA4 Requests: ${ga4Requests.length > 0 ? 'PASS' : 'PENDING'}`);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'gdpr-analytics-test.png', fullPage: false });
    console.log('📸 Screenshot saved as gdpr-analytics-test.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
};

testAnalyticsAndGDPR();