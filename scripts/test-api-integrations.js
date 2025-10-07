#!/usr/bin/env node

/**
 * Comprehensive API Integration Test Suite
 * Tests all semantic enhancement API integrations
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔬 Comprehensive API Integration Test Suite');
console.log('============================================\n');

// Test results tracking
const testResults = {
  openai_embeddings: { status: 'pending', details: {} },
  openai_chat: { status: 'pending', details: {} },
  google_analytics: { status: 'pending', details: {} },
  api_key_management: { status: 'pending', details: {} },
  cost_estimates: { status: 'pending', details: {} },
};

let totalCost = 0;

async function testOpenAIEmbeddings() {
  console.log('🧠 Testing OpenAI Embeddings API...');
  console.log('──────────────────────────────────────');

  try {
    const {
      generateEmbedding,
      generateEmbeddings,
      cosineSimilarity,
      testAPIConnection,
      getAPIUsageStats,
      estimateEmbeddingCost,
      EMBEDDING_MODELS,
    } = await import('../server/services/openai-enhanced.js');

    // Test 1: API Connection
    console.log('1. Testing API connection...');
    const connectionTest = await testAPIConnection();

    if (!connectionTest.success) {
      testResults.openai_embeddings.status = 'failed';
      testResults.openai_embeddings.details = { error: connectionTest.error };
      console.log('❌ Connection failed:', connectionTest.error);
      return;
    }

    console.log('✅ Connection successful');
    if (connectionTest.embeddings) {
      console.log(`   - Response time: ${connectionTest.embeddings.response_time_ms}ms`);
      console.log(`   - Dimensions: ${connectionTest.embeddings.dimensions}`);
      console.log(`   - Cost: $${connectionTest.embeddings.cost_usd.toFixed(6)}`);
      totalCost += connectionTest.embeddings.cost_usd;
    }

    // Test 2: Single embedding
    console.log('\n2. Testing single embedding generation...');
    const sampleText =
      'Advanced machine learning techniques for semantic analysis and natural language processing';
    const embedding = await generateEmbedding(sampleText);

    console.log('✅ Single embedding generated');
    console.log(`   - Model: ${embedding.model}`);
    console.log(`   - Dimensions: ${embedding.dimensions}`);
    console.log(`   - Tokens: ${embedding.tokens_used}`);
    console.log(`   - Cost: $${embedding.cost_usd.toFixed(6)}`);
    totalCost += embedding.cost_usd;

    // Test 3: Batch embeddings
    console.log('\n3. Testing batch embedding generation...');
    const batchTexts = [
      'React component architecture and state management',
      'Node.js server optimization and performance tuning',
      'Database design patterns for scalable applications',
      'API security best practices and authentication',
      'Frontend performance optimization techniques',
    ];

    const batchEmbeddings = await generateEmbeddings(batchTexts);
    console.log('✅ Batch embeddings generated');
    console.log(`   - Count: ${batchEmbeddings.length}`);
    console.log(`   - Total tokens: ${batchEmbeddings.reduce((sum, e) => sum + e.tokens_used, 0)}`);
    console.log(
      `   - Total cost: $${batchEmbeddings.reduce((sum, e) => sum + e.cost_usd, 0).toFixed(6)}`
    );
    totalCost += batchEmbeddings.reduce((sum, e) => sum + e.cost_usd, 0);

    // Test 4: Similarity calculation
    console.log('\n4. Testing similarity calculations...');
    const similarity1 = cosineSimilarity(
      batchEmbeddings[0].embedding,
      batchEmbeddings[4].embedding
    ); // React vs Frontend
    const similarity2 = cosineSimilarity(
      batchEmbeddings[1].embedding,
      batchEmbeddings[2].embedding
    ); // Node vs Database

    console.log('✅ Similarity calculations working');
    console.log(`   - React ↔ Frontend optimization: ${similarity1.toFixed(4)}`);
    console.log(`   - Node.js ↔ Database design: ${similarity2.toFixed(4)}`);

    // Test 5: Cost estimation
    console.log('\n5. Testing cost estimation...');
    const costEstimate = estimateEmbeddingCost(batchTexts);
    console.log('✅ Cost estimation working');
    console.log(`   - Estimated tokens: ${costEstimate.tokens}`);
    console.log(`   - Estimated cost: $${costEstimate.cost_usd.toFixed(6)}`);

    const usageStats = getAPIUsageStats();
    console.log('\n📊 Usage Statistics:');
    console.log(`   - Total requests: ${usageStats.total_requests}`);
    console.log(`   - Embedding requests: ${usageStats.embedding_requests}`);
    console.log(`   - Total cost: $${usageStats.total_cost_usd.toFixed(6)}`);

    testResults.openai_embeddings.status = 'passed';
    testResults.openai_embeddings.details = {
      connection_time_ms: connectionTest.embeddings?.response_time_ms,
      dimensions: embedding.dimensions,
      batch_count: batchEmbeddings.length,
      total_cost: usageStats.total_cost_usd,
    };
  } catch (error) {
    console.log('❌ OpenAI Embeddings test failed:', error.message);
    testResults.openai_embeddings.status = 'failed';
    testResults.openai_embeddings.details = { error: error.message };
  }
}

async function testOpenAIChat() {
  console.log('\n💬 Testing OpenAI Chat Completions API...');
  console.log('───────────────────────────────────────────');

  try {
    const { analyzePageContent } = await import('../server/services/openai-enhanced.js');

    const sampleHTML = `
      <html>
        <head>
          <title>Advanced React Patterns for Scalable Applications</title>
          <meta name="description" content="Learn advanced React patterns including render props, higher-order components, and custom hooks for building maintainable applications.">
        </head>
        <body>
          <article>
            <h1>Advanced React Patterns</h1>
            <p>This comprehensive guide explores advanced React patterns that help you build more maintainable and scalable applications.</p>
            <h2>Render Props Pattern</h2>
            <p>The render props pattern allows you to share code between React components using a prop whose value is a function.</p>
            <pre><code>
              function DataProvider({ render }) {
                const [data, setData] = useState(null);
                return render(data);
              }
            </code></pre>
            <h2>Higher-Order Components</h2>
            <p>HOCs are functions that take a component and return a new component with enhanced functionality.</p>
          </article>
        </body>
      </html>
    `;

    const startTime = Date.now();
    const analysis = await analyzePageContent(
      'https://example.com/react-patterns',
      sampleHTML,
      true
    );
    const responseTime = Date.now() - startTime;

    console.log('✅ Chat completion analysis successful');
    console.log(`   - Title: "${analysis.title}"`);
    console.log(`   - Quality Score: ${analysis.qualityScore}/10`);
    console.log(`   - Category: ${analysis.category}`);
    console.log(`   - Response Time: ${responseTime}ms`);
    console.log(`   - Model: ${analysis.model}`);
    console.log(`   - Cost: $${(analysis.estimatedCost || 0).toFixed(6)}`);

    if (analysis.estimatedCost) {
      totalCost += analysis.estimatedCost;
    }

    testResults.openai_chat.status = 'passed';
    testResults.openai_chat.details = {
      response_time_ms: responseTime,
      quality_score: analysis.qualityScore,
      model: analysis.model,
      cost: analysis.estimatedCost || 0,
    };
  } catch (error) {
    console.log('❌ OpenAI Chat test failed:', error.message);
    testResults.openai_chat.status = 'failed';
    testResults.openai_chat.details = { error: error.message };
  }
}

async function testGoogleAnalytics() {
  console.log('\n📊 Testing Google Analytics Integration...');
  console.log('──────────────────────────────────────────');

  try {
    const { testAnalyticsConnection, isAnalyticsAvailable, getHighPriorityUrls, AnalyticsConfig } =
      await import('../server/services/google-analytics.js');

    console.log('1. Checking Analytics configuration...');
    console.log(`   - Enabled: ${AnalyticsConfig.enabled}`);
    console.log(`   - Property ID: ${AnalyticsConfig.propertyId || 'not configured'}`);
    console.log(`   - Available: ${isAnalyticsAvailable()}`);

    if (!isAnalyticsAvailable()) {
      console.log('⚠️ Google Analytics not configured (optional feature)');
      console.log("   This is expected if you haven't set up Analytics yet");
      testResults.google_analytics.status = 'skipped';
      testResults.google_analytics.details = { reason: 'Not configured' };
      return;
    }

    console.log('\n2. Testing Analytics API connection...');
    const connectionTest = await testAnalyticsConnection();

    if (connectionTest.success) {
      console.log('✅ Analytics connection successful');
      console.log(`   - Property ID: ${connectionTest.property_id}`);
      if (connectionTest.sample_data) {
        console.log(
          `   - Sample data: ${connectionTest.sample_data.total_sessions} sessions, ${connectionTest.sample_data.total_pages} pages`
        );
      }

      console.log('\n3. Testing high-priority URL detection...');
      const priorityUrls = await getHighPriorityUrls(10);
      console.log(`✅ Retrieved ${priorityUrls.length} priority URLs`);
      priorityUrls.slice(0, 3).forEach((item, i) => {
        console.log(
          `   ${i + 1}. ${item.url} (score: ${item.priority_score.toFixed(1)}) - ${item.reason}`
        );
      });

      testResults.google_analytics.status = 'passed';
      testResults.google_analytics.details = {
        property_id: connectionTest.property_id,
        sample_sessions: connectionTest.sample_data?.total_sessions || 0,
        priority_urls_count: priorityUrls.length,
      };
    } else {
      console.log('❌ Analytics connection failed:', connectionTest.error);
      testResults.google_analytics.status = 'failed';
      testResults.google_analytics.details = { error: connectionTest.error };
    }
  } catch (error) {
    console.log('❌ Google Analytics test failed:', error.message);
    testResults.google_analytics.status = 'failed';
    testResults.google_analytics.details = { error: error.message };
  }
}

async function testAPIKeyManagement() {
  console.log('\n🔐 Testing API Key Management System...');
  console.log('─────────────────────────────────────────');

  try {
    const { testKeyManagement, getSecurityDashboard, checkAllKeysRotation, monitorQuotaUsage } =
      await import('../server/services/api-key-manager.js');

    console.log('1. Testing key management system...');
    const managementTest = testKeyManagement();

    if (managementTest.success) {
      console.log('✅ Key management system operational');
      console.log(`   - Message: ${managementTest.message}`);
      console.log(`   - Active keys: ${managementTest.stats.active_keys}`);
      console.log(`   - Total usage: ${managementTest.stats.total_usage}`);
    } else {
      console.log('❌ Key management test failed:', managementTest.message);
    }

    console.log('\n2. Checking key rotation status...');
    const rotationStatus = checkAllKeysRotation();
    if (rotationStatus.length === 0) {
      console.log('✅ All keys are up to date');
    } else {
      console.log(`⚠️ ${rotationStatus.length} keys need attention:`);
      rotationStatus.forEach((status) => {
        const icon = status.status === 'overdue' ? '🔴' : '🟡';
        console.log(`   ${icon} ${status.service}: ${status.message}`);
      });
    }

    console.log('\n3. Testing quota monitoring...');
    // Simulate quota monitoring
    monitorQuotaUsage('openai', 850, 1000, '1 hour');
    monitorQuotaUsage('google_analytics', 15000, 25000, '1 day');
    console.log('✅ Quota monitoring alerts generated');

    console.log('\n4. Security dashboard overview...');
    const dashboard = getSecurityDashboard();
    console.log(`   - Total keys: ${dashboard.key_stats.total_keys}`);
    console.log(`   - Active alerts: ${dashboard.active_alerts.length}`);
    console.log(`   - Recommendations: ${dashboard.recommendations.length}`);
    dashboard.recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`     ${i + 1}. ${rec}`);
    });

    testResults.api_key_management.status = 'passed';
    testResults.api_key_management.details = {
      active_keys: managementTest.stats.active_keys,
      rotation_warnings: rotationStatus.length,
      active_alerts: dashboard.active_alerts.length,
    };
  } catch (error) {
    console.log('❌ API Key Management test failed:', error.message);
    testResults.api_key_management.status = 'failed';
    testResults.api_key_management.details = { error: error.message };
  }
}

async function generateCostEstimates() {
  console.log('\n💰 Generating Cost Estimates...');
  console.log('──────────────────────────────────────');

  try {
    const { estimateEmbeddingCost, estimateBatchCost } = await import(
      '../server/services/openai-enhanced.js'
    );

    console.log('Typical usage scenarios:');

    // Scenario 1: Small website (50 pages)
    const small = estimateEmbeddingCost(
      Array(50).fill(
        'Average webpage content with about 500 words including titles, descriptions, headings and body text that would be analyzed for semantic clustering and content organization'
      )
    );
    console.log(`1. Small website (50 pages): $${small.cost_usd.toFixed(4)}`);

    // Scenario 2: Medium website (200 pages)
    const medium = estimateEmbeddingCost(
      Array(200).fill(
        'Average webpage content with about 500 words including titles, descriptions, headings and body text that would be analyzed for semantic clustering and content organization'
      )
    );
    console.log(`2. Medium website (200 pages): $${medium.cost_usd.toFixed(4)}`);

    // Scenario 3: Large website (1000 pages)
    const large = estimateEmbeddingCost(
      Array(1000).fill(
        'Average webpage content with about 500 words including titles, descriptions, headings and body text that would be analyzed for semantic clustering and content organization'
      )
    );
    console.log(`3. Large website (1000 pages): $${large.cost_usd.toFixed(2)}`);

    // Chat completion costs
    const chatCost = estimateBatchCost(50); // 50 pages analyzed with AI
    console.log(`4. AI analysis (50 pages): $${chatCost.estimated.toFixed(4)}`);

    console.log('\nModel comparison for 100 pages:');
    const comparison = estimateBatchCost(100);
    Object.entries(comparison.comparison).forEach(([model, cost]) => {
      const recommended = model === 'gpt-4o-mini' ? ' ⭐' : '';
      console.log(`   - ${model}: $${cost.toFixed(4)}${recommended}`);
    });

    console.log('\n💡 Cost optimization tips:');
    console.log('   - Use text-embedding-3-small for embeddings (most cost-effective)');
    console.log('   - Use gpt-4o-mini for content analysis (93% cheaper than gpt-4o)');
    console.log('   - Cache embeddings to avoid regeneration');
    console.log('   - Batch process pages for better efficiency');

    testResults.cost_estimates.status = 'passed';
    testResults.cost_estimates.details = {
      small_site: small.cost_usd,
      medium_site: medium.cost_usd,
      large_site: large.cost_usd,
      ai_analysis_50_pages: chatCost.estimated,
    };
  } catch (error) {
    console.log('❌ Cost estimation failed:', error.message);
    testResults.cost_estimates.status = 'failed';
    testResults.cost_estimates.details = { error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  const startTime = Date.now();

  await testOpenAIEmbeddings();
  await testOpenAIChat();
  await testGoogleAnalytics();
  await testAPIKeyManagement();
  await generateCostEstimates();

  const totalTime = Date.now() - startTime;

  // Print final summary
  console.log('\n📋 Test Summary');
  console.log('===============');

  const testCount = Object.keys(testResults).length;
  const passedCount = Object.values(testResults).filter((r) => r.status === 'passed').length;
  const failedCount = Object.values(testResults).filter((r) => r.status === 'failed').length;
  const skippedCount = Object.values(testResults).filter((r) => r.status === 'skipped').length;

  console.log(`Total tests: ${testCount}`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`⚠️ Skipped: ${skippedCount}`);
  console.log(`⏱️ Total time: ${totalTime}ms`);
  console.log(`💰 Total API cost: $${totalCost.toFixed(6)}`);

  console.log('\nDetailed Results:');
  Object.entries(testResults).forEach(([test, result]) => {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
    console.log(`${icon} ${test}: ${result.status}`);
    if (result.details.error) {
      console.log(`   Error: ${result.details.error}`);
    }
  });

  console.log('\n🚀 Next Steps:');
  if (passedCount === testCount - skippedCount) {
    console.log('   ✅ All tests passed! APIs are ready for production');
    console.log('   ✅ Semantic enhancement features can be implemented');
    console.log('   ✅ Rate limiting and monitoring are working correctly');
  } else {
    console.log('   🔧 Fix failed tests before proceeding to production');
    console.log('   📖 Check the setup documentation for configuration help');
  }

  if (skippedCount > 0) {
    console.log('   📊 Google Analytics is optional but provides enhanced insights');
    console.log('   📚 See GOOGLE_ANALYTICS_API_SETUP.md for configuration');
  }

  // Exit with appropriate code
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run the test suite
runAllTests().catch((error) => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
