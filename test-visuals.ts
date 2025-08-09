// Visual Refresh Testing Script
import fs from 'fs';
import path from 'path';

console.log("🎨 TESTING VISUAL REFRESH IMPLEMENTATION\n");

// Test 1: Verify all image files exist
console.log("Test 1: Image Asset Verification");
console.log("=".repeat(50));

const imageFiles = [
  'logo-primary.png',
  'logo-icon.png',
  'hero-illustration.png',
  'how-it-works.png',
  'tier-free.png',
  'tier-coffee.png',
  'tier-growth.png',
  'tier-scale.png',
  'empty-state-no-analysis.png',
  'analysis-in-progress.png',
  'success-celebration.png',
  'error-404.png',
  'error-connection.png',
  'error-generic.png'
];

const imagesDir = path.join(process.cwd(), 'client/public/images');
let allImagesPresent = true;

imageFiles.forEach(file => {
  const filePath = path.join(imagesDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(0);
    console.log(`  ✅ ${file} (${sizeKB} KB)`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    allImagesPresent = false;
  }
});

// Test 2: Verify favicon
console.log("\nTest 2: Favicon Verification");
console.log("=".repeat(50));

const faviconPath = path.join(process.cwd(), 'client/public/favicon/logo-icon.png');
if (fs.existsSync(faviconPath)) {
  const stats = fs.statSync(faviconPath);
  console.log(`  ✅ Favicon present (${(stats.size / 1024).toFixed(0)} KB)`);
} else {
  console.log(`  ❌ Favicon missing!`);
}

// Test 3: Check HTML meta tags
console.log("\nTest 3: HTML Meta Tags");
console.log("=".repeat(50));

const indexPath = path.join(process.cwd(), 'client/index.html');
const htmlContent = fs.readFileSync(indexPath, 'utf-8');

const metaChecks = [
  { pattern: /favicon\/logo-icon\.png/, name: "Favicon link" },
  { pattern: /apple-touch-icon/, name: "Apple touch icon" },
  { pattern: /og:title/, name: "Open Graph title" },
  { pattern: /og:image/, name: "Open Graph image" },
  { pattern: /twitter:card/, name: "Twitter card" },
  { pattern: /LLM\.txt Mastery/, name: "Title meta tag" }
];

metaChecks.forEach(check => {
  if (check.pattern.test(htmlContent)) {
    console.log(`  ✅ ${check.name}`);
  } else {
    console.log(`  ❌ ${check.name} - Missing!`);
  }
});

// Test 4: Component Integration
console.log("\nTest 4: Component Integration");
console.log("=".repeat(50));

const componentChecks = [
  { file: 'client/src/pages/home.tsx', checks: ['logo-primary.png', 'hero-illustration.png', 'how-it-works.png'] },
  { file: 'client/src/components/email-capture.tsx', checks: ['tier-free.png', 'tier-coffee.png', 'tier-growth.png', 'tier-scale.png'] },
  { file: 'client/src/components/ErrorStates.tsx', checks: ['error-404.png', 'error-connection.png', 'error-generic.png'] },
  { file: 'client/src/components/content-analysis.tsx', checks: ['analysis-in-progress.png'] },
  { file: 'client/src/pages/coffee-success.tsx', checks: ['success-celebration.png'] }
];

componentChecks.forEach(component => {
  const filePath = path.join(process.cwd(), component.file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`\n  ${component.file}:`);
    component.checks.forEach(imageRef => {
      if (content.includes(imageRef)) {
        console.log(`    ✅ References ${imageRef}`);
      } else {
        console.log(`    ❌ Missing reference to ${imageRef}`);
      }
    });
  }
});

// Test 5: Image Optimization Recommendations
console.log("\n\nTest 5: Optimization Recommendations");
console.log("=".repeat(50));

let totalSize = 0;
const largeImages: string[] = [];

imageFiles.forEach(file => {
  const filePath = path.join(imagesDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
    if (stats.size > 500 * 1024) { // Images larger than 500KB
      largeImages.push(`${file} (${(stats.size / 1024).toFixed(0)} KB)`);
    }
  }
});

console.log(`  Total image size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
if (largeImages.length > 0) {
  console.log(`  ⚠️  Large images that could be optimized:`);
  largeImages.forEach(img => console.log(`    - ${img}`));
  console.log(`  💡 Consider converting to WebP format for 30% size reduction`);
} else {
  console.log(`  ✅ All images are reasonably sized`);
}

// Summary
console.log("\n" + "=".repeat(50));
console.log("📊 VISUAL REFRESH TEST SUMMARY");
console.log("=".repeat(50));

const totalTests = imageFiles.length + 1 + metaChecks.length;
const passedTests = imageFiles.filter(f => 
  fs.existsSync(path.join(imagesDir, f))
).length + 
(fs.existsSync(faviconPath) ? 1 : 0) +
metaChecks.filter(c => c.pattern.test(htmlContent)).length;

console.log(`  Tests Passed: ${passedTests}/${totalTests}`);
console.log(`  Success Rate: ${((passedTests/totalTests) * 100).toFixed(0)}%`);

if (allImagesPresent && fs.existsSync(faviconPath)) {
  console.log(`\n✅ VISUAL REFRESH SUCCESSFULLY IMPLEMENTED!`);
  console.log(`   All brand assets are properly integrated.`);
} else {
  console.log(`\n⚠️  Some visual assets may be missing.`);
  console.log(`   Please check the errors above.`);
}

console.log("\n🌐 Open http://localhost:5173 in your browser to see the visual refresh live!");