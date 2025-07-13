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
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert content analyzer specializing in creating high-quality descriptions for LLM.txt files. Analyze the provided HTML content and create a comprehensive analysis.

Your task is to:
1. Extract a clear, descriptive title
2. Create a concise but informative description (50-150 characters)
3. Assign a quality score (1-10) based on content value for AI systems
4. Categorize the content (Documentation, Tutorial, API, Guide, Legal, About, etc.)
5. Rate relevance for AI crawling (1-10)

Respond with JSON in this exact format: { "title": "string", "description": "string", "qualityScore": number, "category": "string", "relevance": number }`
        },
        {
          role: "user",
          content: `URL: ${url}\n\nHTML Content:\n${htmlContent.substring(0, 8000)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      title: result.title || "Untitled Page",
      description: result.description || "No description available",
      qualityScore: Math.max(1, Math.min(10, result.qualityScore || 5)),
      category: result.category || "General",
      relevance: Math.max(1, Math.min(10, result.relevance || 5))
    };
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    return {
      title: "Analysis Failed",
      description: "Unable to analyze content",
      qualityScore: 1,
      category: "Unknown",
      relevance: 1
    };
  }
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
