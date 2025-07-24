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
    const { email, websiteUrl } = JSON.parse(event.body);
    
    if (!email || !websiteUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Email and website URL required' })
      };
    }

    // Initialize Stripe (lazy loading to ensure env vars are available)
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    if (!stripe) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Stripe not configured' })
      };
    }

    // Create Stripe checkout session for Coffee tier
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_LLM_TXT_COFFEE_PRICE_ID,
        quantity: 1,
      }],
      mode: 'payment', // One-time payment
      customer_email: email,
      metadata: {
        tier: 'coffee',
        websiteUrl: websiteUrl,
        email: email
      },
      success_url: `${process.env.URL || 'https://llmtxtmastery.com'}/coffee-success?session_id={CHECKOUT_SESSION_ID}&url=${encodeURIComponent(websiteUrl)}`,
      cancel_url: `${process.env.URL || 'https://llmtxtmastery.com'}/coffee-cancel`,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        sessionId: session.id,
        url: session.url,
        message: "Checkout session created successfully"
      })
    };
  } catch (error) {
    console.error("Checkout error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: error instanceof Error ? error.message : "Failed to create checkout session"
      })
    };
  }
};