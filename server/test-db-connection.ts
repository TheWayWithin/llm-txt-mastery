import { pool, db } from './db';
import { authUsers } from '@shared/schema';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');

    // Test raw pool connection
    const poolResult = await pool.query('SELECT NOW()');
    console.log('✅ Pool connection successful:', poolResult.rows[0]);

    // Test Drizzle select
    const users = await db.select().from(authUsers).limit(1);
    console.log('✅ Drizzle select successful, users count:', users.length);

    // Test Drizzle insert
    const testUser = {
      email: `test${Date.now()}@example.com`,
      passwordHash: 'test_hash',
      emailVerified: false,
      tier: 'starter' as const,
      creditsRemaining: 0,
    };

    console.log('📝 Attempting to insert:', testUser);

    const [insertedUser] = await db.insert(authUsers).values(testUser).returning();
    console.log('✅ User inserted successfully:', insertedUser);

    // Clean up test user
    await pool.query('DELETE FROM auth_users WHERE email = $1', [testUser.email]);
    console.log('🧹 Test user cleaned up');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

testConnection();
