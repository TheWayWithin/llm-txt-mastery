// Utility functions for handling user tiers

export type UserTier = 'starter' | 'solo' | 'growth' | 'scale';

/**
 * Get user-friendly display name for tier
 */
export const getTierDisplayName = (tier: string): string => {
  switch (tier) {
    case 'starter':
      return 'FREE';
    case 'solo':
      return 'SOLO';
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
      return '3 free analyses per day, up to 20 pages';
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
 * Get tier color class for styling
 */
export const getTierColorClass = (tier: string): string => {
  switch (tier) {
    case 'starter':
      return 'bg-mastery-blue text-white';
    case 'solo':
      return 'bg-orange-600 text-white';
    case 'growth':
      return 'bg-green-600 text-white';
    case 'scale':
      return 'bg-purple-600 text-white';
    default:
      return 'bg-gray-600 text-white';
  }
};
