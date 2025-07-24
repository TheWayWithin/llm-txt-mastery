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
    const { url, force = false, email, tier } = JSON.parse(event.body);
    
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          message: "Website URL required for analysis." 
        })
      };
    }

    // Check if this is a Coffee tier request that needs payment
    if (tier === 'coffee') {
      return {
        statusCode: 402, // Payment Required
        headers,
        body: JSON.stringify({ 
          message: "Payment required for Coffee tier analysis",
          tier: "coffee",
          price: 4.95,
          redirectToPayment: true,
          checkoutUrl: `/coffee-checkout?url=${encodeURIComponent(url)}&email=${encodeURIComponent(email)}`
        })
      };
    }

    // Store the URL for later retrieval
    const analysisId = Math.floor(Math.random() * 10000);
    
    // For demo purposes, we'll use the actual URL in our response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        analysisId: analysisId,
        status: "analyzing",
        estimatedDuration: 30, // 30 seconds for demo
        pageCount: Math.floor(Math.random() * 50) + 20, // Random page count 20-70
        websiteUrl: url,
        message: `Analysis started for ${url}! This is a demo response.`
      })
    };
  } catch (error) {
    console.error("Analysis error:", error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        message: error instanceof Error ? error.message : "Failed to analyze website"
      })
    };
  }
};