import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Calendar, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: 'Why AI Attribution Matters More Than Ever',
    excerpt:
      "As AI systems consume more web content, getting proper attribution isn't just about traffic—it's about survival in the post-LLM world.",
    date: 'January 13, 2025',
    readTime: '5 min read',
    category: 'AI & SEO',
  },
  {
    id: 2,
    title: 'The llms.txt Specification: A Deep Dive',
    excerpt:
      'Understanding the technical details of llms.txt and how to implement it effectively for maximum AI visibility.',
    date: 'January 10, 2025',
    readTime: '8 min read',
    category: 'Technical',
  },
  {
    id: 3,
    title: 'From Corporate to Solopreneur: My Journey',
    excerpt:
      'Why I learned AI to stay relevant, and how corporate risk aversion led me to build for those who actually need it.',
    date: 'January 5, 2025',
    readTime: '6 min read',
    category: 'Personal',
  },
];

export const BlogPage: React.FC = () => {
  useSEO({
    title: 'Blog - AI, Web Survival & Building Tools That Matter',
    description: 'Insights on AI attribution, the llms.txt specification, and strategies for website visibility in the age of large language models.',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Blog</h1>
          <p className="text-xl text-gray-600">
            Thoughts on AI, web survival, and building tools that matter
          </p>
        </div>

        {/* Coming Soon Notice */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <p className="text-center text-gray-700">
              <strong>Coming Soon:</strong> Real insights from building AI tools and helping
              websites survive the LLM revolution. No corporate fluff, just practical wisdom from
              the trenches.
            </p>
          </CardContent>
        </Card>

        {/* Blog Posts Grid */}
        <div className="space-y-6">
          {blogPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-600 font-medium">{post.category}</span>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span className="flex items-center">
                      <Calendar className="mr-1" size={14} />
                      {post.date}
                    </span>
                    <span className="flex items-center">
                      <Clock className="mr-1" size={14} />
                      {post.readTime}
                    </span>
                  </div>
                </div>
                <CardTitle className="text-2xl">{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{post.excerpt}</p>
                <div className="flex items-center text-blue-600 font-medium">
                  Read more
                  <ArrowRight className="ml-2" size={16} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Newsletter Signup */}
        <Card className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8">
            <div className="text-center">
              <BookOpen className="mx-auto mb-4" size={48} />
              <h2 className="text-2xl font-bold mb-4">Get Updates When New Posts Drop</h2>
              <p className="mb-6">
                No spam, no corporate newsletter BS. Just real insights when I have something worth
                sharing.
              </p>
              <div className="max-w-md mx-auto">
                <div className="bg-white/10 backdrop-blur p-4 rounded-lg">
                  <p className="text-sm">
                    Newsletter coming soon. Follow me on{' '}
                    <a
                      href="https://twitter.com/jamiewatters"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      Twitter
                    </a>{' '}
                    for updates.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Topics I Cover</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="text-center p-4">
              <h3 className="font-semibold mb-2">AI & Web Survival</h3>
              <p className="text-sm text-gray-600">How to thrive when AI is eating the web</p>
            </Card>
            <Card className="text-center p-4">
              <h3 className="font-semibold mb-2">Technical Deep Dives</h3>
              <p className="text-sm text-gray-600">The nitty-gritty of building AI tools</p>
            </Card>
            <Card className="text-center p-4">
              <h3 className="font-semibold mb-2">Solopreneur Life</h3>
              <p className="text-sm text-gray-600">Escaping corporate to build what matters</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
