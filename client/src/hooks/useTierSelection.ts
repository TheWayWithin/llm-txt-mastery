/**
 * useTierSelection - Specialized hook for tier selection logic
 *
 * Handles tier state, validation, and tier-specific business rules.
 */

import { useState, useCallback, useMemo } from 'react';
import { UserTier } from '@shared/schema';
import { tierUtils } from '@/lib/validation-utils';
import { ValidationResult } from '@/lib/error-utils';

export interface UseTierSelectionOptions {
  initialTier?: UserTier | null;
  allowedTiers?: UserTier[];
  required?: boolean;
}

export interface TierInfo {
  tier: UserTier;
  displayName: string;
  features: string[];
  price: number;
  isRecommended: boolean;
  isPopular: boolean;
}

export interface UseTierSelectionReturn {
  // State
  selectedTier: UserTier | null;

  // Actions
  selectTier: (tier: UserTier) => void;
  clearSelection: () => void;

  // Validation
  validate: () => ValidationResult;
  isValid: boolean;
  error: string | null;

  // Computed values
  tierInfo: TierInfo[];
  selectedTierInfo: TierInfo | null;
  recommendedTier: UserTier;

  // Helpers
  isTierAllowed: (tier: UserTier) => boolean;
  getTierPrice: (tier: UserTier) => number;
  compareTiers: (tier1: UserTier, tier2: UserTier) => number;
}

/**
 * Hook for managing tier selection with validation and business rules
 */
export function useTierSelection(options: UseTierSelectionOptions = {}): UseTierSelectionReturn {
  const {
    initialTier = null,
    allowedTiers = ['starter', 'coffee', 'growth', 'scale'],
    required = true,
  } = options;

  // State
  const [selectedTier, setSelectedTier] = useState<UserTier | null>(initialTier);

  // Tier information with business rules
  const tierInfo = useMemo(
    (): TierInfo[] => [
      {
        tier: 'starter',
        displayName: 'Free (But Crippled)',
        features: [
          'Only 3 analyses per day',
          'Limited to 20 pages only',
          'No AI quality scoring',
          'Basic features only',
        ],
        price: 0,
        isRecommended: false,
        isPopular: false,
      },
      {
        tier: 'coffee',
        displayName: 'Coffee Power ($4.95/month)',
        features: [
          'UNLIMITED daily analyses',
          '200 pages per analysis (10x more)',
          'AI-powered content scoring',
          'Keep LLM.txt current',
          'Beat competitors',
        ],
        price: 4.95,
        isRecommended: true,
        isPopular: true,
      },
      {
        tier: 'growth',
        displayName: 'Professional Power ($9.95/mo)',
        features: [
          'Unlimited analyses',
          '1,000 pages per analysis',
          'Team collaboration',
          'Priority support',
        ],
        price: 9.95,
        isRecommended: false,
        isPopular: false,
      },
      {
        tier: 'scale',
        displayName: 'Agency & API ($19.95/mo)',
        features: [
          'Unlimited pages per analysis',
          'Full AI analysis',
          'API access for integrations',
          'Multi-site management',
          'Direct email support',
        ],
        price: 19.95,
        isRecommended: false,
        isPopular: false,
      },
    ],
    []
  );

  // Recommended tier (business rule: coffee tier is best for most users)
  const recommendedTier: UserTier = 'coffee';

  // Select tier with validation
  const selectTier = useCallback(
    (tier: UserTier) => {
      if (!allowedTiers.includes(tier)) {
        console.warn(`Tier ${tier} is not allowed. Allowed tiers:`, allowedTiers);
        return;
      }

      setSelectedTier(tier);
    },
    [allowedTiers]
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedTier(null);
  }, []);

  // Validation
  const validate = useCallback((): ValidationResult => {
    if (required && !selectedTier) {
      return {
        isValid: false,
        errors: [{ field: 'tier', message: 'Please select a service tier' }],
        firstError: { field: 'tier', message: 'Please select a service tier' },
      };
    }

    if (selectedTier && !tierUtils.isValid(selectedTier)) {
      return {
        isValid: false,
        errors: [{ field: 'tier', message: 'Please select a valid service tier' }],
        firstError: { field: 'tier', message: 'Please select a valid service tier' },
      };
    }

    if (selectedTier && !allowedTiers.includes(selectedTier)) {
      return {
        isValid: false,
        errors: [{ field: 'tier', message: 'Selected tier is not available' }],
        firstError: { field: 'tier', message: 'Selected tier is not available' },
      };
    }

    return {
      isValid: true,
      errors: [],
    };
  }, [selectedTier, required, allowedTiers]);

  // Computed validation state
  const validationResult = useMemo(() => validate(), [validate]);
  const isValid = validationResult.isValid;
  const error = validationResult.firstError?.message || null;

  // Get selected tier info
  const selectedTierInfo = useMemo(() => {
    if (!selectedTier) return null;
    return tierInfo.find((info) => info.tier === selectedTier) || null;
  }, [selectedTier, tierInfo]);

  // Helper functions
  const isTierAllowed = useCallback(
    (tier: UserTier) => {
      return allowedTiers.includes(tier);
    },
    [allowedTiers]
  );

  const getTierPrice = useCallback(
    (tier: UserTier) => {
      const info = tierInfo.find((t) => t.tier === tier);
      return info?.price || 0;
    },
    [tierInfo]
  );

  const compareTiers = useCallback(
    (tier1: UserTier, tier2: UserTier) => {
      const price1 = getTierPrice(tier1);
      const price2 = getTierPrice(tier2);
      return price1 - price2; // Lower price first
    },
    [getTierPrice]
  );

  return {
    // State
    selectedTier,

    // Actions
    selectTier,
    clearSelection,

    // Validation
    validate,
    isValid,
    error,

    // Computed values
    tierInfo,
    selectedTierInfo,
    recommendedTier,

    // Helpers
    isTierAllowed,
    getTierPrice,
    compareTiers,
  };
}

/**
 * Simple tier selection hook for basic use cases
 */
export function useSimpleTierSelection(initialTier?: UserTier) {
  return useTierSelection({
    initialTier: initialTier || null,
    required: false,
  });
}
