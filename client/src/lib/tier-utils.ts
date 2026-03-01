// Utility functions for handling user tiers

export type UserTier = 'starter' | 'solo' | 'growth' | 'scale';

/**
 * Get user-friendly display name for tier
 */
export const getTierDisplayName = (tier: string): string => {
  switch (tier) {
    case 'starter':
      return 'Starter';
    case 'coffee':
    case 'solo':
      return 'Solo';
    case 'growth':
      return 'Growth';
    case 'scale':
      return 'Scale';
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
    case 'coffee':
    case 'solo':
      return '20 monthly analyses, up to 200 pages each';
    case 'growth':
      return '35 monthly analyses, up to 500 pages each';
    case 'scale':
      return '100 monthly analyses, up to 1000 pages each';
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
    case 'coffee':
    case 'solo':
      return 'bg-signal-blue text-white';
    case 'growth':
      return 'bg-signal-blue text-white';
    case 'scale':
      return 'bg-mastery-blue text-white';
    default:
      return 'bg-slate-brand text-white';
  }
};
