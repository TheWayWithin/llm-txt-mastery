import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set. Using in-memory storage for testing only!');
  // For testing only - includes postgres user to avoid defaulting to OS user (e.g., root in CI)
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test';
}

// Simple pool configuration - let it connect lazily when needed
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle({ client: pool, schema });
