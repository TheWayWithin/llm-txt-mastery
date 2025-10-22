/**
 * Test script for validating freecalchub.com llms.txt
 *
 * This script tests the Phase 1 validator implementation against a real llms.txt file.
 *
 * Usage:
 *   npx tsx test-freecalchub-validation.ts
 */

async function testFreecalchubValidation() {
  const STAGING_API = 'https://llm-txt-mastery-staging.up.railway.app';
  const TEST_URL = 'https://www.freecalchub.com';

  console.log('🧪 Testing Phase 1 Validator with freecalchub.com\n');
  console.log(`API Endpoint: ${STAGING_API}/api/validate-llms-txt`);
  console.log(`Test URL: ${TEST_URL}\n`);

  const startTime = Date.now();

  try {
    const response = await fetch(`${STAGING_API}/api/validate-llms-txt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: TEST_URL,
        includeRobotsTxt: true,
      }),
    });

    const responseTime = Date.now() - startTime;

    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`📊 HTTP Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Validation Request Failed:');
      console.error(JSON.stringify(errorData, null, 2));
      return;
    }

    const data = await response.json();

    console.log('✅ Validation Response:\n');
    console.log(JSON.stringify(data, null, 2));

    // Analyze results
    console.log('\n📈 ANALYSIS:');
    console.log(`Score: ${data.validation.score}/100`);
    console.log(`Valid: ${data.validation.valid}`);
    console.log(`Processing Time: ${data.validation.processingTime}ms`);
    console.log(`Issues Found: ${data.validation.issues.length}`);
    console.log(`Recommendations: ${data.validation.recommendations.length}`);

    if (data.validation.robotsConflicts) {
      console.log(`Robots.txt Conflicts: ${data.validation.robotsConflicts.length}`);
    }

    console.log('\n🔍 ISSUES:');
    data.validation.issues.forEach((issue: any, index: number) => {
      console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
      if (issue.suggestion) {
        console.log(`   💡 ${issue.suggestion}`);
      }
    });

    console.log('\n💡 RECOMMENDATIONS:');
    data.validation.recommendations.forEach((rec: any, index: number) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.title}`);
      console.log(`   ${rec.description}`);
    });

    // Score analysis
    console.log('\n🎯 SCORING ASSESSMENT:');
    const expectedScore = 75; // Predicted based on structure analysis
    const actualScore = data.validation.score;
    const variance = Math.abs(expectedScore - actualScore);

    console.log(`Expected Score: ${expectedScore}/100`);
    console.log(`Actual Score: ${actualScore}/100`);
    console.log(`Variance: ${variance} points`);

    if (variance <= 10) {
      console.log('✅ PASS: Scoring accuracy within ±10 points');
    } else {
      console.log('❌ FAIL: Scoring variance exceeds ±10 points');
    }

    // Performance assessment
    console.log('\n⚡ PERFORMANCE ASSESSMENT:');
    if (data.validation.processingTime < 35000) {
      console.log(`✅ PASS: Processing time ${data.validation.processingTime}ms < 35,000ms target`);
    } else {
      console.log(`❌ FAIL: Processing time ${data.validation.processingTime}ms exceeds 35,000ms target`);
    }

    // Real validator confirmation
    console.log('\n🔬 VALIDATOR VERIFICATION:');
    if (actualScore !== 75 || data.validation.issues.length > 0) {
      console.log('✅ CONFIRMED: Real validation logic active (score varies, not always 75)');
    } else {
      console.log('⚠️  WARNING: Score is exactly 75 with no issues - might be mock');
    }

  } catch (error) {
    console.error('❌ Test Failed:', error);
    if (error instanceof Error) {
      console.error('Error Message:', error.message);
      console.error('Stack Trace:', error.stack);
    }
  }
}

// Run the test
testFreecalchubValidation().catch(console.error);
