exports.handler = async (event, context) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'text/plain',
    'Content-Disposition': 'attachment; filename="llms.txt"'
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
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    // Extract file ID from path (e.g., /api/download/3258)
    const pathParts = event.path.split('/');
    const fileId = pathParts[pathParts.length - 1];
    
    if (!fileId || fileId === 'download') {
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'File ID required' })
      };
    }

    // Generate sample LLM.txt content for download
    const downloadContent = `# FreeCalcHub.com - LLM.txt

Generated on: ${new Date().toISOString()}
Pages included: 4
Total pages analyzed: 5

---

## FreeCalcHub - Free Online Calculators
URL: https://freecalchub.com/
Category: Landing Page
Quality Score: 87/10
Description: Access hundreds of free online calculators for finance, math, health, and more

Welcome to FreeCalcHub! We provide comprehensive free online calculators for all your calculation needs. Our tools are designed to be accurate, fast, and easy to use.

---

## Financial Calculators - Mortgage, Loan & Investment Tools
URL: https://freecalchub.com/financial-calculators
Category: Financial Tools
Quality Score: 83/10
Description: Calculate mortgages, loans, investments, and other financial metrics

Our comprehensive suite of financial calculators helps you make informed decisions about mortgages, loans, investments, retirement planning, and more.

---

## Math Calculators - Algebra, Geometry & Statistics
URL: https://freecalchub.com/math-calculators
Category: Math Tools
Quality Score: 76/10
Description: Solve complex math problems with our advanced calculators

From basic arithmetic to advanced calculus, our math calculators cover algebra, geometry, trigonometry, statistics, and more.

---

## Health & Fitness Calculators - BMI, Calorie & Nutrition
URL: https://freecalchub.com/health-calculators
Category: Health Tools
Quality Score: 72/10
Description: Calculate BMI, calories, body fat, and other health metrics

Track your health and fitness goals with our health calculators including BMI, calorie needs, body fat percentage, and nutrition tracking.

---
`;
    
    return {
      statusCode: 200,
      headers,
      body: downloadContent
    };
  } catch (error) {
    console.error("Download error:", error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: error instanceof Error ? error.message : "Failed to download file"
      })
    };
  }
};