import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, Coffee, Zap, Crown } from 'lucide-react';
import { Link } from 'wouter';

export type TierType = 'free' | 'solo' | 'growth' | 'scale';

interface PricingPreviewProps {
  highlightTier?: TierType;
  showAllTiers?: boolean;
  className?: string;
  id?: string;
}

export default function PricingPreview({
  highlightTier = 'solo',
  showAllTiers = true,
  className = '',
  id,
}: PricingPreviewProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const tiers = [
    {
      id: 'free' as TierType,
      name: 'Starter',
      bestFor: 'Quick check',
      monthlyPrice: '$0',
      annualPrice: '$0',
      monthlyOriginal: null as string | null,
      period: '',
      annualPeriod: '',
      icon: Check,
      description: 'Find out if you\'re invisible to AI',
      features: [
        'Discover if AI can find you',
        'See your visibility score',
        '20 pages analyzed',
        'Basic recommendations',
      ],
      cta: 'Start Free',
      ctaVariant: 'outline' as const,
      badge: null,
    },
    {
      id: 'solo' as TierType,
      name: 'Solo',
      bestFor: 'Solopreneurs',
      monthlyPrice: '$4.95',
      annualPrice: '$3.95',
      monthlyOriginal: '$4.95',
      period: '/mo',
      annualPeriod: 'per month, billed annually',
      icon: Coffee,
      description: 'Help AI find your best content',
      features: [
        'AI finds 10x more pages (200)',
        'Know which pages convert',
        'Quality scoring for every page',
        '30-day money-back guarantee',
      ],
      cta: 'Generate Your File',
      ctaVariant: 'outline' as const,
      badge: null,
    },
    {
      id: 'growth' as TierType,
      name: 'Growth',
      bestFor: 'Agencies',
      monthlyPrice: '$9.95',
      annualPrice: '$7.95',
      monthlyOriginal: '$9.95',
      period: '/mo',
      annualPeriod: 'per month, billed annually',
      icon: Zap,
      description: 'Be discoverable across AI platforms',
      features: [
        'Cover 1,000 pages per site',
        'Unlimited daily analyses',
        'Bulk website processing',
        'Export to CSV/JSON',
      ],
      cta: 'Generate Your File',
      ctaVariant: 'default' as const,
      badge: 'MOST POPULAR',
    },
    {
      id: 'scale' as TierType,
      name: 'Scale',
      bestFor: 'Developers',
      monthlyPrice: '$19.95',
      annualPrice: '$15.95',
      monthlyOriginal: '$19.95',
      period: '/mo',
      annualPeriod: 'per month, billed annually',
      icon: Crown,
      description: 'Full coverage for complex sites',
      features: [
        'JS rendering for React/Angular/Vue',
        'Unlimited pages per analysis',
        'Unlimited AI analysis',
        'Multi-site management',
      ],
      cta: 'Generate Your File',
      ctaVariant: 'outline' as const,
      badge: null,
    },
  ];

  const visibleTiers = showAllTiers ? tiers : tiers.filter(t => ['free', 'solo'].includes(t.id));
  const sectionRef = useRef<HTMLElement>(null);
  const hasFired = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasFired.current) {
          hasFired.current = true;
          (window as any).plausible?.('pricing-section-view');
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id={id} className={`py-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-ink mb-3">
            Simple, Transparent Pricing
          </h2>
          <p className="text-base sm:text-lg text-slate-brand max-w-2xl mx-auto">
            Start free, upgrade when you need more
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {visibleTiers.map((tier) => {
            const Icon = tier.icon;
            const isHighlighted = tier.id === highlightTier;

            return (
              <Card
                key={tier.id}
                className={`relative bg-white border border-mist rounded-lg hover:shadow-lg transition-shadow ${
                  isHighlighted ? 'shadow-md border-t-2 border-t-signal-blue' : ''
                }`}
              >
                {/* Badge for highlighted tier */}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-signal-blue text-white text-xs px-3 py-1 rounded-full font-semibold">
                    {tier.badge}
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-6 w-6 text-signal-blue" />
                    <div className="text-right">
                      {billing === 'annual' && tier.monthlyOriginal ? (
                        <>
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-sm text-slate-brand line-through">{tier.monthlyOriginal}</span>
                            <span className="text-2xl sm:text-3xl font-bold text-ink">{tier.annualPrice}</span>
                          </div>
                          <span className="text-xs text-slate-brand block">{tier.annualPeriod}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl sm:text-3xl font-bold text-ink">{tier.monthlyPrice}</span>
                          {tier.period && (
                            <span className="text-xs text-slate-brand block">{tier.period}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <CardDescription className="text-sm">
                    <span className="text-signal-blue font-medium">Best for: {tier.bestFor}</span>
                    <br />
                    {tier.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Features List */}
                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-ink">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Link href={tier.id === 'free' ? '/' : `/signup?tier=${tier.id}${billing === 'annual' ? '&billing=annual' : ''}`}>
                    <Button
                      variant={tier.ctaVariant}
                      className={`w-full min-h-[44px] ${
                        tier.id === 'growth'
                          ? 'bg-signal-blue hover:bg-[#1D4ED8] text-white'
                          : tier.ctaVariant === 'outline'
                            ? 'border-signal-blue text-signal-blue hover:bg-signal-blue/10'
                            : ''
                      }`}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Value Props Footer */}
        <div className="text-center">
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
      </div>
    </section>
  );
}
