#!/bin/bash

# Database Setup Script for LLM.txt Mastery Semantic Enhancements
# This script sets up pgvector and creates all necessary tables

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 Starting LLM.txt Mastery Database Setup${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable is not set${NC}"
    echo -e "${YELLOW}Please set your Neon PostgreSQL connection string:${NC}"
    echo -e "${YELLOW}export DATABASE_URL='your_connection_string_here'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ DATABASE_URL found${NC}"

# Function to run SQL with error handling
run_sql() {
    local sql_file="$1"
    local description="$2"
    
    echo -e "${BLUE}📄 Running: $description${NC}"
    
    if [ ! -f "$sql_file" ]; then
        echo -e "${RED}❌ SQL file not found: $sql_file${NC}"
        exit 1
    fi
    
    if psql "$DATABASE_URL" -f "$sql_file"; then
        echo -e "${GREEN}✅ Completed: $description${NC}"
    else
        echo -e "${RED}❌ Failed: $description${NC}"
        exit 1
    fi
    echo ""
}

# Check PostgreSQL connection
echo -e "${BLUE}🔍 Testing database connection...${NC}"
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo -e "${YELLOW}Please check your DATABASE_URL and network connectivity${NC}"
    exit 1
fi
echo ""

# Run setup scripts in order
echo -e "${BLUE}📦 Setting up pgvector extension and tables...${NC}"

# 1. Run the main pgvector setup
run_sql "$SCRIPT_DIR/setup-pgvector.sql" "pgvector Extension Setup"

# 2. Run the migration (if it exists)
if [ -f "$PROJECT_ROOT/migrations/005_semantic_enhancements.sql" ]; then
    run_sql "$PROJECT_ROOT/migrations/005_semantic_enhancements.sql" "Semantic Enhancement Tables Migration"
fi

# 3. Check if we have embeddings data, then create vector indexes
echo -e "${BLUE}🔍 Checking for existing embeddings data...${NC}"
EMBEDDING_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COALESCE((SELECT count(*) FROM embedding_cache), 0);" 2>/dev/null || echo "0")
echo -e "${BLUE}Found $EMBEDDING_COUNT cached embeddings${NC}"

if [ "$EMBEDDING_COUNT" -gt 0 ]; then
    echo -e "${BLUE}📊 Creating vector indexes (data exists)...${NC}"
    run_sql "$SCRIPT_DIR/create-vector-indexes.sql" "Vector Index Creation"
else
    echo -e "${YELLOW}⚠️  Skipping vector index creation (no data exists yet)${NC}"
    echo -e "${YELLOW}   Run create-vector-indexes.sql after generating embeddings${NC}"
fi

# 4. Test the setup
echo -e "${BLUE}🧪 Testing database setup...${NC}"
TEST_RESULT=$(psql "$DATABASE_URL" -t -c "SELECT test_vector_performance();" 2>/dev/null || echo "FAILED")

if [[ "$TEST_RESULT" == *"FAILED"* ]]; then
    echo -e "${RED}❌ Database test failed${NC}"
    echo -e "${YELLOW}The setup completed but tests are failing${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Database tests passed${NC}"
fi

# 5. Show setup summary
echo -e "${BLUE}📊 Setup Summary${NC}"
echo -e "${BLUE}===============${NC}"

# Query table information
echo -e "${BLUE}Tables created:${NC}"
TABLES=$(psql "$DATABASE_URL" -t -c "
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name IN ('embedding_cache', 'content_clusters', 'semantic_tags', 'page_relationships', 'enhanced_descriptions')
    ORDER BY table_name;
" 2>/dev/null || echo "Query failed")

if [[ "$TABLES" != *"failed"* ]]; then
    echo "$TABLES" | sed 's/^/  ✅ /'
else
    echo -e "${RED}  ❌ Could not query table information${NC}"
fi

# Query extension status
echo -e "${BLUE}Extensions:${NC}"
EXT_STATUS=$(psql "$DATABASE_URL" -t -c "
    SELECT extname || ' (version ' || extversion || ')' as extension
    FROM pg_extension 
    WHERE extname = 'vector';
" 2>/dev/null || echo "Query failed")

if [[ "$EXT_STATUS" != *"failed"* && "$EXT_STATUS" != "" ]]; then
    echo "  ✅ $EXT_STATUS"
else
    echo -e "${RED}  ❌ pgvector extension not found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Database setup completed successfully!${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo -e "${BLUE}  1. Set up Redis for embedding cache${NC}"
echo -e "${BLUE}  2. Configure OpenAI API key${NC}"
echo -e "${BLUE}  3. Run: npm run test:environment${NC}"
echo -e "${BLUE}  4. After generating embeddings, run: ${SCRIPT_DIR}/create-vector-indexes.sql${NC}"

exit 0