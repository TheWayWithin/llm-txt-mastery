import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, Coffee, Zap, Crown, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import SubscriptionManagement from '@/components/subscription-management';
import Footer from '@/components/footer';
import { useSEO } from '@/hooks/useSEO';

export default function Pricing() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');

  useSEO({
    title: 'Pricing - Simple, Transparent Plans',
    description: 'Choose from Starter (free), Solo, Growth, or Scale plans. Generate AI-ready llms.txt files with no hidden fees.',
  });

  return (
    <div className="min-h-screen bg-cloud">
      {/* Header */}
      <header className="bg-mastery-blue shadow-sm border-b border-mastery-blue">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <a className="flex items-center space-x-3">
                <img
                  src="/images/logo-primary.png"
                  alt="LLM.txt Mastery"
                  className="h-16 md:h-20 w-auto"
                />
              </a>
            </Link>
            <Link href="/">
              <a>
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
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
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-ink mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-slate-brand max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex items-center bg-mist rounded-lg p-1 gap-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                billing === 'monthly'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-slate-brand hover:text-ink'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all ${
                billing === 'annual'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-slate-brand hover:text-ink'
              }`}
            >
              Annual
              <span className="bg-success text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                2 months free
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Free Trial Tier */}
          <Card className="relative bg-white border border-mist rounded-lg hover:shadow-lg transition-shadow">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-success text-white text-xs px-3 py-1 rounded-full font-semibold">
              7 DAYS FREE
            </div>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-6 w-6 text-signal-blue" />
                <div className="text-right">
                  <span className="text-2xl font-bold text-ink">$0</span>
                  <span className="text-xs text-slate-brand block">for 7 days</span>
                </div>
              </div>
              <CardTitle className="text-lg">Free Trial</CardTitle>
              <CardDescription className="text-sm">
                <span className="text-signal-blue font-medium">Best for: Try everything free</span>
                <br />
                Full Growth features, no charge for 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">35 analyses, 500 pages each</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">AI-enhanced analysis</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">Priority processing</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">3 output formats + compliance grading</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">Deployment guides, zip download & verification</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">
                    {billing === 'annual' ? 'Then $7.95/mo (billed annually) — cancel anytime' : 'Then $9.95/mo — cancel anytime'}
                  </span>
                </li>
              </ul>
              <Link href="/signup?tier=trial">
                <a className="block">
                  <Button variant="outline" className="w-full min-h-[44px] border-signal-blue text-signal-blue hover:bg-signal-blue/10">
                    Start Free Trial
                  </Button>
                </a>
              </Link>
            </CardContent>
          </Card>

          {/* Solo Tier */}
          <Card className="relative bg-white border border-mist rounded-lg hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Coffee className="h-6 w-6 text-signal-blue" />
                <div className="text-right">
                  {billing === 'annual' ? (
                    <>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-sm text-slate-brand line-through">$4.95</span>
                        <span className="text-2xl font-bold text-ink">$3.95</span>
                      </div>
                      <span className="text-xs text-slate-brand block">per month, billed annually</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-ink">$4.95</span>
                      <span className="text-xs text-slate-brand block">/month</span>
                    </>
                  )}
                </div>
              </div>
              <CardTitle className="text-lg">Solo</CardTitle>
              <CardDescription className="text-sm">
                <span className="text-signal-blue font-medium">Best for: Solopreneurs</span>
                <br />
                Help AI find your best content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">AI finds 10x more pages (200)</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">Know which pages convert</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">Quality scoring for every page</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">3 output formats + compliance grading</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">Deployment guides, zip download & verification</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">30-day money-back guarantee</span>
                </li>
              </ul>
              <Link href={`/signup?tier=solo${billing === 'annual' ? '&billing=annual' : ''}`}>
                <a className="block">
                  <Button variant="outline" className="w-full min-h-[44px] border-signal-blue text-signal-blue hover:bg-signal-blue/10">
                    Generate Your File
                  </Button>
                </a>
              </Link>
            </CardContent>
          </Card>

          {/* Growth Tier - MOST POPULAR */}
          <Card className="relative bg-white border border-mist rounded-lg hover:shadow-lg transition-shadow shadow-md border-t-2 border-t-signal-blue">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-signal-blue text-white text-xs px-3 py-1 rounded-full font-semibold">
              MOST POPULAR
            </div>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-6 w-6 text-signal-blue" />
                <div className="text-right">
                  {billing === 'annual' ? (
                    <>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-sm text-slate-brand line-through">$9.95</span>
                        <span className="text-2xl font-bold text-ink">$7.95</span>
                      </div>
                      <span className="text-xs text-slate-brand block">per month, billed annually</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-ink">$9.95</span>
                      <span className="text-xs text-slate-brand block">/month</span>
                    </>
                  )}
                </div>
              </div>
              <CardTitle className="text-lg">Growth</CardTitle>
              <CardDescription className="text-sm">
                <span className="text-signal-blue font-medium">Best for: Agencies</span>
                <br />
                Be discoverable across AI platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">35 analyses/month, 500 pages each</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">Priority processing</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">Bulk website processing</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">Export to CSV/JSON</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">3 output formats + compliance grading</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">Deployment guides, zip download & verification</span>
                </li>
              </ul>
              <Link href={`/signup?tier=growth${billing === 'annual' ? '&billing=annual' : ''}`}>
                <a className="block">
                  <Button className="w-full min-h-[44px] bg-signal-blue hover:bg-[#1D4ED8] text-white">
                    Generate Your File
                  </Button>
                </a>
              </Link>
            </CardContent>
          </Card>

          {/* Scale Tier */}
          <Card className="relative bg-white border border-mist rounded-lg hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Crown className="h-6 w-6 text-signal-blue" />
                <div className="text-right">
                  {billing === 'annual' ? (
                    <>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-sm text-slate-brand line-through">$19.95</span>
                        <span className="text-2xl font-bold text-ink">$15.95</span>
                      </div>
                      <span className="text-xs text-slate-brand block">per month, billed annually</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-ink">$19.95</span>
                      <span className="text-xs text-slate-brand block">/month</span>
                    </>
                  )}
                </div>
              </div>
              <CardTitle className="text-lg">Scale</CardTitle>
              <CardDescription className="text-sm">
                <span className="text-signal-blue font-medium">Best for: Developers</span>
                <br />
                Full coverage for complex sites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">JS rendering for React/Angular/Vue</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">100 analyses/month, 1,000 pages each</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">API access for automation</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">Multi-site management</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">3 output formats + compliance grading</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">Deployment guides, zip download & verification</span>
                </li>
              </ul>
              <Link href={`/signup?tier=scale${billing === 'annual' ? '&billing=annual' : ''}`}>
                <a className="block">
                  <Button variant="outline" className="w-full min-h-[44px] border-signal-blue text-signal-blue hover:bg-signal-blue/10">
                    Generate Your File
                  </Button>
                </a>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Value Props */}
        <div className="text-center mb-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm text-slate-brand">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span>84% cheaper than competitors</span>
            </div>
            <span className="hidden sm:inline text-mist">|</span>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span>30-day money-back guarantee</span>
            </div>
            <span className="hidden sm:inline text-mist">|</span>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span>No credit card required for free tier</span>
            </div>
          </div>
        </div>

        {/* Subscription Management */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-ink text-center mb-6">Manage Your Subscription</h3>
          <SubscriptionManagement />
        </div>
      </main>

      <Footer />
    </div>
  );
}
