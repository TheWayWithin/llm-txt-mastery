// Utility functions for handling user tiers

export type UserTier = 'starter' | 'solo' | 'growth' | 'scale' | 'cancelled';

/**
 * Get user-friendly display name for tier
 */
export const getTierDisplayName = (tier: string): string => {
  switch (tier) {
    case 'starter':
      return 'Starter';
    case 'trial':
      return 'Free Trial';
    case 'coffee':
    case 'solo':
      return 'Solo';
    case 'growth':
      return 'Growth';
    case 'scale':
      return 'Scale';
    case 'cancelled':
      return 'Cancelled';
    default:
      return tier.charAt(0).toUpperCase() + tier.slice(1);
  }
};

/**
 * Get user-friendly description for tier
 */
export const getTierDescription = (tier: string): string => {
  switch (tier) {
    case 'starter':
      return '3 free analyses per day, up to 20 pages';
    case 'trial':
      return '7-day free trial with Growth features (35 analyses, 500 pages)';
    case 'coffee':
    case 'solo':
      return '20 monthly analyses, up to 200 pages each';
    case 'growth':
      return '35 monthly analyses, up to 500 pages each';
    case 'scale':
      return '100 monthly analyses, up to 1000 pages each';
    case 'cancelled':
      return 'Subscription ended — re-subscribe to continue';
    default:
      return 'Custom tier';
  }
};

/**
 * Get tier color class for styling (brand-aligned)
 */
export const getTierColorClass = (tier: string): string => {
  switch (tier) {
    case 'starter':
      return 'bg-slate-brand text-white';
    case 'trial':
      return 'bg-success text-white';
    case 'coffee':
    case 'solo':
      return 'bg-signal-blue text-white';
    case 'growth':
      return 'bg-signal-blue text-white';
    case 'scale':
      return 'bg-mastery-blue text-white';
    case 'cancelled':
      return 'bg-error text-white';
    default:
      return 'bg-slate-brand text-white';
  }
};
