import { db } from '../server/db';
import { oneTimeCredits } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function checkCoffeePurchases() {
  console.log('Checking Coffee purchases for user_id 24...\n');

  const purchases = await db
    .select()
    .from(oneTimeCredits)
    .where(
      and(
        eq(oneTimeCredits.userId, 24),
        eq(oneTimeCredits.productType, 'coffee')
      )
    )
    .orderBy(oneTimeCredits.purchasedAt);

  console.log(`Found ${purchases.length} purchase(s):\n`);

  purchases.forEach((p, idx) => {
    console.log(`Purchase ${idx + 1}:`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Purchased At: ${p.purchasedAt}`);
    console.log(`  Credits: ${p.creditsRemaining}/${p.creditsTotal}`);
    console.log(`  Refunded: ${p.refunded}`);
    console.log(`  Created At: ${p.createdAt}`);
    console.log(`  Days since purchase: ${Math.floor((Date.now() - new Date(p.purchasedAt).getTime()) / (1000 * 60 * 60 * 24))}`);
    console.log('');
  });

  // Check what the buggy query returns (oldest first)
  const buggyQuery = await db
    .select()
    .from(oneTimeCredits)
    .where(
      and(
        eq(oneTimeCredits.userId, 24),
        eq(oneTimeCredits.productType, 'coffee'),
        eq(oneTimeCredits.refunded, false)
      )
    )
    .orderBy(oneTimeCredits.purchasedAt)
    .limit(1);

  console.log('🐛 BUGGY QUERY (oldest first):');
  if (buggyQuery.length) {
    const p = buggyQuery[0];
    console.log(`  Returns: ${p.purchasedAt} (${Math.floor((Date.now() - new Date(p.purchasedAt).getTime()) / (1000 * 60 * 60 * 24))} days old)`);
  }

  process.exit(0);
}

checkCoffeePurchases().catch(console.error);
