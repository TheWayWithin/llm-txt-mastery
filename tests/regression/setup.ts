/**
 * Regression Test Setup
 * Node environment setup for backend regression testing
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-regression-testing-must-be-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-regression-testing-must-be-at-least-32-chars-long';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'test://in-memory';

// Optional Stripe keys (for payment tests)
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';

// Silence console logs during tests (optional)
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: () => {},
    debug: () => {},
    info: () => {},
  };
}
