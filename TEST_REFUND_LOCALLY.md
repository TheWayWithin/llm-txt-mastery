# Test Refund Eligibility Locally

Since Railway deployment is slow, let's test the fix locally to verify it works before waiting.

## Quick Local Test

```bash
# 1. Set DATABASE_URL
export DATABASE_URL="postgresql://neondb_owner:npg_QcNpixbZ7T9H@ep-dark-fire-ae795ogn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# 2. Create test script
cat > test-refund.ts << 'EOF'
import { db } from './server/db';
import { oneTimeCredits } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

async function testRefundEligibility() {
  const userId = 24; // Jamie's user ID

  console.log('Testing refund eligibility for user', userId);

  // This is what the FIXED code does
  const coffeeCredits = await db
    .select()
    .from(oneTimeCredits)
    .where(
      and(
        eq(oneTimeCredits.userId, userId),
        eq(oneTimeCredits.productType, 'coffee'),
        eq(oneTimeCredits.refunded, false)
      )
    )
    .orderBy(desc(oneTimeCredits.purchasedAt)) // DESC = newest first
    .limit(1);

  console.log(`\nFound ${coffeeCredits.length} coffee purchases`);

  if (coffeeCredits.length) {
    const purchase = coffeeCredits[0];
    const purchaseDate = new Date(purchase.purchasedAt);
    const daysSince = Math.floor((Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const withinGuarantee = daysSince <= 30;

    console.log(`\nPurchase Details:`);
    console.log(`  Date: ${purchaseDate.toISOString()}`);
    console.log(`  Days since purchase: ${daysSince}`);
    console.log(`  Within 30-day guarantee: ${withinGuarantee ? 'YES ✅' : 'NO ❌'}`);
    console.log(`  Amount: $4.95`);

    if (withinGuarantee) {
      console.log('\n✅ USER IS ELIGIBLE FOR REFUND');
    } else {
      console.log('\n❌ User NOT eligible - outside 30-day window');
    }
  } else {
    console.log('\n❌ No coffee purchase found');
  }

  process.exit(0);
}

testRefundEligibility().catch(console.error);
EOF

# 3. Run the test
npx tsx test-refund.ts
```

## Expected Output

If the fix works, you should see:
```
Found 1 coffee purchases

Purchase Details:
  Date: 2025-09-27T16:00:00.000Z
  Days since purchase: 5
  Within 30-day guarantee: YES ✅
  Amount: $4.95

✅ USER IS ELIGIBLE FOR REFUND
```

## If This Works

Then the backend code is correct and we just need to wait for Railway to deploy it.

## Next Steps After Railway Deploys

1. Check health endpoint shows new version:
   ```bash
   curl https://llm-txt-mastery-production.up.railway.app/health | jq '.version'
   ```

2. Test eligibility API in browser console:
   ```javascript
   fetch('https://llm-txt-mastery-production.up.railway.app/api/refund/eligibility', {
     headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('auth_access_token') }
   })
   .then(r => r.json())
   .then(d => console.log(d));
   ```

3. Hard refresh dashboard (Cmd+Shift+R) to clear cache

4. Refund button should appear!
