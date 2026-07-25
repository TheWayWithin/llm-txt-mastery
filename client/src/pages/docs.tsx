import ContentUpdated from '@/components/content-updated';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FileText, BookOpen, Shield, Zap, Globe, ArrowRight } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

export const DocsPage: React.FC = () => {
  useSEO({
    title: 'Documentation - LLMs.txt Specification Guide',
    description:
      'Complete guide to the llms.txt specification. Learn how to implement AI attribution and visibility for your website.',
  });

  return (
    <div className="min-h-screen bg-cloud">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">LLMs.txt Documentation</h1>
          <p className="text-xl text-slate-brand">
            Everything you need to know about the llms.txt specification and how to use it
            effectively
          </p>
        </div>

        {/* What is llms.txt Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-3 text-signal-blue" />
              What is llms.txt?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-ink">
              <p>
                The llms.txt file is a proposed standard for websites to communicate with Large
                Language Models (LLMs) about how their content should be used, referenced, and
                attributed. Similar to robots.txt for search engines, llms.txt provides guidelines
                for AI systems accessing your content.
              </p>

              <p>
                It's placed at the root of your domain (e.g.,{' '}
                <code className="bg-cloud px-2 py-1 rounded">https://yoursite.com/llms.txt</code>)
                and contains structured information about your content, licensing, and attribution
                preferences.
              </p>

              <div className="bg-signal-blue/10 border-l-4 border-signal-blue p-4 mt-4">
                <p className="font-semibold">Official Specification:</p>
                <a
                  href="https://llmstxt.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-signal-blue hover:underline"
                >
                  https://llmstxt.org
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why It Matters Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-3 text-slate-brand" />
              Why llms.txt Matters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-ink">
              <div className="border-l-4 border-mastery-blue pl-4">
                <h3 className="font-semibold mb-2">Get Proper Attribution</h3>
                <p>
                  AI systems are consuming your content but not giving you credit. A properly
                  structured llms.txt file helps ensure AI systems reference and link to your
                  original content.
                </p>
              </div>

              <div className="border-l-4 border-success pl-4">
                <h3 className="font-semibold mb-2">Control Your Content</h3>
                <p>
                  Specify how AI systems should use your content, what they can and cannot do with
                  it, and how they should attribute it when referencing your expertise.
                </p>
              </div>

              <div className="border-l-4 border-signal-blue pl-4">
                <h3 className="font-semibold mb-2">Early Adopter Advantage</h3>
                <p>
                  As AI systems evolve to respect content preferences, early adopters of llms.txt
                  will be better positioned to maintain traffic and authority in the AI-first world.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Structure Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-3 text-success" />
              LLMs.txt File Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-ink">A typical llms.txt file contains several key sections:</p>

              <div className="bg-ink text-success p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
                  {`# LLMs.txt - AI Content Guidelines

## About This Site
[Brief description of your site and expertise]

## Content Usage
- AI systems may summarize our content
- Attribution required with link to source
- No verbatim reproduction without permission

## Key Pages
- /about - [Description]
- /blog - [Description]
- /products - [Description]

## Contact
Email: contact@yoursite.com
Website: https://yoursite.com

## Last Updated
2025-01-13`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best Practices Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-3 text-action-amber" />
              Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-ink">
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span>Keep your llms.txt concise and well-structured</span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span>Update it regularly as your content changes</span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span>Include clear attribution requirements</span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span>List your most important pages with descriptions</span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span>Specify contact information for licensing inquiries</span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span>Use standard markdown formatting for readability</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Integration Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-3 text-signal-blue" />
              How LLM.txt Mastery Helps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-ink">
              <p>
                LLM.txt Mastery doesn't just generate generic llms.txt files. Our AI-powered
                analysis:
              </p>

              <ul className="space-y-2 ml-4">
                <li className="flex items-start">
                  <ArrowRight className="mr-2 text-signal-blue flex-shrink-0 mt-1" size={16} />
                  <span>Analyzes your entire website to identify key expertise areas</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="mr-2 text-signal-blue flex-shrink-0 mt-1" size={16} />
                  <span>
                    Creates strategic descriptions that help AI systems understand your value
                  </span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="mr-2 text-signal-blue flex-shrink-0 mt-1" size={16} />
                  <span>Optimizes formatting based on how AI systems actually process content</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="mr-2 text-signal-blue flex-shrink-0 mt-1" size={16} />
                  <span>Maximizes the likelihood of proper attribution and linking</span>
                </li>
              </ul>

              <p className="font-semibold mt-4">
                The difference between a generic llms.txt and one that actually works lies in
                understanding how AI systems make decisions about what to reference and link to.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sprint 12: llms.txt Formats Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-3 text-signal-blue" />
              llms.txt Formats Explained
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-brand mb-4">
              LLM.txt Mastery generates three output formats from a single crawl, each designed for
              different AI consumption scenarios.
            </p>
            <div className="space-y-4">
              <div className="bg-cloud rounded-lg p-4">
                <h4 className="font-semibold text-ink mb-1">llms.txt (Standard)</h4>
                <p className="text-sm text-slate-brand">
                  The default format per the llmstxt.org specification. Contains your site title,
                  description, section headings, and linked pages with brief annotations. Ideal for
                  general AI discovery.
                </p>
              </div>
              <div className="bg-cloud rounded-lg p-4">
                <h4 className="font-semibold text-ink mb-1">llms-full.txt (Full)</h4>
                <p className="text-sm text-slate-brand">
                  An expanded version with complete page content inline, not just links. Gives AI
                  models richer context without requiring follow-up fetches. Best for comprehensive
                  AI understanding of your site.
                </p>
              </div>
              <div className="bg-cloud rounded-lg p-4">
                <h4 className="font-semibold text-ink mb-1">llms-mini.txt (Mini)</h4>
                <p className="text-sm text-slate-brand">
                  A condensed version optimized for smaller context windows. Keeps only your top 5
                  most important pages with truncated descriptions. Useful for models with limited
                  token budgets.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-brand mt-4">
              <strong>Recommendation:</strong> Deploy all three. AI crawlers will choose the version
              that fits their context window. The standard llms.txt is required; the full and mini
              variants are optional but recommended for maximum compatibility.
            </p>
          </CardContent>
        </Card>

        {/* Sprint 12: Compliance Grading Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-3 text-signal-blue" />
              Compliance Grading
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-brand mb-4">
              Every validated file receives an A/B/C/D compliance grade based on how well it follows
              the official llmstxt.org specification. The grade is a weighted composite of four
              dimensions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="flex items-start gap-3 bg-cloud rounded-lg p-3">
                <span className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm">
                  A
                </span>
                <div>
                  <p className="font-semibold text-ink text-sm">Grade A (95%+)</p>
                  <p className="text-xs text-slate-brand">
                    Fully spec-compliant with excellent content quality
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-cloud rounded-lg p-3">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                  B
                </span>
                <div>
                  <p className="font-semibold text-ink text-sm">Grade B (80-94%)</p>
                  <p className="text-xs text-slate-brand">
                    Core structure correct with minor issues
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-cloud rounded-lg p-3">
                <span className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-sm">
                  C
                </span>
                <div>
                  <p className="font-semibold text-ink text-sm">Grade C (60-79%)</p>
                  <p className="text-xs text-slate-brand">
                    Basic structure but missing key elements
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-cloud rounded-lg p-3">
                <span className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold text-sm">
                  D
                </span>
                <div>
                  <p className="font-semibold text-ink text-sm">Grade D (below 60%)</p>
                  <p className="text-xs text-slate-brand">
                    Significant issues — requires regeneration
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-brand">
              <strong>Scoring weights:</strong> Spec Structure (40%), Content Quality (30%),
              Freshness (20%), Size Optimization (10%).
            </p>
          </CardContent>
        </Card>

        {/* Sprint 13: Quick Fix Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-3 text-signal-blue" />
              Quick Fix — Auto-Correct Formatting Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-brand mb-4">
              When the validator detects fixable formatting issues, you'll see a{' '}
              <strong>Quick Fix</strong> button that auto-corrects common problems. Review the
              before/after preview, then download the corrected file.
            </p>
            <div className="space-y-3 mb-4">
              <div className="bg-cloud rounded-lg p-3">
                <h4 className="font-semibold text-ink text-sm mb-1">Issues Auto-Fixed</h4>
                <ul className="text-sm text-slate-brand space-y-1">
                  <li>• Missing H1 title — adds one from your first content line</li>
                  <li>• Missing blockquote description — adds a placeholder you can customize</li>
                  <li>• Malformed list items — converts plain URLs to proper linked format</li>
                  <li>• Excessive blank lines and missing trailing newlines</li>
                </ul>
              </div>
            </div>
            <p className="text-sm text-slate-brand">
              <strong>Tip:</strong> Quick Fix handles structural formatting. For content
              improvements (better descriptions, more pages), use our AI-powered{' '}
              <strong>Generator</strong> to create a comprehensive file from scratch.
            </p>
          </CardContent>
        </Card>

        {/* Sprint 12: Deployment Guide Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-3 text-signal-blue" />
              Deploying Your llms.txt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-brand mb-4">
              Generating the file is only step one. AI crawlers need to be <strong>told</strong> the
              file exists through discovery mechanisms. Without these, crawlers have to guess.
            </p>
            <div className="space-y-4">
              <div className="bg-cloud rounded-lg p-4">
                <h4 className="font-semibold text-ink mb-2">1. Upload the File</h4>
                <p className="text-sm text-slate-brand mb-2">
                  Upload llms.txt (and optionally llms-full.txt, llms-mini.txt) to your website's
                  root directory.
                </p>
                <code className="text-xs bg-white px-2 py-1 rounded border border-mist">
                  https://yourdomain.com/llms.txt
                </code>
              </div>
              <div className="bg-cloud rounded-lg p-4">
                <h4 className="font-semibold text-ink mb-2">2. Add HTML Discovery Tag</h4>
                <p className="text-sm text-slate-brand mb-2">
                  Add this tag to the {'<head>'} section of every page:
                </p>
                <code className="text-xs bg-white px-2 py-1 rounded border border-mist block overflow-x-auto">
                  {
                    '<link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-readable version">'
                  }
                </code>
              </div>
              <div className="bg-cloud rounded-lg p-4">
                <h4 className="font-semibold text-ink mb-2">3. Update robots.txt</h4>
                <p className="text-sm text-slate-brand mb-2">
                  Add this directive to your robots.txt file:
                </p>
                <code className="text-xs bg-white px-2 py-1 rounded border border-mist block">
                  Llms-Txt: https://yourdomain.com/llms.txt
                </code>
              </div>
            </div>
            <p className="text-sm text-slate-brand mt-4">
              After deployment, use our <strong>Verify Deployment</strong> button in the generation
              flow to confirm all discovery mechanisms are working. You'll see an explicit{' '}
              <strong>deployment score (X/5)</strong> with individual check results.
            </p>
            <div className="mt-4 bg-signal-blue/5 rounded-lg p-4 border border-signal-blue/20">
              <h4 className="font-semibold text-ink mb-2">New: Bulk Download & Platform Guides</h4>
              <ul className="text-sm text-slate-brand space-y-1">
                <li>
                  • <strong>Download All (zip)</strong> — Download all 3 formats (llms.txt,
                  llms-full.txt, llms-mini.txt) as a single zip file
                </li>
                <li>
                  • <strong>Format Comparison</strong> — Side-by-side view showing what each format
                  includes, token counts, and size
                </li>
                <li>
                  • <strong>Platform-Specific Guides</strong> — Step-by-step deployment instructions
                  for WordPress, Shopify, Squarespace, Wix, Webflow, and Next.js including HTML tag
                  and robots.txt setup
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Sprint 12: Discovery Mechanisms Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-3 text-signal-blue" />
              How AI Crawlers Discover llms.txt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-brand mb-4">
              AI crawlers use several methods to find llms.txt files. Using all three maximizes your
              discoverability.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-cloud rounded-lg p-4 text-center">
                <h4 className="font-semibold text-ink mb-1 text-sm">Well-Known Path</h4>
                <p className="text-xs text-slate-brand">
                  Crawlers check /llms.txt at the root, similar to /robots.txt or /sitemap.xml.
                </p>
              </div>
              <div className="bg-cloud rounded-lg p-4 text-center">
                <h4 className="font-semibold text-ink mb-1 text-sm">HTML Link Tag</h4>
                <p className="text-xs text-slate-brand">
                  A {'<link>'} tag in your page head explicitly points crawlers to the file.
                </p>
              </div>
              <div className="bg-cloud rounded-lg p-4 text-center">
                <h4 className="font-semibold text-ink mb-1 text-sm">robots.txt Reference</h4>
                <p className="text-xs text-slate-brand">
                  The Llms-Txt: directive provides another discovery path for crawlers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Additional Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://llmstxt.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-signal-blue hover:underline flex items-center"
                >
                  Official llms.txt Specification
                  <ArrowRight className="ml-1" size={16} />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/llmstxt/llmstxt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-signal-blue hover:underline flex items-center"
                >
                  GitHub Repository
                  <ArrowRight className="ml-1" size={16} />
                </a>
              </li>
              <li>
                <a href="/about" className="text-signal-blue hover:underline flex items-center">
                  Why I Built LLM.txt Mastery
                  <ArrowRight className="ml-1" size={16} />
                </a>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-mastery-blue to-signal-blue text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Create Your LLMs.txt File?</h2>
            <p className="mb-6">
              Start getting proper attribution for your content in the AI-first world.
            </p>
            <a
              href="/"
              className="inline-flex items-center bg-white text-signal-blue px-6 py-3 rounded-lg font-semibold hover:bg-cloud transition-colors"
            >
              Get Started
              <ArrowRight className="ml-2" />
            </a>
          </CardContent>
        </Card>
        <ContentUpdated />
      </div>
    </div>
  );
};
