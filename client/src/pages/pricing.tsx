import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, Coffee, Zap, Crown, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import SubscriptionManagement from '@/components/subscription-management';
import { useSEO } from '@/hooks/useSEO';

export default function Pricing() {
  useSEO({
    title: 'Pricing - Simple, Transparent Plans',
    description: 'Choose from Starter (free), Solo, Growth, or Scale plans. Generate AI-ready llms.txt files with no hidden fees.',
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/images/logo-primary.png"
                alt="LLM.txt Mastery"
                className="h-16 md:h-20 w-auto"
              />
            </div>
            <Link href="/">
              <a>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to App
                </Button>
              </a>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-framework-black mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-ai-silver max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Starter Tier */}
          <Card className="relative border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Check className="h-6 w-6 text-green-600" />
                <span className="text-2xl font-bold">$0</span>
              </div>
              <CardTitle>Starter</CardTitle>
              <CardDescription>Find out if you're invisible to AI</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Discover if AI can find you</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">See your visibility score</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">20 pages analyzed</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Basic recommendations</span>
                </li>
              </ul>
              <Link href="/">
                <a className="block">
                  <Button variant="outline" className="w-full">
                    Start Free
                  </Button>
                </a>
              </Link>
            </CardContent>
          </Card>

          {/* Solo Tier */}
          <Card className="relative border-2 border-orange-400 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Coffee className="h-6 w-6 text-orange-600" />
                <div className="text-right">
                  <span className="text-2xl font-bold">$4.95</span>
                  <span className="text-xs text-ai-silver block">/month</span>
                </div>
              </div>
              <CardTitle>Solo</CardTitle>
              <CardDescription>Help AI find your best content</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">AI finds 10x more pages (200)</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Know which pages convert</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Help AI find your best content</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">30-day money-back guarantee</span>
                </li>
              </ul>
              <Link href="/signup?tier=solo">
                <a className="block">
                  <Button variant="outline" className="w-full">
                    Generate Your File
                  </Button>
                </a>
              </Link>
            </CardContent>
          </Card>

          {/* Growth Tier - MOST POPULAR */}
          <Card className="relative border-2 border-innovation-teal hover:shadow-lg transition-shadow bg-teal-50 ring-2 ring-innovation-teal ring-offset-2">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-innovation-teal text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
              MOST POPULAR
            </div>
            <CardHeader className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-6 w-6 text-innovation-teal" />
                <div className="text-right">
                  <span className="text-2xl font-bold">$9.95</span>
                  <span className="text-xs text-ai-silver block">/month</span>
                </div>
              </div>
              <CardTitle>Growth</CardTitle>
              <CardDescription>Be discoverable across AI platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-innovation-teal mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Cover 1,000 pages per site</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-innovation-teal mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Unlimited daily analyses</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-innovation-teal mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Bulk website processing</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-innovation-teal mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Export to CSV/JSON</span>
                </li>
              </ul>
              <Link href="/signup?tier=growth">
                <a className="block">
                  <Button className="w-full bg-innovation-teal hover:bg-teal-600 text-white">
                    Generate Your File
                  </Button>
                </a>
              </Link>
            </CardContent>
          </Card>

          {/* Scale Tier */}
          <Card className="relative border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Crown className="h-6 w-6 text-mastery-blue" />
                <div className="text-right">
                  <span className="text-2xl font-bold">$19.95</span>
                  <span className="text-xs text-ai-silver block">/month</span>
                </div>
              </div>
              <CardTitle>Scale</CardTitle>
              <CardDescription>Full coverage for complex sites</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-mastery-blue mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">JavaScript rendering for React/Angular/Vue</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-mastery-blue mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Unlimited pages per analysis</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-mastery-blue mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Unlimited AI analysis</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-mastery-blue mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Multi-site management</span>
                </li>
              </ul>
              <Link href="/signup?tier=scale">
                <a className="block">
                  <Button variant="outline" className="w-full">
                    Generate Your File
                  </Button>
                </a>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Original Subscription Management Component */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-6">Manage Your Subscription</h3>
          <SubscriptionManagement />
        </div>
      </main>
    </div>
  );
}
