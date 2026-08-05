/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Performance benchmarks.
 *
 * Run on demand:
 *   npm run test:perf
 *
 * These are deliberately NOT in the default vitest config and NOT in CI. They
 * assert absolute wall-clock times (render < 150ms, frequent state updates
 * < 400ms, visibility toggle < 20ms), which is a measurement of the machine as
 * much as of the code. On a shared GitHub Actions runner they came in at 166ms,
 * 524ms and 46ms, so they had the CI/CD Pipeline red on main and develop
 * continuously from roughly 2026-07-30 (LTM-ISS-22 follow-up).
 *
 * That matters more than the numbers: a pipeline that is always red is a broken
 * smoke alarm. It is the same failure mode that let LTM-ISS-14 (deploys silently
 * failing for days) and LTM-ISS-19 (a security fix sitting unshipped) go
 * unnoticed. A correctness gate has to be trustworthy to be worth anything.
 *
 * Raising the thresholds was considered and rejected: it picks numbers nothing
 * justifies and simply defers the next drift. If you want these enforced, the
 * honest way is a dedicated runner with a stable machine profile, comparing
 * against a recorded baseline rather than a hard-coded millisecond literal.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['client/src/test/performance/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**'],
    testTimeout: 30000,
    hookTimeout: 10000,
    // Benchmarks must not compete with each other for CPU, or they measure
    // contention rather than the component under test.
    isolate: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
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
