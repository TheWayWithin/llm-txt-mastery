exports.handler = async (event, context) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'text/html'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod === 'GET') {
    // Return a simple test page
    const testPage = `
<!DOCTYPE html>
<html>
<head>
    <title>Coffee Tier Payment Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        button { background: #ff6b35; color: white; padding: 12px 24px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; }
        button:hover { background: #e55a2e; }
        .result { margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>☕ Coffee Tier Payment Test</h1>
    <p>Click the button below to test the Stripe integration:</p>
    
    <button onclick="testPayment()">Test $4.95 Coffee Payment</button>
    
    <div id="result" class="result" style="display:none;"></div>

    <script>
        async function testPayment() {
            const button = document.querySelector('button');
            const result = document.getElementById('result');
            
            button.disabled = true;
            button.textContent = 'Creating checkout session...';
            result.style.display = 'block';
            result.innerHTML = 'Testing Stripe integration...';
            
            try {
                const response = await fetch('/api/coffee-checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: 'jamie.watters.mail@icloud.com',
                        websiteUrl: 'https://freecalchub.com'
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.url) {
                    result.innerHTML = '✅ Success! Redirecting to Stripe checkout...';
                    window.location.href = data.url;
                } else {
                    result.innerHTML = '❌ Error: ' + (data.message || 'Unknown error');
                }
            } catch (error) {
                result.innerHTML = '❌ Network error: ' + error.message;
            }
            
            button.disabled = false;
            button.textContent = 'Test $4.95 Coffee Payment';
        }
    </script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers,
      body: testPage
    };
  }

  return {
    statusCode: 405,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Method not allowed' })
  };
};