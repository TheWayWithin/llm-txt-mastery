import { test, expect, Page } from '@playwright/test';
import { CompetitorTestHelper } from './utils/competitor-test-helpers.js';
import type { CompetitorTestResult } from './utils/competitor-test-helpers.js';
import { COMPETITOR_CONFIGS, TEST_URLS } from './utils/competitor-config.js';

/**
 * COMPETITOR ANALYSIS TEST SUITE
 * 
 * Tests competitor LLMs.txt generators to understand their:
 * - Processing capabilities and speed
 * - Output quality and structure  
 * - User experience flows
 * - Rate limiting and error handling
 * - Content analysis capabilities
 */

class CompetitorAnalyzer {
  private page: Page;
  private helper: CompetitorTestHelper;
  private results: CompetitorTestResult[] = [];

  constructor(page: Page) {
    this.page = page;
    this.helper = new CompetitorTestHelper(page);
  }

  async analyzeCompetitor(config: any, testUrl: any): Promise<CompetitorTestResult> {
    const result: CompetitorTestResult = {
      competitor: config.name,
      url: config.url,
      testUrl: testUrl.url || testUrl,
      startTime: Date.now(),
      errors: [],
      status: 'failed',
      userFlow: {
        inputMethod: 'unknown',
        generationTrigger: 'unknown',
        outputDelivery: 'unknown',
        stepsRequired: 0
      },
      performance: {}
    };

    try {
      console.log(`🔍 Analyzing ${config.name} with URL: ${result.testUrl}`);
      
      // Initialize browser for competitor testing
      await this.helper.initializeBrowser();
      
      // Step 1: Navigate to competitor site
      const navStartTime = Date.now();
      await this.helper.navigateToCompetitor(config);
      result.performance.domContentLoaded = Date.now() - navStartTime;
      
      await this.helper.takeScreenshot(`${config.name}-landing`);

      // Step 2: Check for blocking/rate limiting
      const blockingCheck = await this.helper.detectBlocking();
      if (blockingCheck.blocked) {
        result.status = blockingCheck.reason as any;
        result.errors.push(`Blocked: ${blockingCheck.reason}`);
        return result;
      }

      // Step 3: Fill input field
      const inputStartTime = Date.now();
      const inputSuccess = await this.helper.findAndFillInput(config, result.testUrl);
      if (!inputSuccess) {
        result.errors.push('Failed to find or fill URL input field');
        return result;
      }
      result.userFlow.inputMethod = 'url-input-field';
      result.userFlow.stepsRequired++;

      // Step 4: Trigger generation
      const submitSuccess = await this.helper.findAndClickSubmit(config);
      if (!submitSuccess) {
        result.errors.push('Failed to find or click submit button');
        return result;
      }
      result.userFlow.generationTrigger = 'submit-button';
      result.userFlow.stepsRequired++;
      
      const generationStartTime = Date.now();

      // Step 5: Wait for and capture output
      const output = await this.helper.captureOutput(config);
      result.performance.generationTime = Date.now() - generationStartTime;
      
      if (output) {
        result.outputContent = output;
        result.fileSize = output.length;
        result.userFlow.outputDelivery = 'inline-text';
        result.status = 'success';
        
        // Step 6: Analyze content quality
        result.contentStructure = this.helper.analyzeContentQuality(output);
        
        // Extract page count from content
        const pageMatches = output.match(/https?:\/\/[^\s\n]+/g);
        result.pagesFound = pageMatches ? pageMatches.length : 0;
        
        console.log(`✅ Success: ${result.fileSize} chars, ${result.pagesFound} pages, quality: ${result.contentStructure.qualityScore}`);
      } else {
        result.errors.push('No output content captured');
      }

      result.endTime = Date.now();
      result.processingTime = result.endTime - result.startTime;
      result.performance.outputAvailable = result.endTime;

    } catch (error) {
      console.error(`❌ Error analyzing ${config.name}:`, error);
      result.errors.push(error instanceof Error ? error.message : String(error));
      result.endTime = Date.now();
      result.processingTime = result.endTime - result.startTime;
      
      // Take error screenshot
      await this.helper.takeScreenshot(`${config.name}-error`);
    }

    this.results.push(result);
    return result;
  }

  getResults(): CompetitorTestResult[] {
    return this.results;
  }

  generateComparisonReport(): string {
    const report = ['# Competitor Analysis Report\n'];
    const timestamp = new Date().toISOString();
    
    report.push(`**Generated**: ${timestamp}\n`);
    report.push(`**Test URLs**: ${TEST_URLS.map(u => typeof u === 'string' ? u : u.url).join(', ')}\n`);
    
    // Summary statistics
    report.push(`## Executive Summary\n`);
    const successful = this.results.filter(r => r.status === 'success');
    const failed = this.results.filter(r => r.status === 'failed');
    const blocked = this.results.filter(r => ['blocked', 'rate_limited', 'captcha'].includes(r.status));
    
    report.push(`- **Total Competitors Analyzed**: ${this.results.length}`);
    report.push(`- **Successful Analyses**: ${successful.length}`);
    report.push(`- **Failed Analyses**: ${failed.length}`);
    report.push(`- **Blocked/Rate Limited**: ${blocked.length}`);
    
    if (successful.length > 0) {
      const avgProcessingTime = successful.reduce((sum, r) => sum + (r.processingTime || 0), 0) / successful.length;
      const avgFileSize = successful.reduce((sum, r) => sum + (r.fileSize || 0), 0) / successful.length;
      const avgPagesFound = successful.reduce((sum, r) => sum + (r.pagesFound || 0), 0) / successful.length;
      const avgQualityScore = successful.reduce((sum, r) => sum + (r.contentStructure?.qualityScore || 0), 0) / successful.length;
      
      report.push(`- **Average Processing Time**: ${Math.round(avgProcessingTime)}ms`);
      report.push(`- **Average File Size**: ${Math.round(avgFileSize)} characters`);
      report.push(`- **Average Pages Found**: ${Math.round(avgPagesFound)}`);
      report.push(`- **Average Quality Score**: ${Math.round(avgQualityScore)}/100\n`);
    }

    // Performance comparison table
    if (successful.length > 1) {
      report.push(`## Performance Comparison\n`);
      report.push(`| Competitor | Processing Time | File Size | Pages Found | Quality Score |`);
      report.push(`|------------|----------------|-----------|-------------|---------------|`);
      
      for (const result of successful) {
        const performance = this.helper.classifyPerformance(
          result.processingTime || 0,
          result.fileSize || 0,
          result.pagesFound || 0
        );
        
        report.push(`| ${result.competitor} | ${result.processingTime}ms (${performance.timeRating}) | ${result.fileSize} chars (${performance.sizeRating}) | ${result.pagesFound} (${performance.pageRating}) | ${result.contentStructure?.qualityScore || 0}/100 |`);
      }
      report.push('');
    }

    // Detailed analysis per competitor
    report.push(`## Detailed Analysis\n`);
    
    for (const result of this.results) {
      report.push(`### ${result.competitor}\n`);
      report.push(`- **Status**: ${result.status.toUpperCase()}`);
      report.push(`- **Tool URL**: ${result.url}`);
      report.push(`- **Test URL**: ${result.testUrl}`);
      
      if (result.processingTime) {
        const performance = this.helper.classifyPerformance(
          result.processingTime,
          result.fileSize || 0,
          result.pagesFound || 0
        );
        report.push(`- **Processing Time**: ${result.processingTime}ms (${performance.timeRating})`);
      }
      
      if (result.pagesFound !== undefined) {
        report.push(`- **Pages Found**: ${result.pagesFound}`);
      }
      
      if (result.fileSize !== undefined) {
        report.push(`- **File Size**: ${result.fileSize} characters`);
      }

      report.push(`- **User Experience**:`);
      report.push(`  - Input Method: ${result.userFlow.inputMethod}`);
      report.push(`  - Generation Trigger: ${result.userFlow.generationTrigger}`);
      report.push(`  - Output Delivery: ${result.userFlow.outputDelivery}`);
      report.push(`  - Steps Required: ${result.userFlow.stepsRequired}`);

      if (result.contentStructure) {
        report.push(`- **Content Quality Analysis**:`);
        report.push(`  - Overall Quality Score: ${result.contentStructure.qualityScore}/100`);
        report.push(`  - Has Metadata: ${result.contentStructure.hasMetadata ? '✅' : '❌'}`);
        report.push(`  - Has Page List: ${result.contentStructure.hasPageList ? '✅' : '❌'}`);
        report.push(`  - Has Substantial Content: ${result.contentStructure.hasContent ? '✅' : '❌'}`);
        report.push(`  - Structured Sections: ${result.contentStructure.sections.length}`);
      }

      if (result.performance && Object.keys(result.performance).length > 0) {
        report.push(`- **Performance Metrics**:`);
        if (result.performance.domContentLoaded) {
          report.push(`  - Page Load Time: ${result.performance.domContentLoaded}ms`);
        }
        if (result.performance.generationTime) {
          report.push(`  - Generation Time: ${result.performance.generationTime}ms`);
        }
      }

      if (result.errors.length > 0) {
        report.push(`- **Issues Encountered**: ${result.errors.join(', ')}`);
      }

      if (result.outputContent && result.outputContent.length > 0) {
        report.push(`- **Sample Output** (first 300 characters):`);
        report.push(`\`\`\`\n${result.outputContent.substring(0, 300)}${result.outputContent.length > 300 ? '...' : ''}\n\`\`\``);
      }

      report.push('');
    }

    // Competitive insights
    if (successful.length > 0) {
      report.push(`## Competitive Insights\n`);
      
      const fastest = successful.reduce((min, r) => (r.processingTime || Infinity) < (min.processingTime || Infinity) ? r : min);
      const mostPages = successful.reduce((max, r) => (r.pagesFound || 0) > (max.pagesFound || 0) ? r : max);
      const highestQuality = successful.reduce((max, r) => (r.contentStructure?.qualityScore || 0) > (max.contentStructure?.qualityScore || 0) ? r : max);
      
      report.push(`- **Fastest Processing**: ${fastest.competitor} (${fastest.processingTime}ms)`);
      report.push(`- **Most Pages Discovered**: ${mostPages.competitor} (${mostPages.pagesFound} pages)`);
      report.push(`- **Highest Quality Output**: ${highestQuality.competitor} (${highestQuality.contentStructure?.qualityScore}/100)`);
      
      report.push(`\n**Key Differentiators**:`);
      report.push(`- Processing speed varies significantly (${Math.min(...successful.map(r => r.processingTime || 0))}ms - ${Math.max(...successful.map(r => r.processingTime || 0))}ms)`);
      report.push(`- Page discovery capabilities range from ${Math.min(...successful.map(r => r.pagesFound || 0))} to ${Math.max(...successful.map(r => r.pagesFound || 0))} pages`);
      report.push(`- Content quality scores range from ${Math.min(...successful.map(r => r.contentStructure?.qualityScore || 0))} to ${Math.max(...successful.map(r => r.contentStructure?.qualityScore || 0))}/100`);
    }

    return report.join('\n');
  }
}

test.describe('Competitor Analysis Suite', () => {
  let analyzer: CompetitorAnalyzer;

  test.beforeEach(async ({ page }) => {
    analyzer = new CompetitorAnalyzer(page);
  });

  // Test each competitor individually
  for (const config of COMPETITOR_CONFIGS) {
    test(`${config.name} - LLMs.txt generator analysis`, async ({ page }) => {
      console.log(`🎯 Testing ${config.name} llms.txt generator`);

      // Try each test URL until one works
      for (const testUrl of TEST_URLS) {
        try {
          const result = await analyzer.analyzeCompetitor(config, testUrl);
          
          // Basic assertions
          expect(result.competitor).toBe(config.name);
          expect(result.processingTime).toBeGreaterThan(0);
          
          if (result.status === 'success') {
            expect(result.outputContent).toBeTruthy();
            expect(result.fileSize).toBeGreaterThan(0);
            expect(result.contentStructure).toBeTruthy();
            expect(result.contentStructure!.qualityScore).toBeGreaterThanOrEqual(0);
          }

          console.log(`📊 ${config.name} result for ${typeof testUrl === 'string' ? testUrl : testUrl.url}: ${result.status}`);
          
          // If successful with this URL, break to next competitor
          if (result.status === 'success') break;
          
        } catch (error) {
          const url = typeof testUrl === 'string' ? testUrl : testUrl.url;
          console.log(`⚠️ ${config.name} failed with ${url}, trying next URL`);
          
          // If this is the last URL, allow the test to continue but mark as failed
          if (testUrl === TEST_URLS[TEST_URLS.length - 1]) {
            console.log(`❌ ${config.name} failed with all test URLs`);
            // Don't throw - let the test continue to generate a report
          }
        }
      }
    });
  }

  test.afterAll(async () => {
    try {
      // Generate and save comparison report
      const report = analyzer.generateComparisonReport();
      
      // Ensure test-results directory exists
      const fs = await import('fs');
      const path = await import('path');
      
      const testResultsDir = 'test-results';
      if (!fs.existsSync(testResultsDir)) {
        fs.mkdirSync(testResultsDir, { recursive: true });
      }
      
      // Save detailed report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.join(testResultsDir, `competitor-analysis-report-${timestamp}.md`);
      
      fs.writeFileSync(filename, report);
      console.log(`📄 Detailed competitor analysis report saved to: ${filename}`);
      
      // Save JSON data for programmatic analysis
      const jsonFilename = path.join(testResultsDir, `competitor-analysis-data-${timestamp}.json`);
      const jsonData = {
        timestamp: new Date().toISOString(),
        testUrls: TEST_URLS,
        results: analyzer.getResults(),
        summary: {
          totalCompetitors: analyzer.getResults().length,
          successful: analyzer.getResults().filter(r => r.status === 'success').length,
          failed: analyzer.getResults().filter(r => r.status === 'failed').length,
          blocked: analyzer.getResults().filter(r => ['blocked', 'rate_limited', 'captcha'].includes(r.status)).length
        }
      };
      
      fs.writeFileSync(jsonFilename, JSON.stringify(jsonData, null, 2));
      console.log(`📊 Analysis data saved to: ${jsonFilename}`);
      
      // Print summary to console
      console.log('\n' + '='.repeat(80));
      console.log('COMPETITOR ANALYSIS SUMMARY');
      console.log('='.repeat(80));
      
      const results = analyzer.getResults();
      const successful = results.filter(r => r.status === 'success');
      
      if (successful.length > 0) {
        console.log(`✅ Successfully analyzed ${successful.length}/${results.length} competitors:`);
        successful.forEach(r => {
          console.log(`  • ${r.competitor}: ${r.fileSize} chars, ${r.pagesFound} pages, ${r.contentStructure?.qualityScore}/100 quality (${r.processingTime}ms)`);
        });
      } else {
        console.log(`❌ No competitors successfully analyzed. Check the detailed report for issues.`);
      }
      
      const failed = results.filter(r => r.status !== 'success');
      if (failed.length > 0) {
        console.log(`\n⚠️ Failed analyses (${failed.length}):`);
        failed.forEach(r => {
          console.log(`  • ${r.competitor}: ${r.status} - ${r.errors.join(', ')}`);
        });
      }
      
      console.log(`\n📖 Full report: ${filename}`);
      console.log('='.repeat(80));
      
    } catch (error) {
      console.error('❌ Failed to generate analysis report:', error);
    }
  });
});

// Export the analyzer class for potential reuse
export { CompetitorAnalyzer };