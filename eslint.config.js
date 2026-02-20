import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Base recommended rules
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Relax some rules for existing codebase
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-namespace': 'warn',
      'prefer-const': 'warn',
      'prefer-rest-params': 'warn',
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
      'migrations/**',
      'scripts/**',
      'test-data/**',
      'tests/**',
      'test/**',
      'test-*.js',
      'test-*.ts',
      'test_*.js',
      'test_*.ts',
      'playwright-report/**',
      'playwright-report-*/**',
      '.playwright-mcp/**',
      '.netlify/**',
      'netlify/**',
      'prospects/**',
      'vite.config.ts',
      'vitest.config.ts',
      'postcss.config.js',
      'tailwind.config.ts',
      'drizzle.config.ts',
      '*.cjs',
      'debug_*.ts',
      'generate-*.ts',
      'generate-*.js',
      'validate-*.ts',
      'validate-*.cjs',
      'simple-*.js',
      'quick-*.js',
      'coffee-*.cjs',
      'security-*.cjs',
      'server/test-*.ts',
    ],
  },
);
