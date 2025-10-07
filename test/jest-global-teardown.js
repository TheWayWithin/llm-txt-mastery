/**
 * Jest Global Teardown - runs once after all tests
 */

module.exports = async () => {
  console.log('🧹 Jest global teardown starting...');

  // Clean up any global resources
  try {
    // Close database connections if any
    if (global.__DATABASE_CONNECTION__) {
      await global.__DATABASE_CONNECTION__.end();
      console.log('✅ Database connection closed');
    }

    // Close Redis connections if any
    if (global.__REDIS_CONNECTION__) {
      await global.__REDIS_CONNECTION__.quit();
      console.log('✅ Redis connection closed');
    }

    // Clean up temporary files if any
    const { promises: fs } = require('fs');
    const path = require('path');

    const tempDir = path.join(__dirname, '../temp-test-files');
    try {
      await fs.access(tempDir);
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log('✅ Temporary test files cleaned up');
    } catch {
      // Directory doesn't exist, no cleanup needed
    }
  } catch (error) {
    console.warn('⚠️ Teardown warning:', error.message);
  }

  console.log('✅ Jest global teardown complete');
};
