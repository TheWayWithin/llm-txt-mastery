#!/usr/bin/env node

/**
 * WIP.co Posting Utility
 * 
 * Posts todos to WIP.co API with project hashtags.
 * Usage: node scripts/post-wip.js "Your todo text #projectname"
 * 
 * Environment: Requires WIP_API_KEY in /home/ubuntu/clawd/.env
 */

import dotenv from 'dotenv';
import https from 'https';
import { URL } from 'url';

// Load environment variables from main workspace
dotenv.config({ path: '/home/ubuntu/clawd/.env' });

const WIP_API_KEY = process.env.WIP_API_KEY;
const WIP_BASE_URL = 'https://api.wip.co/v1';

/**
 * Available project hashtags according to TOOLS.md:
 * #plebtest, #modeloptix, #isotracker, #llmtrader7, #aimpactscanner, #llmtxtmastery
 */

async function postToWIP(todoText, dryRun = false) {
  if (!WIP_API_KEY) {
    throw new Error('WIP_API_KEY not found in environment variables');
  }

  if (!todoText || todoText.trim() === '') {
    throw new Error('Todo text is required');
  }

  const postData = JSON.stringify({
    body: todoText.trim()
  });

  const url = new URL(`${WIP_BASE_URL}/todos`);
  url.searchParams.append('api_key', WIP_API_KEY);

  console.log('📝 WIP.co Todo Post:');
  console.log('Text:', todoText);
  console.log('URL:', `${WIP_BASE_URL}/todos?api_key=${WIP_API_KEY.substring(0, 8)}...`);
  console.log('Body:', postData);

  if (dryRun) {
    console.log('\n🧪 DRY RUN - No actual post made');
    return { success: true, dryRun: true };
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'LLMtxt-Mastery-Scripts/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('\n📡 WIP.co Response:');
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.headers);
        
        try {
          const response = JSON.parse(data);
          console.log('Body:', JSON.stringify(response, null, 2));
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('\n✅ Successfully posted to WIP.co!');
            resolve({ success: true, response, statusCode: res.statusCode });
          } else {
            console.error('\n❌ WIP.co API Error');
            reject(new Error(`WIP.co API error: ${res.statusCode} - ${JSON.stringify(response)}`));
          }
        } catch (parseError) {
          console.log('Raw Body:', data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('\n✅ Successfully posted to WIP.co! (Non-JSON response)');
            resolve({ success: true, response: data, statusCode: res.statusCode });
          } else {
            console.error('\n❌ WIP.co API Error (Non-JSON response)');
            reject(new Error(`WIP.co API error: ${res.statusCode} - ${data}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ Network Error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Test function to verify API connection
async function testWIPConnection() {
  if (!WIP_API_KEY) {
    throw new Error('WIP_API_KEY not found in environment variables');
  }

  const url = new URL(`${WIP_BASE_URL}/users/me`);
  url.searchParams.append('api_key', WIP_API_KEY);

  console.log('🔍 Testing WIP.co API connection...');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'LLMtxt-Mastery-Scripts/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Status:', res.statusCode);
        
        try {
          const response = JSON.parse(data);
          console.log('User Info:', JSON.stringify(response, null, 2));
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('\n✅ WIP.co API connection successful!');
            resolve({ success: true, response });
          } else {
            console.error('\n❌ WIP.co API Test Failed');
            reject(new Error(`WIP.co API test error: ${res.statusCode} - ${JSON.stringify(response)}`));
          }
        } catch (parseError) {
          console.log('Raw response:', data);
          reject(new Error(`Failed to parse WIP.co response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ Network Error:', error.message);
      reject(error);
    });

    req.end();
  });
}

// CLI Usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
📝 WIP.co Posting Utility

Usage:
  node scripts/post-wip.js "Todo text with #hashtag"
  node scripts/post-wip.js --test          # Test API connection
  node scripts/post-wip.js --dry-run "..."  # Preview without posting

Available project hashtags:
  #plebtest, #modeloptix, #isotracker, #llmtrader7, #aimpactscanner, #llmtxtmastery

Examples:
  node scripts/post-wip.js "Fixed React import errors in test suite #llmtxtmastery"
  node scripts/post-wip.js "Updated prospect list with 13 new Webflow agencies #llmtxtmastery"
  node scripts/post-wip.js "Shipped new onboarding flow #plebtest"
    `);
    process.exit(0);
  }

  if (args[0] === '--test') {
    try {
      await testWIPConnection();
      process.exit(0);
    } catch (error) {
      console.error('Test failed:', error.message);
      process.exit(1);
    }
  }

  const dryRun = args[0] === '--dry-run';
  const todoText = dryRun ? args[1] : args[0];

  if (!todoText) {
    console.error('❌ Todo text is required');
    process.exit(1);
  }

  try {
    const result = await postToWIP(todoText, dryRun);
    if (result.success) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Failed to post to WIP.co:', error.message);
    process.exit(1);
  }
}

// Run if called directly (ES module equivalent)
import { fileURLToPath } from 'url';
if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(console.error);
}

export { postToWIP, testWIPConnection };