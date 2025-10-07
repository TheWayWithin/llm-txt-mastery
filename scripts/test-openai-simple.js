#!/usr/bin/env node

/**
 * Simple OpenAI API Test
 * Tests basic OpenAI integration and provides cost estimates
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Simple OpenAI API Test');
console.log('=========================\n');

// Check environment configuration
console.log('1️⃣ Environment Configuration');
console.log('API Key configured:', process.env.OPENAI_API_KEY ? '✅ Yes' : '❌ No');
console.log(
  'Embedding model:',
  process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small (default)'
);
console.log('Dimensions:', process.env.EMBEDDING_DIMENSIONS || '1536 (default)');

if (!process.env.OPENAI_API_KEY) {
  console.log('\n❌ OPENAI_API_KEY not configured');
  console.log('   Set your OpenAI API key in .env file');
  console.log('   OPENAI_API_KEY=your_api_key_here');
  process.exit(1);
}

// Test with direct OpenAI client
console.log('\n2️⃣ Testing OpenAI Client');
try {
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log('✅ OpenAI client initialized');

  // Test embeddings API
  console.log('\n3️⃣ Testing Embeddings API');
  const testText = 'This is a test to verify OpenAI embeddings API functionality';

  console.log('Making embeddings API call...');
  const startTime = Date.now();

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: testText,
    dimensions: 1536,
  });

  const responseTime = Date.now() - startTime;
  const embedding = response.data[0];
  const usage = response.usage;

  console.log('✅ Embeddings API successful!');
  console.log(`   - Model: ${response.model}`);
  console.log(`   - Dimensions: ${embedding.embedding.length}`);
  console.log(`   - Tokens used: ${usage.total_tokens}`);
  console.log(`   - Response time: ${responseTime}ms`);
  console.log(
    `   - Embedding sample: [${embedding.embedding
      .slice(0, 3)
      .map((n) => n.toFixed(4))
      .join(', ')}...]`
  );

  // Calculate cost
  const costPerToken = 0.00002 / 1000; // $0.00002 per 1K tokens
  const cost = usage.total_tokens * costPerToken;
  console.log(`   - Cost: $${cost.toFixed(6)}`);

  // Test chat completions API
  console.log('\n4️⃣ Testing Chat Completions API');

  const chatStartTime = Date.now();
  const chatResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content:
          'Analyze this text for quality (1-10): "' +
          testText +
          '". Respond with JSON: {"score": 8, "reason": "clear and concise"}',
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 100,
  });

  const chatResponseTime = Date.now() - chatStartTime;
  const chatUsage = chatResponse.usage;
  const chatResult = JSON.parse(chatResponse.choices[0].message.content || '{}');

  console.log('✅ Chat completions API successful!');
  console.log(`   - Model: ${chatResponse.model}`);
  console.log(`   - Input tokens: ${chatUsage?.prompt_tokens || 0}`);
  console.log(`   - Output tokens: ${chatUsage?.completion_tokens || 0}`);
  console.log(`   - Response time: ${chatResponseTime}ms`);
  console.log(`   - Analysis result: Quality score ${chatResult.score}/10`);

  // Calculate chat cost (gpt-4o-mini pricing)
  const inputCostPerToken = 0.00015 / 1000; // $0.00015 per 1K input tokens
  const outputCostPerToken = 0.0006 / 1000; // $0.0006 per 1K output tokens
  const chatCost =
    (chatUsage?.prompt_tokens || 0) * inputCostPerToken +
    (chatUsage?.completion_tokens || 0) * outputCostPerToken;
  console.log(`   - Cost: $${chatCost.toFixed(6)}`);

  // Generate cost estimates
  console.log('\n5️⃣ Cost Estimates for Semantic Enhancement');
  console.log('Typical scenarios:');

  const avgTokensPerPage = 100; // Conservative estimate for title + description
  const scenarios = [
    { name: 'Small site (50 pages)', pages: 50 },
    { name: 'Medium site (200 pages)', pages: 200 },
    { name: 'Large site (500 pages)', pages: 500 },
    { name: 'Enterprise site (1000 pages)', pages: 1000 },
  ];

  scenarios.forEach((scenario) => {
    const embeddingTokens = scenario.pages * avgTokensPerPage;
    const embeddingCost = embeddingTokens * costPerToken;

    // Assume 20% of pages get AI analysis (high-priority pages)
    const aiAnalysisPages = Math.ceil(scenario.pages * 0.2);
    const aiInputTokens = aiAnalysisPages * 150; // Estimated tokens per analysis
    const aiOutputTokens = aiAnalysisPages * 50;
    const aiCost = aiInputTokens * inputCostPerToken + aiOutputTokens * outputCostPerToken;

    const totalCost = embeddingCost + aiCost;

    console.log(
      `   - ${scenario.name}: $${totalCost.toFixed(4)} (embeddings: $${embeddingCost.toFixed(4)}, AI analysis: $${aiCost.toFixed(4)})`
    );
  });

  const totalTestCost = cost + chatCost;

  console.log('\n✅ All Tests Passed!');
  console.log(`Total test cost: $${totalTestCost.toFixed(6)}`);
  console.log('\n🚀 OpenAI APIs are ready for semantic enhancement features');
  console.log('💡 Key benefits:');
  console.log('   - text-embedding-3-small: Most cost-effective embeddings model');
  console.log('   - gpt-4o-mini: 93% cheaper than gpt-4o with similar quality');
  console.log('   - Smart caching will reduce actual costs significantly');
  console.log('   - Batch processing optimizes API usage');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);

  if (error.status === 401) {
    console.log('🔧 Authentication error - check your API key');
  } else if (error.status === 429) {
    console.log('🔧 Rate limit exceeded - try again in a moment');
  } else if (error.status === 403) {
    console.log('🔧 Permission denied - check your API access');
  }

  process.exit(1);
}
