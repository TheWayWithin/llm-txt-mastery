# LLM.txt Mastery - File Generation Logic Documentation
*Last Updated: July 30, 2025*

This document explains in natural language how LLM.txt Mastery creates llms.txt files, including the complete workflow, decision-making rules, and AI integration.

## Overview

LLM.txt Mastery follows a sophisticated 4-stage process to create high-quality llms.txt files:

1. **Website Discovery** - Finding all pages on a website using multiple strategies
2. **Content Analysis** - Evaluating each page's quality and relevance for AI systems
3. **Page Selection** - Automatically and manually selecting the best pages
4. **File Generation** - Creating a properly formatted llms.txt file with metadata

The entire process is designed to be intelligent, with multiple fallback strategies and AI-enhanced analysis for premium users.

## Stage 1: Website Discovery Process

### Primary Strategy: Sitemap Discovery
The application first tries to find and parse the website's sitemap.xml file, which contains a structured list of all pages the website owner wants search engines to discover.

**Discovery Methods (in order of preference):**

1. **Direct Sitemap Check** - Looks for `sitemap.xml` at the root domain
2. **Robots.txt Analysis** - Checks `/robots.txt` for sitemap references
3. **Common Sitemap Locations** - Tests standard paths like `/sitemap_index.xml`

### Fallback Strategy: Enhanced Crawling
When no sitemap is found, the application switches to intelligent crawling:

**Homepage Link Extraction:**
- Visits the website's homepage
- Extracts all internal links (same domain only)
- Filters out unwanted content (file downloads, admin pages, external links)
- Validates each discovered URL with HEAD requests

**Common Path Testing:**
- Tests standard website paths: `/docs`, `/api`, `/about`, `/blog`, `/guide`
- Validates which paths exist and are accessible
- Builds a list of discovered pages from successful responses

**Content Filtering Rules:**
- Excludes file downloads (.pdf, .doc, .zip, etc.)
- Removes admin and login pages
- Filters out external domains and subdomains
- Skips pages that return errors or redirects

### Analysis Limitations
- **Free Tier**: Maximum 20 pages analyzed
- **Coffee Tier**: Maximum 200 pages analyzed with full AI scoring
- **Performance Optimization**: Uses parallel processing with timeouts to handle large sites efficiently

## Stage 2: Content Analysis & AI Integration

### Two-Tier Analysis System

The application uses different analysis methods based on the user's tier:

#### HTML-Based Analysis (Free Tier)
**Content Extraction:**
- Parses HTML to extract title, meta description, and main content
- Counts structural elements (paragraphs, headings, lists, code blocks)
- Analyzes word count and content depth

**Quality Scoring Algorithm:**
- **Base Score**: Starts at 3 points (conservative baseline)
- **Content Depth Scoring**: 
  - +1 point for 100+ words
  - +1 point for 300+ words  
  - +1 point for 500+ words
- **Structure Scoring**:
  - +0.5 points for 2+ headings
  - +0.5 points for 3+ paragraphs
  - +1 point for code blocks
- **Quality Indicators**:
  - +0.5 points for meaningful titles (20+ chars, no URLs)
  - +0.5 points for substantial descriptions (100+ chars)

**Navigation Page Detection:**
The system identifies and penalizes navigation-only pages:
- Looks for phrases like "from here you can", "select from"
- Checks ratio of list items to paragraphs
- Reduces quality score for pages with minimal content and excessive links

#### AI-Enhanced Analysis (Coffee+ Tiers)
**AI Integration with GPT-4o:**
- Uses OpenAI's GPT-4o model for sophisticated content analysis
- Processes up to 2000 characters of cleaned content per page
- Removes navigation, scripts, and styling elements before analysis

**AI Analysis Prompt Structure:**
```
Analyze this webpage content for AI/LLM accessibility and value.
URL: [page URL]
Title: [extracted title]
Meta Description: [meta description]
Content Sample: [cleaned content sample]

Provide JSON response with:
1. Enhanced description optimized for AI understanding (150-300 chars)
2. Quality score (1-10) based on content value for AI systems
3. Category classification
4. Relevance score (1-10) for AI training/reference
```

**AI Quality Criteria:**
- **Content Relevance** (30%): How useful the content is for AI understanding
- **Technical Documentation Quality** (25%): Completeness and accuracy of technical info
- **SEO Optimization** (20%): Structure and meta information quality
- **Information Architecture** (15%): Organization and hierarchy of content
- **User Experience Indicators** (10%): Overall page design and usability

### Category Classification
The system automatically categorizes pages:
- **Documentation**: `/docs`, `/documentation` paths
- **API Reference**: `/api` paths and technical references
- **Tutorial**: `/guide`, `/tutorial` paths
- **Blog**: `/blog` paths and article content
- **About**: Company and project information
- **Historical**: Special handling for historically significant content
- **Navigation**: Index and menu pages
- **General**: Default category for other content

### Error Handling & Fallbacks
- **AI Failure Fallback**: If AI analysis fails, automatically uses HTML analysis
- **Timeout Protection**: 10-second timeout per page to prevent hanging
- **Content Validation**: Ensures descriptions are properly truncated at word boundaries
- **Quality Score Bounds**: All scores normalized to 1-10 range

## Stage 3: Page Selection Logic

### Automatic Selection Rules

**Primary Selection Criteria:**
- **Quality Threshold**: Automatically selects pages with quality score ≥ 5
- **Smart Fallback**: If no pages meet the threshold, selects top 3 highest-scoring pages
- **User Override**: Users can manually select/deselect any discovered page

**Selection Algorithm:**
```
1. Calculate quality scores for all analyzed pages
2. IF any pages have score >= 5:
   - Auto-select all pages with score >= 5
3. ELSE:
   - Sort pages by quality score (highest first)
   - Auto-select top 3 pages
4. Allow user to modify selections in Content Review interface
```

### User Interface Controls

**Filter Options:**
- **All Pages**: Shows all discovered and analyzed pages
- **High Quality**: Shows only pages with score ≥ 7
- **Documentation**: Shows only documentation category pages
- **Tutorials**: Shows tutorial and guide content

**Manual Override Capabilities:**
- **Individual Selection**: Check/uncheck specific pages
- **Batch Operations**: Select/deselect groups based on filters
- **Quality Review**: View quality scores and reasoning for each page

### Content Review Interface
- **Page Information Display**: URL, title, description, quality score, category
- **Selection Controls**: Checkboxes for individual page selection
- **Quality Indicators**: Visual scoring with explanations
- **Preview Capabilities**: See what content will be included in final file

## Stage 4: LLM.txt File Generation

### File Structure and Format

**Header Section:**
```
# LLM.txt File for [website URL]
# Generated by LLM.txt Mastery (https://llmtxt.com)
# Created: [YYYY-MM-DD]
```

**Analysis Summary:**
```
# === ANALYSIS SUMMARY ===
# Pages Found: [total discovered] (discovered in sitemap and crawling)
# Pages Analyzed: [successfully processed] (successfully fetched and scored)
# Pages Included: [selected count] (selected for LLM.txt file)
# Pages Excluded: [excluded count] (filtered out during review)
```

**Quality Scoring Reference:**
- Explains the 1-10 scoring system
- Details the five criteria used for AI analysis
- Provides links to documentation for understanding scores

### Content Formatting Rules

**Page Entry Format:**
Each included page follows this exact structure:
```
[URL]: [Title] - [Description]
```

**Content Rules:**
- **URL**: Complete, absolute URL to the page
- **Title**: Extracted or AI-enhanced page title (max 100 characters)
- **Description**: Content summary optimized for AI understanding (max 300 characters)
- **Separation**: Double line breaks between each page entry

**Description Handling:**
- Truncates at word boundaries to avoid cutting words in half
- Adds "..." when content is truncated
- Ensures meaningful content even for minimal pages
- Removes redundant navigation language

### Excluded Pages Documentation

**Excluded Pages Section:**
```
# === EXCLUDED PAGES ===
# The following [count] pages were excluded due to lower quality scores,
# content duplication, or limited relevance for AI understanding:
```

**Exclusion Reasons:**
- Quality scores below selection threshold
- Navigation-only pages with minimal content
- Error pages or broken links
- Duplicate or redundant content
- User manual deselection

**Management Rules:**
- Lists up to 20 excluded pages to keep file manageable
- Shows count summary for larger exclusion lists
- Includes brief reasoning for exclusions

### Analysis Metadata

**Reference Links:**
- Link back to analysis details on LLM.txt Mastery platform
- Contact information for support questions
- Documentation links for format specifications

**Analysis ID Integration:**
- Unique analysis identifier for tracking and re-access
- Enables users to return to modify selections
- Supports account dashboard file history

## Quality Scoring Deep Dive

### HTML-Based Scoring Algorithm

**Content Depth Assessment:**
- **Word Count Analysis**: Measures substantial vs minimal content
- **Structural Elements**: Counts headings, paragraphs, lists for organization assessment
- **Technical Content**: Identifies code blocks and technical documentation
- **Content Completeness**: Detects incomplete descriptions and placeholder content

**Navigation vs Content Detection:**
```
Navigation Page Indicators:
- Contains "from here you can" phrases
- List items outnumber paragraphs significantly
- Word count below 300 with many links
- Minimal paragraph content with excessive navigation

Quality Adjustments:
- Navigation pages: Score reduced to 1-3 range
- Technical documentation: Bonus points for code blocks
- Historical significance: Moderate bonus (0.5 points)
- Error pages: Automatic score of 1
```

**Content Quality Penalties:**
- **Incomplete Content**: Descriptions ending with ":" or minimal length
- **Placeholder Content**: "Lorem ipsum", "coming soon" detection
- **Error Pages**: 404, error, "page not found" detection
- **Low Value Content**: Excessive navigation with minimal information

### AI-Enhanced Scoring Criteria

**Prompt Engineering:**
The AI analysis uses carefully crafted prompts that focus on:
- **AI System Value**: How useful would this content be for training or reference?
- **Technical Accuracy**: Is the information technically sound and complete?
- **Information Density**: How much useful information per unit of content?
- **Contextual Relevance**: Does the content provide meaningful context?

**JSON Response Validation:**
- Ensures AI responses conform to expected structure
- Validates score ranges (1-10) and category classifications
- Falls back to HTML analysis if AI response is invalid
- Normalizes and bounds all numerical values

**Quality Consistency:**
- AI analysis typically produces more nuanced scoring
- Combines AI insights with HTML structural analysis
- Maintains consistency with fallback HTML scoring
- Provides enhanced descriptions optimized for AI understanding

## Performance Optimizations

### Caching Strategy
- **Smart Caching**: Stores analysis results with content hash validation
- **Tier-Based Expiration**: Different cache durations for different user tiers
- **Change Detection**: Uses HTTP headers (ETag, Last-Modified) to detect updates

### Batch Processing
- **Parallel Analysis**: Processes multiple pages simultaneously
- **Timeout Management**: 10-second timeout per page to prevent hanging
- **Error Resilience**: Continues processing even if individual pages fail
- **Progress Tracking**: Real-time updates on analysis progress

### Resource Management
- **API Cost Optimization**: Intelligent caching reduces OpenAI API costs by 60-80%
- **Rate Limiting**: Prevents abuse while maintaining performance
- **Content Sampling**: Limits AI analysis to 2000 characters per page for efficiency
- **Fallback Performance**: HTML analysis as fast backup when AI is unavailable

---

**This documentation reflects the complete file generation logic as implemented in LLM.txt Mastery v2.0. The system is designed to be intelligent, efficient, and user-friendly while producing high-quality llms.txt files optimized for AI systems.**