#!/bin/bash

# Image Optimization Script for LLM.txt Mastery
echo "🎨 OPTIMIZING IMAGES FOR WEB PERFORMANCE"
echo "========================================="

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed. Please install it first:"
    echo "   brew install imagemagick"
    exit 1
fi

# Navigate to images directory
cd client/public/images

# Function to optimize PNG
optimize_png() {
    local file=$1
    local max_width=$2
    local quality=${3:-85}
    
    if [ -f "$file" ]; then
        local original_size=$(ls -lh "$file" | awk '{print $5}')
        
        # Create backup
        cp "$file" "${file}.backup"
        
        # Optimize with ImageMagick
        convert "$file" \
            -resize "${max_width}x>" \
            -quality "$quality" \
            -strip \
            -define png:compression-filter=5 \
            -define png:compression-level=9 \
            -define png:compression-strategy=1 \
            "$file"
        
        local new_size=$(ls -lh "$file" | awk '{print $5}')
        echo "✅ $file: $original_size → $new_size"
    fi
}

echo ""
echo "Optimizing critical landing page images..."
echo ""

# Optimize logo (should be smaller, it's just a header logo)
optimize_png "logo-primary.png" 400 90

# Optimize hero illustration (max width for hero section)
optimize_png "hero-illustration.png" 800 85

# Optimize how-it-works diagram (same as hero)
optimize_png "how-it-works.png" 800 85

# Optimize tier icons (smaller icons)
optimize_png "tier-free.png" 200 90
optimize_png "tier-coffee.png" 200 90
optimize_png "tier-growth.png" 200 90
optimize_png "tier-scale.png" 200 90

# Optimize other large images
optimize_png "empty-state-no-analysis.png" 400 85
optimize_png "analysis-in-progress.png" 600 85
optimize_png "success-celebration.png" 400 85
optimize_png "error-404.png" 300 85
optimize_png "error-connection.png" 300 85
optimize_png "error-generic.png" 300 85

echo ""
echo "========================================="
echo "📊 OPTIMIZATION COMPLETE"
echo ""
echo "Original backups saved as *.png.backup"
echo "To restore: for f in *.backup; do mv \"\$f\" \"\${f%.backup}\"; done"
echo ""
echo "💡 For further optimization, consider:"
echo "   1. Converting to WebP format (30-50% smaller)"
echo "   2. Using a CDN for image delivery"
echo "   3. Implementing lazy loading for below-fold images"