import OpenAI from "openai";
import * as cheerio from "cheerio";

// Model configuration with pricing (as of Jan 2025)
export const OPENAI_MODELS = {
  "gpt-4o": {
    name: "gpt-4o",
    description: "Most capable, highest quality",
    pricing: { input: 2.50, output: 10.00 }, // per 1M tokens
    maxTokens: 128000,
    recommended: false
  },
  "gpt-4o-mini": {
    name: "gpt-4o-mini",
    description: "Best value, 93% cheaper than gpt-4o",
    pricing: { input: 0.15, output: 0.60 }, // per 1M tokens
    maxTokens: 128000,
    recommended: true // RECOMMENDED for production
  },
  "gpt-3.5-turbo": {
    name: "gpt-3.5-turbo",
    description: "Legacy model, being phased out",
    pricing: { input: 0.50, output: 1.50 }, // per 1M tokens
    maxTokens: 16385,
    recommended: false
  }
};

// Get model from environment or use recommended default
const DEFAULT_MODEL = "gpt-4o-mini"; // Changed from gpt-4o for cost efficiency
const selectedModel = process.env.OPENAI_MODEL || DEFAULT_MODEL;

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

// Log configuration at startup
console.log('🤖 OpenAI Service Configuration:');
console.log(`  - API Key: ${apiKey ? 'Configured' : 'NOT SET'}`);
console.log(`  - Model: ${selectedModel}`);
if (OPENAI_MODELS[selectedModel]) {
  const model = OPENAI_MODELS[selectedModel];
  console.log(`  - Pricing: $${model.pricing.input}/1M input, $${model.pricing.output}/1M output`);
  console.log(`  - Recommended: ${model.recommended ? '✅ YES' : '❌ NO'}`);
}

export interface ContentAnalysisResult {
  title: string;
  description: string;
  qualityScore: number;
  category: string;
  relevance: number;
  model?: string; // Track which model was used
  estimatedCost?: number; // Track cost per analysis
}

export async function analyzePageContentWithModel(
  url: string, 
  htmlContent: string, 
  useAI: boolean = false,
  modelOverride?: string
): Promise<ContentAnalysisResult> {
  // Validate inputs
  if (!htmlContent || htmlContent.trim().length === 0) {
    throw new Error(`Empty HTML content received for ${url}`);
  }
  
  if (!url || !url.startsWith('http')) {
    throw new Error(`Invalid URL provided: ${url}`);
  }
  
  const model = modelOverride || selectedModel;
  
  console.log(`[AI Analysis] Processing ${url}:`);
  console.log(`  - Model: ${model}`);
  console.log(`  - Use AI: ${useAI}`);
  
  try {
    if (useAI && apiKey) {
      return await generateAIAnalysisWithModel(url, htmlContent, model);
    } else {
      return generateHTMLAnalysis(url, htmlContent);
    }
  } catch (error) {
    console.error(`Analysis failed for ${url}:`, error);
    return generateHTMLAnalysis(url, htmlContent);
  }
}

async function generateAIAnalysisWithModel(
  url: string, 
  htmlContent: string,
  model: string
): Promise<ContentAnalysisResult> {
  if (!openai) {
    throw new Error("OpenAI client not initialized");
  }

  const $ = cheerio.load(htmlContent);
  const title = $('title').text() || 'Untitled';
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const headings = $('h1, h2, h3').map((_, el) => $(el).text()).get().slice(0, 10).join(', ');
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const contentPreview = bodyText.substring(0, 2000);

  const prompt = `Analyze this web page and provide:
1. Title: Concise, descriptive title (max 100 chars)
2. Description: Clear summary for llms.txt (200-300 chars)
3. Quality Score (1-10): Based on content value for AI/LLM understanding
4. Category: One of: Documentation, Tutorial, API Reference, Blog Post, Product Page, Landing Page, About Page, Contact Page, Other
5. Relevance (1-10): How useful for developers/AI practitioners

Page URL: ${url}
Title: ${title}
Meta: ${metaDescription}
Headings: ${headings}
Content Preview: ${contentPreview}

Respond in JSON format with these exact keys: title, description, qualityScore, category, relevance`;

  try {
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are an expert at evaluating web content quality for LLM training data. Focus on technical accuracy, content depth, and usefulness for AI understanding. Respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const usage = response.usage;
    
    // Calculate cost
    let estimatedCost = 0;
    if (usage && OPENAI_MODELS[model]) {
      const pricing = OPENAI_MODELS[model].pricing;
      estimatedCost = (usage.prompt_tokens / 1_000_000) * pricing.input + 
                     (usage.completion_tokens / 1_000_000) * pricing.output;
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ AI analysis complete for ${url}`);
    console.log(`   - Model: ${model}`);
    console.log(`   - Tokens: ${usage?.prompt_tokens || 0} in, ${usage?.completion_tokens || 0} out`);
    console.log(`   - Cost: $${estimatedCost.toFixed(6)}`);
    console.log(`   - Time: ${processingTime}ms`);
    console.log(`   - Quality Score: ${result.qualityScore || 0}/10`);

    return {
      title: result.title || title,
      description: result.description || metaDescription || `Content from ${url}`,
      qualityScore: result.qualityScore || 5,
      category: result.category || 'Other',
      relevance: result.relevance || 5,
      model,
      estimatedCost
    };
  } catch (error) {
    console.error(`AI analysis error for ${url}:`, error);
    throw error;
  }
}

function generateHTMLAnalysis(url: string, htmlContent: string): ContentAnalysisResult {
  const $ = cheerio.load(htmlContent);
  
  const title = $('title').text() || 
                $('h1').first().text() || 
                $('meta[property="og:title"]').attr('content') || 
                'Untitled Page';
  
  const description = $('meta[name="description"]').attr('content') || 
                     $('meta[property="og:description"]').attr('content') ||
                     $('p').first().text().substring(0, 200) ||
                     `Content from ${url}`;
  
  // Basic quality scoring based on HTML structure
  let qualityScore = 5;
  if ($('h1').length > 0) qualityScore++;
  if ($('meta[name="description"]').length > 0) qualityScore++;
  if ($('article, main').length > 0) qualityScore++;
  if ($('code, pre').length > 0) qualityScore++;
  if ($('nav').length > 0) qualityScore--;
  
  qualityScore = Math.min(Math.max(qualityScore, 1), 10);
  
  // Detect category from HTML structure
  let category = 'Other';
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  if (urlLower.includes('/docs/') || urlLower.includes('/documentation/')) {
    category = 'Documentation';
  } else if (urlLower.includes('/api/') || titleLower.includes('api')) {
    category = 'API Reference';
  } else if (urlLower.includes('/blog/') || urlLower.includes('/posts/')) {
    category = 'Blog Post';
  } else if (urlLower.includes('/tutorial') || titleLower.includes('tutorial')) {
    category = 'Tutorial';
  } else if ($('.product, .pricing').length > 0) {
    category = 'Product Page';
  }
  
  return {
    title: title.substring(0, 100),
    description: description.substring(0, 300),
    qualityScore,
    category,
    relevance: qualityScore, // Use quality score as relevance for HTML extraction
    model: 'html-extraction',
    estimatedCost: 0
  };
}

// Export the enhanced function as the default
export const analyzePageContent = analyzePageContentWithModel;

// Utility function to estimate costs for batch processing
export function estimateBatchCost(pageCount: number, model: string = selectedModel): {
  estimated: number;
  breakdown: { input: number; output: number };
  comparison: Record<string, number>;
} {
  const avgTokensPerPage = { input: 400, output: 100 }; // Based on testing
  
  const modelPricing = OPENAI_MODELS[model]?.pricing || OPENAI_MODELS[DEFAULT_MODEL].pricing;
  
  const inputCost = (pageCount * avgTokensPerPage.input / 1_000_000) * modelPricing.input;
  const outputCost = (pageCount * avgTokensPerPage.output / 1_000_000) * modelPricing.output;
  
  // Compare with other models
  const comparison: Record<string, number> = {};
  for (const [modelName, config] of Object.entries(OPENAI_MODELS)) {
    const modelInput = (pageCount * avgTokensPerPage.input / 1_000_000) * config.pricing.input;
    const modelOutput = (pageCount * avgTokensPerPage.output / 1_000_000) * config.pricing.output;
    comparison[modelName] = modelInput + modelOutput;
  }
  
  return {
    estimated: inputCost + outputCost,
    breakdown: { input: inputCost, output: outputCost },
    comparison
  };
}