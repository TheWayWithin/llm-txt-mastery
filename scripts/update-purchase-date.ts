import 'dotenv/config';
import { db } from '../server/db';
import { oneTimeCredits, authUsers } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function updatePurchaseDate() {
  try {
    // Find Jamie's account
    const users = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, 'jamie.watters.mail@icloud.com'))
      .limit(1);

    if (!users.length) {
      console.error('❌ User not found');
      process.exit(1);
    }

    const user = users[0];
    console.log(`✅ Found user: ${user.email} (ID: ${user.id}, Tier: ${user.tier})`);

    // Find ALL purchases for this user
    const allCredits = await db
      .select({
        id: oneTimeCredits.id,
        userId: oneTimeCredits.userId,
        purchasedAt: oneTimeCredits.purchasedAt,
        creditsRemaining: oneTimeCredits.creditsRemaining,
        productType: oneTimeCredits.productType,
        refunded: oneTimeCredits.refunded,
      })
      .from(oneTimeCredits)
      .where(eq(oneTimeCredits.userId, user.id));

    console.log(`📦 Found ${allCredits.length} purchase records:`, allCredits);

    // Find their coffee purchase
    const credits = await db
      .select({
        id: oneTimeCredits.id,
        userId: oneTimeCredits.userId,
        purchasedAt: oneTimeCredits.purchasedAt,
        creditsRemaining: oneTimeCredits.creditsRemaining,
      })
      .from(oneTimeCredits)
      .where(eq(oneTimeCredits.userId, user.id))
      .limit(1);

    if (!credits.length) {
      console.log('📝 No coffee purchase found - creating one...');

      // Create a Coffee purchase record
      const newPurchaseDate = new Date('2025-09-27T12:00:00Z');

      const [newPurchase] = await db
        .insert(oneTimeCredits)
        .values({
          userId: user.id,
          creditsRemaining: 73, // From your dashboard
          creditsTotal: 100,
          productType: 'coffee',
          purchasedAt: newPurchaseDate,
          refunded: false,
        })
        .returning();

      console.log(`✅ Created Coffee purchase record with date: ${newPurchaseDate}`);
      console.log(`✅ Credits: 73/100`);
      console.log(`✅ You are now eligible for 30-day money-back guarantee!`);

      process.exit(0);
    }

    const purchase = credits[0];
    console.log(`📅 Current purchase date: ${purchase.purchasedAt}`);

    // Set new purchase date to September 27, 2025
    const newPurchaseDate = new Date('2025-09-27T12:00:00Z');

    await db
      .update(oneTimeCredits)
      .set({ purchasedAt: newPurchaseDate })
      .where(eq(oneTimeCredits.id, purchase.id));

    console.log(`✅ Updated purchase date to: ${newPurchaseDate}`);
    console.log(`✅ This makes you eligible for the 30-day money-back guarantee!`);

    // Calculate days remaining
    const now = new Date();
    const daysElapsed = Math.floor((now.getTime() - newPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = 30 - daysElapsed;

    console.log(`📊 Days elapsed: ${daysElapsed}/30`);
    console.log(`📊 Days remaining: ${daysRemaining} days`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updatePurchaseDate();
