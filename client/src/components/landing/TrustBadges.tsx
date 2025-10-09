import { Lock, Shield, Zap, CreditCard, DollarSign } from 'lucide-react';

export type TrustBadgeVariant = 'security' | 'privacy' | 'reliability' | 'payment' | 'full';

interface TrustBadgesProps {
  variant?: TrustBadgeVariant;
  compact?: boolean;
  alignment?: 'left' | 'center' | 'right';
  className?: string;
}

interface Badge {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  subtext: string;
  color: string;
  show: boolean;
}

export default function TrustBadges({
  variant = 'full',
  compact = false,
  alignment = 'center',
  className = '',
}: TrustBadgesProps) {
  const badges: Badge[] = [
    {
      icon: Lock,
      text: 'SSL Encrypted',
      subtext: '256-bit security',
      color: 'text-green-600',
      show: variant === 'security' || variant === 'full',
    },
    {
      icon: Shield,
      text: 'Privacy Protected',
      subtext: 'No data selling',
      color: 'text-mastery-blue',
      show: variant === 'privacy' || variant === 'full',
    },
    {
      icon: Zap,
      text: '99.9% Uptime',
      subtext: 'Always available',
      color: 'text-innovation-teal',
      show: variant === 'reliability' || variant === 'full',
    },
    {
      icon: CreditCard,
      text: 'Secure Payments',
      subtext: 'Powered by Stripe',
      color: 'text-purple-600',
      show: variant === 'payment' || variant === 'full',
    },
    {
      icon: DollarSign,
      text: '30-Day Guarantee',
      subtext: 'Risk-free trial',
      color: 'text-green-600',
      show: variant === 'payment' || variant === 'full',
    },
  ];

  const visibleBadges = badges.filter((b) => b.show);

  // Alignment classes
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  if (compact) {
    // Compact inline version
    return (
      <div
        className={`flex flex-wrap items-center ${alignmentClasses[alignment]} gap-2 text-xs text-gray-600 ${className}`}
      >
        {visibleBadges.map((badge, idx) => {
          const Icon = badge.icon;
          return (
            <div key={idx} className="flex items-center gap-1">
              <Icon className={`h-3 w-3 ${badge.color}`} />
              <span className="hidden sm:inline">{badge.text}</span>
              <span className="inline sm:hidden">{badge.text.split(' ')[0]}</span>
              {idx < visibleBadges.length - 1 && (
                <span className="ml-2 text-gray-400">•</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Full badge cards version
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}
    >
      {visibleBadges.map((badge, idx) => {
        const Icon = badge.icon;
        return (
          <div
            key={idx}
            className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            role="img"
            aria-label={`${badge.text} - ${badge.subtext}`}
          >
            <Icon className={`h-5 w-5 ${badge.color} mb-1`} />
            <div className="text-xs font-semibold text-gray-900">{badge.text}</div>
            <div className="text-[10px] text-gray-500">{badge.subtext}</div>
          </div>
        );
      })}
    </div>
  );
}
