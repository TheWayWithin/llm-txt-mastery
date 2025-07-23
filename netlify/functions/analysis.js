exports.handler = async (event, context) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    // Extract analysis ID from path (e.g., /api/analysis/5718)
    const pathParts = event.path.split('/');
    const analysisId = pathParts[pathParts.length - 1];
    
    if (!analysisId || analysisId === 'analysis') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Analysis ID required' })
      };
    }

    // For demo purposes, return a mock completed analysis
    const mockPages = [
      {
        url: 'https://example.com/',
        title: 'Home Page',
        description: 'Welcome to our website',
        content: 'This is the main landing page content...',
        contentLength: 1250,
        qualityScore: 85,
        selected: true
      },
      {
        url: 'https://example.com/about',
        title: 'About Us',
        description: 'Learn more about our company',
        content: 'We are a leading company in our field...',
        contentLength: 890,
        qualityScore: 78,
        selected: true
      },
      {
        url: 'https://example.com/services',
        title: 'Our Services',
        description: 'Discover what we offer',
        content: 'We provide comprehensive services including...',
        contentLength: 1450,
        qualityScore: 82,
        selected: true
      }
    ];
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        id: parseInt(analysisId),
        status: "completed",
        websiteUrl: "https://example.com",
        totalPages: mockPages.length,
        pagesWithContent: mockPages.length,
        selectedPages: mockPages.filter(p => p.selected).length,
        avgQualityScore: Math.round(mockPages.reduce((sum, p) => sum + p.qualityScore, 0) / mockPages.length),
        completedAt: new Date().toISOString(),
        pages: mockPages,
        message: "Analysis completed successfully! This is a demo response for the free tier."
      })
    };
  } catch (error) {
    console.error("Analysis status error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: error instanceof Error ? error.message : "Failed to get analysis status"
      })
    };
  }
};