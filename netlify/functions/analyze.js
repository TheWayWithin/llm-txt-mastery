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

    // Debug: Log the incoming request
    console.log('Analyze request:', { url, email, tier, force });

    // Simplified workaround: Force Coffee tier for testing
    const isCoffeeTier = email && email.includes('jamie.watters');
    
    console.log('Coffee tier detection:', { 
      email, 
      isCoffeeTier, 
      tier,
      willTriggerPayment: tier === 'coffee' || isCoffeeTier 
    });

    // Check if this is a Coffee tier request that needs payment
    if (tier === 'coffee' || isCoffeeTier) {
      console.log('Coffee tier detected, creating Stripe checkout session');
      
      try {
        // Initialize Stripe and create checkout session immediately
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price: process.env.STRIPE_LLM_TXT_COFFEE_PRICE_ID,
            quantity: 1,
          }],
          mode: 'payment',
          customer_email: email,
          metadata: {
            tier: 'coffee',
            websiteUrl: url,
            email: email
          },
          success_url: `https://llmtxtmastery.com/coffee-success?session_id={CHECKOUT_SESSION_ID}&url=${encodeURIComponent(url)}`,
          cancel_url: `https://llmtxtmastery.com/coffee-cancel`,
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            requiresPayment: true,
            tier: "coffee",
            price: 4.95,
            stripeSessionId: session.id,
            stripeCheckoutUrl: session.url,
            message: "Redirecting to Stripe checkout for Coffee tier payment"
          })
        };
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            message: "Failed to create payment session",
            error: stripeError.message
          })
        };
      }
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