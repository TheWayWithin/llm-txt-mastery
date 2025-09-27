#!/usr/bin/env tsx

/**
 * Generate an enhanced LLM file for the completed analysis
 */

import { db } from './server/db';
import { sitemapAnalysis } from '@shared/schema';
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';

const PRODUCTION_API = 'https://llm-txt-mastery-production.up.railway.app';

async function generateEnhancedFile() {
  console.log('🎯 Generating enhanced LLM file for your analysis...\n');
  
  try {
    // Get analysis ID 59 (your latest freecalchub analysis)
    const analysis = await db.select()
      .from(sitemapAnalysis)
      .where(eq(sitemapAnalysis.id, 59))
      .limit(1);
    
    if (!analysis.length) {
      console.error('❌ Analysis ID 59 not found');
      return;
    }
    
    const analysisData = analysis[0];
    console.log('📊 Using your analysis:');
    console.log('  ID:', analysisData.id);
    console.log('  URL:', analysisData.url);
    console.log('  Pages:', analysisData.discoveredPages?.length || 0);
    
    // Prepare all pages as selected
    const selectedPages = (analysisData.discoveredPages || [])
      .map((page: any) => ({
        url: page.url,
        title: page.title || 'Untitled',
        description: page.description || '',
        selected: true
      }));
    
    console.log('\n📝 Generating LLM file with ALL', selectedPages.length, 'pages...');
    
    // Call the production API
    const response = await fetch(`${PRODUCTION_API}/api/generate-llm-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisId: 59,
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
    
    // Show first 1000 chars
    console.log('\n📄 Content preview (first 1000 chars):');
    console.log('---');
    console.log(content.substring(0, 1000));
    console.log('---');
    
    // Save to file for inspection
    const fs = await import('fs');
    const filename = `enhanced-llm-${Date.now()}.txt`;
    fs.writeFileSync(filename, content);
    console.log(`\n💾 Full content saved to: ${filename}`);
    
    // Provide download URL
    console.log('\n📥 Download your enhanced file from:');
    console.log(`   ${PRODUCTION_API}/api/download/${result.id}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the generation
generateEnhancedFile();