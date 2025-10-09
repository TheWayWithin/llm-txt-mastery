import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, Coffee, Zap, Crown } from 'lucide-react';
import { Link } from 'wouter';

export type TierType = 'free' | 'coffee' | 'growth' | 'scale';

interface PricingPreviewProps {
  highlightTier?: TierType;
  showAllTiers?: boolean;
  ctaText?: string;
  className?: string;
}

export default function PricingPreview({
  highlightTier = 'coffee',
  showAllTiers = true,
  ctaText = 'Start Free Analysis',
  className = '',
}: PricingPreviewProps) {
  const tiers = [
    {
      id: 'free' as TierType,
      name: 'FREE',
      price: '$0',
      period: '',
      icon: Check,
      description: 'Perfect for testing',
      features: [
        '3 analyses/day',
        '20 pages',
        'Basic categorization',
      ],
      cta: 'Get Started Free',
      borderColor: 'border-green-500',
      bgColor: 'bg-white',
      iconColor: 'text-green-600',
      ctaVariant: 'outline' as const,
      badge: null,
    },
    {
      id: 'coffee' as TierType,
      name: 'COFFEE',
      price: '$4.95',
      period: '/mo',
      icon: Coffee,
      description: '100 analyses/month',
      features: [
        '100 analyses/month',
        '200 pages per analysis',
        'AI-enhanced quality',
      ],
      cta: 'Start Coffee Plan',
      borderColor: 'border-orange-400',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      ctaVariant: 'default' as const,
      badge: 'MOST POPULAR',
      badgeBg: 'bg-orange-600',
    },
    {
      id: 'growth' as TierType,
      name: 'GROWTH',
      price: '$9.95',
      period: '/mo',
      icon: Zap,
      description: 'Professional power',
      features: [
        'Unlimited analyses',
        '1,000 pages per analysis',
        'Smart caching',
      ],
      cta: 'View Full Pricing',
      borderColor: 'border-innovation-teal',
      bgColor: 'bg-white',
      iconColor: 'text-innovation-teal',
      ctaVariant: 'outline' as const,
      badge: null,
    },
    {
      id: 'scale' as TierType,
      name: 'SCALE',
      price: '$19.95',
      period: '/mo',
      icon: Crown,
      description: 'Enterprise grade',
      features: [
        'Unlimited everything',
        'API access',
        'Direct email support',
      ],
      cta: 'View Full Pricing',
      borderColor: 'border-mastery-blue',
      bgColor: 'bg-white',
      iconColor: 'text-mastery-blue',
      ctaVariant: 'outline' as const,
      badge: null,
    },
  ];

  // Filter tiers based on showAllTiers and screen size
  const visibleTiers = showAllTiers ? tiers : tiers.filter(t => ['free', 'coffee'].includes(t.id));

  return (
    <section className={`py-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-framework-black mb-3">
            Simple, Transparent Pricing
          </h2>
          <p className="text-base sm:text-lg text-ai-silver max-w-2xl mx-auto">
            Start free, upgrade when you need more
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {visibleTiers.map((tier) => {
            const Icon = tier.icon;
            const isHighlighted = tier.id === highlightTier;

            return (
              <Card
                key={tier.id}
                className={`relative border-2 ${tier.borderColor} ${tier.bgColor} hover:shadow-lg transition-shadow ${
                  isHighlighted ? 'shadow-md' : ''
                }`}
              >
                {/* Badge for highlighted tier */}
                {tier.badge && (
                  <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${tier.badgeBg} text-white text-xs px-3 py-1 rounded-full font-semibold`}>
                    {tier.badge}
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-6 w-6 ${tier.iconColor}`} />
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-bold">{tier.price}</span>
                      {tier.period && (
                        <span className="text-xs text-ai-silver block">{tier.period}</span>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <CardDescription className="text-sm">{tier.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Features List */}
                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className={`h-4 w-4 ${tier.iconColor} mr-2 mt-0.5 flex-shrink-0`} />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button - Minimum 44px height for touch targets */}
                  {tier.id === 'free' || tier.id === 'coffee' ? (
                    <Link href="/">
                      <Button
                        variant={tier.ctaVariant}
                        className={`w-full min-h-[44px] ${
                          tier.id === 'coffee'
                            ? 'bg-orange-600 hover:bg-orange-700 text-white'
                            : ''
                        }`}
                      >
                        {tier.cta}
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/pricing">
                      <Button variant="outline" className="w-full min-h-[44px]">
                        {tier.cta} →
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Value Props Footer */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-semibold">✓</span>
              <span>84% cheaper than competitors</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-2">
              <span className="text-green-600">🛡️</span>
              <span>30-day money-back guarantee</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>No credit card required for FREE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
