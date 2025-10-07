#!/usr/bin/env tsx

/**
 * Test Data Generation Script for LLM.txt Mastery Semantic Enhancement Project
 *
 * This script generates comprehensive test data for:
 * - Sample websites with varying sizes (10-1000 pages)
 * - Diverse content for clustering tests
 * - Edge cases for uniqueness testing
 * - Test embeddings data
 * - Mock Google Analytics data
 */

import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

interface TestPage {
  url: string;
  title: string;
  description: string;
  content: string;
  category: string;
  quality: number;
  contentType:
    | 'article'
    | 'product'
    | 'service'
    | 'about'
    | 'contact'
    | 'blog'
    | 'documentation'
    | 'landing';
  wordCount: number;
}

interface TestWebsite {
  domain: string;
  name: string;
  description: string;
  pages: TestPage[];
  businessType:
    | 'saas'
    | 'ecommerce'
    | 'blog'
    | 'corporate'
    | 'portfolio'
    | 'documentation'
    | 'educational';
}

interface MockAnalyticsData {
  pagePath: string;
  pageViews: number;
  uniquePageViews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  conversions: number;
  goalValue: number;
}

const CONTENT_CATEGORIES = [
  'Authentication & Security',
  'API Documentation',
  'User Management',
  'Payment Processing',
  'Data Analytics',
  'Machine Learning',
  'Frontend Development',
  'Backend Development',
  'Mobile Development',
  'DevOps & Deployment',
  'Business Intelligence',
  'Customer Support',
  'Marketing & SEO',
  'Product Management',
  'Legal & Compliance',
];

const BUSINESS_TYPES: Array<TestWebsite['businessType']> = [
  'saas',
  'ecommerce',
  'blog',
  'corporate',
  'portfolio',
  'documentation',
  'educational',
];

const CONTENT_TEMPLATES = {
  article: {
    titles: [
      'How to Build {topic} in 2025',
      'The Complete Guide to {topic}',
      'Best Practices for {topic}',
      '10 Common {topic} Mistakes to Avoid',
      'Advanced {topic} Techniques',
      'Getting Started with {topic}',
      '{topic}: Everything You Need to Know',
    ],
    descriptions: [
      'Learn the fundamentals of {topic} with our comprehensive guide.',
      'Discover best practices and advanced techniques for {topic}.',
      'Master {topic} with step-by-step instructions and real examples.',
      'Avoid common pitfalls and optimize your {topic} implementation.',
      'Expert insights and practical tips for {topic} success.',
    ],
    content: [
      "In this comprehensive guide, we'll explore the fundamentals of {topic} and how it can transform your workflow.",
      "Whether you're a beginner or an expert, understanding {topic} is crucial for modern development.",
      'This article covers everything from basic concepts to advanced implementation strategies for {topic}.',
      "We'll walk through practical examples and real-world use cases for {topic}.",
      "By the end of this guide, you'll have a solid understanding of {topic} and how to apply it effectively.",
    ],
  },
  product: {
    titles: [
      '{topic} Pro - Professional Edition',
      'Enterprise {topic} Solution',
      '{topic} Starter Package',
      'Advanced {topic} Tools',
      '{topic} Premium Features',
    ],
    descriptions: [
      'Professional-grade {topic} solution designed for enterprise needs.',
      'Get started with our comprehensive {topic} package.',
      'Advanced tools and features for {topic} professionals.',
      'Streamline your workflow with our {topic} solution.',
      'Everything you need for successful {topic} implementation.',
    ],
    content: [
      'Our {topic} solution provides enterprise-grade features and reliability.',
      'Designed for teams and organizations that need scalable {topic} capabilities.',
      'Includes advanced analytics, custom integrations, and dedicated support.',
      'Trusted by thousands of companies worldwide for their {topic} needs.',
      'Get up and running in minutes with our intuitive {topic} platform.',
    ],
  },
};

class TestDataGenerator {
  private outputDir: string;

  constructor(outputDir: string = './test-data') {
    this.outputDir = outputDir;
  }

  async generateAll(): Promise<void> {
    console.log('🚀 Starting test data generation...');

    await this.ensureOutputDirectory();

    // Generate different sized websites
    const sizes = [10, 25, 50, 100, 250, 500, 1000];
    const websites: TestWebsite[] = [];

    for (const size of sizes) {
      const website = await this.generateWebsite(size);
      websites.push(website);
      console.log(`✅ Generated ${size}-page website: ${website.name}`);
    }

    // Save all websites
    await this.saveWebsites(websites);

    // Generate clustering test data
    await this.generateClusteringTestData();

    // Generate uniqueness test data
    await this.generateUniquenessTestData();

    // Generate embeddings test data
    await this.generateEmbeddingsTestData();

    // Generate mock analytics data
    await this.generateMockAnalyticsData(websites);

    console.log('🎉 Test data generation complete!');
    console.log(`📁 Data saved to: ${this.outputDir}`);
  }

  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  private async generateWebsite(pageCount: number): Promise<TestWebsite> {
    const businessType = BUSINESS_TYPES[Math.floor(Math.random() * BUSINESS_TYPES.length)];
    const domain = `test-site-${pageCount}pages.com`;
    const name = `Test Site (${pageCount} pages)`;

    const pages: TestPage[] = [];

    // Generate diverse pages
    for (let i = 0; i < pageCount; i++) {
      const category = CONTENT_CATEGORIES[i % CONTENT_CATEGORIES.length];
      const contentType = this.getContentTypeForIndex(i, pageCount);
      const page = this.generatePage(domain, category, contentType, i);
      pages.push(page);
    }

    return {
      domain,
      name,
      description: `Test website with ${pageCount} pages for ${businessType} business`,
      pages,
      businessType,
    };
  }

  private getContentTypeForIndex(index: number, total: number): TestPage['contentType'] {
    const types: TestPage['contentType'][] = [
      'article',
      'product',
      'service',
      'about',
      'contact',
      'blog',
      'documentation',
      'landing',
    ];

    // Ensure distribution of content types
    if (index === 0) return 'landing';
    if (index === 1) return 'about';
    if (index === 2) return 'contact';
    if (index < total * 0.1) return 'landing';
    if (index < total * 0.4) return 'article';
    if (index < total * 0.6) return 'blog';
    if (index < total * 0.8) return 'documentation';
    return 'product';
  }

  private generatePage(
    domain: string,
    category: string,
    contentType: TestPage['contentType'],
    index: number
  ): TestPage {
    const templates = CONTENT_TEMPLATES[contentType] || CONTENT_TEMPLATES.article;

    const titleTemplate = templates.titles[Math.floor(Math.random() * templates.titles.length)];
    const descriptionTemplate =
      templates.descriptions[Math.floor(Math.random() * templates.descriptions.length)];
    const contentTemplate = templates.content[Math.floor(Math.random() * templates.content.length)];

    const topic = category.toLowerCase().replace(/[^a-z ]/g, '');

    const title = titleTemplate.replace(/{topic}/g, category);
    const description = descriptionTemplate.replace(/{topic}/g, category);
    const content = contentTemplate.replace(/{topic}/g, category);

    // Generate realistic word counts
    let wordCount: number;
    switch (contentType) {
      case 'article':
      case 'blog':
        wordCount = 800 + Math.floor(Math.random() * 1200);
        break;
      case 'documentation':
        wordCount = 500 + Math.floor(Math.random() * 800);
        break;
      case 'product':
      case 'service':
        wordCount = 200 + Math.floor(Math.random() * 400);
        break;
      default:
        wordCount = 150 + Math.floor(Math.random() * 300);
    }

    // Generate quality score based on content type and word count
    let quality = Math.random();
    if (contentType === 'article' || contentType === 'documentation') {
      quality = 0.6 + Math.random() * 0.4; // Higher quality for articles
    }
    if (wordCount > 1000) {
      quality = Math.min(1.0, quality + 0.2); // Boost for longer content
    }

    const url = `https://${domain}/${contentType}/${this.slugify(title)}`;

    return {
      url,
      title,
      description,
      content: this.expandContent(content, wordCount),
      category,
      quality: Math.round(quality * 10) / 10,
      contentType,
      wordCount,
    };
  }

  private expandContent(baseContent: string, targetWords: number): string {
    const words = baseContent.split(' ');
    if (words.length >= targetWords) return baseContent;

    const expansions = [
      'This approach has been proven effective in numerous real-world scenarios.',
      'Industry experts recommend this methodology for optimal results.',
      'Research shows significant improvements when following these guidelines.',
      'Implementation details vary depending on specific use cases and requirements.',
      'Best practices suggest regular monitoring and continuous optimization.',
      'Common challenges include scalability, maintainability, and performance considerations.',
      'Success metrics should be established early in the implementation process.',
      'User feedback and analytics data provide valuable insights for improvement.',
    ];

    let expandedContent = baseContent;
    while (expandedContent.split(' ').length < targetWords) {
      const expansion = expansions[Math.floor(Math.random() * expansions.length)];
      expandedContent += ' ' + expansion;
    }

    return expandedContent;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async saveWebsites(websites: TestWebsite[]): Promise<void> {
    const websitesFile = path.join(this.outputDir, 'websites.json');
    await fs.writeFile(websitesFile, JSON.stringify(websites, null, 2));

    // Save individual website files for easier testing
    for (const website of websites) {
      const filename = `website-${website.pages.length}pages.json`;
      const filepath = path.join(this.outputDir, filename);
      await fs.writeFile(filepath, JSON.stringify(website, null, 2));
    }
  }

  private async generateClusteringTestData(): Promise<void> {
    console.log('📊 Generating clustering test data...');

    const clusteringTests = [
      {
        name: 'perfect_clusters',
        description: 'Pages that should cluster perfectly by topic',
        pages: this.generatePerfectClusters(),
      },
      {
        name: 'mixed_content',
        description: 'Mixed content that requires intelligent clustering',
        pages: this.generateMixedContent(),
      },
      {
        name: 'similar_but_different',
        description: 'Similar pages that should form separate clusters',
        pages: this.generateSimilarButDifferent(),
      },
      {
        name: 'edge_cases',
        description: 'Edge cases for clustering algorithms',
        pages: this.generateClusteringEdgeCases(),
      },
    ];

    const clusteringFile = path.join(this.outputDir, 'clustering-tests.json');
    await fs.writeFile(clusteringFile, JSON.stringify(clusteringTests, null, 2));
  }

  private generatePerfectClusters(): TestPage[] {
    const clusters = [
      {
        topic: 'Authentication',
        pages: [
          'User Login Implementation',
          'Password Reset Functionality',
          'Two-Factor Authentication Setup',
          'OAuth Integration Guide',
          'Session Management Best Practices',
        ],
      },
      {
        topic: 'Payment Processing',
        pages: [
          'Stripe Integration Tutorial',
          'Payment Gateway Comparison',
          'Subscription Billing Setup',
          'Refund Processing Guide',
          'Payment Security Measures',
        ],
      },
      {
        topic: 'API Development',
        pages: [
          'RESTful API Design',
          'GraphQL Implementation',
          'API Authentication Methods',
          'Rate Limiting Strategies',
          'API Documentation Standards',
        ],
      },
    ];

    const pages: TestPage[] = [];
    clusters.forEach((cluster, clusterIndex) => {
      cluster.pages.forEach((pageTitle, pageIndex) => {
        pages.push({
          url: `https://test-clustering.com/${this.slugify(cluster.topic)}/${this.slugify(pageTitle)}`,
          title: pageTitle,
          description: `Comprehensive guide to ${pageTitle.toLowerCase()} in ${cluster.topic.toLowerCase()}`,
          content: `This guide covers everything you need to know about ${pageTitle.toLowerCase()}. ${cluster.topic} is a critical aspect of modern development.`,
          category: cluster.topic,
          quality: 0.8 + Math.random() * 0.2,
          contentType: 'article',
          wordCount: 600 + Math.floor(Math.random() * 400),
        });
      });
    });

    return pages;
  }

  private generateMixedContent(): TestPage[] {
    const topics = [
      'machine learning model deployment',
      'database optimization strategies',
      'frontend performance monitoring',
      'customer support automation',
      'business intelligence dashboards',
      'security vulnerability assessment',
      'mobile app development',
      'cloud infrastructure management',
    ];

    return topics.map((topic, index) => ({
      url: `https://mixed-content-test.com/topic-${index + 1}`,
      title: `Advanced ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
      description: `Professional insights into ${topic} for modern applications`,
      content: `This article explores ${topic} from multiple perspectives, covering technical implementation, business impact, and industry trends.`,
      category: topic.split(' ')[0],
      quality: 0.5 + Math.random() * 0.5,
      contentType: 'article',
      wordCount: 500 + Math.floor(Math.random() * 600),
    }));
  }

  private generateSimilarButDifferent(): TestPage[] {
    const baseTopics = [
      {
        base: 'React Development',
        variations: [
          'React Hooks Implementation',
          'React State Management',
          'React Performance Optimization',
          'React Testing Strategies',
        ],
      },
      {
        base: 'Database Design',
        variations: [
          'SQL Database Schema Design',
          'NoSQL Database Architecture',
          'Database Performance Tuning',
          'Database Migration Strategies',
        ],
      },
    ];

    const pages: TestPage[] = [];
    baseTopics.forEach((topic) => {
      topic.variations.forEach((variation, index) => {
        pages.push({
          url: `https://similar-content-test.com/${this.slugify(topic.base)}/${this.slugify(variation)}`,
          title: variation,
          description: `Specialized guide focusing on ${variation.toLowerCase()}`,
          content: `This article specifically addresses ${variation.toLowerCase()}. While related to ${topic.base.toLowerCase()}, this focuses on unique aspects and implementation details.`,
          category: topic.base,
          quality: 0.7 + Math.random() * 0.3,
          contentType: 'article',
          wordCount: 400 + Math.floor(Math.random() * 400),
        });
      });
    });

    return pages;
  }

  private generateClusteringEdgeCases(): TestPage[] {
    return [
      {
        url: 'https://edge-cases.com/empty-content',
        title: 'Empty Content Page',
        description: '',
        content: '',
        category: 'Uncategorized',
        quality: 0.1,
        contentType: 'article',
        wordCount: 0,
      },
      {
        url: 'https://edge-cases.com/very-long-content',
        title: 'Extremely Long Content Page',
        description:
          'This page contains an unusually large amount of content to test clustering performance',
        content: 'Lorem ipsum '.repeat(1000),
        category: 'Performance Testing',
        quality: 0.3,
        contentType: 'article',
        wordCount: 2000,
      },
      {
        url: 'https://edge-cases.com/special-characters',
        title: 'Page with Special Characters: 你好 世界 @ #$%^&*()',
        description: 'Testing clustering with unicode and special characters',
        content:
          'This content includes special characters: 你好世界, café, résumé, naïve, and symbols: @#$%^&*()',
        category: 'Internationalization',
        quality: 0.6,
        contentType: 'article',
        wordCount: 150,
      },
      {
        url: 'https://edge-cases.com/duplicate-content-1',
        title: 'Identical Content Page 1',
        description: 'This page has identical content to test deduplication',
        content:
          'This is exactly the same content that appears on multiple pages to test clustering deduplication.',
        category: 'Duplicate Testing',
        quality: 0.5,
        contentType: 'article',
        wordCount: 50,
      },
      {
        url: 'https://edge-cases.com/duplicate-content-2',
        title: 'Identical Content Page 2',
        description: 'This page has identical content to test deduplication',
        content:
          'This is exactly the same content that appears on multiple pages to test clustering deduplication.',
        category: 'Duplicate Testing',
        quality: 0.5,
        contentType: 'article',
        wordCount: 50,
      },
    ];
  }

  private async generateUniquenessTestData(): Promise<void> {
    console.log('🔍 Generating uniqueness test data...');

    const uniquenessTests = [
      {
        name: 'identical_descriptions',
        description: 'Pages with identical descriptions that need uniqueness enhancement',
        pages: this.generateIdenticalDescriptions(),
      },
      {
        name: 'similar_descriptions',
        description: 'Pages with very similar descriptions',
        pages: this.generateSimilarDescriptions(),
      },
      {
        name: 'generic_descriptions',
        description: 'Pages with generic, low-quality descriptions',
        pages: this.generateGenericDescriptions(),
      },
      {
        name: 'high_quality_unique',
        description: 'Pages with already unique, high-quality descriptions',
        pages: this.generateHighQualityDescriptions(),
      },
    ];

    const uniquenessFile = path.join(this.outputDir, 'uniqueness-tests.json');
    await fs.writeFile(uniquenessFile, JSON.stringify(uniquenessTests, null, 2));
  }

  private generateIdenticalDescriptions(): TestPage[] {
    const identicalDescription =
      'Learn best practices and implementation strategies for modern web development.';

    return [
      'User Authentication System',
      'Payment Processing Integration',
      'Database Optimization Techniques',
      'API Security Implementation',
      'Frontend Performance Monitoring',
    ].map((title, index) => ({
      url: `https://uniqueness-test.com/identical-${index + 1}`,
      title,
      description: identicalDescription,
      content: `This guide covers ${title.toLowerCase()} with practical examples and best practices.`,
      category: 'Web Development',
      quality: 0.4,
      contentType: 'article' as const,
      wordCount: 400,
    }));
  }

  private generateSimilarDescriptions(): TestPage[] {
    const baseDescription = 'Complete guide to {topic} implementation with best practices';

    return [
      { topic: 'authentication', title: 'Authentication Guide' },
      { topic: 'authorization', title: 'Authorization Guide' },
      { topic: 'validation', title: 'Validation Guide' },
      { topic: 'sanitization', title: 'Sanitization Guide' },
    ].map((item, index) => ({
      url: `https://uniqueness-test.com/similar-${index + 1}`,
      title: item.title,
      description: baseDescription.replace('{topic}', item.topic),
      content: `This is a comprehensive guide to ${item.topic} implementation.`,
      category: 'Security',
      quality: 0.6,
      contentType: 'article' as const,
      wordCount: 350,
    }));
  }

  private generateGenericDescriptions(): TestPage[] {
    const genericDescriptions = [
      'Read more about this topic.',
      'Learn more here.',
      'Get started today.',
      'Find out more.',
      'Discover the benefits.',
    ];

    return [
      'Advanced React Patterns',
      'Node.js Performance Optimization',
      'PostgreSQL Query Tuning',
      'Docker Container Security',
      'GraphQL Schema Design',
    ].map((title, index) => ({
      url: `https://uniqueness-test.com/generic-${index + 1}`,
      title,
      description: genericDescriptions[index],
      content: `This article discusses ${title.toLowerCase()} in detail.`,
      category: 'Development',
      quality: 0.2,
      contentType: 'article' as const,
      wordCount: 300,
    }));
  }

  private generateHighQualityDescriptions(): TestPage[] {
    return [
      {
        title: 'Advanced React Hooks Patterns for Enterprise Applications',
        description:
          'Master complex React Hooks patterns including custom hooks, performance optimization with useMemo and useCallback, and advanced state management techniques for large-scale applications.',
      },
      {
        title: 'PostgreSQL Performance Tuning for High-Traffic Applications',
        description:
          'Comprehensive guide to optimizing PostgreSQL databases for high-traffic scenarios, covering indexing strategies, query optimization, connection pooling, and monitoring techniques.',
      },
      {
        title: 'Microservices Architecture with Docker and Kubernetes',
        description:
          'Learn to design, deploy, and manage microservices architectures using Docker containers and Kubernetes orchestration, including service discovery, load balancing, and monitoring.',
      },
    ].map((item, index) => ({
      url: `https://uniqueness-test.com/high-quality-${index + 1}`,
      title: item.title,
      description: item.description,
      content: `This comprehensive guide covers ${item.title.toLowerCase()} with real-world examples and practical implementation details.`,
      category: 'Advanced Topics',
      quality: 0.9,
      contentType: 'article' as const,
      wordCount: 1200,
    }));
  }

  private async generateEmbeddingsTestData(): Promise<void> {
    console.log('🧠 Generating embeddings test data...');

    // Generate mock embeddings data (1536 dimensions for OpenAI text-embedding-3-small)
    const embeddingsTests = {
      dimensions: 1536,
      test_embeddings: [
        {
          text: 'User authentication and login systems',
          embedding: this.generateMockEmbedding(),
          expected_cluster: 'authentication',
        },
        {
          text: 'Password reset and recovery functionality',
          embedding: this.generateMockEmbedding(),
          expected_cluster: 'authentication',
        },
        {
          text: 'Payment processing with Stripe integration',
          embedding: this.generateMockEmbedding(),
          expected_cluster: 'payments',
        },
        {
          text: 'Subscription billing and recurring charges',
          embedding: this.generateMockEmbedding(),
          expected_cluster: 'payments',
        },
        {
          text: 'RESTful API design and implementation',
          embedding: this.generateMockEmbedding(),
          expected_cluster: 'api',
        },
        {
          text: 'GraphQL schema design and queries',
          embedding: this.generateMockEmbedding(),
          expected_cluster: 'api',
        },
      ],
      similarity_pairs: [
        {
          text1: 'User login functionality',
          text2: 'Authentication system design',
          expected_similarity: 0.85,
        },
        {
          text1: 'Payment processing',
          text2: 'User authentication',
          expected_similarity: 0.25,
        },
        {
          text1: 'API documentation',
          text2: 'API implementation guide',
          expected_similarity: 0.78,
        },
      ],
    };

    const embeddingsFile = path.join(this.outputDir, 'embeddings-tests.json');
    await fs.writeFile(embeddingsFile, JSON.stringify(embeddingsTests, null, 2));
  }

  private generateMockEmbedding(): number[] {
    const embedding = new Array(1536);
    for (let i = 0; i < 1536; i++) {
      // Generate normalized random values between -1 and 1
      embedding[i] = (Math.random() - 0.5) * 2;
    }

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
  }

  private async generateMockAnalyticsData(websites: TestWebsite[]): Promise<void> {
    console.log('📈 Generating mock analytics data...');

    const analyticsData: Record<string, MockAnalyticsData[]> = {};

    for (const website of websites) {
      const siteAnalytics: MockAnalyticsData[] = [];

      for (const page of website.pages) {
        // Generate realistic analytics data based on page type and quality
        let baseViews = 100;
        let conversionRate = 0.02;

        switch (page.contentType) {
          case 'landing':
            baseViews = 1000;
            conversionRate = 0.05;
            break;
          case 'product':
            baseViews = 500;
            conversionRate = 0.08;
            break;
          case 'article':
          case 'blog':
            baseViews = 300;
            conversionRate = 0.03;
            break;
          case 'documentation':
            baseViews = 200;
            conversionRate = 0.01;
            break;
          default:
            baseViews = 150;
        }

        // Quality affects views and engagement
        const qualityMultiplier = page.quality;
        const views = Math.floor(baseViews * qualityMultiplier * (0.5 + Math.random()));
        const uniqueViews = Math.floor(views * (0.6 + Math.random() * 0.3));
        const avgTime = Math.floor((60 + Math.random() * 300) * qualityMultiplier);
        const bounce = Math.max(0.1, 0.8 - qualityMultiplier * 0.4 + Math.random() * 0.3);
        const conversions = Math.floor(views * conversionRate * qualityMultiplier);

        siteAnalytics.push({
          pagePath: new URL(page.url).pathname,
          pageViews: views,
          uniquePageViews: uniqueViews,
          avgTimeOnPage: avgTime,
          bounceRate: Math.round(bounce * 100) / 100,
          conversions,
          goalValue: conversions * (page.contentType === 'product' ? 50 : 10),
        });
      }

      analyticsData[website.domain] = siteAnalytics;
    }

    const analyticsFile = path.join(this.outputDir, 'mock-analytics.json');
    await fs.writeFile(analyticsFile, JSON.stringify(analyticsData, null, 2));
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const outputDir = process.argv[2] || './test-data';
  const generator = new TestDataGenerator(outputDir);

  generator.generateAll().catch((error) => {
    console.error('❌ Test data generation failed:', error);
    process.exit(1);
  });
}

export { TestDataGenerator, type TestWebsite, type TestPage, type MockAnalyticsData };
