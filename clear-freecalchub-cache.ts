#!/usr/bin/env tsx

import { db } from "./server/db";
import { analysisCache } from "@shared/schema";
import { eq, like, or } from "drizzle-orm";
import crypto from 'crypto';

/**
 * Script to clear cache entries for freecalchub.com
 * This will force a fresh analysis with the new enhanced LLMs.txt generation
 */
async function clearFreecalchubCache() {
  console.log("🔍 Searching for freecalchub.com cache entries...");
  
  try {
    // Generate possible URL hashes for freecalchub
    const urls = [
      'https://freecalchub.com',
      'http://freecalchub.com',
      'https://www.freecalchub.com',
      'http://www.freecalchub.com'
    ];
    
    const urlHashes = urls.map(url => 
      crypto.createHash('sha256').update(url).digest('hex')
    );
    
    console.log("📋 Checking URL hashes:", urlHashes);
    
    // Find all cache entries for freecalchub
    const cacheEntries = await db
      .select()
      .from(analysisCache)
      .where(
        or(
          like(analysisCache.url, '%freecalchub%'),
          ...urlHashes.map(hash => eq(analysisCache.urlHash, hash))
        )
      );
    
    if (cacheEntries.length === 0) {
      console.log("✅ No cache entries found for freecalchub.com");
      console.log("   Fresh analysis will use enhanced generation!");
      return;
    }
    
    console.log(`📊 Found ${cacheEntries.length} cache entries:`);
    cacheEntries.forEach(entry => {
      console.log(`   - URL: ${entry.url}`);
      console.log(`     Tier: ${entry.tier}`);
      console.log(`     Created: ${entry.createdAt}`);
      console.log(`     Expires: ${entry.expiresAt}`);
      console.log(`     Hits: ${entry.hitCount}`);
    });
    
    // Delete the cache entries
    console.log("\n🗑️  Deleting cache entries...");
    
    const deleteResult = await db
      .delete(analysisCache)
      .where(
        or(
          like(analysisCache.url, '%freecalchub%'),
          ...urlHashes.map(hash => eq(analysisCache.urlHash, hash))
        )
      )
      .returning({ id: analysisCache.id });
    
    console.log(`✅ Successfully deleted ${deleteResult.length} cache entries`);
    console.log("\n🎉 Cache cleared! Next analysis of freecalchub.com will:");
    console.log("   ✅ Use Phase 1: Mandatory blockquote summary");
    console.log("   ✅ Use Phase 2: Dynamic topical clustering");
    console.log("   ✅ Use Phase 3: Semantic tagging system");
    console.log("   ✅ Use Phase 4: Intelligent page sequencing");
    console.log("   ✅ Use Phase 5: Enhanced metadata extraction");
    console.log("   ✅ Use Phase 6: Content quality improvements");
    
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
clearFreecalchubCache();