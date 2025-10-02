import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function createCoffeePurchase() {
  try {
    console.log('Creating Coffee purchase record for jamie.watters.mail@icloud.com...');

    // Insert using raw SQL to avoid schema mismatches
    await db.execute(sql`
      INSERT INTO one_time_credits (
        user_id,
        credits_remaining,
        credits_total,
        product_type,
        purchased_at,
        refunded,
        created_at,
        updated_at
      )
      VALUES (
        24,
        73,
        100,
        'coffee',
        '2025-09-27 12:00:00+00',
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Coffee purchase record created!');

    // Verify
    const result = await db.execute(sql`
      SELECT
        id,
        user_id,
        credits_remaining,
        product_type,
        purchased_at,
        refunded,
        EXTRACT(DAY FROM (NOW() - purchased_at)) as days_since_purchase,
        CASE
          WHEN (NOW() - purchased_at) <= INTERVAL '30 days' THEN 'ELIGIBLE ✅'
          ELSE 'NOT ELIGIBLE ❌'
        END as guarantee_status
      FROM one_time_credits
      WHERE user_id = 24
    `);

    console.log('\n📊 Purchase Details:');
    console.log(result.rows[0]);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createCoffeePurchase();
