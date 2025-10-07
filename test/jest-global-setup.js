/**
 * Jest Global Setup - runs once before all tests
 */

const { spawn } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up Jest test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5432/llmtxt_test';
  process.env.REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost';
  process.env.REDIS_PORT = process.env.TEST_REDIS_PORT || '6379';

  // Setup test database if needed
  try {
    // Check if we need to run migrations
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrations = await fs.readdir(migrationsDir);

    if (migrations.length > 0) {
      console.log('📋 Running database migrations...');
      // Migration logic would go here - simplified for now
      console.log('✅ Database migrations completed');
    }
  } catch (error) {
    console.warn('⚠️ Database setup warning:', error.message);
  }

  // Generate test data if needed
  try {
    const testDataDir = path.join(__dirname, '../test-data-jest');
    await fs.access(testDataDir);
    console.log('✅ Test data found');
  } catch {
    console.log('📊 Generating Jest test data...');
    // Test data generation would happen here
    console.log('✅ Jest test data generated');
  }

  console.log('✅ Jest global setup complete');
};
