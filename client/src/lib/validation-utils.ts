/**
 * Standardized validation utilities for LLM.txt Mastery
 * 
 * Provides reusable Zod schemas, validation functions, and form field validators
 * to ensure consistency across all forms and user inputs.
 */

import { z } from 'zod';
import { UserTier, emailCaptureSchema, urlAnalysisSchema, userRegistrationSchema, userLoginSchema } from '@shared/schema';
import { ValidationError, FormFieldError, ValidationResult } from './error-utils';

// Re-export shared schemas for convenience
export { 
  emailCaptureSchema, 
  urlAnalysisSchema, 
  userRegistrationSchema, 
  userLoginSchema 
} from '@shared/schema';

// Common validation schemas
export const commonSchemas = {
  /**
   * Enhanced email validation with domain checking
   */
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email address is too long')
    .refine(
      (email) => {
        // Basic domain format check
        const domain = email.split('@')[1];
        return domain && domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
      },
      'Please enter a valid email address'
    ),

  /**
   * URL validation with protocol handling
   */
  url: z
    .string()
    .min(1, 'URL is required')
    .refine(
      (url) => {
        try {
          // Auto-add protocol if missing
          const urlWithProtocol = url.match(/^https?:\/\//) ? url : `https://${url}`;
          const parsed = new URL(urlWithProtocol);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      },
      'Please enter a valid URL (e.g., example.com or https://example.com)'
    ),

  /**
   * Tier validation
   */
  tier: z.enum(['starter', 'coffee', 'growth', 'scale'], {
    errorMap: () => ({ message: 'Please select a valid service tier' })
  }),

  /**
   * Password validation with strength requirements
   */
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .refine(
      (password) => /[A-Za-z]/.test(password),
      'Password must contain at least one letter'
    )
    .refine(
      (password) => /\d/.test(password),
      'Password must contain at least one number'
    ),

  /**
   * Optional string that can be empty
   */
  optionalString: z.string().optional().nullable(),

  /**
   * Non-empty string validation
   */
  nonEmptyString: z.string().min(1, 'This field is required').trim()
};

// Form-specific schemas
export const formSchemas = {
  /**
   * Email capture form with enhanced validation
   */
  emailCapture: z.object({
    email: commonSchemas.email,
    websiteUrl: commonSchemas.optionalString,
    tier: commonSchemas.tier.default('coffee')
  }),

  /**
   * URL analysis form
   */
  urlAnalysis: z.object({
    url: commonSchemas.url
  }),

  /**
   * Enhanced user registration
   */
  userRegistration: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    tier: commonSchemas.tier.optional()
  }).refine(
    (data) => data.password === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword']
    }
  ),

  /**
   * User login
   */
  userLogin: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required')
  }),

  /**
   * Password reset request
   */
  passwordResetRequest: z.object({
    email: commonSchemas.email
  }),

  /**
   * Password reset confirmation
   */
  passwordResetConfirm: z.object({
    password: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    token: z.string().min(1, 'Reset token is required')
  }).refine(
    (data) => data.password === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword']
    }
  )
};

// Type exports for form schemas
export type EmailCaptureFormData = z.infer<typeof formSchemas.emailCapture>;
export type UrlAnalysisFormData = z.infer<typeof formSchemas.urlAnalysis>;
export type UserRegistrationFormData = z.infer<typeof formSchemas.userRegistration>;
export type UserLoginFormData = z.infer<typeof formSchemas.userLogin>;
export type PasswordResetRequestFormData = z.infer<typeof formSchemas.passwordResetRequest>;
export type PasswordResetConfirmFormData = z.infer<typeof formSchemas.passwordResetConfirm>;

/**
 * URL normalization utility
 */
export const urlUtils = {
  /**
   * Normalize URL by adding protocol if missing
   */
  normalize: (url: string): string => {
    if (!url.trim()) return url;
    return url.match(/^https?:\/\//) ? url : `https://${url}`;
  },

  /**
   * Validate URL format without throwing
   */
  isValid: (url: string): boolean => {
    try {
      const normalizedUrl = urlUtils.normalize(url);
      const parsed = new URL(normalizedUrl);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },

  /**
   * Extract domain from URL
   */
  getDomain: (url: string): string | null => {
    try {
      const normalizedUrl = urlUtils.normalize(url);
      return new URL(normalizedUrl).hostname;
    } catch {
      return null;
    }
  }
};

/**
 * Email validation utilities
 */
export const emailUtils = {
  /**
   * Basic email format validation
   */
  isValid: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.toLowerCase());
  },

  /**
   * Extract domain from email
   */
  getDomain: (email: string): string | null => {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : null;
  },

  /**
   * Check for common disposable email domains
   */
  isDisposable: (email: string): boolean => {
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'temp-mail.org'
    ];
    const domain = emailUtils.getDomain(email);
    return domain ? disposableDomains.includes(domain) : false;
  }
};

/**
 * Password validation utilities
 */
export const passwordUtils = {
  /**
   * Check password strength
   */
  checkStrength: (password: string): {
    score: number; // 0-4
    feedback: string[];
    isStrong: boolean;
  } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else feedback.push('Use at least 8 characters');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score++;
    else feedback.push('Include numbers');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('Include special characters');

    return {
      score,
      feedback,
      isStrong: score >= 3
    };
  },

  /**
   * Validate password meets minimum requirements
   */
  meetsRequirements: (password: string): ValidationResult => {
    const errors: FormFieldError[] = [];

    if (password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    }

    if (!/[A-Za-z]/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one letter' });
    }

    if (!/\d/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one number' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      firstError: errors[0]
    };
  }
};

/**
 * Tier validation utilities
 */
export const tierUtils = {
  /**
   * Valid tier options
   */
  validTiers: ['starter', 'coffee', 'growth', 'scale'] as const,

  /**
   * Check if tier is valid
   */
  isValid: (tier: string): tier is UserTier => {
    return tierUtils.validTiers.includes(tier as UserTier);
  },

  /**
   * Get tier display name
   */
  getDisplayName: (tier: UserTier): string => {
    const displayNames: Record<UserTier, string> = {
      starter: 'Starter (Free)',
      coffee: 'Coffee ($4.95)',
      growth: 'Growth ($9.95)',
      scale: 'Scale ($19.95)'
    };
    return displayNames[tier] || tier;
  },

  /**
   * Get tier features
   */
  getFeatures: (tier: UserTier): string[] => {
    const features: Record<UserTier, string[]> = {
      starter: ['Basic HTML analysis', '1 analysis per day', 'Standard support'],
      coffee: ['AI-enhanced analysis', '5 analyses per day', 'Priority support', 'File history'],
      growth: ['Advanced AI analysis', '25 analyses per day', 'Smart caching', 'Priority support'],
      scale: ['Enterprise AI analysis', 'Unlimited analyses', 'API access', 'White-label options']
    };
    return features[tier] || [];
  }
};

/**
 * Generic form validation helper
 */
export const validateForm = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data?: T; errors?: FormFieldError[] } => {
  try {
    const validatedData = schema.parse(data);
    return { data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: FormFieldError[] = error.errors.map(err => ({
        field: err.path.join('.') || 'form',
        message: err.message,
        code: err.code
      }));
      return { errors };
    }
    
    return { 
      errors: [{ 
        field: 'form', 
        message: 'Validation failed' 
      }] 
    };
  }
};

/**
 * Field-specific validation helpers
 */
export const fieldValidators = {
  email: (value: string): ValidationResult => {
    const result = validateForm(commonSchemas.email, value);
    return {
      isValid: !result.errors,
      errors: result.errors || [],
      firstError: result.errors?.[0]
    };
  },

  url: (value: string): ValidationResult => {
    const result = validateForm(commonSchemas.url, value);
    return {
      isValid: !result.errors,
      errors: result.errors || [],
      firstError: result.errors?.[0]
    };
  },

  password: (value: string): ValidationResult => {
    const result = validateForm(commonSchemas.password, value);
    return {
      isValid: !result.errors,
      errors: result.errors || [],
      firstError: result.errors?.[0]
    };
  },

  tier: (value: string): ValidationResult => {
    const result = validateForm(commonSchemas.tier, value);
    return {
      isValid: !result.errors,
      errors: result.errors || [],
      firstError: result.errors?.[0]
    };
  }
};

/**
 * Validation error message formatting
 */
export const validationMessages = {
  required: (field: string) => `${field} is required`,
  invalid: (field: string) => `Please enter a valid ${field.toLowerCase()}`,
  tooShort: (field: string, min: number) => `${field} must be at least ${min} characters`,
  tooLong: (field: string, max: number) => `${field} must be no more than ${max} characters`,
  mismatch: (field1: string, field2: string) => `${field1} and ${field2} do not match`,
  
  // Specific field messages
  email: {
    required: 'Email address is required',
    invalid: 'Please enter a valid email address',
    disposable: 'Please use a non-disposable email address',
    tooLong: 'Email address is too long'
  },
  
  password: {
    required: 'Password is required',
    tooShort: 'Password must be at least 8 characters',
    weak: 'Password is too weak',
    mismatch: 'Passwords do not match'
  },
  
  url: {
    required: 'Website URL is required',
    invalid: 'Please enter a valid URL (e.g., example.com)',
    notAccessible: 'This website appears to be inaccessible'
  },
  
  tier: {
    required: 'Please select a service tier',
    invalid: 'Please select a valid service tier'
  }
};