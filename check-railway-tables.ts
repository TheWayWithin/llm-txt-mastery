import { sql } from 'drizzle-orm';
import { db } from './server/db';

async function checkTables() {
  const result = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log(
    'Railway database tables:',
    result.rows.map((r) => r.table_name)
  );
  process.exit(0);
}

checkTables().catch(console.error);
