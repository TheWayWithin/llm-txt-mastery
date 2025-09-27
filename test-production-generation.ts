#!/usr/bin/env tsx

/**
 * Test script to directly call production API and generate LLM file
 * This will help us see the debug logs and understand what's happening
 */

import fetch from 'node-fetch';
import { db } from './server/db';
import { sitemapAnalysis } from '@shared/schema';
import { eq } from 'drizzle-orm';

const PRODUCTION_API = 'https://llm-txt-mastery-production.up.railway.app';

async function testProductionGeneration() {
  console.log('🧪 Testing production LLM.txt generation...\n');
  
  try {
    // Get the latest freecalchub analysis (ID 57)
    const analysis = await db.select()
      .from(sitemapAnalysis)
      .where(eq(sitemapAnalysis.id, 57))
      .limit(1);
    
    if (!analysis.length) {
      console.error('❌ Analysis ID 57 not found');
      return;
    }
    
    const analysisData = analysis[0];
    console.log('📊 Using analysis:');
    console.log('  ID:', analysisData.id);
    console.log('  URL:', analysisData.url);
    console.log('  Pages:', analysisData.discoveredPages?.length || 0);
    
    // Prepare selected pages from discovered pages
    const discoveredPages = analysisData.discoveredPages as any[] || [];
    console.log('  First page example:', discoveredPages[0]);
    
    const selectedPages = discoveredPages
      .slice(0, 10) // Just test with first 10 pages
      .map((page: any) => ({
        url: page.url,
        title: page.title || 'Untitled',
        description: page.description || '',
        selected: true
      }));
    
    console.log('\n📝 Generating LLM file with', selectedPages.length, 'pages...');
    
    // Call the production API
    const response = await fetch(`${PRODUCTION_API}/api/generate-llm-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisId: 57,
        selectedPages
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', response.status, error);
      return;
    }
    
    const result = await response.json();
    console.log('\n✅ Generation successful!');
    console.log('  File ID:', result.id);
    console.log('  Page count:', result.pageCount);
    console.log('  File size:', result.fileSize, 'bytes');
    
    // Check the content for enhancements
    const content = result.content;
    console.log('\n🔍 Enhancement signatures:');
    console.log('  Has blockquote summary:', content.includes('> ') ? '✅' : '❌');
    console.log('  Has category headers:', content.includes('## ') ? '✅' : '❌');
    console.log('  Has semantic tags:', content.includes('Tags:') ? '✅' : '❌');
    console.log('  Has quality metadata:', content.includes('Quality Score:') ? '✅' : '❌');
    
    // Show first 500 chars
    console.log('\n📄 Content preview:');
    console.log(content.substring(0, 500));
    
    // Save to file for inspection
    const fs = await import('fs');
    const filename = `test-generation-${Date.now()}.txt`;
    fs.writeFileSync(filename, content);
    console.log(`\n💾 Full content saved to: ${filename}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testProductionGeneration();