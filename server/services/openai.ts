import OpenAI from "openai";
import * as cheerio from "cheerio";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ContentAnalysisResult {
  title: string;
  description: string;
  qualityScore: number;
  category: string;
  relevance: number;
}

export async function analyzePageContent(url: string, htmlContent: string, useAI: boolean = false): Promise<ContentAnalysisResult> {
  try {
    if (useAI && process.env.OPENAI_API_KEY) {
      console.log("Using AI analysis for:", url);
      return await generateAIAnalysis(url, htmlContent);
    } else {
      console.log("Using HTML extraction for:", url);
      return generateHTMLAnalysis(url, htmlContent);
    }
  } catch (error) {
    console.error("Analysis failed for:", url, error);
    
    // Simple fallback when analysis fails
    return {
      title: new URL(url).pathname.split('/').pop() || 'Page',
      description: `Content from ${new URL(url).hostname}`,
      qualityScore: 5,
      category: 'General',
      relevance: 5
    };
  }
}

function generateHTMLAnalysis(url: string, htmlContent: string): ContentAnalysisResult {
  // Basic HTML parsing to extract title and create analysis
  const $ = cheerio.load(htmlContent);
  
  // Extract text content for analysis first (needed by other functions)
  const textContent = $('body').text().trim();
  
  // Extract title
  let title = $('title').text().trim();
  if (!title) {
    title = $('h1').first().text().trim();
  }
  if (!title) {
    const urlParts = url.split('/');
    title = urlParts[urlParts.length - 1] || 'Page';
  }
  
  // Extract enhanced description with smarter content analysis
  let description = $('meta[name="description"]').attr('content') || '';
  
  if (!description) {
    // Enhanced content extraction strategy
    description = extractSmartDescription($, url, textContent);
  } else {
    // Clean up existing meta description
    description = cleanDescription(description);
  }
  
  // Add content structure information for better context
  const structureInfo = analyzeContentStructure($, textContent);
  if (structureInfo) {
    description = `${description} ${structureInfo}`;
  }
  
  // Calculate quality score based on content indicators
  let qualityScore = 3; // Lower base score for more realistic assessment
  const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
  const paragraphCount = $('p').length;
  const listItemCount = $('li').length;
  const headingCount = $('h1, h2, h3, h4, h5, h6').length;
  const codeBlockCount = $('code, pre').length;
  const linkCount = $('a').length;
  
  // Enhanced category detection using both URL patterns and content analysis
  const category = detectContentCategory($, url, textContent, {
    codeBlockCount,
    listItemCount,
    paragraphCount,
    headingCount
  });
  
  // Apply category-specific quality adjustments
  qualityScore = applyCategoryQualityAdjustments(qualityScore, category, $, textContent);
  
  // Content depth scoring (more stringent)
  if (wordCount > 100) qualityScore += 1;
  if (wordCount > 300) qualityScore += 1;
  if (wordCount > 500) qualityScore += 1;
  
  // Structure scoring
  if (headingCount >= 2) qualityScore += 0.5;
  if (paragraphCount >= 3) qualityScore += 0.5;
  if (codeBlockCount > 0) qualityScore += 1;
  
  // Content quality indicators
  if (title.length > 20 && !title.includes('http://') && !title.includes('https://')) {
    qualityScore += 0.5;
  }
  if (description.length > 100 && !description.includes('From here you can')) {
    qualityScore += 0.5;
  }
  
  
  // Navigation vs content pages - be more aggressive about detection
  const isNavigationPage = textContent.toLowerCase().includes('from here you can') ||
                          textContent.toLowerCase().includes('select from') ||
                          textContent.toLowerCase().includes('choose from') ||
                          (listItemCount > 2 && paragraphCount <= 2 && wordCount < 300);
  
  if (isNavigationPage) {
    // Navigation pages should score low regardless of other factors
    qualityScore = Math.max(1, Math.min(3, qualityScore - 1));
    console.log(`Detected navigation page: ${url}, reducing quality score`);
  }
  
  // Error and low-value page detection
  if (title.toLowerCase().includes('404') || 
      title.toLowerCase().includes('error') ||
      textContent.toLowerCase().includes('page not found')) {
    qualityScore = 1;
  }
  
  // Placeholder content detection
  if (textContent.toLowerCase().includes('lorem ipsum') ||
      textContent.toLowerCase().includes('coming soon') ||
      textContent.toLowerCase().includes('under construction')) {
    qualityScore = Math.max(1, qualityScore - 2);
  }
  
  // Incomplete content detection - be more aggressive
  if (description.endsWith(':') || 
      description.endsWith('can:') ||
      description.includes('From here you can:') ||
      description.includes('From here you can') ||
      description.length < 30) {
    qualityScore = Math.max(1, qualityScore - 2);
    console.log(`Detected incomplete/minimal content: ${url}, description: "${description}"`);
  }
  
  qualityScore = Math.max(1, Math.min(10, Math.round(qualityScore * 2) / 2)); // Round to nearest 0.5
  
  // Ensure description doesn't cut off mid-word
  let finalDescription = description.substring(0, 300) || "No description available";
  if (description.length > 300) {
    const lastSpace = finalDescription.lastIndexOf(' ');
    if (lastSpace > 250) { // Only truncate at word boundary if it's not too short
      finalDescription = finalDescription.substring(0, lastSpace) + '...';
    }
  }

  return {
    title: title.substring(0, 100) || "Untitled Page",
    description: finalDescription,
    qualityScore,
    category,
    relevance: qualityScore // Use quality score as relevance for fallback
  };
}

async function generateAIAnalysis(url: string, htmlContent: string): Promise<ContentAnalysisResult> {
  // First extract basic info using HTML parsing
  const htmlResult = generateHTMLAnalysis(url, htmlContent);
  
  try {
    // Extract main content for AI analysis
    const $ = cheerio.load(htmlContent);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .sidebar, .menu, .navigation').remove();
    
    // Get main content
    const mainContent = $('main, article, .content, .post, .page, body').first().text().trim();
    const contentSample = mainContent.substring(0, 2000); // Limit content for API
    
    const prompt = `Analyze this webpage content for AI/LLM accessibility and value. 

URL: ${url}
Title: ${htmlResult.title}
Meta Description: ${htmlResult.description}
Content Sample: ${contentSample}

Provide a JSON response with:
1. Enhanced description optimized for AI understanding (150-300 chars)
2. Quality score (1-10) based on content value for AI systems
3. Category (Documentation, Tutorial, API Reference, Blog, Product, About, General)
4. Relevance score (1-10) for AI training/reference

Focus on technical accuracy, information density, and AI utility.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert content analyst specializing in AI/LLM accessibility. Respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.3
    });

    const aiResult = JSON.parse(response.choices[0].message.content || "{}");
    
    // Ensure description doesn't cut off mid-word
    let enhancedDescription = aiResult.description || htmlResult.description;
    if (enhancedDescription.length > 300) {
      const lastSpace = enhancedDescription.lastIndexOf(' ', 300);
      if (lastSpace > 250) {
        enhancedDescription = enhancedDescription.substring(0, lastSpace) + '...';
      }
    }
    
    return {
      title: htmlResult.title,
      description: enhancedDescription,
      qualityScore: Math.max(1, Math.min(10, parseInt(aiResult.qualityScore) || htmlResult.qualityScore)),
      category: aiResult.category || htmlResult.category,
      relevance: Math.max(1, Math.min(10, parseInt(aiResult.relevance) || htmlResult.qualityScore))
    };
    
  } catch (error) {
    console.error("AI analysis failed, falling back to HTML analysis:", error);
    return htmlResult;
  }
}

export async function batchAnalyzeContent(pages: { url: string; content: string }[], useAI: boolean = false): Promise<ContentAnalysisResult[]> {
  const results = await Promise.allSettled(
    pages.map(page => analyzePageContent(page.url, page.content, useAI))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return {
        title: `Error analyzing ${pages[index].url}`,
        description: "Analysis failed",
        qualityScore: 1,
        category: "Error",
        relevance: 1
      };
    }
  });
}

// Enhanced description extraction for free tier users
function extractSmartDescription($: any, url: string, textContent: string): string {
  // Strategy 1: Look for introduction/summary content
  const introSelectors = [
    '.intro, .introduction, .summary, .overview, .description',
    'p:first-of-type', 
    '.lead, .excerpt, .subtitle',
    '[data-description], [data-summary]'
  ];
  
  for (const selector of introSelectors) {
    const introText = $(selector).first().text().trim();
    if (introText && introText.length > 20 && introText.length < 400) {
      return cleanDescription(introText);
    }
  }
  
  // Strategy 2: Extract from structured content
  const structuredContent = extractStructuredContent($, url);
  if (structuredContent) {
    return structuredContent;
  }
  
  // Strategy 3: Smart paragraph analysis
  const paragraphs = $('p').map((_, el) => $(el).text().trim()).get()
    .filter(p => p.length > 30 && p.length < 300)
    .filter(p => !isNavigationText(p));
  
  if (paragraphs.length > 0) {
    return cleanDescription(paragraphs[0]);
  }
  
  // Strategy 4: Fallback to meaningful content extraction
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  if (sentences.length > 0) {
    return cleanDescription(sentences[0] + '.');
  }
  
  return `Content from ${new URL(url).hostname}`;
}

function extractStructuredContent($: any, url: string): string | null {
  const urlLower = url.toLowerCase();
  
  // API documentation pages
  if (urlLower.includes('/api')) {
    const endpoints = $('code, .endpoint, .method').map((_, el) => $(el).text().trim()).get().slice(0, 3);
    if (endpoints.length > 0) {
      return `API documentation covering ${endpoints.join(', ')} and related endpoints`;
    }
  }
  
  // Tutorial/guide pages
  if (urlLower.includes('/tutorial') || urlLower.includes('/guide')) {
    const steps = $('h2, h3, .step, li').map((_, el) => $(el).text().trim()).get()
      .filter(step => step.length > 10 && step.length < 60)
      .slice(0, 3);
    if (steps.length > 0) {
      return `Step-by-step guide covering: ${steps.join(', ')}`;
    }
  }
  
  // Documentation pages
  if (urlLower.includes('/docs')) {
    const sections = $('h2, h3').map((_, el) => $(el).text().trim()).get()
      .filter(section => section.length > 5 && section.length < 50)
      .slice(0, 3);
    if (sections.length > 0) {
      return `Documentation covering ${sections.join(', ')}`;
    }
  }
  
  // Blog posts
  if (urlLower.includes('/blog')) {
    const publishDate = $('time, .date, .published').first().text().trim();
    const tags = $('.tag, .category, .label').map((_, el) => $(el).text().trim()).get().slice(0, 3);
    let desc = 'Blog post';
    if (tags.length > 0) desc += ` about ${tags.join(', ')}`;
    if (publishDate) desc += ` (${publishDate})`;
    return desc;
  }
  
  return null;
}

function analyzeContentStructure($: any, textContent: string): string | null {
  const codeBlockCount = $('code, pre').length;
  const listItemCount = $('li').length;
  const headingCount = $('h1, h2, h3, h4, h5, h6').length;
  const tableCount = $('table').length;
  const imageCount = $('img').length;
  
  const features = [];
  
  if (codeBlockCount >= 3) features.push(`${codeBlockCount} code examples`);
  if (tableCount >= 2) features.push(`${tableCount} data tables`);
  if (listItemCount >= 5) features.push(`${listItemCount} structured items`);
  if (headingCount >= 4) features.push(`${headingCount} sections`);
  if (imageCount >= 3) features.push(`${imageCount} images/diagrams`);
  
  if (features.length > 0) {
    return `Includes ${features.slice(0, 2).join(' and ')}.`;
  }
  
  return null;
}

function cleanDescription(description: string): string {
  // Remove common boilerplate phrases
  const boilerplatePatterns = [
    /from here you can/gi,
    /welcome to/gi,
    /this page/gi,
    /click here/gi,
    /learn more/gi,
    /home \| /gi,
    / \| home/gi
  ];
  
  let cleaned = description;
  for (const pattern of boilerplatePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Clean up extra whitespace and punctuation
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^[:\-\|\s]+/, '').replace(/[:\-\|\s]+$/, '');
  
  // Ensure proper sentence structure
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    cleaned += '.';
  }
  
  return cleaned || description; // Return original if cleaning made it empty
}

function isNavigationText(text: string): boolean {
  const navPatterns = [
    /from here you can/i,
    /choose from/i,
    /select from/i,
    /navigate to/i,
    /go to/i,
    /click on/i
  ];
  
  return navPatterns.some(pattern => pattern.test(text)) || 
         (text.split(' ').length < 10 && text.includes('page'));
}

/**
 * Enhanced content category detection using multiple signals
 */
function detectContentCategory(
  $: any, 
  url: string, 
  textContent: string, 
  metrics: {
    codeBlockCount: number;
    listItemCount: number;
    paragraphCount: number;
    headingCount: number;
  }
): string {
  const urlLower = url.toLowerCase();
  const contentLower = textContent.toLowerCase();
  const title = $('title').text().toLowerCase();
  
  // URL-based detection (highest priority)
  const urlPatterns = [
    { pattern: ['/docs', '/documentation'], category: 'Documentation' },
    { pattern: ['/api', '/reference'], category: 'API Reference' },
    { pattern: ['/guide', '/tutorial', '/how-to'], category: 'Tutorial' },
    { pattern: ['/getting-started', '/quickstart', '/setup'], category: 'Getting Started' },
    { pattern: ['/blog', '/news', '/articles'], category: 'Blog' },
    { pattern: ['/about', '/company', '/team'], category: 'About' },
    { pattern: ['/pricing', '/plans', '/cost'], category: 'Pricing' },
    { pattern: ['/support', '/help', '/faq'], category: 'Support' },
    { pattern: ['/product', '/features'], category: 'Product' },
    { pattern: ['/download', '/install'], category: 'Installation' },
    { pattern: ['/example', '/demo', '/sample'], category: 'Examples' }
  ];
  
  for (const { pattern, category } of urlPatterns) {
    if (pattern.some(p => urlLower.includes(p))) {
      return category;
    }
  }
  
  // Content-based detection
  const contentPatterns = [
    { 
      keywords: ['api', 'endpoint', 'method', 'parameter', 'request', 'response'],
      minCount: 3,
      category: 'API Reference'
    },
    {
      keywords: ['step', 'tutorial', 'guide', 'learn', 'how to', 'instruction'],
      minCount: 2,
      category: 'Tutorial'
    },
    {
      keywords: ['install', 'setup', 'configure', 'getting started', 'quick start'],
      minCount: 2,
      category: 'Getting Started'
    },
    {
      keywords: ['blog', 'post', 'article', 'published', 'author', 'tagged'],
      minCount: 2,
      category: 'Blog'
    },
    {
      keywords: ['price', 'pricing', 'plan', 'subscription', 'cost', '$'],
      minCount: 2,
      category: 'Pricing'
    },
    {
      keywords: ['support', 'help', 'faq', 'question', 'problem', 'issue'],
      minCount: 2,
      category: 'Support'
    }
  ];
  
  for (const { keywords, minCount, category } of contentPatterns) {
    const matchCount = keywords.filter(keyword => contentLower.includes(keyword)).length;
    if (matchCount >= minCount) {
      return category;
    }
  }
  
  // Structure-based detection
  if (metrics.codeBlockCount >= 3) {
    return 'Documentation'; // Technical documentation with code examples
  }
  
  if (metrics.listItemCount > metrics.paragraphCount * 2 && metrics.paragraphCount < 3) {
    if (contentLower.includes('navigation') || contentLower.includes('from here you can')) {
      return 'Navigation';
    } else {
      return 'Reference'; // Structured lists of information
    }
  }
  
  // HTML structure analysis
  const hasForm = $('form, input[type="email"], input[type="password"]').length > 0;
  const hasPricing = $('.price, .pricing, [class*="price"]').length > 0;
  const hasTestimonial = $('.testimonial, .review, [class*="testimonial"]').length > 0;
  
  if (hasForm && !hasPricing) {
    return 'Contact';
  }
  
  if (hasPricing) {
    return 'Pricing';
  }
  
  if (hasTestimonial) {
    return 'Testimonials';
  }
  
  // Special cases
  if (urlLower.includes('cern.ch') && contentLower.includes('first website')) {
    return 'Historical';
  }
  
  // Default fallback
  return 'General';
}

/**
 * Apply category-specific quality score adjustments
 */
function applyCategoryQualityAdjustments(
  baseScore: number, 
  category: string, 
  $: any, 
  textContent: string
): number {
  let adjustedScore = baseScore;
  const contentLower = textContent.toLowerCase();
  
  switch (category) {
    case 'API Reference':
      // Boost for well-structured API docs
      if ($('code, pre').length >= 3) adjustedScore += 1;
      if (contentLower.includes('parameter') && contentLower.includes('response')) adjustedScore += 0.5;
      break;
      
    case 'Tutorial':
      // Boost for step-by-step content
      if ($('h2, h3').length >= 3) adjustedScore += 0.5;
      if (contentLower.includes('step') || contentLower.includes('example')) adjustedScore += 0.5;
      break;
      
    case 'Getting Started':
      // High value for onboarding content
      adjustedScore += 1;
      break;
      
    case 'Documentation':
      // Boost for comprehensive docs
      if ($('code, pre').length > 0) adjustedScore += 0.5;
      if ($('h2, h3, h4').length >= 4) adjustedScore += 0.5;
      break;
      
    case 'Blog':
      // Moderate boost for fresh content
      const hasDate = $('time, .date, .published').length > 0;
      if (hasDate) adjustedScore += 0.3;
      break;
      
    case 'Navigation':
      // Penalize navigation pages
      adjustedScore = Math.max(1, adjustedScore - 2);
      break;
      
    case 'Historical':
      // Moderate boost for historical significance
      adjustedScore += 0.5;
      break;
      
    case 'Pricing':
      // High value for pricing information
      adjustedScore += 0.8;
      break;
      
    case 'About':
      // Moderate value for company information
      adjustedScore += 0.3;
      break;
  }
  
  return Math.max(1, Math.min(10, adjustedScore));
}
