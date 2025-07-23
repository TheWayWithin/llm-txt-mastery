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

    // Generate realistic mock pages based on the analysis
    // For demo purposes, we'll create pages that look like they came from the actual website
    const baseUrl = 'https://freecalchub.com'; // Default for demo, should be dynamic
    const siteName = 'FreeCalcHub';
    
    const mockPages = [
      {
        url: `${baseUrl}/`,
        title: `${siteName} - Free Online Calculators`,
        description: 'Access hundreds of free online calculators for finance, math, health, and more',
        content: `Welcome to ${siteName}! We provide comprehensive free online calculators for all your calculation needs. Our tools are designed to be accurate, fast, and easy to use.`,
        contentLength: Math.floor(Math.random() * 800) + 800,
        qualityScore: Math.floor(Math.random() * 20) + 80,
        category: 'Landing Page',
        selected: true
      },
      {
        url: `${baseUrl}/financial-calculators`,
        title: 'Financial Calculators - Mortgage, Loan & Investment Tools',
        description: 'Calculate mortgages, loans, investments, and other financial metrics',
        content: 'Our comprehensive suite of financial calculators helps you make informed decisions about mortgages, loans, investments, retirement planning, and more.',
        contentLength: Math.floor(Math.random() * 600) + 600,
        qualityScore: Math.floor(Math.random() * 15) + 75,
        category: 'Financial Tools',
        selected: true
      },
      {
        url: `${baseUrl}/math-calculators`,
        title: 'Math Calculators - Algebra, Geometry & Statistics',
        description: 'Solve complex math problems with our advanced calculators',
        content: 'From basic arithmetic to advanced calculus, our math calculators cover algebra, geometry, trigonometry, statistics, and more.',
        contentLength: Math.floor(Math.random() * 500) + 500,
        qualityScore: Math.floor(Math.random() * 10) + 70,
        category: 'Math Tools',
        selected: true
      },
      {
        url: `${baseUrl}/health-calculators`,
        title: 'Health & Fitness Calculators - BMI, Calorie & Nutrition',
        description: 'Calculate BMI, calories, body fat, and other health metrics',
        content: 'Track your health and fitness goals with our health calculators including BMI, calorie needs, body fat percentage, and nutrition tracking.',
        contentLength: Math.floor(Math.random() * 400) + 400,
        qualityScore: Math.floor(Math.random() * 15) + 65,
        category: 'Health Tools',
        selected: true
      },
      {
        url: `${baseUrl}/about`,
        title: 'About FreeCalcHub - Our Mission',
        description: 'Learn about our mission to provide free, accurate calculation tools',
        content: 'FreeCalcHub was founded to provide free, accurate, and easy-to-use calculators for everyone. Our team of developers and mathematicians work to ensure all tools are reliable.',
        contentLength: Math.floor(Math.random() * 300) + 300,
        qualityScore: Math.floor(Math.random() * 10) + 60,
        category: 'About',
        selected: false
      }
    ];
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        id: parseInt(analysisId),
        status: "completed",
        websiteUrl: baseUrl,
        totalPages: mockPages.length,
        totalPagesFound: mockPages.length,
        pagesWithContent: mockPages.length,
        selectedPages: mockPages.filter(p => p.selected).length,
        avgQualityScore: Math.round(mockPages.reduce((sum, p) => sum + p.qualityScore, 0) / mockPages.length),
        completedAt: new Date().toISOString(),
        discoveredPages: mockPages,
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