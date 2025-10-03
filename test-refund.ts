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
      console.log('✅ Refund button SHOULD appear on dashboard');
    } else {
      console.log('\n❌ User NOT eligible - outside 30-day window');
    }
  } else {
    console.log('\n❌ No coffee purchase found');
  }

  process.exit(0);
}

testRefundEligibility().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
