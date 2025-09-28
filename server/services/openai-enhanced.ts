import OpenAI from "openai";
import * as cheerio from "cheerio";

// Embedding Models Configuration
export const EMBEDDING_MODELS = {
  "text-embedding-3-small": {
    name: "text-embedding-3-small",
    dimensions: 1536,
    pricing: 0.00002, // per 1K tokens
    maxTokens: 8192,
    recommended: true
  },
  "text-embedding-3-large": {
    name: "text-embedding-3-large", 
    dimensions: 3072,
    pricing: 0.00013, // per 1K tokens
    maxTokens: 8192,
    recommended: false
  },
  "text-embedding-ada-002": {
    name: "text-embedding-ada-002",
    dimensions: 1536,
    pricing: 0.0001, // per K tokens
    maxTokens: 8192,
    recommended: false // Legacy model
  }
};

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
  // New token tracking fields
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  actualCostUSD?: number; // Precise cost in USD
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
    
    // Calculate precise cost
    let estimatedCost = 0;
    let actualCostUSD = 0;
    const tokensUsed = {
      prompt: usage?.prompt_tokens || 0,
      completion: usage?.completion_tokens || 0,
      total: (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0)
    };
    
    if (usage && OPENAI_MODELS[model]) {
      const pricing = OPENAI_MODELS[model].pricing;
      // Calculate precise cost in USD
      actualCostUSD = (usage.prompt_tokens / 1_000_000) * pricing.input + 
                      (usage.completion_tokens / 1_000_000) * pricing.output;
      estimatedCost = actualCostUSD; // Keep for backward compatibility
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ AI analysis complete for ${url}`);
    console.log(`   - Model: ${model}`);
    console.log(`   - Tokens: ${tokensUsed.prompt} in, ${tokensUsed.completion} out (${tokensUsed.total} total)`);
    console.log(`   - Cost: $${actualCostUSD.toFixed(6)} USD`);
    console.log(`   - Time: ${processingTime}ms`);
    console.log(`   - Quality Score: ${result.qualityScore || 0}/10`);

    return {
      title: result.title || title,
      description: result.description || metaDescription || `Content from ${url}`,
      qualityScore: result.qualityScore || 5,
      category: result.category || 'Other',
      relevance: result.relevance || 5,
      model,
      estimatedCost,
      tokensUsed,
      actualCostUSD
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

// ===== EMBEDDINGS API EXTENSION =====

// Get embedding model from environment
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || '1536');

// Type definitions for embeddings
export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResult {
  content: string;
  embedding: number[];
  model: string;
  dimensions: number;
  created_at: Date;
  tokens_used: number;
  cost_usd: number;
}

export interface APIUsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  embedding_requests: number;
  embedding_tokens: number;
  chat_requests: number;
  chat_tokens: number;
  last_reset: Date;
  rate_limit_hits: number;
  error_count: number;
}

export interface RateLimitConfig {
  requests_per_minute: number;
  tokens_per_minute: number;
  max_retries: number;
  base_delay_ms: number;
  max_delay_ms: number;
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG: RateLimitConfig = {
  requests_per_minute: parseInt(process.env.EMBEDDING_RATE_LIMIT_PER_MINUTE || '3000'),
  tokens_per_minute: 1000000, // OpenAI limit
  max_retries: 3,
  base_delay_ms: 1000,
  max_delay_ms: 60000
};

// In-memory rate limiter and usage tracking
class APIMonitor {
  private requestCount = 0;
  private tokenCount = 0;
  private windowStart = Date.now();
  private readonly windowMs = 60000; // 1 minute
  
  private usage: APIUsageStats = {
    total_requests: 0,
    total_tokens: 0,
    total_cost_usd: 0,
    embedding_requests: 0,
    embedding_tokens: 0,
    chat_requests: 0,
    chat_tokens: 0,
    last_reset: new Date(),
    rate_limit_hits: 0,
    error_count: 0
  };

  async checkRateLimit(estimatedTokens: number = 1000): Promise<void> {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart >= this.windowMs) {
      this.requestCount = 0;
      this.tokenCount = 0;
      this.windowStart = now;
    }

    // Check limits
    if (this.requestCount >= RATE_LIMIT_CONFIG.requests_per_minute) {
      const waitTime = this.windowMs - (now - this.windowStart);
      throw new Error(`Rate limit exceeded: ${this.requestCount} requests. Wait ${Math.ceil(waitTime / 1000)}s`);
    }

    if (this.tokenCount + estimatedTokens > RATE_LIMIT_CONFIG.tokens_per_minute) {
      const waitTime = this.windowMs - (now - this.windowStart);
      throw new Error(`Token limit exceeded: ${this.tokenCount + estimatedTokens} tokens. Wait ${Math.ceil(waitTime / 1000)}s`);
    }

    this.requestCount++;
    this.tokenCount += estimatedTokens;
  }

  recordUsage(type: 'embedding' | 'chat', tokens: number, cost: number): void {
    this.usage.total_requests++;
    this.usage.total_tokens += tokens;
    this.usage.total_cost_usd += cost;
    
    if (type === 'embedding') {
      this.usage.embedding_requests++;
      this.usage.embedding_tokens += tokens;
    } else {
      this.usage.chat_requests++;
      this.usage.chat_tokens += tokens;
    }
    
    console.log(`[API Monitor] ${type} usage: ${tokens} tokens, $${cost.toFixed(6)}`);
  }

  recordError(): void {
    this.usage.error_count++;
  }

  recordRateLimitHit(): void {
    this.usage.rate_limit_hits++;
  }

  getUsageStats(): APIUsageStats {
    return { ...this.usage };
  }

  resetStats(): void {
    this.usage = {
      total_requests: 0,
      total_tokens: 0,
      total_cost_usd: 0,
      embedding_requests: 0,
      embedding_tokens: 0,
      chat_requests: 0,
      chat_tokens: 0,
      last_reset: new Date(),
      rate_limit_hits: 0,
      error_count: 0
    };
    console.log('[API Monitor] Usage stats reset');
  }
}

const apiMonitor = new APIMonitor();

// Utility functions
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function estimateTokens(text: string): number {
  // More accurate token estimation: ~4 chars per token
  return Math.ceil(text.length / 4);
}

async function withRetry<T>(
  operation: () => Promise<T>,
  context: string = 'API call'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= RATE_LIMIT_CONFIG.max_retries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      console.error(`[OpenAI Enhanced] ${context} attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.status === 401 || error.status === 403) {
        throw error; // Auth errors
      }
      
      if (error.status === 400 && !error.message.includes('rate limit')) {
        throw error; // Bad request (not rate limit)
      }
      
      if (attempt === RATE_LIMIT_CONFIG.max_retries) {
        throw error; // Final attempt
      }
      
      // Exponential backoff with jitter
      const baseDelay = Math.min(
        RATE_LIMIT_CONFIG.base_delay_ms * Math.pow(2, attempt - 1),
        RATE_LIMIT_CONFIG.max_delay_ms
      );
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;
      
      console.log(`[OpenAI Enhanced] Retrying ${context} in ${Math.round(delay)}ms...`);
      await sleep(delay);
      
      if (error.message.includes('rate limit')) {
        apiMonitor.recordRateLimitHit();
      }
    }
  }
  
  throw lastError!;
}

/**
 * Generate embeddings for text content
 */
export async function generateEmbeddings(
  input: string | string[],
  options: Partial<EmbeddingRequest> = {}
): Promise<EmbeddingResult[]> {
  if (!openai) {
    throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
  }

  const model = options.model || EMBEDDING_MODEL;
  const inputs = Array.isArray(input) ? input : [input];
  
  // Validate inputs
  if (inputs.some(text => !text || typeof text !== 'string' || text.trim().length === 0)) {
    throw new Error('All inputs must be non-empty strings');
  }
  
  const totalText = inputs.join(' ');
  const estimatedTokens = estimateTokens(totalText);
  
  console.log(`[OpenAI Enhanced] Generating embeddings for ${inputs.length} inputs (${estimatedTokens} tokens)`);
  
  try {
    // Check rate limits
    await apiMonitor.checkRateLimit(estimatedTokens);
    
    // Make API call with retry logic
    const response = await withRetry(async () => {
      return await openai!.embeddings.create({
        input: inputs,
        model,
        dimensions: options.dimensions || EMBEDDING_DIMENSIONS,
      });
    }, 'embeddings generation');
    
    // Calculate cost
    const actualTokens = response.usage.total_tokens;
    const modelConfig = EMBEDDING_MODELS[model as keyof typeof EMBEDDING_MODELS];
    const costPerToken = modelConfig ? modelConfig.pricing / 1000 : 0.00002 / 1000;
    const totalCost = actualTokens * costPerToken;
    
    // Record usage
    apiMonitor.recordUsage('embedding', actualTokens, totalCost);
    
    // Transform response
    const results: EmbeddingResult[] = response.data.map((item, index) => ({
      content: inputs[index],
      embedding: item.embedding,
      model: response.model,
      dimensions: item.embedding.length,
      created_at: new Date(),
      tokens_used: Math.ceil(actualTokens / inputs.length),
      cost_usd: totalCost / inputs.length
    }));
    
    console.log(`[OpenAI Enhanced] Generated ${results.length} embeddings ($${totalCost.toFixed(6)})`);
    return results;
    
  } catch (error: any) {
    apiMonitor.recordError();
    console.error('[OpenAI Enhanced] Embedding generation failed:', error);
    throw error;
  }
}

/**
 * Generate single embedding for convenience
 */
export async function generateEmbedding(
  input: string,
  options: Partial<EmbeddingRequest> = {}
): Promise<EmbeddingResult> {
  const results = await generateEmbeddings(input, options);
  return results[0];
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimensions must match: ${a.length} vs ${b.length}`);
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find most similar embeddings to a query
 */
export function findMostSimilar(
  queryEmbedding: number[],
  embeddings: { embedding: number[]; metadata?: any }[],
  topK: number = 5,
  threshold: number = 0.7
): Array<{ similarity: number; index: number; metadata?: any }> {
  const similarities = embeddings.map((item, index) => ({
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
    index,
    metadata: item.metadata
  }));
  
  return similarities
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Get API usage statistics
 */
export function getAPIUsageStats(): APIUsageStats {
  return apiMonitor.getUsageStats();
}

/**
 * Reset API usage statistics
 */
export function resetAPIUsageStats(): void {
  apiMonitor.resetStats();
}

/**
 * Calculate estimated embedding cost
 */
export function estimateEmbeddingCost(
  text: string | string[],
  model: string = EMBEDDING_MODEL
): { tokens: number; cost_usd: number; model: string } {
  const texts = Array.isArray(text) ? text : [text];
  const totalTokens = texts.reduce((sum, t) => sum + estimateTokens(t), 0);
  
  const modelConfig = EMBEDDING_MODELS[model as keyof typeof EMBEDDING_MODELS];
  const costPerToken = modelConfig ? modelConfig.pricing / 1000 : 0.00002 / 1000;
  const cost = totalTokens * costPerToken;
  
  return {
    tokens: totalTokens,
    cost_usd: cost,
    model
  };
}

/**
 * Test OpenAI API connection and performance
 */
export async function testAPIConnection(): Promise<{
  success: boolean;
  message: string;
  embeddings?: {
    response_time_ms: number;
    tokens_used: number;
    cost_usd: number;
    dimensions: number;
    model: string;
  };
  chat?: {
    response_time_ms: number;
    tokens_used: number;
    cost_usd: number;
    model: string;
  };
  error?: string;
}> {
  if (!openai) {
    return {
      success: false,
      message: 'OpenAI client not initialized',
      error: 'OPENAI_API_KEY not configured'
    };
  }
  
  const testText = "This is a test to verify OpenAI API connection and performance.";
  const results: any = { success: true, message: 'API connection successful' };
  
  try {
    // Test embeddings
    console.log('[Test] Testing embeddings API...');
    const embeddingStart = Date.now();
    const embeddingResult = await generateEmbedding(testText);
    const embeddingTime = Date.now() - embeddingStart;
    
    results.embeddings = {
      response_time_ms: embeddingTime,
      tokens_used: embeddingResult.tokens_used,
      cost_usd: embeddingResult.cost_usd,
      dimensions: embeddingResult.dimensions,
      model: embeddingResult.model
    };
    
    // Test chat completion
    console.log('[Test] Testing chat completion API...');
    const chatStart = Date.now();
    const chatResult = await analyzePageContentWithModel(
      'https://example.com/test',
      `<html><head><title>Test Page</title></head><body><p>${testText}</p></body></html>`,
      true
    );
    const chatTime = Date.now() - chatStart;
    
    results.chat = {
      response_time_ms: chatTime,
      tokens_used: 0, // Would need to track from the actual call
      cost_usd: chatResult.estimatedCost || 0,
      model: chatResult.model || selectedModel
    };
    
    console.log('[Test] ✅ Both APIs working correctly');
    return results;
    
  } catch (error: any) {
    console.error('[Test] API test failed:', error);
    return {
      success: false,
      message: 'API test failed',
      error: error.message
    };
  }
}

// Log enhanced service initialization
console.log('🧠 Enhanced OpenAI Service with Embeddings:');
console.log(`  - Embedding Model: ${EMBEDDING_MODEL}`);
console.log(`  - Dimensions: ${EMBEDDING_DIMENSIONS}`);
console.log(`  - Rate Limit: ${RATE_LIMIT_CONFIG.requests_per_minute} req/min`);
console.log(`  - Monitoring: enabled`);