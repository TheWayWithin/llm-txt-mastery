# LLM.txt Mastery Semantic Enhancement Setup Guide

This guide walks through setting up the complete environment for semantic enhancements including pgvector, Redis, and OpenAI integration.

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Neon PostgreSQL database account
- ✅ Railway account (for Redis hosting)
- ✅ OpenAI API account
- ✅ Access to project repository

## 🚀 Quick Start (5-Minute Setup)

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd llm-txt-mastery
npm install
```

### 2. Environment Configuration

Copy and configure environment variables:

```bash
cp .env.example .env.local
```

Fill in the required values in `.env.local`:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host/database

# Redis (Railway or other provider)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# OpenAI API
OPENAI_API_KEY=sk-your-openai-key-here

# Enable semantic features
ENABLE_SEMANTIC_FEATURES=true
```

### 3. Database Setup

Run the automated setup script:

```bash
./scripts/setup-database.sh
```

This will:

- Enable pgvector extension
- Create all semantic enhancement tables
- Set up vector indexes (if data exists)
- Run performance tests

### 4. Verify Setup

Run the comprehensive test suite:

```bash
npm run test:environment
```

**Expected Result**: All tests should pass with green checkmarks ✅

---

## 📋 Detailed Setup Instructions

### Database Setup (Neon PostgreSQL)

#### Option A: Automated Setup (Recommended)

```bash
export DATABASE_URL="your_neon_connection_string"
./scripts/setup-database.sh
```

#### Option B: Manual Setup

```bash
# 1. Enable pgvector
psql $DATABASE_URL -f scripts/setup-pgvector.sql

# 2. Run migrations
psql $DATABASE_URL -f migrations/005_semantic_enhancements.sql

# 3. Create indexes (after you have embedding data)
psql $DATABASE_URL -f scripts/create-vector-indexes.sql
```

#### Verify Database Setup

```sql
-- Check pgvector extension
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('embedding_cache', 'content_clusters', 'semantic_tags');

-- Test vector operations
SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector;
```

### Redis Setup

#### Option A: Railway (Recommended)

1. Login to Railway dashboard
2. Create new Redis service
3. Copy connection details to `.env.local`
4. Test connection:

```bash
redis-cli -h your-host -p your-port -a your-password ping
```

#### Option B: Upstash (Serverless)

1. Sign up at Upstash.com
2. Create Redis database
3. Use REST URL format:

```bash
REDIS_HOST=your-upstash-endpoint
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-token
```

#### Option C: Local Development

```bash
# Install Redis locally
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu

# Start Redis
redis-server

# Use local settings
REDIS_HOST=localhost
REDIS_PORT=6379
# No password needed for local
```

### OpenAI API Setup

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to environment:

```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

3. Test API access:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## 🧪 Testing and Validation

### Environment Test Suite

Run the complete test suite:

```bash
npm run test:environment
```

**Test Coverage:**

- ✅ Configuration validation
- ✅ PostgreSQL connection and pgvector
- ✅ Semantic enhancement tables
- ✅ Vector operations performance
- ✅ Redis connection and caching
- ✅ OpenAI API and embedding generation
- ✅ Full integration pipeline
- ✅ Performance benchmarks

### Manual Testing

#### Test PostgreSQL + pgvector

```bash
psql $DATABASE_URL -c "SELECT test_vector_performance();"
```

#### Test Redis Cache

```bash
node -e "
const { EmbeddingCache } = require('./server/services/redis-client.ts');
EmbeddingCache.setEmbedding('test', [1,2,3], {contentText: 'test', modelVersion: 'test'});
"
```

#### Test OpenAI Embeddings

```bash
node -e "
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
openai.embeddings.create({model: 'text-embedding-3-small', input: 'test'})
  .then(r => console.log('✅ Embedding length:', r.data[0].embedding.length));
"
```

### Performance Expectations

| Operation                   | Expected Time | Notes                       |
| --------------------------- | ------------- | --------------------------- |
| Vector Insert               | < 50ms        | Per embedding in PostgreSQL |
| Vector Similarity Search    | < 100ms       | With proper indexes         |
| Redis Cache Hit             | < 5ms         | Local network               |
| OpenAI Embedding Generation | < 500ms       | Per API call                |
| Full Pipeline (cache miss)  | < 600ms       | Including OpenAI + storage  |
| Full Pipeline (cache hit)   | < 10ms        | Redis + PostgreSQL          |

---

## 🔧 Configuration Reference

### Environment Variables

#### Required Variables

```bash
DATABASE_URL=postgresql://...           # Neon PostgreSQL
REDIS_HOST=your-redis-host             # Redis cache server
REDIS_PASSWORD=your-redis-password     # Redis auth
OPENAI_API_KEY=sk-...                  # OpenAI API access
```

#### Optional Configuration

```bash
# Redis Settings
REDIS_PORT=6379                        # Default: 6379
REDIS_DB=0                             # Default: 0

# OpenAI Settings
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Default model
EMBEDDING_DIMENSIONS=1536              # Model dimensions
EMBEDDING_BATCH_SIZE=100               # Batch processing size
EMBEDDING_RATE_LIMIT_PER_MINUTE=3000   # API rate limit

# Cache Settings
EMBEDDING_CACHE_TTL_DAYS=7             # Cache expiration
ENABLE_EMBEDDING_CACHE_STATS=true      # Enable cache metrics

# Clustering Settings
CLUSTERING_MIN_PAGES=3                 # Minimum pages to cluster
CLUSTERING_MAX_CLUSTERS=10             # Maximum clusters per analysis
CLUSTERING_COHERENCE_THRESHOLD=0.7     # Minimum coherence score
CLUSTERING_ALGORITHM=k-means           # Algorithm choice

# Analysis Settings
SEMANTIC_SIMILARITY_THRESHOLD=0.8      # Similarity cutoff
UNIQUENESS_SCORE_THRESHOLD=0.8         # Description uniqueness
TAG_EXTRACTION_CONFIDENCE_THRESHOLD=0.6 # Tag confidence

# Feature Flags
ENABLE_SEMANTIC_FEATURES=false         # Main feature toggle
ENABLE_CLUSTERING_DEBUG=false          # Debug logging
```

### File Structure

```
├── server/
│   ├── config/
│   │   └── semantic-config.ts         # Configuration management
│   └── services/
│       └── redis-client.ts            # Redis service
├── scripts/
│   ├── setup-pgvector.sql             # pgvector setup
│   ├── setup-database.sh              # Automated DB setup
│   ├── create-vector-indexes.sql      # Vector indexes
│   └── test-environment-setup.ts      # Test suite
├── migrations/
│   └── 005_semantic_enhancements.sql  # Database migration
└── docs/
    ├── redis-hosting-comparison.md    # Redis hosting options
    └── SEMANTIC_SETUP_GUIDE.md        # This guide
```

---

## 🚨 Troubleshooting

### Common Issues

#### pgvector Extension Not Found

```bash
# Error: extension "vector" is not available
# Solution: Ensure you're using Neon PostgreSQL (supports pgvector)
psql $DATABASE_URL -c "CREATE EXTENSION vector;"
```

#### Redis Connection Failed

```bash
# Error: Redis connection timeout
# Check: Host, port, password configuration
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

#### OpenAI Rate Limits

```bash
# Error: Rate limit exceeded
# Solution: Reduce EMBEDDING_BATCH_SIZE and add delays
# Check your OpenAI usage dashboard
```

#### Vector Index Creation Failed

```bash
# Error: IVFFlat requires existing data
# Solution: Generate embeddings first, then create indexes
psql $DATABASE_URL -f scripts/create-vector-indexes.sql
```

### Debug Mode

Enable debug logging:

```bash
export ENABLE_CLUSTERING_DEBUG=true
export NODE_ENV=development
```

### Performance Issues

#### Slow Vector Operations

1. **Check indexes**: Ensure vector indexes exist
2. **Optimize queries**: Use proper similarity operators
3. **Monitor memory**: Vector operations are memory-intensive
4. **Consider HNSW**: For large datasets (>100k vectors)

#### Redis Cache Misses

1. **Check TTL**: Ensure cache isn't expiring too quickly
2. **Monitor memory**: Redis may be evicting data
3. **Hash consistency**: Verify content hashing algorithm

---

## 📊 Monitoring and Maintenance

### Cache Statistics

```bash
# View Redis cache performance
node -e "
const { EmbeddingCache } = require('./server/services/redis-client.ts');
EmbeddingCache.getStats(7).then(console.log);
"
```

### Database Monitoring

```sql
-- View embedding cache stats
SELECT * FROM embedding_cache_stats;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename LIKE '%embedding%' OR tablename LIKE '%semantic%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor vector index usage
SELECT * FROM pg_stat_user_indexes WHERE indexrelname LIKE '%embedding%';
```

### Cleanup Operations

```bash
# Clear expired embeddings
psql $DATABASE_URL -c "SELECT cleanup_expired_embeddings();"

# Clear Redis cache (use with caution)
node -e "const { EmbeddingCache } = require('./server/services/redis-client.ts'); EmbeddingCache.clearAll();"
```

---

## 🔄 Development Workflow

### Adding New Features

1. **Update configuration** in `semantic-config.ts`
2. **Add database migrations** if needed
3. **Update test suite** in `test-environment-setup.ts`
4. **Test locally** with debug mode enabled
5. **Run full test suite** before deployment

### Production Deployment

1. **Test environment setup** on staging
2. **Run migrations** on production database
3. **Monitor performance** after deployment
4. **Set up alerts** for cache misses and API limits

---

## 📞 Support

### Getting Help

1. **Run diagnostics**: `npm run test:environment`
2. **Check logs**: Enable debug mode for detailed logging
3. **Review configuration**: Use `getConfigSummary()` function

### Support Channels

- **Technical Issues**: Check error logs and performance metrics
- **Configuration**: Review environment variables and validation
- **Performance**: Monitor cache hit rates and query performance

---

**Setup Complete!** 🎉

Your environment is ready for semantic enhancement development. Run the test suite to verify everything is working correctly.
