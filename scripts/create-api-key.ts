/**
 * CLI Script: Create API Key
 *
 * Usage: npx tsx scripts/create-api-key.ts <name> <consumer> [tier] [rateLimit]
 *
 * Example:
 *   npx tsx scripts/create-api-key.ts "aimpactscanner-prod" aimpactscanner partner 1000
 *   npx tsx scripts/create-api-key.ts "test-key" public free 100
 */
import { generateApiKey, type CreateApiKeyParams } from '../server/utils/api-key-generator';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              API Key Generator - LLM.txt Mastery             ║
╚══════════════════════════════════════════════════════════════╝

Usage: npx tsx scripts/create-api-key.ts <name> <consumer> [tier] [rateLimit]

Arguments:
  name        - Descriptive name for the API key (e.g., "aimpactscanner-prod")
  consumer    - Consumer identifier (e.g., "aimpactscanner", "public", "internal")
  tier        - API tier: free | partner | enterprise (default: free)
  rateLimit   - Rate limit in requests per hour (default: based on tier)

Default Rate Limits:
  free        - 100 requests/hour
  partner     - 1,000 requests/hour
  enterprise  - 10,000 requests/hour

Examples:
  npx tsx scripts/create-api-key.ts "aimpactscanner-prod" aimpactscanner partner 1000
  npx tsx scripts/create-api-key.ts "test-key" public free 100
  npx tsx scripts/create-api-key.ts "enterprise-client" acme enterprise
`);
    process.exit(1);
  }

  const [name, consumer, tier = 'free', rateLimitStr] = args;

  // Validate tier
  const validTiers = ['free', 'partner', 'enterprise'];
  if (!validTiers.includes(tier)) {
    console.error(`\n❌ Invalid tier: "${tier}". Must be one of: ${validTiers.join(', ')}\n`);
    process.exit(1);
  }

  // Parse rate limit
  const rateLimit = rateLimitStr ? parseInt(rateLimitStr, 10) : undefined;
  if (rateLimitStr && isNaN(rateLimit!)) {
    console.error(`\n❌ Invalid rate limit: "${rateLimitStr}". Must be a number.\n`);
    process.exit(1);
  }

  try {
    console.log('\n🔑 Creating API key...\n');

    const params: CreateApiKeyParams = {
      name,
      consumer,
      tier: tier as 'free' | 'partner' | 'enterprise',
      rateLimit,
    };

    const { rawKey, apiKey } = await generateApiKey(params);

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ API Key Created Successfully              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Name:        ${apiKey.name}`);
    console.log(`  Consumer:    ${apiKey.consumer}`);
    console.log(`  Tier:        ${apiKey.tier}`);
    console.log(`  Rate Limit:  ${apiKey.rateLimit} requests/hour`);
    console.log(`  Created:     ${apiKey.createdAt}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('  🔐 API KEY (save this now - it will NOT be shown again!):');
    console.log('');
    console.log(`  ${rawKey}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('  📖 Usage:');
    console.log('  Include in your API requests as:');
    console.log('');
    console.log('    curl -H "X-API-Key: <your-key>" https://api.llmtxtmastery.com/api/v1/status');
    console.log('');
    console.log('  Or in JavaScript:');
    console.log('');
    console.log('    fetch(url, { headers: { "X-API-Key": "<your-key>" } })');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to create API key:', error);
    process.exit(1);
  }
}

main();
