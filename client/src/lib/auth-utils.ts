/**
 * Client-side password validation utilities
 */

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  requirements: string[];
}

/**
 * Validates a password against security requirements
 * Mirrors the server-side validation logic
 */
export function validatePasswordClient(password: string): PasswordValidation {
  const errors: string[] = [];
  const requirements = [
    'At least 8 characters long',
    'Contains at least one lowercase letter',
    'Contains at least one uppercase letter',
    'Contains at least one number',
    'Contains at least one special character',
  ];

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character - same regex as server
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
    requirements,
  };
}

/**
 * Check if an email address appears valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
