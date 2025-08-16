import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

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
    
    // Get or create today's usage record
    const result = await db.execute(sql`
      INSERT INTO simple_usage (email, date, count, tier)
      VALUES (${email}, ${today}, 0, 'starter')
      ON CONFLICT (email, date) 
      DO UPDATE SET count = simple_usage.count
      RETURNING *
    `);
    
    const usage = result.rows[0];
    
    // Determine tier limits
    const tierLimits = {
      starter: 3,
      coffee: 999,
      growth: 999,
      scale: 999
    };
    
    const response = {
      tier: usage.tier || 'starter',
      usage: {
        analysesToday: usage.count || 0
      },
      limits: {
        dailyAnalyses: tierLimits[usage.tier || 'starter']
      }
    };
    
    console.log(`✅ [SIMPLE-USAGE] ${email}: ${response.usage.analysesToday}/${response.limits.dailyAnalyses}`);
    res.json(response);
  } catch (error) {
    console.error('[SIMPLE-USAGE] Error:', error);
    // Return default values on error
    res.json({
      tier: 'starter',
      usage: { analysesToday: 0 },
      limits: { dailyAnalyses: 3 }
    });
  }
});

// Track usage (increment counter)
router.post('/api/simple-usage/track', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const normalizedEmail = email.toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`📈 [SIMPLE-USAGE] Incrementing usage for ${normalizedEmail}`);
    
    // Increment the counter
    const result = await db.execute(sql`
      INSERT INTO simple_usage (email, date, count, tier)
      VALUES (${normalizedEmail}, ${today}, 1, 'starter')
      ON CONFLICT (email, date) 
      DO UPDATE SET count = simple_usage.count + 1
      RETURNING *
    `);
    
    const usage = result.rows[0];
    console.log(`✅ [SIMPLE-USAGE] ${normalizedEmail} now at ${usage.count} analyses today`);
    
    res.json({
      success: true,
      count: usage.count
    });
  } catch (error) {
    console.error('[SIMPLE-USAGE] Track error:', error);
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

export default router;