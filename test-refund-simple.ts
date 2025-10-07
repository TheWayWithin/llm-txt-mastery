import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function testRefund() {
  console.log('Testing refund eligibility with SQL query...\n');

  // Direct SQL query - what the backend SHOULD be doing
  const result = await sql`
    SELECT id, purchased_at,
           EXTRACT(DAY FROM NOW() - purchased_at) as days_since_purchase
    FROM one_time_credits
    WHERE user_id = 24
      AND product_type = 'coffee'
      AND refunded = false
    ORDER BY purchased_at DESC
    LIMIT 1
  `;

  if (result.length === 0) {
    console.log('❌ No coffee purchase found');
    process.exit(1);
  }

  const purchase = result[0];
  const daysSince = parseFloat(purchase.days_since_purchase);
  const withinGuarantee = daysSince <= 30;

  console.log('Purchase Details:');
  console.log(`  ID: ${purchase.id}`);
  console.log(`  Date: ${purchase.purchased_at}`);
  console.log(`  Days since purchase: ${daysSince.toFixed(1)} days`);
  console.log(`  Within 30-day guarantee: ${withinGuarantee ? 'YES ✅' : 'NO ❌'}`);

  if (withinGuarantee) {
    console.log('\n✅ USER IS ELIGIBLE FOR $4.95 REFUND');
    console.log('✅ Backend should return: eligible=true, guaranteeApplies=true');
  } else {
    console.log('\n❌ NOT ELIGIBLE - Outside 30-day window');
  }

  process.exit(0);
}

testRefund().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
