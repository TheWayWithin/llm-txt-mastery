import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, Coffee, Zap, Crown, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import SubscriptionManagement from '@/components/subscription-management';

export default function Pricing() {
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
                    Get Started Free
                  </Button>
                </a>
              </Link>
            </CardContent>
          </Card>

          {/* Solo Tier */}
          <Card className="relative border-2 border-orange-400 hover:shadow-lg transition-shadow bg-orange-50">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white text-xs px-3 py-1 rounded-full">
              MOST POPULAR
            </div>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Coffee className="h-6 w-6 text-orange-600" />
                <div className="text-right">
                  <span className="text-2xl font-bold">$4.95</span>
                  <span className="text-xs text-ai-silver block">/month</span>
                </div>
              </div>
              <CardTitle>Solo</CardTitle>
              <CardDescription>Stop losing customers to competitors</CardDescription>
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
                  <span className="text-sm">Stop losing to competitors</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">30-day money-back guarantee</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Growth Tier */}
          <Card className="relative border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-6 w-6 text-innovation-teal" />
                <div className="text-right">
                  <span className="text-2xl font-bold">$9.95</span>
                  <span className="text-xs text-ai-silver block">/month</span>
                </div>
              </div>
              <CardTitle>Growth</CardTitle>
              <CardDescription>Dominate AI recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-innovation-teal mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Cover 1,000 pages per site</span>
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
              <CardDescription>No limits. Just results.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
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
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-mastery-blue mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Direct support line</span>
                </li>
              </ul>
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
