-- Migration 005: Semantic Enhancement Foundation
-- Adds pgvector support and semantic analysis tables for LLM.txt Mastery

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add semantic clustering columns to existing sitemapAnalysis table
ALTER TABLE sitemapAnalysis 
ADD COLUMN IF NOT EXISTS semantic_clusters JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS clustering_metadata JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS content_embeddings JSONB DEFAULT NULL;

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

-- Create indexes for embedding cache
CREATE INDEX IF NOT EXISTS idx_embedding_cache_content_hash ON embedding_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_expires_at ON embedding_cache(expires_at);

-- Create vector similarity index for embedding searches
-- Note: IVFFlat index requires data to exist, so we'll create it via the setup script
-- CREATE INDEX IF NOT EXISTS idx_embedding_cache_embedding ON embedding_cache 
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

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

-- Create indexes for page relationships
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

-- Create enhanced descriptions table for uniqueness tracking
CREATE TABLE IF NOT EXISTS enhanced_descriptions (
  id serial PRIMARY KEY,
  analysis_id integer NOT NULL REFERENCES sitemapAnalysis(id) ON DELETE CASCADE,
  url text NOT NULL,
  original_description text NOT NULL,
  enhanced_description text NOT NULL,
  uniqueness_score float NOT NULL DEFAULT 0.0,
  similarity_scores JSONB DEFAULT '{}'::jsonb, -- Similarity to other descriptions
  enhancement_method text DEFAULT 'ai', -- 'ai', 'template', 'hybrid'
  regeneration_count integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create indexes for enhanced descriptions
CREATE INDEX IF NOT EXISTS idx_enhanced_descriptions_analysis_id ON enhanced_descriptions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_descriptions_url ON enhanced_descriptions(url);
CREATE INDEX IF NOT EXISTS idx_enhanced_descriptions_uniqueness_score ON enhanced_descriptions(uniqueness_score);

-- Add comments for documentation
COMMENT ON TABLE embedding_cache IS 'Cache for OpenAI embeddings to reduce API costs and improve performance';
COMMENT ON TABLE content_clusters IS 'Stores semantic clustering results for analyzed websites';  
COMMENT ON TABLE semantic_tags IS 'AI-generated and rule-based semantic tags for pages';
COMMENT ON TABLE page_relationships IS 'Relationships between pages (hierarchical, semantic, thematic)';
COMMENT ON TABLE enhanced_descriptions IS 'Enhanced page descriptions with uniqueness validation';

COMMENT ON COLUMN sitemapAnalysis.semantic_clusters IS 'JSONB array of semantic clusters with page groupings';
COMMENT ON COLUMN sitemapAnalysis.clustering_metadata IS 'Clustering algorithm metadata and performance metrics';
COMMENT ON COLUMN sitemapAnalysis.content_embeddings IS 'Cached embeddings metadata for performance optimization';

-- Migration complete
INSERT INTO pg_stat_statements_info VALUES ('Migration 005: Semantic Enhancement Foundation completed at ' || now());