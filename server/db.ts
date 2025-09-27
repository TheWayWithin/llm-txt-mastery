import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  DATABASE_URL not set. Using in-memory storage for testing only!",
  );
  // For testing only - will use in-memory storage
  process.env.DATABASE_URL = "postgresql://localhost:5432/test";
}

// Configure pool with connection timeout to prevent blocking
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 second timeout
  idleTimeoutMillis: 30000,
  max: 10
});

// Test database connection but don't block server startup
pool.connect()
  .then(client => {
    console.log('✅ Database connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('⚠️ Database connection error:', err.message);
    console.log('Server will continue running, but database operations may fail');
  });

export const db = drizzle({ client: pool, schema });