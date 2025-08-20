#!/usr/bin/env tsx
// Fix for llmTextFiles table column naming issue
// Run this script if you encounter "column analysis_id does not exist" error

import { db } from './db';

async function fixLlmTextFilesColumns() {
  console.log('🔧 Fixing llmTextFiles table column names...');
  
  try {
    // Check current column names
    const checkResult = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'llmTextFiles'
      ORDER BY ordinal_position;
    `);
    
    const columns = checkResult.rows.map((r: any) => r.column_name);
    console.log('Current columns:', columns);
    
    // Fix camelCase columns to snake_case
    const renames = [
      { old: 'analysisId', new: 'analysis_id' },
      { old: 'selectedPages', new: 'selected_pages' },
      { old: 'createdAt', new: 'created_at' }
    ];
    
    for (const { old: oldName, new: newName } of renames) {
      if (columns.includes(oldName)) {
        console.log(`  Renaming ${oldName} → ${newName}...`);
        await db.execute(`ALTER TABLE "llmTextFiles" RENAME COLUMN "${oldName}" TO ${newName}`);
        console.log(`  ✅ Renamed successfully`);
      } else if (columns.includes(newName)) {
        console.log(`  ✓ Column ${newName} already correct`);
      } else {
        console.log(`  ⚠️ Neither ${oldName} nor ${newName} found`);
      }
    }
    
    // Verify final state
    const verifyResult = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'llmTextFiles'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n✅ Final column names:');
    console.log(verifyResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing columns:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixLlmTextFilesColumns();
}