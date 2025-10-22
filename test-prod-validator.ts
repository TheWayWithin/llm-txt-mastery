/**
 * Test production validator endpoint
 * Replicates the exact error the user is experiencing
 */

const testUrl = 'https://llm-txt-mastery-production.up.railway.app/api/validate-llms-txt';
const payload = {
  url: 'https://freecalchub.com/',
  includeRobotsTxt: true
};

console.log('Testing production validator endpoint...');
console.log('URL:', testUrl);
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('\n');

fetch(testUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})
  .then(async (response) => {
    console.log('HTTP Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('\n');

    const text = await response.text();
    console.log('Raw Response:');
    console.log(text);
    console.log('\n');

    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Failed to parse as JSON');
    }
  })
  .catch((error) => {
    console.error('Fetch error:', error);
  });
