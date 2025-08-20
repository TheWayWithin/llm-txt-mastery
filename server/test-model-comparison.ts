import OpenAI from "openai";
import * as cheerio from "cheerio";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ OPENAI_API_KEY not set in environment");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

// Test content - a sample web page
const testContent = `
<html>
<head>
  <title>Understanding Machine Learning Fundamentals</title>
  <meta name="description" content="A comprehensive guide to machine learning basics, algorithms, and applications">
</head>
<body>
  <h1>Machine Learning Fundamentals</h1>
  <p>Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. This guide covers the essential concepts, algorithms, and real-world applications of ML.</p>
  
  <h2>Core Concepts</h2>
  <p>At its heart, machine learning involves teaching computers to recognize patterns in data. There are three main types: supervised learning (learning from labeled examples), unsupervised learning (finding hidden patterns), and reinforcement learning (learning through trial and error).</p>
  
  <h2>Popular Algorithms</h2>
  <ul>
    <li>Linear Regression - Predicting continuous values</li>
    <li>Decision Trees - Making decisions based on features</li>
    <li>Neural Networks - Complex pattern recognition</li>
    <li>Support Vector Machines - Classification and regression</li>
  </ul>
  
  <h2>Applications</h2>
  <p>Machine learning powers many modern technologies including recommendation systems (Netflix, Amazon), voice assistants (Siri, Alexa), autonomous vehicles, medical diagnosis, and financial fraud detection.</p>
</body>
</html>
`;

async function testModel(modelName: string, htmlContent: string): Promise<{
  model: string;
  result: any;
  tokens: { input: number; output: number };
  cost: { input: number; output: number; total: number };
  time: number;
}> {
  const startTime = Date.now();
  
  const $ = cheerio.load(htmlContent);
  const title = $('title').text() || 'Untitled';
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 1500);
  
  const prompt = `Analyze this web page content and provide:
1. A concise title (max 100 chars)
2. A descriptive summary (200-300 chars) suitable for llms.txt
3. Quality score (1-10) based on content value for AI/LLM understanding
4. Primary category (e.g., Documentation, Tutorial, Reference, Blog, Product)
5. Relevance score (1-10) for AI/developer audience

Page Title: ${title}
Meta Description: ${metaDescription}
Content: ${bodyText}

Respond in JSON format: {"title": "", "description": "", "qualityScore": 0, "category": "", "relevance": 0}`;

  try {
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing web content for LLM training data quality. Respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };
    
    // Calculate costs based on model pricing
    let inputCost = 0;
    let outputCost = 0;
    
    if (modelName === "gpt-4o") {
      // GPT-4o pricing: $2.50/1M input, $10.00/1M output
      inputCost = (usage.prompt_tokens / 1_000_000) * 2.50;
      outputCost = (usage.completion_tokens / 1_000_000) * 10.00;
    } else if (modelName === "gpt-4o-mini") {
      // GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output
      inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
      outputCost = (usage.completion_tokens / 1_000_000) * 0.60;
    } else if (modelName === "gpt-3.5-turbo") {
      // GPT-3.5-turbo pricing: $0.50/1M input, $1.50/1M output
      inputCost = (usage.prompt_tokens / 1_000_000) * 0.50;
      outputCost = (usage.completion_tokens / 1_000_000) * 1.50;
    }
    
    return {
      model: modelName,
      result,
      tokens: {
        input: usage.prompt_tokens,
        output: usage.completion_tokens
      },
      cost: {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost
      },
      time: Date.now() - startTime
    };
  } catch (error) {
    console.error(`Error testing ${modelName}:`, error);
    throw error;
  }
}

async function runComparison() {
  console.log("🔬 OpenAI Model Comparison Test");
  console.log("================================\n");
  
  const models = [
    "gpt-4o",        // Current model (most expensive, highest quality)
    "gpt-4o-mini",   // Cheaper alternative (16x cheaper than gpt-4o)
    "gpt-3.5-turbo"  // Legacy option (cheapest, lower quality)
  ];
  
  const results = [];
  
  for (const model of models) {
    console.log(`Testing ${model}...`);
    try {
      const result = await testModel(model, testContent);
      results.push(result);
      console.log(`✅ ${model} completed in ${result.time}ms\n`);
    } catch (error) {
      console.log(`❌ ${model} failed: ${error.message}\n`);
    }
  }
  
  // Display comparison results
  console.log("\n📊 RESULTS COMPARISON");
  console.log("====================\n");
  
  for (const result of results) {
    console.log(`Model: ${result.model}`);
    console.log(`-----------------`);
    console.log("Output:", JSON.stringify(result.result, null, 2));
    console.log(`Tokens: ${result.tokens.input} input, ${result.tokens.output} output`);
    console.log(`Cost: $${result.cost.total.toFixed(6)} ($${result.cost.input.toFixed(6)} input + $${result.cost.output.toFixed(6)} output)`);
    console.log(`Speed: ${result.time}ms`);
    console.log();
  }
  
  // Cost comparison for 1000 pages
  console.log("\n💰 COST PROJECTION (1000 pages)");
  console.log("================================");
  for (const result of results) {
    const cost1000 = result.cost.total * 1000;
    console.log(`${result.model}: $${cost1000.toFixed(2)}`);
  }
  
  // Savings calculation
  if (results.length >= 2) {
    const gpt4oCost = results.find(r => r.model === "gpt-4o")?.cost.total || 0;
    const gpt4oMiniCost = results.find(r => r.model === "gpt-4o-mini")?.cost.total || 0;
    const savings = ((gpt4oCost - gpt4oMiniCost) / gpt4oCost * 100).toFixed(1);
    console.log(`\n💡 Switching from gpt-4o to gpt-4o-mini would save ${savings}% on API costs`);
  }
}

// Run the comparison
runComparison().catch(console.error);