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
    description = $('p').first().text().trim().substring(0, 300);
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
