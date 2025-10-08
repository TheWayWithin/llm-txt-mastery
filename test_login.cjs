// Test staging login and show detailed error
const https = require('https');

const data = JSON.stringify({
  email: 'test@example.com',
  password: 'testpass123'
});

const options = {
  hostname: 'llm-txt-mastery-staging.up.railway.app',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🧪 Testing staging login...\n');

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', responseData);
    console.log('\n✅ Check Railway logs now for "Login error:" message');
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error);
});

req.write(data);
req.end();
