/**
 * ULTRA-SIMPLE USAGE TRACKING
 * 
 * This is the SINGLE SOURCE OF TRUTH for usage tracking.
 * It uses email as the primary key and doesn't care about users, foreign keys, or complex relationships.
 * 
 * RULE: This MUST ALWAYS WORK. No exceptions, no failures, no complex logic.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

// Initialize the simple_usage table if it doesn't exist
export async function initSimpleTracking() {
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
    console.log('✅ [SIMPLE-TRACKER] Table initialized');
  } catch (error) {
    console.error('❌ [SIMPLE-TRACKER] Failed to create table:', error);
  }
}

// Increment usage - THIS MUST ALWAYS WORK
export async function incrementSimpleUsage(email: string, tier: string = 'starter'): Promise<number> {
  if (!email) {
    console.error('❌ [SIMPLE-TRACKER] No email provided');
    return 0;
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`🔍 [SIMPLE-TRACKER] INCREMENT called for: "${email}" -> normalized: "${normalizedEmail}" on ${today} with tier: ${tier}`);
  
  try {
    // Use UPSERT to ensure this always works
    const result = await db.execute(sql`
      INSERT INTO simple_usage (email, date, count, tier)
      VALUES (${normalizedEmail}, ${today}, 1, ${tier})
      ON CONFLICT (email, date) 
      DO UPDATE SET 
        count = simple_usage.count + 1,
        tier = ${tier}
      RETURNING count
    `);
    
    const newCount = result.rows[0]?.count || 1;
    console.log(`✅ [SIMPLE-TRACKER] INCREMENT SUCCESS: ${normalizedEmail}: ${newCount} analyses today (date: ${today})`);
    return newCount;
  } catch (error) {
    console.error(`❌ [SIMPLE-TRACKER] Failed to increment for ${normalizedEmail}:`, error);
    // Even if database fails, return something reasonable
    return 1;
  }
}

// Get usage - THIS MUST ALWAYS RETURN A VALUE
export async function getSimpleUsage(email: string): Promise<{ count: number; tier: string }> {
  if (!email) {
    console.log('⚠️ [SIMPLE-TRACKER] GET called with no email');
    return { count: 0, tier: 'starter' };
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`🔍 [SIMPLE-TRACKER] GET called for: "${email}" -> normalized: "${normalizedEmail}" on ${today}`);
  
  try {
    // Get or create today's record
    const result = await db.execute(sql`
      INSERT INTO simple_usage (email, date, count, tier)
      VALUES (${normalizedEmail}, ${today}, 0, 'starter')
      ON CONFLICT (email, date) 
      DO UPDATE SET count = simple_usage.count
      RETURNING count, tier
    `);
    
    const usage = result.rows[0];
    console.log(`✅ [SIMPLE-TRACKER] GET SUCCESS: ${normalizedEmail}: count=${usage?.count || 0}, tier=${usage?.tier || 'starter'} (date: ${today})`);
    return {
      count: usage?.count || 0,
      tier: usage?.tier || 'starter'
    };
  } catch (error) {
    console.error(`❌ [SIMPLE-TRACKER] Failed to get usage for ${normalizedEmail}:`, error);
    // Always return defaults on error
    return { count: 0, tier: 'starter' };
  }
}

// Initialize on module load
initSimpleTracking();