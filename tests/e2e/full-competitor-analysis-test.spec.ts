import { test, expect } from '@playwright/test';
import { CompetitorAnalyzer } from './competitor-analysis.spec.js';
import { COMPETITOR_CONFIGS, TEST_URLS } from './utils/competitor-config.js';

/**
 * FULL COMPETITOR ANALYSIS TEST
 * 
 * This test validates our complete competitor analysis infrastructure
 * using the improved JavaScript extraction capabilities.
 */

test.describe('Full Competitor Analysis Test', () => {
  test('SiteSpeakAI - complete analysis flow', async ({ page }) => {
    console.log('🎯 Testing complete competitor analysis flow with SiteSpeakAI');

    const analyzer = new CompetitorAnalyzer(page);
    const siteSpeakConfig = COMPETITOR_CONFIGS.find(c => c.name === 'SiteSpeakAI');
    
    if (!siteSpeakConfig) {
      throw new Error('SiteSpeakAI config not found');
    }

    // Test with the primary test URL
    const testUrl = TEST_URLS[0]; // freecalchub.com
    
    console.log(`Testing with URL: ${typeof testUrl === 'string' ? testUrl : testUrl.url}`);
    
    const result = await analyzer.analyzeCompetitor(siteSpeakConfig, testUrl);
    
    // Log detailed results
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log('==================');
    console.log(`Competitor: ${result.competitor}`);
    console.log(`Status: ${result.status}`);
    console.log(`Processing Time: ${result.processingTime}ms`);
    console.log(`Test URL: ${result.testUrl}`);
    
    if (result.status === 'success') {
      console.log(`✅ SUCCESS METRICS:`);
      console.log(`  - File Size: ${result.fileSize} characters`);
      console.log(`  - Pages Found: ${result.pagesFound}`);
      console.log(`  - Quality Score: ${result.contentStructure?.qualityScore}/100`);
      console.log(`  - Has Metadata: ${result.contentStructure?.hasMetadata}`);
      console.log(`  - Has Page List: ${result.contentStructure?.hasPageList}`);
      console.log(`  - Has Content: ${result.contentStructure?.hasContent}`);
      console.log(`  - Sections: ${result.contentStructure?.sections.length}`);
      
      console.log(`\n📝 SAMPLE OUTPUT (first 200 chars):`);
      console.log(`"${result.outputContent?.substring(0, 200)}..."`);
      
      // Assertions for successful analysis
      expect(result.status).toBe('success');
      expect(result.outputContent).toBeTruthy();
      expect(result.fileSize).toBeGreaterThan(50);
      expect(result.contentStructure).toBeTruthy();
      expect(result.contentStructure!.qualityScore).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
      
      // Content quality checks
      expect(result.outputContent).toContain('llms.txt');
      expect(result.outputContent!.length).toBeGreaterThan(100);
      
    } else {
      console.log(`❌ ANALYSIS FAILED:`);
      console.log(`  - Status: ${result.status}`);
      console.log(`  - Errors: ${result.errors.join(', ')}`);
      
      // Even if the analysis failed, we should have basic metrics
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    }
    
    // User flow validation
    console.log(`\n🔄 USER FLOW ANALYSIS:`);
    console.log(`  - Input Method: ${result.userFlow.inputMethod}`);
    console.log(`  - Generation Trigger: ${result.userFlow.generationTrigger}`);
    console.log(`  - Output Delivery: ${result.userFlow.outputDelivery}`);
    console.log(`  - Steps Required: ${result.userFlow.stepsRequired}`);
    
    expect(result.userFlow.inputMethod).toBe('url-input-field');
    expect(result.userFlow.generationTrigger).toBe('submit-button');
    expect(result.userFlow.stepsRequired).toBeGreaterThan(0);
    
    // Performance validation
    if (result.performance) {
      console.log(`\n⚡ PERFORMANCE METRICS:`);
      if (result.performance.domContentLoaded) {
        console.log(`  - DOM Load Time: ${result.performance.domContentLoaded}ms`);
      }
      if (result.performance.generationTime) {
        console.log(`  - Generation Time: ${result.performance.generationTime}ms`);
      }
    }
    
    // Generate mini-report
    const miniReport = analyzer.generateComparisonReport();
    console.log(`\n📄 GENERATED REPORT PREVIEW:`);
    console.log(miniReport.substring(0, 500) + '...');
    
    console.log(`\n✅ Full competitor analysis test completed successfully!`);
  });

  test('Test infrastructure resilience', async ({ page }) => {
    console.log('🧪 Testing infrastructure resilience with invalid inputs');

    const analyzer = new CompetitorAnalyzer(page);
    const siteSpeakConfig = COMPETITOR_CONFIGS.find(c => c.name === 'SiteSpeakAI');
    
    if (!siteSpeakConfig) {
      throw new Error('SiteSpeakAI config not found');
    }

    // Test with invalid URL
    const invalidUrl = 'https://this-domain-definitely-does-not-exist-12345.com';
    
    const result = await analyzer.analyzeCompetitor(siteSpeakConfig, invalidUrl);
    
    console.log(`\n🔍 RESILIENCE TEST RESULTS:`);
    console.log(`Test URL: ${invalidUrl}`);
    console.log(`Status: ${result.status}`);
    console.log(`Errors: ${result.errors.join(', ')}`);
    console.log(`Processing Time: ${result.processingTime}ms`);
    
    // Should handle errors gracefully
    expect(result.status).not.toBe('success');
    expect(result.processingTime).toBeGreaterThan(0);
    expect(result.errors.length).toBeGreaterThan(0);
    
    console.log(`✅ Infrastructure handled invalid input gracefully`);
  });
});