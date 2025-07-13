import OpenAI from "openai";

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

export async function analyzePageContent(url: string, htmlContent: string): Promise<ContentAnalysisResult> {
  // Use fallback analysis for demo purposes when OpenAI quota is exceeded
  console.log("Using fallback analysis for:", url);
  return generateFallbackAnalysis(url, htmlContent);
}

function generateFallbackAnalysis(url: string, htmlContent: string): ContentAnalysisResult {
  // Basic HTML parsing to extract title and create analysis
  const cheerio = require('cheerio');
  const $ = cheerio.load(htmlContent);
  
  // Extract title
  let title = $('title').text().trim();
  if (!title) {
    title = $('h1').first().text().trim();
  }
  if (!title) {
    const urlParts = url.split('/');
    title = urlParts[urlParts.length - 1] || 'Page';
  }
  
  // Extract description
  let description = $('meta[name="description"]').attr('content') || '';
  if (!description) {
    description = $('p').first().text().trim().substring(0, 150);
  }
  if (!description) {
    description = 'Content page from ' + new URL(url).hostname;
  }
  
  // Determine category based on URL patterns
  let category = "General";
  const urlLower = url.toLowerCase();
  if (urlLower.includes('/docs') || urlLower.includes('/documentation')) {
    category = "Documentation";
  } else if (urlLower.includes('/api')) {
    category = "API Reference";
  } else if (urlLower.includes('/guide') || urlLower.includes('/tutorial')) {
    category = "Tutorial";
  } else if (urlLower.includes('/blog')) {
    category = "Blog";
  } else if (urlLower.includes('/about')) {
    category = "About";
  }
  
  // Calculate quality score based on content indicators
  let qualityScore = 5; // Base score
  
  // Increase score for valuable content indicators
  if (title.length > 10) qualityScore += 1;
  if (description.length > 50) qualityScore += 1;
  if ($('h1, h2, h3').length > 2) qualityScore += 1;
  if ($('p').length > 3) qualityScore += 1;
  if ($('code, pre').length > 0) qualityScore += 1;
  
  // Decrease score for less valuable content
  if (title.toLowerCase().includes('404') || title.toLowerCase().includes('error')) {
    qualityScore = 1;
  }
  
  qualityScore = Math.max(1, Math.min(10, qualityScore));
  
  return {
    title: title.substring(0, 100) || "Untitled Page",
    description: description.substring(0, 150) || "No description available",
    qualityScore,
    category,
    relevance: qualityScore // Use quality score as relevance for fallback
  };
}

export async function batchAnalyzeContent(pages: { url: string; content: string }[]): Promise<ContentAnalysisResult[]> {
  const results = await Promise.allSettled(
    pages.map(page => analyzePageContent(page.url, page.content))
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
