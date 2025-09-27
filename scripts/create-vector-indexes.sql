-- Create vector indexes after initial data is loaded
-- This script should be run after embeddings are populated

-- Create vector similarity index for embedding cache (IVFFlat)
-- Only create if table has data (IVFFlat requires existing vectors)
DO $$
BEGIN
  -- Check if embedding_cache has any data
  IF (SELECT count(*) FROM embedding_cache) > 0 THEN
    -- Create IVFFlat index for cosine similarity
    CREATE INDEX IF NOT EXISTS idx_embedding_cache_embedding_ivfflat 
    ON embedding_cache 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);
    
    RAISE NOTICE 'Created IVFFlat index on embedding_cache with % vectors', (SELECT count(*) FROM embedding_cache);
  ELSE
    RAISE NOTICE 'Skipping IVFFlat index creation - no vectors found in embedding_cache';
  END IF;
END
$$;

-- Create HNSW index for content_clusters centroid embeddings
DO $$
BEGIN
  -- Check if content_clusters has any data with embeddings
  IF (SELECT count(*) FROM content_clusters WHERE centroid_embedding IS NOT NULL) > 0 THEN
    -- Create HNSW index for better performance with smaller datasets
    CREATE INDEX IF NOT EXISTS idx_content_clusters_centroid_hnsw 
    ON content_clusters 
    USING hnsw (centroid_embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);
    
    RAISE NOTICE 'Created HNSW index on content_clusters with % centroids', 
                 (SELECT count(*) FROM content_clusters WHERE centroid_embedding IS NOT NULL);
  ELSE
    RAISE NOTICE 'Skipping HNSW index creation - no centroid embeddings found in content_clusters';
  END IF;
END
$$;

-- Analyze tables for better query planning
ANALYZE embedding_cache;
ANALYZE content_clusters;
ANALYZE semantic_tags;
ANALYZE page_relationships;
ANALYZE enhanced_descriptions;

-- Display index information
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('embedding_cache', 'content_clusters', 'semantic_tags', 'page_relationships', 'enhanced_descriptions')
ORDER BY tablename, indexname;