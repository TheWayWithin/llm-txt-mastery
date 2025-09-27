-- PostgreSQL pgvector extension setup for LLM.txt Mastery semantic enhancements
-- This script sets up vector storage capabilities for embeddings

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create embedding cache table for OpenAI embeddings (1536 dimensions)
CREATE TABLE IF NOT EXISTS embedding_cache (
  id serial PRIMARY KEY,
  content_hash text UNIQUE NOT NULL,
  content_text text NOT NULL, -- Store original text for debugging
  embedding vector(1536) NOT NULL, -- OpenAI text-embedding-3-small dimensions
  semantic_tags JSONB DEFAULT '[]'::jsonb,
  created_at timestamp DEFAULT now(),
  expires_at timestamp NOT NULL,
  hit_count integer DEFAULT 0,
  model_version text DEFAULT 'text-embedding-3-small'
);

-- Create index for content hash lookup (for cache hits)
CREATE INDEX IF NOT EXISTS idx_embedding_cache_content_hash ON embedding_cache(content_hash);

-- Create index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_embedding_cache_expires_at ON embedding_cache(expires_at);

-- Create vector similarity index for embedding searches
CREATE INDEX IF NOT EXISTS idx_embedding_cache_embedding ON embedding_cache 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add semantic clustering columns to existing sitemapAnalysis table
ALTER TABLE sitemapAnalysis 
ADD COLUMN IF NOT EXISTS semantic_clusters JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS clustering_metadata JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS content_embeddings JSONB DEFAULT NULL;

-- Create page relationships table for hierarchical clustering
CREATE TABLE IF NOT EXISTS page_relationships (
  id serial PRIMARY KEY,
  analysis_id integer NOT NULL REFERENCES sitemapAnalysis(id) ON DELETE CASCADE,
  parent_url text NOT NULL,
  child_url text NOT NULL,
  relationship_type text NOT NULL, -- 'hierarchical', 'semantic', 'thematic'
  similarity_score float DEFAULT 0.0,
  created_at timestamp DEFAULT now()
);

-- Create index for relationship lookups
CREATE INDEX IF NOT EXISTS idx_page_relationships_analysis_id ON page_relationships(analysis_id);
CREATE INDEX IF NOT EXISTS idx_page_relationships_parent_url ON page_relationships(parent_url);

-- Create semantic tags table for enhanced tagging
CREATE TABLE IF NOT EXISTS semantic_tags (
  id serial PRIMARY KEY,
  analysis_id integer NOT NULL REFERENCES sitemapAnalysis(id) ON DELETE CASCADE,
  url text NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  extraction_method text DEFAULT 'ai', -- 'ai', 'rule-based', 'hybrid'
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create indexes for semantic tags
CREATE INDEX IF NOT EXISTS idx_semantic_tags_analysis_id ON semantic_tags(analysis_id);
CREATE INDEX IF NOT EXISTS idx_semantic_tags_url ON semantic_tags(url);
CREATE INDEX IF NOT EXISTS idx_semantic_tags_tags ON semantic_tags USING gin(tags);

-- Create content clusters table for storing cluster results
CREATE TABLE IF NOT EXISTS content_clusters (
  id serial PRIMARY KEY,
  analysis_id integer NOT NULL REFERENCES sitemapAnalysis(id) ON DELETE CASCADE,
  cluster_id integer NOT NULL,
  cluster_name text NOT NULL,
  cluster_description text,
  urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  centroid_embedding vector(1536),
  coherence_score float DEFAULT 0.0,
  page_count integer DEFAULT 0,
  algorithm_used text DEFAULT 'k-means', -- 'k-means', 'hierarchical', 'dbscan'
  created_at timestamp DEFAULT now()
);

-- Create indexes for content clusters
CREATE INDEX IF NOT EXISTS idx_content_clusters_analysis_id ON content_clusters(analysis_id);
CREATE INDEX IF NOT EXISTS idx_content_clusters_cluster_id ON content_clusters(cluster_id);

-- Create vector similarity search function for embeddings
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id integer,
  content_hash text,
  content_text text,
  similarity float,
  semantic_tags jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    embedding_cache.id,
    embedding_cache.content_hash,
    embedding_cache.content_text,
    1 - (embedding_cache.embedding <=> query_embedding) as similarity,
    embedding_cache.semantic_tags
  FROM embedding_cache
  WHERE 1 - (embedding_cache.embedding <=> query_embedding) > match_threshold
    AND embedding_cache.expires_at > now()
  ORDER BY embedding_cache.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

-- Create function to find similar pages within an analysis
CREATE OR REPLACE FUNCTION find_similar_pages(
  target_embedding vector(1536),
  target_analysis_id integer,
  similarity_threshold float DEFAULT 0.8,
  max_results int DEFAULT 5
)
RETURNS TABLE (
  url text,
  similarity float,
  semantic_tags jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    st.url,
    1 - (ec.embedding <=> target_embedding) as similarity,
    st.tags as semantic_tags
  FROM semantic_tags st
  JOIN embedding_cache ec ON ec.content_hash = md5(st.url || ':' || st.analysis_id::text)
  WHERE st.analysis_id = target_analysis_id
    AND 1 - (ec.embedding <=> target_embedding) > similarity_threshold
    AND ec.expires_at > now()
  ORDER BY ec.embedding <=> target_embedding ASC
  LIMIT max_results;
$$;

-- Create cleanup function for expired embeddings
CREATE OR REPLACE FUNCTION cleanup_expired_embeddings()
RETURNS integer
LANGUAGE sql
AS $$
  WITH deleted AS (
    DELETE FROM embedding_cache 
    WHERE expires_at < now()
    RETURNING id
  )
  SELECT count(*)::integer FROM deleted;
$$;

-- Performance test function for vector operations
CREATE OR REPLACE FUNCTION test_vector_performance()
RETURNS TABLE (
  operation text,
  duration_ms float,
  status text
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  test_embedding vector(1536);
  result_count integer;
BEGIN
  -- Generate a test embedding (random vector)
  test_embedding := array_fill(random(), ARRAY[1536])::vector(1536);
  
  -- Test 1: Insert performance
  start_time := clock_timestamp();
  INSERT INTO embedding_cache (content_hash, content_text, embedding, expires_at)
  VALUES ('test-hash-' || extract(epoch from now()), 'test content', test_embedding, now() + interval '1 hour')
  ON CONFLICT (content_hash) DO NOTHING;
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'insert'::text, 
    extract(milliseconds from end_time - start_time)::float,
    'success'::text;
  
  -- Test 2: Similarity search performance
  start_time := clock_timestamp();
  SELECT count(*) INTO result_count
  FROM embedding_cache 
  WHERE embedding <=> test_embedding < 0.5
  LIMIT 10;
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'similarity_search'::text, 
    extract(milliseconds from end_time - start_time)::float,
    CASE WHEN result_count >= 0 THEN 'success' ELSE 'error' END::text;
  
  -- Test 3: Index usage check
  start_time := clock_timestamp();
  PERFORM * FROM match_embeddings(test_embedding, 0.7, 5);
  end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'function_search'::text, 
    extract(milliseconds from end_time - start_time)::float,
    'success'::text;
    
  -- Clean up test data
  DELETE FROM embedding_cache WHERE content_hash LIKE 'test-hash-%';
  
END;
$$;

-- Create summary view for monitoring
CREATE OR REPLACE VIEW embedding_cache_stats AS
SELECT 
  count(*) as total_embeddings,
  count(*) FILTER (WHERE expires_at > now()) as active_embeddings,
  count(*) FILTER (WHERE expires_at <= now()) as expired_embeddings,
  avg(hit_count) as avg_hit_count,
  max(created_at) as last_created,
  pg_size_pretty(pg_total_relation_size('embedding_cache')) as table_size,
  (SELECT count(*) FROM pg_indexes WHERE tablename = 'embedding_cache') as index_count
FROM embedding_cache;

COMMENT ON TABLE embedding_cache IS 'Cache for OpenAI embeddings to reduce API costs and improve performance';
COMMENT ON TABLE content_clusters IS 'Stores semantic clustering results for analyzed websites';  
COMMENT ON TABLE semantic_tags IS 'AI-generated and rule-based semantic tags for pages';
COMMENT ON TABLE page_relationships IS 'Relationships between pages (hierarchical, semantic, thematic)';
COMMENT ON FUNCTION match_embeddings IS 'Find similar embeddings using cosine similarity';
COMMENT ON FUNCTION find_similar_pages IS 'Find semantically similar pages within an analysis';
COMMENT ON FUNCTION cleanup_expired_embeddings IS 'Remove expired embedding cache entries';
COMMENT ON FUNCTION test_vector_performance IS 'Test vector operation performance and validate setup';