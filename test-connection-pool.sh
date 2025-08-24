#!/bin/bash

# Connection Pool Test Suite Runner
echo "🧪 Running Connection Pool Test Suite"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if dependencies are installed
print_status "Checking dependencies..."

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Run unit tests first
print_status "Running Unit Tests for Connection Pool..."
echo "----------------------------------------"

if npm run test -- tests/connection-pool.test.ts; then
    print_status "✅ Unit tests passed"
else
    print_error "❌ Unit tests failed"
    exit 1
fi

echo ""

# Run integration tests
print_status "Running Integration Tests for Connection Pool..."
echo "----------------------------------------------"

if npm run test -- tests/integration/connection-pool-integration.test.ts; then
    print_status "✅ Integration tests passed"
else
    print_error "❌ Integration tests failed"
    exit 1
fi

echo ""

# Check if server is running for E2E tests
print_status "Checking server status for E2E tests..."

if curl -f http://localhost:8080/api/health &> /dev/null; then
    print_status "✅ Server is running"
    
    print_status "Running E2E Regression Tests for Connection Pool..."
    echo "------------------------------------------------"
    
    if npx playwright test tests/e2e/regression-connection-pool.spec.ts; then
        print_status "✅ E2E tests passed"
    else
        print_error "❌ E2E tests failed"
        exit 1
    fi
else
    print_warning "⚠️  Server not running - skipping E2E tests"
    print_status "To run E2E tests, start the server with: npm run dev"
fi

echo ""
print_status "🎉 Connection Pool Test Suite Complete!"
echo ""
print_status "Summary:"
echo "- Unit Tests: ✅ Passed"
echo "- Integration Tests: ✅ Passed"
if curl -f http://localhost:8080/api/health &> /dev/null; then
    echo "- E2E Tests: ✅ Passed"
else
    echo "- E2E Tests: ⏭️  Skipped (server not running)"
fi

echo ""
print_status "Next steps:"
echo "1. Review test results above"
echo "2. Check connection pool logs in development"
echo "3. Monitor performance metrics in production"
echo "4. Run full regression test suite before deployment"