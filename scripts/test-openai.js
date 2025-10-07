#!/usr/bin/env node
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config({ path: '.env.production' });

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  console.log('🔍 Testing OpenAI API Key...');

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }

  if (!apiKey.startsWith('sk-')) {
    console.error('❌ Invalid API key format (should start with sk-)');
    process.exit(1);
  }

  try {
    const openai = new OpenAI({ apiKey });

    // Test with a simple completion
    console.log('📡 Making test API call...');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "API test successful"' }],
      max_tokens: 10,
    });

    console.log('✅ OpenAI API test successful!');
    console.log('📝 Response:', response.choices[0].message.content);
    console.log('💰 Usage:', response.usage);
  } catch (error) {
    console.error('❌ OpenAI API test failed:');
    console.error(error.message);

    if (error.status === 401) {
      console.error('🔑 Check your API key - it may be invalid or expired');
    } else if (error.status === 429) {
      console.error('⚡ Rate limited - check your usage limits');
    } else if (error.status === 402) {
      console.error('💳 Payment required - check your billing setup');
    }

    process.exit(1);
  }
}

testOpenAI();
