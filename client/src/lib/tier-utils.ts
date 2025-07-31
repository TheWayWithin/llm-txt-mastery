// Utility functions for handling user tiers

export type UserTier = 'starter' | 'coffee' | 'growth' | 'scale';

/**
 * Get user-friendly display name for tier
 */
export const getTierDisplayName = (tier: string): string => {
  switch (tier) {
    case 'starter':
      return 'FREE';
    case 'coffee':
      return 'COFFEE';
    case 'growth':
      return 'GROWTH';
    case 'scale':
      return 'SCALE';
    default:
      return tier.toUpperCase();
  }
};

/**
 * Get user-friendly description for tier
 */
export const getTierDescription = (tier: string): string => {
  switch (tier) {
    case 'starter':
      return '1 free analysis per day, up to 20 pages';
    case 'coffee':
      return 'Unlimited AI analysis, up to 200 pages';
    case 'growth':
      return 'Unlimited analysis, premium features';
    case 'scale':
      return 'Enterprise features, unlimited everything';
    default:
      return 'Custom tier';
  }
};

/**
 * Get tier color class for styling
 */
export const getTierColorClass = (tier: string): string => {
  switch (tier) {
    case 'starter':
      return 'bg-mastery-blue text-white';
    case 'coffee':
      return 'bg-orange-600 text-white';
    case 'growth':
      return 'bg-green-600 text-white';
    case 'scale':
      return 'bg-purple-600 text-white';
    default:
      return 'bg-gray-600 text-white';
  }
};