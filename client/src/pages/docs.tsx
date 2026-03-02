import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FileText, BookOpen, Shield, Zap, Globe, ArrowRight } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

export const DocsPage: React.FC = () => {
  useSEO({
    title: 'Documentation - LLMs.txt Specification Guide',
    description: 'Complete guide to the llms.txt specification. Learn how to implement AI attribution and visibility for your website.',
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
                <code className="bg-cloud px-2 py-1 rounded">https://yoursite.com/llms.txt</code>
                ) and contains structured information about your content, licensing, and attribution
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
              <p className="text-ink">
                A typical llms.txt file contains several key sections:
              </p>

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
      </div>
    </div>
  );
};
