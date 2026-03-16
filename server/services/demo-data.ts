import { storage } from '../storage';
import { authStorage } from './auth-storage';
import { trackUsage } from './usage';
import { DiscoveredPage, UserTier } from '@shared/schema';

// Demo data constants
const DEMO_USER_ID = -1;
const DEMO_USER_EMAIL = 'demo@llmtxtmastery.com';

const demoAnalyses = [
  {
    url: 'https://example.com',
    status: 'completed' as const,
    discoveredPages: [
      {
        url: 'https://example.com',
        title: 'Example Domain',
        description: 'This domain is for use in illustrative examples in documents.',
        qualityScore: 0.85,
        category: 'informational',
        lastModified: '2024-01-15T10:00:00Z',
      },
      {
        url: 'https://example.com/about',
        title: 'About Example',
        description: 'Learn more about this example domain and its purpose.',
        qualityScore: 0.72,
        category: 'about',
        lastModified: '2024-01-15T09:30:00Z',
      },
      {
        url: 'https://example.com/contact',
        title: 'Contact Example',
        description: 'Get in touch with the Example domain team.',
        qualityScore: 0.68,
        category: 'contact',
        lastModified: '2024-01-15T09:45:00Z',
      },
    ] as DiscoveredPage[],
    analysisMetadata: {
      siteType: 'multi-page' as const,
      sitemapFound: true,
      analysisMethod: 'sitemap' as const,
      message: 'Successfully analyzed website using sitemap discovery.',
      totalPagesFound: 3,
      userEmail: DEMO_USER_EMAIL,
      tier: 'solo' as UserTier,
      metrics: {
        cacheHit: false,
        processingTime: 2500,
        apiCalls: 3,
        costSaved: 0,
        analyzedPages: 3,
        cachedPages: 0,
        aiCallsUsed: 3,
        htmlExtractionsUsed: 0,
      },
      processingTime: 2500,
    },
  },
  {
    url: 'https://demo-site.com',
    status: 'completed' as const,
    discoveredPages: [
      {
        url: 'https://demo-site.com',
        title: 'Demo Site - Homepage',
        description: 'Welcome to our demonstration website showcasing various features.',
        qualityScore: 0.92,
        category: 'homepage',
        lastModified: '2024-01-20T14:30:00Z',
      },
      {
        url: 'https://demo-site.com/features',
        title: 'Features Overview',
        description: 'Comprehensive overview of all available features and capabilities.',
        qualityScore: 0.88,
        category: 'features',
        lastModified: '2024-01-20T14:00:00Z',
      },
      {
        url: 'https://demo-site.com/documentation',
        title: 'Documentation Hub',
        description: 'Complete documentation for developers and users.',
        qualityScore: 0.95,
        category: 'documentation',
        lastModified: '2024-01-20T13:45:00Z',
      },
      {
        url: 'https://demo-site.com/api-reference',
        title: 'API Reference',
        description: 'Detailed API documentation with examples and usage guides.',
        qualityScore: 0.91,
        category: 'documentation',
        lastModified: '2024-01-20T13:30:00Z',
      },
      {
        url: 'https://demo-site.com/blog',
        title: 'Company Blog',
        description: 'Latest updates, insights, and technical articles from our team.',
        qualityScore: 0.78,
        category: 'blog',
        lastModified: '2024-01-20T12:00:00Z',
      },
    ] as DiscoveredPage[],
    analysisMetadata: {
      siteType: 'multi-page' as const,
      sitemapFound: true,
      analysisMethod: 'sitemap' as const,
      message: 'Successfully analyzed comprehensive website with AI-powered content scoring.',
      totalPagesFound: 5,
      userEmail: DEMO_USER_EMAIL,
      tier: 'solo' as UserTier,
      metrics: {
        cacheHit: false,
        processingTime: 4200,
        apiCalls: 5,
        costSaved: 0,
        analyzedPages: 5,
        cachedPages: 0,
        aiCallsUsed: 5,
        htmlExtractionsUsed: 0,
      },
      processingTime: 4200,
    },
  },
];

/**
 * Ensures demo data exists for the demo user
 * Creates sample analyses, LLM files, and usage tracking if not present
 */
export async function ensureDemoData(): Promise<void> {
  try {
    console.log('🎭 Ensuring demo data exists for demo user...');

    // Check if demo data already exists
    const existingAnalyses = await authStorage.getUserAnalyses(DEMO_USER_EMAIL);

    if (existingAnalyses.length > 0) {
      console.log(`✅ Demo data already exists (${existingAnalyses.length} analyses found)`);
      return;
    }

    console.log('🔧 Creating demo data...');

    // First, ensure email capture exists for demo user
    try {
      const existingEmailCapture = await storage.getEmailCapture(DEMO_USER_EMAIL);
      if (!existingEmailCapture) {
        await storage.createEmailCapture({
          userId: DEMO_USER_ID,
          email: DEMO_USER_EMAIL,
          websiteUrl: 'https://example.com',
          tier: 'solo',
        });
        console.log(`  ✅ Created email capture for demo user`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to create email capture:`, error);
    }

    // Create demo analyses
    const createdAnalyses = [];

    for (const demoAnalysis of demoAnalyses) {
      try {
        const analysis = await storage.createAnalysis({
          userId: DEMO_USER_ID,
          url: demoAnalysis.url,
          sitemapContent: null,
          discoveredPages: demoAnalysis.discoveredPages,
          status: demoAnalysis.status,
          analysisMetadata: demoAnalysis.analysisMetadata,
        });

        createdAnalyses.push(analysis);
        console.log(`  ✅ Created analysis for ${demoAnalysis.url} (ID: ${analysis.id})`);
      } catch (error) {
        console.error(`  ❌ Failed to create analysis for ${demoAnalysis.url}:`, error);
      }
    }

    // Create demo LLM.txt file for the first analysis (example.com)
    if (createdAnalyses.length > 0) {
      const firstAnalysis = createdAnalyses[0];

      try {
        const selectedPages =
          firstAnalysis.discoveredPages?.map((page) => ({
            url: page.url,
            title: page.title,
            description: page.description,
            selected: page.qualityScore > 0.7, // Select high-quality pages
            category: page.category,
            qualityScore: page.qualityScore,
          })) || [];

        const llmFileContent = generateLLMFileContent(firstAnalysis.url, selectedPages);

        const llmFile = await storage.createLlmFile({
          userId: DEMO_USER_ID,
          analysisId: firstAnalysis.id,
          selectedPages,
          content: llmFileContent,
        });

        console.log(`  ✅ Created LLM.txt file for ${firstAnalysis.url} (ID: ${llmFile.id})`);
      } catch (error) {
        console.error(`  ❌ Failed to create LLM.txt file:`, error);
      }
    }

    // Create usage tracking entry showing demo activity
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      const totalPages = createdAnalyses.reduce(
        (total, analysis) => total + (analysis.discoveredPages?.length || 0),
        0
      );
      const totalAICalls = createdAnalyses.reduce(
        (total, analysis) => total + (analysis.analysisMetadata?.metrics?.aiCallsUsed || 0),
        0
      );

      await trackUsage(
        DEMO_USER_EMAIL,
        totalPages, // pagesProcessed
        totalAICalls, // aiCallsCount
        0, // htmlExtractionsCount
        0, // cacheHits
        0 // estimatedCost
      );

      console.log(`  ✅ Created usage tracking for ${today}`);
    } catch (error) {
      console.error(`  ❌ Failed to create usage tracking:`, error);
    }

    console.log('🎉 Demo data creation completed successfully!');
  } catch (error) {
    console.error('❌ Failed to ensure demo data:', error);
    // Don't throw - demo data creation failure shouldn't block login
  }
}

/**
 * Generates LLM.txt file content from selected pages
 */
function generateLLMFileContent(url: string, selectedPages: any[]): string {
  const selectedPagesOnly = selectedPages.filter((page) => page.selected);
  const domain = new URL(url).hostname;

  const header = `# ${domain} - LLM.txt

This file contains information about ${domain} to help large language models understand and interact with this website.

## Website Overview
- **Domain**: ${domain}
- **Total Pages Analyzed**: ${selectedPages.length}
- **Pages Included**: ${selectedPagesOnly.length}
- **Analysis Date**: ${new Date().toISOString().split('T')[0]}

## Selected Pages

The following pages have been selected based on their content quality and relevance:

`;

  const pagesList = selectedPagesOnly
    .map((page) => {
      return `### ${page.title}
- **URL**: ${page.url}
- **Description**: ${page.description}
- **Category**: ${page.category || 'general'}
- **Quality Score**: ${page.qualityScore?.toFixed(2) || 'N/A'}

`;
    })
    .join('');

  const footer = `
## Usage Guidelines

This content is provided to help AI systems understand the structure and content of ${domain}. 
When referencing this site, please:

1. Use the most relevant pages based on the user's query
2. Provide accurate URLs when linking to specific content  
3. Respect the website's terms of service and robots.txt
4. Consider the quality scores when prioritizing information

---
Generated by LLM.txt Mastery (https://llmtxtmastery.com)
`;

  return header + pagesList + footer;
}

/**
 * Cleans up demo data (for testing purposes)
 */
export async function cleanupDemoData(): Promise<void> {
  try {
    console.log('🧹 Cleaning up demo data...');

    // Note: This would require implementing deletion methods in storage
    // For now, just log the intent
    console.log('Demo data cleanup would remove analyses and files for demo user');
  } catch (error) {
    console.error('❌ Failed to cleanup demo data:', error);
  }
}
