/**
 * Test script to validate the newly generated llms.txt file
 * Expected score: 85-95/100 (up from 70-75 with old format)
 */

const API_URL = 'https://llm-txt-mastery-staging.up.railway.app/api/validate-llms-txt';

async function validateNewFormat() {
  console.log('🧪 Testing NEW llms.txt format validation...\n');

  // Note: The newly generated file is at /Users/jamiewatters/DevProjects/freecalchub/llms.txt
  // But we need to validate the deployed version at https://www.freecalchub.com/llms.txt
  // If freecalchub.com hasn't been updated yet, this will show the OLD format score (~75/100)

  const testUrl = 'https://www.freecalchub.com';

  console.log(`📍 Validating: ${testUrl}`);
  console.log(`🔗 API Endpoint: ${API_URL}\n`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: testUrl,
        includeRobotsTxt: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        console.log('⚠️  RATE LIMIT EXCEEDED');
        console.log(`Message: ${data.message}`);
        console.log(`Reset at: ${data.resetAt}`);
        console.log(`\n💡 Wait until reset time or use authenticated account for testing`);
        return;
      }

      console.log(`❌ Error: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ VALIDATION SUCCESSFUL\n');

    const validation = data.validation || data;

    console.log('📊 SCORE ANALYSIS:');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Score: ${validation.score}/100`);
    console.log(`Valid: ${validation.valid}`);
    console.log(`Processing Time: ${validation.processingTime}ms`);
    console.log('');

    // Score expectation
    if (validation.score >= 85 && validation.score <= 95) {
      console.log('🎉 SUCCESS! Score in expected range (85-95/100)');
      console.log('✅ New generator format working perfectly!');
    } else if (validation.score >= 70 && validation.score <= 80) {
      console.log('⚠️  Score in OLD format range (70-80/100)');
      console.log('💡 This suggests freecalchub.com still has the OLD llms.txt format');
      console.log('   The locally generated file needs to be deployed to see new score');
    } else {
      console.log(`📌 Unexpected score: ${validation.score}/100`);
    }
    console.log('');

    console.log('🔍 ISSUES FOUND:');
    console.log('═══════════════════════════════════════════════════');
    if (validation.issues && validation.issues.length > 0) {
      validation.issues.forEach((issue: any, index: number) => {
        console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.suggestion) {
          console.log(`   💡 ${issue.suggestion}`);
        }
      });
    } else {
      console.log('No issues found! ✨');
    }
    console.log('');

    console.log('💡 RECOMMENDATIONS:');
    console.log('═══════════════════════════════════════════════════');
    if (validation.recommendations && validation.recommendations.length > 0) {
      validation.recommendations.forEach((rec: any, index: number) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`   ${rec.description}`);
      });
    } else {
      console.log('No recommendations! Perfect score! 🎯');
    }
    console.log('');

    if (validation.robotsConflicts && validation.robotsConflicts.length > 0) {
      console.log('🤖 ROBOTS.TXT CONFLICTS:');
      console.log('═══════════════════════════════════════════════════');
      validation.robotsConflicts.forEach((conflict: any, index: number) => {
        console.log(`${index + 1}. ${conflict.conflict}`);
        console.log(`   Rule: ${conflict.rule}`);
        console.log(`   Path: ${conflict.llmsTxtPath}`);
        console.log(`   💡 ${conflict.recommendation}`);
      });
    }

    console.log('\n📋 FULL RESPONSE:');
    console.log('═══════════════════════════════════════════════════');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.log('❌ REQUEST FAILED');
    console.log(error);
  }
}

validateNewFormat();
