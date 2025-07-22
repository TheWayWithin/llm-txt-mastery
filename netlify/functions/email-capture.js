import { storage } from '../../server/storage.js';

export const handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    const emailData = JSON.parse(event.body);
    
    // Check if email already exists
    const existingCapture = await storage.getEmailCapture(emailData.email);
    if (existingCapture) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: "Email already captured", 
          capture: existingCapture,
          tier: existingCapture.tier || 'starter'
        })
      };
    }
    
    // Create new email capture with default tier
    const capture = await storage.createEmailCapture({
      ...emailData,
      tier: 'starter'
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: "Email captured successfully", 
        capture,
        tier: 'starter'
      })
    };
  } catch (error) {
    console.error("Email capture error:", error);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: "Failed to capture email", 
        error: error instanceof Error ? error.message : "Unknown error"
      })
    };
  }
};