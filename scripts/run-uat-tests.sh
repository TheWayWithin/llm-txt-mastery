#!/bin/bash

# ============================================================================
# User Acceptance Testing (UAT) Runner Script
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
UAT_CONFIG="playwright.uat.config.ts"
REPORTS_DIR="tests/reports"
SCREENSHOTS_DIR="tests/screenshots"
DOWNLOADS_DIR="tests/downloads"

# Print banner
echo -e "${BLUE}"
echo "============================================================================"
echo "                    LLM.txt Mastery - User Acceptance Testing               "
echo "============================================================================"
echo -e "${NC}"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if Playwright is installed
    if ! npm list @playwright/test &> /dev/null; then
        print_warning "Playwright not found. Installing..."
        npm install @playwright/test
    fi
    
    # Check if browsers are installed
    print_info "Checking Playwright browsers..."
    npx playwright install
    
    print_success "Prerequisites check completed"
}

# Function to create necessary directories
create_directories() {
    print_info "Creating test directories..."
    
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$SCREENSHOTS_DIR"
    mkdir -p "$DOWNLOADS_DIR"
    mkdir -p "tests/videos"
    mkdir -p "tests/traces"
    
    print_success "Directories created"
}

# Function to clean previous test artifacts
clean_artifacts() {
    if [ "$1" == "--clean" ]; then
        print_info "Cleaning previous test artifacts..."
        
        rm -rf "$REPORTS_DIR"/*
        rm -rf "$SCREENSHOTS_DIR"/*
        rm -rf "$DOWNLOADS_DIR"/*
        rm -rf tests/videos/*
        rm -rf tests/traces/*
        
        print_success "Artifacts cleaned"
    fi
}

# Function to set test environment
set_test_environment() {
    local env=$1
    
    case $env in
        production|prod)
            export TEST_ENV="production"
            export TEST_URL="https://llmtxtmastery.com"
            print_info "Testing against PRODUCTION environment"
            ;;
        staging|stage)
            export TEST_ENV="staging"
            export TEST_URL="https://staging.llmtxtmastery.com"
            print_info "Testing against STAGING environment"
            ;;
        development|dev|local)
            export TEST_ENV="development"
            export TEST_URL="http://localhost:8080"
            print_info "Testing against LOCAL environment"
            ;;
        *)
            export TEST_ENV="production"
            export TEST_URL="https://llmtxtmastery.com"
            print_info "Testing against PRODUCTION environment (default)"
            ;;
    esac
}

# Function to run specific test suites
run_test_suite() {
    local suite=$1
    local project=$2
    
    case $suite in
        all)
            print_info "Running ALL UAT tests..."
            npx playwright test --config="$UAT_CONFIG"
            ;;
        free)
            print_info "Running Free Tier tests..."
            npx playwright test --config="$UAT_CONFIG" --grep="Free Tier"
            ;;
        coffee)
            print_info "Running Coffee Tier tests..."
            npx playwright test --config="$UAT_CONFIG" --grep="Coffee Tier"
            ;;
        growth)
            print_info "Running Growth Tier tests..."
            npx playwright test --config="$UAT_CONFIG" --grep="Growth Tier"
            ;;
        scale)
            print_info "Running Scale Tier tests..."
            npx playwright test --config="$UAT_CONFIG" --grep="Scale Tier"
            ;;
        auth)
            print_info "Running Authentication tests..."
            npx playwright test --config="$UAT_CONFIG" --grep="Authentication"
            ;;
        payment)
            print_info "Running Payment Integration tests..."
            npx playwright test --config="$UAT_CONFIG" --grep="Payment"
            ;;
        performance)
            print_info "Running Performance tests..."
            npx playwright test --config="$UAT_CONFIG" --grep="Performance"
            ;;
        security)
            print_info "Running Security tests..."
            npx playwright test --config="$UAT_CONFIG" --grep="Security"
            ;;
        mobile)
            print_info "Running Mobile tests..."
            npx playwright test --config="$UAT_CONFIG" --project="mobile-*"
            ;;
        desktop)
            print_info "Running Desktop tests..."
            npx playwright test --config="$UAT_CONFIG" --project="*-desktop"
            ;;
        *)
            print_info "Running default UAT test suite..."
            npx playwright test --config="$UAT_CONFIG"
            ;;
    esac
    
    # Run specific browser if specified
    if [ ! -z "$project" ]; then
        print_info "Running on specific browser: $project"
        npx playwright test --config="$UAT_CONFIG" --project="$project"
    fi
}

# Function to generate test report
generate_report() {
    print_info "Generating test report..."
    
    # Generate HTML report
    npx playwright show-report tests/reports/uat-html-report
    
    # Generate summary
    if [ -f "$REPORTS_DIR/uat-results.json" ]; then
        print_info "Test Results Summary:"
        node -e "
        const fs = require('fs');
        const results = JSON.parse(fs.readFileSync('$REPORTS_DIR/uat-results.json', 'utf8'));
        const stats = results.stats || {};
        
        console.log('=====================================');
        console.log('Total Tests:', stats.total || 0);
        console.log('Passed:', stats.expected || 0);
        console.log('Failed:', stats.unexpected || 0);
        console.log('Skipped:', stats.skipped || 0);
        console.log('Duration:', ((stats.duration || 0) / 1000).toFixed(2), 'seconds');
        console.log('=====================================');
        
        // Check if ready for production
        const passRate = ((stats.expected || 0) / (stats.total || 1)) * 100;
        if (passRate >= 95) {
            console.log('✅ PASS RATE:', passRate.toFixed(1) + '%');
            console.log('🎉 UAT PASSED - Ready for production!');
        } else {
            console.log('❌ PASS RATE:', passRate.toFixed(1) + '%');
            console.log('⚠️ UAT FAILED - Issues need resolution');
        }
        "
    fi
}

# Function to run in CI mode
run_ci_mode() {
    print_info "Running in CI mode..."
    
    export CI=true
    export TEST_ENV="production"
    
    # Run tests with retries and parallel execution
    npx playwright test \
        --config="$UAT_CONFIG" \
        --workers=4 \
        --retries=2 \
        --reporter=list,json,junit
    
    # Upload artifacts if tests fail
    if [ $? -ne 0 ]; then
        print_warning "Tests failed. Artifacts saved to test-results/"
    fi
}

# Function to run in debug mode
run_debug_mode() {
    print_info "Running in DEBUG mode..."
    
    export DEBUG=true
    export PWDEBUG=1
    
    npx playwright test \
        --config="$UAT_CONFIG" \
        --debug \
        --headed \
        --workers=1 \
        $@
}

# Function to run with UI mode
run_ui_mode() {
    print_info "Running in UI mode..."
    
    npx playwright test \
        --config="$UAT_CONFIG" \
        --ui
}

# Main execution
main() {
    # Parse arguments
    MODE=${1:-all}
    ENV=${2:-production}
    EXTRA_ARGS=${@:3}
    
    # Handle special modes
    case $MODE in
        --help|-h)
            echo "Usage: $0 [mode] [environment] [options]"
            echo ""
            echo "Modes:"
            echo "  all         - Run all UAT tests (default)"
            echo "  free        - Run Free tier tests"
            echo "  coffee      - Run Coffee tier tests"
            echo "  growth      - Run Growth tier tests"
            echo "  scale       - Run Scale tier tests"
            echo "  auth        - Run Authentication tests"
            echo "  payment     - Run Payment tests"
            echo "  performance - Run Performance tests"
            echo "  security    - Run Security tests"
            echo "  mobile      - Run Mobile tests"
            echo "  desktop     - Run Desktop tests"
            echo "  ci          - Run in CI mode"
            echo "  debug       - Run in debug mode"
            echo "  ui          - Run with Playwright UI"
            echo "  clean       - Clean test artifacts"
            echo ""
            echo "Environments:"
            echo "  production  - Test production site (default)"
            echo "  staging     - Test staging site"
            echo "  local       - Test local development"
            echo ""
            echo "Options:"
            echo "  --clean     - Clean artifacts before running"
            echo "  --project   - Specify browser project"
            echo "  --headed    - Run in headed mode"
            echo ""
            echo "Examples:"
            echo "  $0 all production        # Run all tests on production"
            echo "  $0 coffee staging        # Run coffee tier tests on staging"
            echo "  $0 debug auth local      # Debug auth tests locally"
            echo "  $0 ci                    # Run in CI mode"
            exit 0
            ;;
            
        clean)
            clean_artifacts --clean
            exit 0
            ;;
            
        ci)
            check_prerequisites
            create_directories
            clean_artifacts --clean
            run_ci_mode
            generate_report
            exit $?
            ;;
            
        debug)
            check_prerequisites
            create_directories
            set_test_environment "$ENV"
            run_debug_mode $EXTRA_ARGS
            exit $?
            ;;
            
        ui)
            check_prerequisites
            create_directories
            set_test_environment "$ENV"
            run_ui_mode
            exit $?
            ;;
            
        *)
            # Standard test run
            check_prerequisites
            create_directories
            
            # Check for --clean flag
            if [[ " $EXTRA_ARGS " =~ " --clean " ]]; then
                clean_artifacts --clean
            fi
            
            set_test_environment "$ENV"
            
            # Record start time
            START_TIME=$(date +%s)
            
            # Run tests
            run_test_suite "$MODE" "$3"
            TEST_EXIT_CODE=$?
            
            # Record end time
            END_TIME=$(date +%s)
            DURATION=$((END_TIME - START_TIME))
            
            print_info "Test execution time: ${DURATION} seconds"
            
            # Generate report if not in debug mode
            if [ "$MODE" != "debug" ]; then
                generate_report
            fi
            
            # Exit with test exit code
            exit $TEST_EXIT_CODE
            ;;
    esac
}

# Run main function
main "$@"