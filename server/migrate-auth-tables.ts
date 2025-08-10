import { pool } from './db';

async function migrateAuthTables() {
  try {
    console.log('🔍 Starting auth tables migration...');
    console.log('📊 Database URL status:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Check if tables already exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('auth_users', 'user_sessions')
    `);
    
    console.log('📋 Existing tables:', tablesCheck.rows.map(r => r.table_name));
    
    // Create auth_users table if it doesn't exist
    if (!tablesCheck.rows.find(r => r.table_name === 'auth_users')) {
      await pool.query(`
        CREATE TABLE auth_users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          email_verified BOOLEAN DEFAULT FALSE,
          tier TEXT DEFAULT 'starter',
          credits_remaining INTEGER DEFAULT 0,
          stripe_customer_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created auth_users table');
      
      // Create indexes
      await pool.query('CREATE INDEX idx_auth_users_email ON auth_users(email)');
      console.log('✅ Created auth_users indexes');
    } else {
      console.log('ℹ️ auth_users table already exists');
    }
    
    // Create user_sessions table if it doesn't exist
    if (!tablesCheck.rows.find(r => r.table_name === 'user_sessions')) {
      await pool.query(`
        CREATE TABLE user_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
          token_hash TEXT UNIQUE NOT NULL,
          refresh_token_hash TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          refresh_expires_at TIMESTAMP NOT NULL,
          last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_agent TEXT,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created user_sessions table');
      
      // Create indexes
      await pool.query('CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id)');
      await pool.query('CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash)');
      await pool.query('CREATE INDEX idx_user_sessions_refresh_token_hash ON user_sessions(refresh_token_hash)');
      console.log('✅ Created user_sessions indexes');
    } else {
      console.log('ℹ️ user_sessions table already exists');
    }
    
    console.log('✅ Auth tables migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    process.exit(1);
  }
}

export { migrateAuthTables };