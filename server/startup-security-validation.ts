/**
 * CRITICAL SECURITY: Startup Security Validation
 * 
 * This module performs security validation at application startup
 * to ensure production environments have secure configuration.
 * 
 * SECURITY FIX: CVSS 9.1 - JWT Secret Environment Variable Security
 */

interface SecurityValidationResult {
  passed: boolean;
  warnings: string[];
  errors: string[];
  criticalErrors: string[];
}

/**
 * Validate JWT secrets for production security
 */
function validateJWTSecurity(): SecurityValidationResult {
  const result: SecurityValidationResult = {
    passed: false,
    warnings: [],
    errors: [],
    criticalErrors: []
  };

  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const nodeEnv = process.env.NODE_ENV;

  // Critical: Missing JWT secrets
  if (!jwtSecret) {
    result.criticalErrors.push('CRITICAL: JWT_SECRET environment variable is missing');
  }

  if (!jwtRefreshSecret) {
    result.criticalErrors.push('CRITICAL: JWT_REFRESH_SECRET environment variable is missing');
  }

  // Critical: Weak or default JWT secrets
  if (jwtSecret) {
    const weakSecrets = [
      'fallback-secret-for-development',
      'development',
      'dev', 
      'test',
      'secret',
      'jwt-secret',
      'password',
      '123456'
    ];

    if (weakSecrets.includes(jwtSecret.toLowerCase())) {
      result.criticalErrors.push(`CRITICAL: JWT_SECRET is using a weak/default value: ${jwtSecret}`);
    } else if (jwtSecret.length < 32) {
      result.criticalErrors.push(`CRITICAL: JWT_SECRET is too short (${jwtSecret.length} chars, minimum 32)`);
    } else if (nodeEnv === 'production' && jwtSecret.length < 64) {
      result.warnings.push(`WARNING: JWT_SECRET should be at least 64 characters in production (current: ${jwtSecret.length})`);
    }
  }

  if (jwtRefreshSecret) {
    const weakRefreshSecrets = [
      'fallback-refresh-secret-for-development',
      'development',
      'dev',
      'test', 
      'secret',
      'refresh-secret',
      'password',
      '123456'
    ];

    if (weakRefreshSecrets.includes(jwtRefreshSecret.toLowerCase())) {
      result.criticalErrors.push(`CRITICAL: JWT_REFRESH_SECRET is using a weak/default value: ${jwtRefreshSecret}`);
    } else if (jwtRefreshSecret.length < 32) {
      result.criticalErrors.push(`CRITICAL: JWT_REFRESH_SECRET is too short (${jwtRefreshSecret.length} chars, minimum 32)`);
    } else if (nodeEnv === 'production' && jwtRefreshSecret.length < 64) {
      result.warnings.push(`WARNING: JWT_REFRESH_SECRET should be at least 64 characters in production (current: ${jwtRefreshSecret.length})`);
    }
  }

  // Validation: Same secrets
  if (jwtSecret && jwtRefreshSecret && jwtSecret === jwtRefreshSecret) {
    result.criticalErrors.push('CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }

  result.passed = result.criticalErrors.length === 0;
  return result;
}

/**
 * Validate OpenAI API configuration
 */
function validateOpenAISecurity(): SecurityValidationResult {
  const result: SecurityValidationResult = {
    passed: false,
    warnings: [],
    errors: [],
    criticalErrors: []
  };

  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const nodeEnv = process.env.NODE_ENV;

  // Check for LLM API key (OpenRouter preferred, OpenAI fallback)
  if (!openrouterApiKey && !openaiApiKey) {
    if (nodeEnv === 'production') {
      result.errors.push('ERROR: No LLM API key (OPENROUTER_API_KEY or OPENAI_API_KEY) in production');
    } else {
      result.warnings.push('WARNING: No LLM API key set (AI features will be disabled)');
    }
  } else if (openrouterApiKey) {
    // Validate OpenRouter key format
    if (!openrouterApiKey.startsWith('sk-or-')) {
      result.warnings.push('WARNING: OPENROUTER_API_KEY may not be valid (expected "sk-or-" prefix)');
    }
    console.log('✅ Using OpenRouter for LLM calls');
  } else if (openaiApiKey) {
    // Validate OpenAI key format (fallback)
    if (!openaiApiKey.startsWith('sk-')) {
      result.errors.push('ERROR: OPENAI_API_KEY does not appear to be valid (should start with "sk-")');
    } else if (openaiApiKey.length < 40) {
      result.errors.push(`ERROR: OPENAI_API_KEY appears too short (${openaiApiKey.length} chars)`);
    }
    console.log('⚠️ Using OpenAI directly (consider switching to OpenRouter)');

    // Check for test/development keys in production
    if (nodeEnv === 'production' && (
      openaiApiKey.includes('test') || 
      openaiApiKey.includes('dev') ||
      openaiApiKey.includes('fake')
    )) {
      result.criticalErrors.push('CRITICAL: Test/development OpenAI API key detected in production');
    }
  }

  result.passed = result.criticalErrors.length === 0;
  return result;
}

/**
 * Validate database configuration security
 */
function validateDatabaseSecurity(): SecurityValidationResult {
  const result: SecurityValidationResult = {
    passed: false,
    warnings: [],
    errors: [],
    criticalErrors: []
  };

  const databaseUrl = process.env.DATABASE_URL;
  const nodeEnv = process.env.NODE_ENV;

  if (!databaseUrl) {
    result.criticalErrors.push('CRITICAL: DATABASE_URL environment variable is missing');
  } else {
    // Check for insecure database connections in production
    if (nodeEnv === 'production') {
      if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
        result.criticalErrors.push('CRITICAL: Database URL points to localhost in production');
      }
      
      if (databaseUrl.startsWith('postgres://') && !databaseUrl.includes('sslmode=require')) {
        result.warnings.push('WARNING: Database connection may not be using SSL in production');
      }
      
      if (databaseUrl.includes('password=') || databaseUrl.includes(':@')) {
        result.warnings.push('WARNING: Database URL may contain credentials in plain text');
      }
    }

    // Check for test/development databases in production
    if (nodeEnv === 'production' && (
      databaseUrl.includes('test') ||
      databaseUrl.includes('dev') ||
      databaseUrl.includes('local')
    )) {
      result.criticalErrors.push('CRITICAL: Test/development database detected in production');
    }
  }

  result.passed = result.criticalErrors.length === 0;
  return result;
}

/**
 * Comprehensive startup security validation
 */
export function performStartupSecurityValidation(): void {
  console.log('\n🔒 PERFORMING STARTUP SECURITY VALIDATION...\n');

  const jwtValidation = validateJWTSecurity();
  const openaiValidation = validateOpenAISecurity();
  const dbValidation = validateDatabaseSecurity();

  // Report JWT Security
  console.log('🔑 JWT Security Validation:');
  if (jwtValidation.passed) {
    console.log('  ✅ JWT secrets are secure');
  } else {
    jwtValidation.criticalErrors.forEach(error => console.error(`  ❌ ${error}`));
    jwtValidation.errors.forEach(error => console.error(`  🔴 ${error}`));
    jwtValidation.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }

  // Report OpenAI Security  
  console.log('\n🤖 OpenAI API Security Validation:');
  if (openaiValidation.passed) {
    console.log('  ✅ OpenAI configuration is secure');
  } else {
    openaiValidation.criticalErrors.forEach(error => console.error(`  ❌ ${error}`));
    openaiValidation.errors.forEach(error => console.error(`  🔴 ${error}`));
    openaiValidation.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }

  // Report Database Security
  console.log('\n🗄️  Database Security Validation:');
  if (dbValidation.passed) {
    console.log('  ✅ Database configuration is secure');
  } else {
    dbValidation.criticalErrors.forEach(error => console.error(`  ❌ ${error}`));
    dbValidation.errors.forEach(error => console.error(`  🔴 ${error}`));
    dbValidation.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }

  // Summary
  const totalCriticalErrors = jwtValidation.criticalErrors.length + 
                             openaiValidation.criticalErrors.length + 
                             dbValidation.criticalErrors.length;

  const totalErrors = jwtValidation.errors.length + 
                     openaiValidation.errors.length + 
                     dbValidation.errors.length;

  const totalWarnings = jwtValidation.warnings.length + 
                       openaiValidation.warnings.length + 
                       dbValidation.warnings.length;

  console.log('\n📊 SECURITY VALIDATION SUMMARY:');
  console.log(`  Critical Errors: ${totalCriticalErrors}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Warnings: ${totalWarnings}`);

  // Fail startup if critical errors exist
  if (totalCriticalErrors > 0) {
    console.error('\n🚨 STARTUP ABORTED: Critical security issues must be resolved before starting the application');
    console.error('🔧 Fix the critical errors above and restart the application');
    process.exit(1);
  }

  if (totalErrors > 0) {
    console.warn('\n⚠️  WARNING: Security errors detected. Application will start but should be fixed soon.');
  }

  if (totalWarnings > 0) {
    console.info('\n💡 INFO: Security warnings detected. Consider addressing for optimal security.');
  }

  if (totalCriticalErrors === 0 && totalErrors === 0 && totalWarnings === 0) {
    console.log('\n✅ ALL SECURITY VALIDATIONS PASSED - Application is secure to start');
  }

  console.log('\n🔒 Security validation complete\n');
}

/**
 * Generate secure JWT secret for development/setup
 */
export function generateSecureJWTSecret(length: number = 64): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Environment setup helper
 */
export function generateSecurityEnvironmentTemplate(): string {
  const jwtSecret = generateSecureJWTSecret(64);
  const refreshSecret = generateSecureJWTSecret(64);
  
  return `# CRITICAL SECURITY: JWT Secrets
# Generate new secrets for each environment using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${refreshSecret}

# Optional: JWT Token Expiration (defaults shown)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI API Configuration
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Database Configuration
DATABASE_URL=your-production-database-url-here

# Environment
NODE_ENV=production`;
}