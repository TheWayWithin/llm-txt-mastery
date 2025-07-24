exports.handler = async (event, context) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    const requestBody = JSON.parse(event.body);
    
    // Handle both formats: direct array or object with selectedPages property
    const selectedPages = Array.isArray(requestBody) ? requestBody : requestBody.selectedPages;
    const analysisId = requestBody.analysisId;
    
    if (!Array.isArray(selectedPages) || selectedPages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          message: 'Selected pages required',
          received: typeof requestBody,
          hasSelectedPages: !!requestBody.selectedPages,
          selectedPagesLength: Array.isArray(selectedPages) ? selectedPages.length : 'not array'
        })
      };
    }

    // Generate mock LLM.txt file content
    const websiteUrl = selectedPages[0]?.url ? new URL(selectedPages[0].url).origin : 'https://example.com';
    const timestamp = new Date().toISOString();
    
    let llmContent = `# ${websiteUrl} - LLM.txt\n\n`;
    llmContent += `Generated on: ${timestamp}\n`;
    llmContent += `Pages included: ${selectedPages.filter(p => p.selected).length}\n`;
    llmContent += `Total pages analyzed: ${selectedPages.length}\n\n`;
    llmContent += `---\n\n`;

    // Add content for each selected page
    const selectedPagesOnly = selectedPages.filter(page => page.selected);
    
    selectedPagesOnly.forEach((page, index) => {
        
        llmContent += `## ${page.title || 'Untitled Page'}\n`;
        llmContent += `URL: ${page.url || 'No URL'}\n`;
        llmContent += `Category: ${page.category || 'Uncategorized'}\n`;
        llmContent += `Quality Score: ${page.qualityScore || 'N/A'}/10\n`;
        if (page.description) {
          llmContent += `Description: ${page.description}\n`;
        }
        
        // Generate content from available fields since frontend doesn't send full content
        let content = page.content || page.text || page.body;
        
        if (!content) {
          // Generate meaningful content from title and description
          content = `${page.description || 'A page from the website'}. This page provides valuable information and resources related to ${page.title?.toLowerCase() || 'the website content'}.`;
          
          // Add category-specific content
          if (page.category) {
            content += ` This ${page.category.toLowerCase()} section contains detailed information and tools.`;
          }
        }
        
        llmContent += `\n${content}\n\n`;
        llmContent += `---\n\n`;
      });

    // Create a mock file ID for the response
    const fileId = Math.floor(Math.random() * 10000);
    
    const selectedPagesCount = selectedPages.filter(p => p.selected).length;
    const contentSize = Buffer.byteLength(llmContent, 'utf8');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        id: fileId,
        analysisId: analysisId,
        filename: `llm-txt-${Date.now()}.txt`,
        content: llmContent,
        selectedPages: selectedPagesCount,
        totalPages: selectedPages.length,
        pageCount: selectedPagesCount, // Frontend expects this field
        fileSize: contentSize, // Frontend expects this field
        websiteUrl: websiteUrl,
        generatedAt: timestamp,
        message: "LLM.txt file generated successfully! This is a demo response."
      })
    };
  } catch (error) {
    console.error("File generation error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: error instanceof Error ? error.message : "Failed to generate LLM.txt file"
      })
    };
  }
};