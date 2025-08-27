/**
 * TIER UPGRADE VALIDATION TEST CONFIGURATION
 * 
 * Specialized Vitest configuration for testing the tier upgrade fixes.
 * Ensures tests run with proper mocking and database isolation.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test file patterns
    include: [
      'tests/unit/stripe-webhook-handlers.test.ts',
      'tests/unit/email-captures-validation.test.ts',
      'tests/unit/get-user-tier-validation.test.ts',
      'tests/integration/tier-upgrade-integration.test.ts'
    ],
    
    // Global setup and teardown
    globalSetup: ['./tests/setup.ts'],
    
    // Test timeout (important for integration tests)
    testTimeout: 30000,
    
    // Reporters
    reporter: ['verbose', 'json'],
    outputFile: './test-results/tier-validation-results.json',
    
    // Coverage configuration
    coverage: {
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './test-results/tier-validation-coverage',
      include: [
        'server/routes/stripe.ts',
        'server/services/usage.ts',
        'server/storage.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    
    // Aliases for imports
    alias: {
      '@': path.resolve(__dirname, './'),
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
      '@tests': path.resolve(__dirname, './tests')
    },
    
    // Setup files
    setupFiles: [
      './tests/setup.ts'
    ],
    
    // Test execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true // Ensure database tests don't conflict
      }
    }
  },
  
  // Resolve configuration for TypeScript
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});