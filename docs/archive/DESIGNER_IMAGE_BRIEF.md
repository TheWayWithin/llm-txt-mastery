# Image Design Brief - LLM.txt Mastery
*Designer Requirements Document - August 8, 2025*

## Project Overview
LLM.txt Mastery needs custom images to transform from basic MVP to professional SaaS product. The app helps users generate AI-optimized files for their websites. Primary revenue comes from $4.95 "Coffee tier" one-time purchases.

## Brand Colors (Use These Exactly)
```
Primary Blue:    #2A3F7F (Mastery Blue)
Accent Teal:     #00A6C7 (Innovation Teal)  
Coffee Orange:   #EA580C (Coffee tier)
Success Green:   #10B981 (Free tier)
Text Gray:       #64748B (AI Silver)
```

## PRIORITY 1 - Must Have (Due: Week 1)

### 1. Company Logo
**What we need:** Professional logo replacing generic brain icon
**Current state:** Using basic Brain icon from icon library
**Requirements:**
- Full logo: "LLM.txt Mastery" with icon/mark
- Icon only version (for mobile/favicon)
- Deliverables: SVG format, transparent background
- Style: Modern, technical but approachable
- Incorporate: AI/neural network concept subtly
- Colors: Primary Blue (#2A3F7F) with Teal accent (#00A6C7)
- Size: Must be legible at 32x32px (icon) and 180x40px (full)

### 2. Hero Illustration
**What we need:** Main visual for homepage hero section
**Current state:** Text only with small colored dots
**Requirements:**
- Size: 800x400px (desktop), 400x300px (mobile)
- Concept: Abstract visualization of "website transforming into AI-ready content"
- Style: Modern, geometric, clean
- Colors: Gradient from Teal (#00A6C7) to Blue (#2A3F7F)
- Format: SVG preferred, PNG fallback
- Should work on white background
- Avoid: Generic robots, overly complex details

### 3. Coffee Tier Illustration
**What we need:** Distinctive visual for $4.95 Coffee tier (main revenue driver)
**Current state:** Generic coffee emoji ☕
**Requirements:**
- Size: 120x120px
- Concept: Premium coffee cup with subtle tech/AI elements
- Style: Warm, inviting, worth paying for
- Colors: Coffee Orange (#EA580C) primary, brown accents
- Format: SVG
- Must feel more valuable than free tier
- Include: Steam with circuit patterns or data nodes

## PRIORITY 2 - Should Have (Due: Week 2)

### 4. Tier Comparison Icons Set
**What we need:** 4 distinctive icons for pricing tiers
**Current state:** Generic icons (check, coffee, zap, crown)
**Requirements:**
- Size: 80x80px each
- Set of 4:
  - FREE: Simple, starter concept (Green #10B981)
  - COFFEE: Premium coffee visual (Orange #EA580C)  
  - GROWTH: Upward trend/rocket (Teal #00A6C7)
  - SCALE: Enterprise/globe (Blue #2A3F7F)
- Style: Consistent line weight, modern
- Format: SVG
- Each should feel progressively more premium

### 5. Empty State Illustration
**What we need:** Friendly visual when user has no analyses yet
**Current state:** Generic globe icon with text
**Requirements:**
- Size: 300x200px
- Concept: Friendly character/robot waiting to help analyze
- Message: "Ready to analyze your first website!"
- Style: Friendly, encouraging, not childish
- Colors: Use brand palette, light/positive feel
- Format: SVG
- Include: Subtle call-to-action visual cue

### 6. Analysis in Progress Animation
**What we need:** Visual for 30+ second loading state
**Current state:** Basic spinning loader
**Requirements:**
- Size: 400x300px
- Concept: Website being scanned/analyzed by AI
- Style: Animated or animation-ready (multiple states)
- Colors: Brand colors with movement
- Format: SVG sprite sheet or Lottie JSON
- Show: Progress/movement without specific percentage

## PRIORITY 3 - Nice to Have (Due: Week 3)

### 7. Success Celebration Graphic
**What we need:** Celebration visual for successful completion
**Current state:** Basic checkmark icon
**Requirements:**
- Size: 300x300px
- Concept: Success/celebration with confetti or stars
- Style: Delightful but professional
- Format: SVG or Lottie animation
- Use: After payment success or file generation

### 8. How It Works Diagram
**What we need:** 3-step process visualization
**Current state:** Text-only explanation
**Requirements:**
- Size: 800x200px (full width)
- 3 steps: 
  1. Enter URL
  2. AI Analysis  
  3. Download File
- Style: Simple icons with connecting lines
- Format: SVG
- Colors: Use brand palette

### 9. Error State Illustrations (Set of 3)
**What we need:** Friendly error visuals
**Current state:** Generic error icons
**Types needed:**
- 404/Not found (200x150px)
- Connection error (200x150px)
- Generic error (200x150px)
- Style: Helpful, not alarming
- Include: Visual suggesting solution

## Design Guidelines

### Overall Style Direction
- **Modern & Clean:** Not cluttered or overly detailed
- **Professional:** This is a B2B SaaS tool
- **Slightly Technical:** Users are website owners/developers
- **Warm Touch:** Especially for Coffee tier (main revenue)
- **Consistent:** All illustrations should feel part of same family

### Do's and Don'ts
✅ DO:
- Use brand colors consistently
- Keep designs scalable (vector when possible)
- Consider loading performance (optimize file sizes)
- Make Coffee tier feel most appealing
- Test designs at multiple sizes

❌ DON'T:
- Use stock photos or generic clip art
- Make it too playful/cartoon-like
- Use gradients except where specified
- Include text in images (we'll add that in code)
- Make it too complex or detailed

## Technical Requirements

### File Formats
- **Logos:** SVG (must include)
- **Illustrations:** SVG preferred, PNG fallback at 2x resolution
- **Animations:** Lottie JSON or SVG sprite sheets
- **Icons:** SVG only

### File Naming
```
logo-primary.svg
logo-icon.svg
hero-illustration.svg
tier-free.svg
tier-coffee.svg
tier-growth.svg
tier-scale.svg
empty-state-no-analysis.svg
analysis-in-progress.svg (or .json for animation)
success-celebration.svg
how-it-works.svg
error-404.svg
error-connection.svg
error-generic.svg
```

### Optimization
- SVG files must be optimized (use SVGO)
- PNG files must be compressed (use TinyPNG)
- Total file size for all images: < 500KB
- Each SVG should be < 20KB

## Delivery Checklist
Please provide:
- [ ] All final files in specified formats
- [ ] Source files (Figma, Illustrator, or Sketch)
- [ ] 2x PNG exports for any raster images
- [ ] Brief documentation of any animations
- [ ] Color palette used (should match brand colors)

## Reference Sites
For inspiration (style, not content):
- Stripe.com (clean, technical)
- Linear.app (modern, geometric)
- Vercel.com (developer-focused)

## Questions?
Key contexts:
- Primary users: Website owners, developers, marketers
- Main goal: Convert free users to $4.95 Coffee tier
- Success metric: Professional appearance that builds trust

---
*Please deliver Priority 1 items first for immediate implementation. We can iterate on others.*