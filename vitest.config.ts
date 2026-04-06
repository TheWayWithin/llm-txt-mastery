/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // Sprint 16: Use node environment for server-side tests to avoid OpenAI
    // dangerouslyAllowBrowser error and other browser-API leakage. Client
    // component tests stay on jsdom (default).
    environmentMatchGlobs: [
      ['server/**', 'node'],
      ['tests/unit/**', 'node'],
      ['tests/integration/**', 'node'],
    ],
    setupFiles: ['./test/setup.ts'],
    // Only run unit/integration tests, not Playwright e2e tests
    include: [
      'client/src/**/*.test.{ts,tsx}',
      'server/**/*.test.{ts,tsx}',
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    exclude: [
      'node_modules/**',
      'tests/e2e/**',           // Playwright tests - run separately
      'tests/**/*.spec.ts',     // Playwright spec files
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportOnFailure: true,
      all: true,
      include: ['client/src/**/*.{ts,tsx}', 'server/**/*.{ts,js}', 'shared/**/*.{ts,js}'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        'client/src/main.tsx',
        'server/index.ts',
        'scripts/**',
        'migrations/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Specific thresholds for semantic enhancement modules
        'server/services/semantic-*.ts': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'client/src/hooks/use*.ts': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    // Performance settings for large test suites
    testTimeout: 30000,
    hookTimeout: 10000,
    isolate: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
      '@test-data': path.resolve(__dirname, './test-data'),
    },
  },
});
