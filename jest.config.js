/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Module paths and aliases
  moduleNameMapping: {
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@test-data/(.*)$': '<rootDir>/test-data/$1',
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/server/**/__tests__/**/*.{ts,js}',
    '<rootDir>/server/**/*.{test,spec}.{ts,js}',
    '<rootDir>/tests/unit/**/*.{test,spec}.{ts,js}',
    '<rootDir>/tests/integration/**/*.{test,spec}.{ts,js}',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // Transform configuration
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          compilerOptions: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            module: 'commonjs',
          },
        },
      },
    ],
  },

  // File extensions to consider
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage-backend',
  coverageReporters: ['text', 'json', 'html', 'lcov'],

  // Files to include in coverage
  collectCoverageFrom: [
    'server/**/*.{ts,js}',
    'shared/**/*.{ts,js}',
    '!server/index.ts',
    '!server/**/*.d.ts',
    '!server/**/__tests__/**',
    '!server/**/*.test.{ts,js}',
    '!server/**/*.spec.{ts,js}',
    '!server/**/test-*.{ts,js}',
    '!server/vite.ts',
    '!server/config/**',
    '!**/node_modules/**',
    '!**/dist/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Higher thresholds for semantic enhancement services
    './server/services/semantic-*': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Higher thresholds for critical business logic
    './server/services/sitemap*': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './server/services/openai*': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Test timeouts
  testTimeout: 30000,

  // Global test setup
  globalSetup: '<rootDir>/test/jest-global-setup.js',
  globalTeardown: '<rootDir>/test/jest-global-teardown.js',

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/client/',
    '<rootDir>/tests/e2e/',
  ],

  // Handle ES modules in dependencies
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: ['node_modules/(?!(nanoid|openai)/)'],

  // Verbose output for debugging
  verbose: false,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Error handling
  errorOnDeprecated: true,

  // Test result processor for custom reporting
  testResultsProcessor: '<rootDir>/test/jest-results-processor.js',
};
