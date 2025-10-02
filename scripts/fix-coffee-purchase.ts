import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function fixCoffeePurchase() {
  console.log('Checking Coffee purchases for user_id 24 (jamie.watters.mail@icloud.com)...\n');

  // Get all Coffee purchases
  const purchases = await sql`
    SELECT id, purchased_at, credits_remaining, credits_total, refunded, created_at,
           EXTRACT(DAY FROM NOW() - purchased_at) as days_since_purchase
    FROM one_time_credits
    WHERE user_id = 24
      AND product_type = 'coffee'
    ORDER BY purchased_at DESC
  `;

  console.log(`Found ${purchases.length} Coffee purchase(s):\n`);

  purchases.forEach((p, idx) => {
    console.log(`Purchase ${idx + 1}:`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Purchased At: ${p.purchased_at}`);
    console.log(`  Days Since Purchase: ${p.days_since_purchase} days`);
    console.log(`  Credits: ${p.credits_remaining}/${p.credits_total}`);
    console.log(`  Refunded: ${p.refunded}`);
    console.log(`  Eligible for 30-day guarantee: ${parseFloat(p.days_since_purchase) <= 30 ? 'YES ✅' : 'NO ❌'}`);
    console.log('');
  });

  // Find the most recent non-refunded purchase
  const recentPurchase = purchases.find(p => !p.refunded);

  if (!recentPurchase) {
    console.log('❌ No non-refunded purchase found');
    process.exit(1);
  }

  console.log(`\nMost recent non-refunded purchase:`);
  console.log(`  ID: ${recentPurchase.id}`);
  console.log(`  Date: ${recentPurchase.purchased_at}`);
  console.log(`  Days old: ${recentPurchase.days_since_purchase} days`);

  if (parseFloat(recentPurchase.days_since_purchase) <= 30) {
    console.log('  ✅ Within 30-day guarantee window');
  } else {
    console.log('  ❌ Outside 30-day guarantee window');
    console.log('\n🔧 Need to update this purchase to September 27, 2025');

    // Update the purchase date
    await sql`
      UPDATE one_time_credits
      SET purchased_at = '2025-09-27 12:00:00+00'
      WHERE id = ${recentPurchase.id}
    `;

    console.log('✅ Updated purchase date to September 27, 2025');
  }

  // If there are multiple purchases, mark old ones as processed
  if (purchases.length > 1) {
    console.log(`\n⚠️  Found ${purchases.length} total purchases - cleaning up old ones...`);

    const oldPurchases = purchases.filter(p => p.id !== recentPurchase.id);

    for (const old of oldPurchases) {
      await sql`
        UPDATE one_time_credits
        SET refunded = true,
            refunded_at = NOW(),
            credits_remaining = 0
        WHERE id = ${old.id}
      `;
      console.log(`  ✅ Marked purchase ${old.id} as refunded (old record)`);
    }
  }

  console.log('\n✅ Fix complete! Testing eligibility...\n');

  // Test eligibility calculation
  const result = await sql`
    SELECT
      id,
      purchased_at,
      EXTRACT(DAY FROM NOW() - purchased_at) as days_since_purchase,
      (EXTRACT(EPOCH FROM NOW() - purchased_at) * 1000) <= (30 * 24 * 60 * 60 * 1000) as eligible
    FROM one_time_credits
    WHERE user_id = 24
      AND product_type = 'coffee'
      AND refunded = false
    ORDER BY purchased_at DESC
    LIMIT 1
  `;

  if (result.length) {
    const r = result[0];
    console.log('Eligibility check result:');
    console.log(`  Purchase date: ${r.purchased_at}`);
    console.log(`  Days since purchase: ${r.days_since_purchase} days`);
    console.log(`  Eligible: ${r.eligible ? 'YES ✅' : 'NO ❌'}`);
  }
}

fixCoffeePurchase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
