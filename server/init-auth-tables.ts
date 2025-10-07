import { pool } from './db';

async function initAuthTables() {
  try {
    // Drop existing tables if they exist (to fix column name mismatch)
    await pool.query('DROP TABLE IF EXISTS user_sessions CASCADE');
    await pool.query('DROP TABLE IF EXISTS auth_users CASCADE');

    // Create auth_users table with correct column names
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

    // Create user_sessions table with correct column names
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
    await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email)');
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)'
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash)'
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token_hash ON user_sessions(refresh_token_hash)'
    );
    console.log('✅ Created indexes');

    console.log('✅ Auth tables initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing auth tables:', error);
    process.exit(1);
  }
}

initAuthTables();
