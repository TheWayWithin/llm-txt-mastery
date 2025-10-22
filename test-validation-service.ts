/**
 * Test validation service directly to isolate the error
 */

import { validateLlmsTxt } from './server/services/validation';

const testUrl = 'https://freecalchub.com/';
const options = {
  includeRobotsTxt: true,
  bustCache: false,
};

console.log('Testing validation service with:', testUrl);
console.log('Options:', options);
console.log('\n');

validateLlmsTxt(testUrl, options)
  .then((result) => {
    console.log('✅ Validation succeeded!');
    console.log('Result:', JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error('❌ Validation failed!');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  });
