import { db } from './server/db';
import { sitemapAnalysis } from '@shared/schema';

async function testSchema() {
  try {
    console.log('Testing schema with sitemap_analysis table...');
    const result = await db.select().from(sitemapAnalysis).limit(1);
    console.log('✅ Schema works! Found', result.length, 'records');
  } catch (error: any) {
    console.error('❌ Schema error:', error.message);
  }
  process.exit(0);
}

testSchema();
