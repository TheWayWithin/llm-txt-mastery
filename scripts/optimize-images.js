#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const IMAGE_CONFIG = {
  // Critical above-fold images
  'hero-illustration.png': {
    sizes: [
      { width: 1200, suffix: '' },      // Default size
      { width: 800, suffix: '-md' },    // Medium screens
      { width: 400, suffix: '-sm' }     // Mobile
    ],
    quality: 85,
    priority: 'high'
  },
  'how-it-works.png': {
    sizes: [
      { width: 1200, suffix: '' },
      { width: 800, suffix: '-md' },
      { width: 400, suffix: '-sm' }
    ],
    quality: 85,
    priority: 'medium'
  },
  // Other images can be optimized with single size
  'logo-primary.png': {
    sizes: [{ width: 300, suffix: '' }],
    quality: 90,
    priority: 'high'
  }
};

const SOURCE_DIR = path.join(__dirname, '../dist/public/images');
const OUTPUT_DIR = path.join(__dirname, '../dist/public/images/optimized');

async function ensureDirectory(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function optimizeImage(filename, config) {
  const inputPath = path.join(SOURCE_DIR, filename);
  const basename = path.basename(filename, path.extname(filename));
  
  console.log(`\n📸 Processing ${filename}...`);
  
  try {
    // Get original file size
    const stats = await fs.stat(inputPath);
    const originalSize = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`  Original size: ${originalSize} MB`);
    
    for (const size of config.sizes) {
      const outputName = `${basename}${size.suffix}`;
      
      // Generate optimized PNG
      const pngOutput = path.join(OUTPUT_DIR, `${outputName}.png`);
      await sharp(inputPath)
        .resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .png({
          quality: config.quality,
          compressionLevel: 9,
          progressive: true
        })
        .toFile(pngOutput);
      
      const pngStats = await fs.stat(pngOutput);
      const pngSize = (pngStats.size / 1024 / 1024).toFixed(2);
      console.log(`  ✓ PNG ${size.width}px: ${pngSize} MB (${pngOutput})`);
      
      // Generate WebP version
      const webpOutput = path.join(OUTPUT_DIR, `${outputName}.webp`);
      await sharp(inputPath)
        .resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({
          quality: config.quality,
          effort: 6
        })
        .toFile(webpOutput);
      
      const webpStats = await fs.stat(webpOutput);
      const webpSize = (webpStats.size / 1024 / 1024).toFixed(2);
      const savings = Math.round((1 - webpStats.size / stats.size) * 100);
      console.log(`  ✓ WebP ${size.width}px: ${webpSize} MB (-${savings}%)`);
      
      // Generate AVIF version for modern browsers
      const avifOutput = path.join(OUTPUT_DIR, `${outputName}.avif`);
      await sharp(inputPath)
        .resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .avif({
          quality: config.quality - 5, // AVIF can use slightly lower quality
          effort: 6
        })
        .toFile(avifOutput);
      
      const avifStats = await fs.stat(avifOutput);
      const avifSize = (avifStats.size / 1024 / 1024).toFixed(2);
      const avifSavings = Math.round((1 - avifStats.size / stats.size) * 100);
      console.log(`  ✓ AVIF ${size.width}px: ${avifSize} MB (-${avifSavings}%)`);
    }
    
    // Copy optimized default size back to main images folder
    const defaultPng = path.join(OUTPUT_DIR, `${basename}.png`);
    const targetPath = path.join(SOURCE_DIR, filename);
    await fs.copyFile(defaultPng, targetPath);
    console.log(`  ✓ Replaced original with optimized version`);
    
  } catch (error) {
    console.error(`  ✗ Error processing ${filename}:`, error.message);
  }
}

async function processAllImages() {
  console.log('🚀 Starting image optimization...\n');
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  
  // Ensure output directory exists
  await ensureDirectory(OUTPUT_DIR);
  
  // Check if source images exist
  const existingImages = [];
  for (const [filename, config] of Object.entries(IMAGE_CONFIG)) {
    try {
      await fs.access(path.join(SOURCE_DIR, filename));
      existingImages.push([filename, config]);
    } catch {
      console.log(`⚠️  Skipping ${filename} (not found)`);
    }
  }
  
  // Process each image
  for (const [filename, config] of existingImages) {
    await optimizeImage(filename, config);
  }
  
  // Generate picture component helper
  await generatePictureHelper();
  
  console.log('\n✅ Image optimization complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Update your React components to use the OptimizedImage component');
  console.log('2. Deploy to see the performance improvements');
  console.log('3. Test with PageSpeed Insights to verify improvements');
}

async function generatePictureHelper() {
  const helperContent = `// Auto-generated image optimization helper
import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
}

export function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  loading = 'lazy',
  sizes = '100vw' 
}: OptimizedImageProps) {
  // Extract base name and extension
  const basename = src.replace(/\\.png$/, '').replace('/images/', '/images/optimized/');
  
  return (
    <picture>
      {/* AVIF for modern browsers */}
      <source
        type="image/avif"
        srcSet={\`
          \${basename}-sm.avif 400w,
          \${basename}-md.avif 800w,
          \${basename}.avif 1200w
        \`}
        sizes={sizes}
      />
      
      {/* WebP for good browser support */}
      <source
        type="image/webp"
        srcSet={\`
          \${basename}-sm.webp 400w,
          \${basename}-md.webp 800w,
          \${basename}.webp 1200w
        \`}
        sizes={sizes}
      />
      
      {/* PNG fallback */}
      <img
        src={src}
        srcSet={\`
          \${basename}-sm.png 400w,
          \${basename}-md.png 800w,
          \${basename}.png 1200w
        \`}
        sizes={sizes}
        alt={alt}
        className={className}
        loading={loading}
      />
    </picture>
  );
}
`;

  const helperPath = path.join(__dirname, '../client/src/components/OptimizedImage.tsx');
  await fs.writeFile(helperPath, helperContent);
  console.log('\n📦 Generated OptimizedImage component');
}

// Run the optimization
processAllImages().catch(console.error);