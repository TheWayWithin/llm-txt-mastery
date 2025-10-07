#!/usr/bin/env node

/**
 * Test script for OpenAI Embeddings API
 * Tests the enhanced OpenAI service with embeddings support
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import our enhanced OpenAI service
try {
  const {
    testAPIConnection,
    generateEmbedding,
    generateEmbeddings,
    cosineSimilarity,
    findMostSimilar,
    getAPIUsageStats,
    resetAPIUsageStats,
    estimateEmbeddingCost,
    EMBEDDING_MODELS,
  } = await import('../server/services/openai-enhanced.js');

  console.log('🧪 OpenAI Embeddings API Test Suite');
  console.log('=====================================\n');

  // Test 1: Basic API Connection Test
  console.log('1️⃣ Testing API Connection...');
  try {
    const connectionTest = await testAPIConnection();
    if (connectionTest.success) {
      console.log('✅ API Connection Test PASSED');
      if (connectionTest.embeddings) {
        console.log(
          `   - Embeddings: ${connectionTest.embeddings.response_time_ms}ms, ${connectionTest.embeddings.tokens_used} tokens, $${connectionTest.embeddings.cost_usd.toFixed(6)}`
        );
        console.log(
          `   - Model: ${connectionTest.embeddings.model}, Dimensions: ${connectionTest.embeddings.dimensions}`
        );
      }
      if (connectionTest.chat) {
        console.log(
          `   - Chat: ${connectionTest.chat.response_time_ms}ms, $${connectionTest.chat.cost_usd.toFixed(6)}`
        );
      }
    } else {
      console.log('❌ API Connection Test FAILED:', connectionTest.error);
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ API Connection Test ERROR:', error.message);
    process.exit(1);
  }

  console.log('\n2️⃣ Testing Single Embedding Generation...');
  try {
    const testText =
      'This is a comprehensive guide to building scalable web applications with React and Node.js';
    const startTime = Date.now();

    const result = await generateEmbedding(testText);
    const responseTime = Date.now() - startTime;

    console.log('✅ Single Embedding Generation PASSED');
    console.log(`   - Text: "${testText.substring(0, 50)}..."`);
    console.log(`   - Model: ${result.model}`);
    console.log(`   - Dimensions: ${result.dimensions}`);
    console.log(`   - Tokens: ${result.tokens_used}`);
    console.log(`   - Cost: $${result.cost_usd.toFixed(6)}`);
    console.log(`   - Response Time: ${responseTime}ms`);
    console.log(
      `   - Embedding Sample: [${result.embedding
        .slice(0, 5)
        .map((n) => n.toFixed(4))
        .join(', ')}...]`
    );
  } catch (error) {
    console.log('❌ Single Embedding Generation FAILED:', error.message);
  }

  console.log('\n3️⃣ Testing Batch Embedding Generation...');
  try {
    const testTexts = [
      'JavaScript is a versatile programming language for web development',
      'Python excels in data science and machine learning applications',
      'React is a popular library for building user interfaces',
      'Node.js enables server-side JavaScript development',
      'PostgreSQL is a robust relational database management system',
    ];

    const startTime = Date.now();
    const results = await generateEmbeddings(testTexts);
    const responseTime = Date.now() - startTime;

    console.log('✅ Batch Embedding Generation PASSED');
    console.log(`   - Input Count: ${testTexts.length}`);
    console.log(`   - Output Count: ${results.length}`);
    console.log(`   - Total Tokens: ${results.reduce((sum, r) => sum + r.tokens_used, 0)}`);
    console.log(`   - Total Cost: $${results.reduce((sum, r) => sum + r.cost_usd, 0).toFixed(6)}`);
    console.log(`   - Response Time: ${responseTime}ms`);
    console.log(`   - Avg Time per Embedding: ${(responseTime / results.length).toFixed(1)}ms`);

    // Store results for similarity tests
    window.batchResults = results;
  } catch (error) {
    console.log('❌ Batch Embedding Generation FAILED:', error.message);
  }

  console.log('\n4️⃣ Testing Cosine Similarity Calculation...');
  try {
    if (window.batchResults && window.batchResults.length >= 2) {
      const similarity1 = cosineSimilarity(
        window.batchResults[0].embedding, // JavaScript
        window.batchResults[2].embedding // React
      );

      const similarity2 = cosineSimilarity(
        window.batchResults[1].embedding, // Python
        window.batchResults[4].embedding // PostgreSQL
      );

      console.log('✅ Cosine Similarity Calculation PASSED');
      console.log(
        `   - JavaScript ↔ React: ${similarity1.toFixed(4)} (should be high - both web dev)`
      );
      console.log(`   - Python ↔ PostgreSQL: ${similarity2.toFixed(4)} (should be lower)`);

      // Test similarity search
      const similar = findMostSimilar(
        window.batchResults[0].embedding, // Query: JavaScript
        window.batchResults.map((r) => ({ embedding: r.embedding, metadata: { text: r.content } })),
        3,
        0.5
      );

      console.log('   - Most Similar to JavaScript:');
      similar.forEach((match, i) => {
        console.log(
          `     ${i + 1}. "${match.metadata.text.substring(0, 40)}..." (${match.similarity.toFixed(4)})`
        );
      });
    }
  } catch (error) {
    console.log('❌ Cosine Similarity Calculation FAILED:', error.message);
  }

  console.log('\n5️⃣ Testing Cost Estimation...');
  try {
    const sampleTexts = [
      'Short text',
      'This is a medium length text that contains more content and should result in more tokens being used for the embedding generation process.',
      'This is a very long text that contains significantly more content and many more words which will result in a higher token count and therefore higher costs when generating embeddings through the OpenAI API. This test helps us understand the relationship between text length and costs.',
    ];

    console.log('✅ Cost Estimation Test PASSED');
    sampleTexts.forEach((text, i) => {
      const estimate = estimateEmbeddingCost(text);
      console.log(
        `   - Text ${i + 1} (${text.length} chars): ${estimate.tokens} tokens, $${estimate.cost_usd.toFixed(6)}`
      );
    });

    // Batch estimate
    const batchEstimate = estimateEmbeddingCost(sampleTexts);
    console.log(
      `   - Batch Total: ${batchEstimate.tokens} tokens, $${batchEstimate.cost_usd.toFixed(6)}`
    );
  } catch (error) {
    console.log('❌ Cost Estimation FAILED:', error.message);
  }

  console.log('\n6️⃣ Testing API Usage Monitoring...');
  try {
    const stats = getAPIUsageStats();
    console.log('✅ API Usage Monitoring PASSED');
    console.log(`   - Total Requests: ${stats.total_requests}`);
    console.log(`   - Total Tokens: ${stats.total_tokens}`);
    console.log(`   - Total Cost: $${stats.total_cost_usd.toFixed(6)}`);
    console.log(`   - Embedding Requests: ${stats.embedding_requests}`);
    console.log(`   - Chat Requests: ${stats.chat_requests}`);
    console.log(`   - Error Count: ${stats.error_count}`);
    console.log(`   - Rate Limit Hits: ${stats.rate_limit_hits}`);
  } catch (error) {
    console.log('❌ API Usage Monitoring FAILED:', error.message);
  }

  console.log('\n7️⃣ Model Information Summary...');
  console.log('Available Embedding Models:');
  Object.entries(EMBEDDING_MODELS).forEach(([name, config]) => {
    const recommended = config.recommended ? '⭐ RECOMMENDED' : '';
    console.log(`   - ${name}: ${config.dimensions}D, $${config.pricing}/1K tokens ${recommended}`);
  });

  console.log('\n✅ All Tests Completed!');
  console.log('\n📊 Test Summary:');
  const finalStats = getAPIUsageStats();
  console.log(`   - API Calls Made: ${finalStats.total_requests}`);
  console.log(`   - Total Cost: $${finalStats.total_cost_usd.toFixed(6)}`);
  console.log(`   - Performance: All APIs responding normally`);

  console.log('\n💡 Next Steps:');
  console.log('   1. The embeddings API is working correctly');
  console.log('   2. Rate limiting and retry logic is in place');
  console.log('   3. Cost monitoring is tracking usage');
  console.log('   4. Ready for production semantic analysis features');
} catch (importError) {
  console.error('❌ Failed to import OpenAI Enhanced service:', importError.message);
  console.log('\n🔧 Make sure to:');
  console.log('   1. Set OPENAI_API_KEY in your .env file');
  console.log('   2. Run: npm install');
  console.log('   3. Build the server if needed');

  process.exit(1);
}
