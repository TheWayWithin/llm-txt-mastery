import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { StoredUserTier } from '@shared/schema';
import { authStorage } from '../services/auth-storage';

const router = Router();

// Simple usage tracking table (no foreign keys, just email+date+count)
// This avoids all the user resolution complexity
const createTableIfNotExists = async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS simple_usage (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        tier TEXT DEFAULT 'starter',
        UNIQUE(email, date)
      )
    `);
  } catch (error) {
    console.error('Failed to create simple_usage table:', error);
  }
};

// Initialize table on startup
createTableIfNotExists();

// Get usage for an email
router.get('/api/simple-usage/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    console.log(`📊 [SIMPLE-USAGE] Checking usage for ${email} on ${today}`);

    // First, check auth_users table for tier and credits
    let actualTier: StoredUserTier = 'starter';
    let creditsRemaining: number | undefined;

    try {
      const authUser = await authStorage.getUserByEmail(email);
      if (authUser) {
        // DB boundary: the tier column is text but only ever holds StoredUserTier values
        actualTier = authUser.tier as StoredUserTier;
        if (authUser.tier === 'solo' || authUser.tier === 'coffee') {
          creditsRemaining = authUser.creditsRemaining || 0;
          console.log(`[SIMPLE-USAGE] Solo tier user ${email} has ${creditsRemaining} credits`);
        }
      }
    } catch (authError) {
      console.warn(`[SIMPLE-USAGE] Could not fetch auth user for ${email}:`, authError);
    }

    // Get or create today's usage record (use actual tier from auth_users)
    const result = await db.execute(sql`
      INSERT INTO simple_usage (email, date, count, tier)
      VALUES (${email}, ${today}, 0, ${actualTier})
      ON CONFLICT (email, date) 
      DO UPDATE SET 
        count = simple_usage.count,
        tier = ${actualTier}  -- Update tier to match auth_users
      RETURNING *
    `);

    const usage = result.rows[0];

    // Determine tier limits - must match TIER_LIMITS in cache.ts
    const tierLimits = {
      starter: 3,
      solo: 20, // Match TIER_LIMITS.solo.dailyAnalyses
      coffee: 20, // Legacy alias for solo
      growth: 35, // Match TIER_LIMITS.growth.dailyAnalyses
      scale: 100, // Match TIER_LIMITS.scale.dailyAnalyses
      cancelled: 0, // Falls through to the || 3 default below, same as before this key existed
    };

    const response: any = {
      tier: actualTier, // Use tier from auth_users, not simple_usage
      usage: {
        analysesToday: usage.count || 0,
      },
      limits: {
        dailyAnalyses: tierLimits[actualTier] || 3,
      },
    };

    // Add credits for Solo tier users (handles both 'solo' and legacy 'coffee')
    if ((actualTier === 'solo' || actualTier === 'coffee') && creditsRemaining !== undefined) {
      response.creditsRemaining = creditsRemaining;
    }

    console.log(
      `✅ [SIMPLE-USAGE] ${email}: ${response.usage.analysesToday}/${response.limits.dailyAnalyses}${creditsRemaining !== undefined ? ` (${creditsRemaining} credits)` : ''}`
    );
    res.json(response);
  } catch (error) {
    console.error('[SIMPLE-USAGE] Error:', error);
    // Return default values on error
    res.json({
      tier: 'starter',
      usage: { analysesToday: 0 },
      limits: { dailyAnalyses: 3 },
    });
  }
});

// Track usage (increment counter)
router.post('/api/simple-usage/track', async (req, res) => {
  try {
    const { email, tier = 'starter' } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const normalizedEmail = email.toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    console.log(`📈 [SIMPLE-USAGE] Incrementing usage for ${normalizedEmail} (tier: ${tier})`);

    // Increment the counter and update tier
    const result = await db.execute(sql`
      INSERT INTO simple_usage (email, date, count, tier)
      VALUES (${normalizedEmail}, ${today}, 1, ${tier})
      ON CONFLICT (email, date) 
      DO UPDATE SET 
        count = simple_usage.count + 1,
        tier = ${tier}
      RETURNING *
    `);

    const usage = result.rows[0];
    console.log(
      `✅ [SIMPLE-USAGE] ${normalizedEmail} now at ${usage.count} analyses today (tier: ${usage.tier})`
    );

    res.json({
      success: true,
      count: usage.count,
      tier: usage.tier,
    });
  } catch (error) {
    console.error('[SIMPLE-USAGE] Track error:', error);
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

export default router;
