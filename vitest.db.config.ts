/// <reference types="vitest" />
import { defineConfig } from 'vite';
import path from 'path';

/**
 * DB-backed integration tests.
 *
 * These talk to a real postgres rather than mocking drizzle's query builder, so
 * they cannot run on a machine without a database. They are deliberately NOT in
 * the default vitest config: `npx vitest run` must stay green everywhere, and
 * making it depend on a local postgres is what got these suites marked
 * `describe.skip` in the first place.
 *
 * Run them with:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/llm_txt_mastery_test npm run test:db
 *
 * CI runs this config against its postgres service (see .github/workflows/ci.yml),
 * so the tier-upgrade contract is enforced on every push.
 *
 * Mocking the db module instead was considered and rejected: it produces
 * assertions about internal .update().set().where() call chains rather than
 * observable behaviour. tests/unit/email-captures-validation.test.ts was exactly
 * that, its spies were never even attached, and it was deleted in LTM-ISS-22.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['tests/integration/tier-upgrade-integration.test.ts'],
    exclude: ['node_modules/**'],
    testTimeout: 30000,
    hookTimeout: 10000,
    isolate: true,
    pool: 'forks',
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
