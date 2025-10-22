import { readFileSync } from 'fs';
import { marked } from 'marked';

/**
 * Test validation logic against local freecalchub llms.txt file
 * to understand why validator reports issues when file looks correct
 */

const filePath = '/Users/jamiewatters/DevProjects/freecalchub/llms.txt';
const content = readFileSync(filePath, 'utf-8');

console.log('=== Testing Blockquote Detection ===');
const blockquoteRegex = /^>\s+.+$/m;
const hasBlockquote = content.match(blockquoteRegex);
console.log('Blockquote found:', !!hasBlockquote);
if (hasBlockquote) {
  console.log('Matched line:', hasBlockquote[0]);
}

console.log('\n=== Testing URL Extraction ===');
// Test the exact logic from validation.ts parseLlmsTxt function
const urls: string[] = [];
const tokens = marked.lexer(content);

console.log('Total tokens:', tokens.length);

function extractUrls(token: any, depth = 0) {
  const indent = '  '.repeat(depth);

  if (token.type === 'paragraph' || token.type === 'text') {
    const text = 'text' in token ? token.text : '';
    const urlMatches = text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    for (const match of urlMatches) {
      const url = match[2];
      console.log(`${indent}[Paragraph/Text] Found URL: ${url}`);
      if (url && !urls.includes(url)) {
        urls.push(url);
      }
    }
  } else if (token.type === 'list') {
    console.log(`${indent}[List] Processing list with ${token.items?.length || 0} items`);
    const listItems = 'items' in token ? token.items : [];
    for (const item of listItems) {
      if ('text' in item) {
        const itemText = item.text;
        console.log(`${indent}  Item text: ${itemText.substring(0, 80)}...`);

        // Check for markdown links in raw text
        const urlMatches = itemText.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
        for (const match of urlMatches) {
          const url = match[2];
          console.log(`${indent}  Found URL in text: ${url}`);
          if (url && !urls.includes(url)) {
            urls.push(url);
          }
        }
      }

      // Check for nested tokens (marked parses links as separate tokens)
      if ('tokens' in item && Array.isArray(item.tokens)) {
        console.log(`${indent}  Checking ${item.tokens.length} nested tokens`);
        for (const nestedToken of item.tokens) {
          extractUrls(nestedToken, depth + 2);
        }
      }
    }
  } else if (token.type === 'link') {
    console.log(`${indent}[Link] href: ${token.href}`);
    if (token.href && !urls.includes(token.href)) {
      urls.push(token.href);
    }
  }

  // Recursively check nested tokens
  if ('tokens' in token && Array.isArray(token.tokens)) {
    for (const nestedToken of token.tokens) {
      extractUrls(nestedToken, depth + 1);
    }
  }
}

// Process all tokens
for (const token of tokens) {
  extractUrls(token);
}

console.log('\n=== Results ===');
console.log('Total URLs extracted:', urls.length);
console.log('First 5 URLs:', urls.slice(0, 5));
console.log('Has blockquote:', !!hasBlockquote);

console.log('\n=== Diagnosis ===');
if (urls.length === 0) {
  console.log('⚠️  URL extraction is failing - marked is parsing links as tokens, not keeping markdown syntax');
  console.log('   Fix: Need to recursively traverse token tree to find link tokens');
} else {
  console.log('✅ URL extraction working correctly');
}

if (!hasBlockquote) {
  console.log('⚠️  Blockquote detection is failing');
  console.log('   Fix: Check regex pattern or blockquote format');
} else {
  console.log('✅ Blockquote detection working correctly');
}
