// Semantic Enhancement Configuration
// Centralized configuration management for all semantic features

export interface SemanticConfig {
  // Redis Configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };

  // OpenAI Configuration
  openai: {
    model: string;
    dimensions: number;
    rateLimitPerMinute: number;
    batchSize: number;
  };

  // Cache Settings
  cache: {
    ttlDays: number;
    enableStats: boolean;
  };

  // Clustering Configuration
  clustering: {
    algorithm: 'k-means' | 'hierarchical' | 'dbscan';
    minPages: number;
    maxClusters: number;
    coherenceThreshold: number;
  };

  // Semantic Analysis
  analysis: {
    similarityThreshold: number;
    uniquenessThreshold: number;
    tagConfidenceThreshold: number;
  };

  // Feature Flags
  features: {
    enableSemanticFeatures: boolean;
    enableClusteringDebug: boolean;
  };
}

// Load configuration from environment variables
export const semanticConfig: SemanticConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },

  openai: {
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536'),
    rateLimitPerMinute: parseInt(process.env.EMBEDDING_RATE_LIMIT_PER_MINUTE || '3000'),
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100'),
  },

  cache: {
    ttlDays: parseInt(process.env.EMBEDDING_CACHE_TTL_DAYS || '7'),
    enableStats: process.env.ENABLE_EMBEDDING_CACHE_STATS === 'true',
  },

  clustering: {
    algorithm: (process.env.CLUSTERING_ALGORITHM as any) || 'k-means',
    minPages: parseInt(process.env.CLUSTERING_MIN_PAGES || '3'),
    maxClusters: parseInt(process.env.CLUSTERING_MAX_CLUSTERS || '10'),
    coherenceThreshold: parseFloat(process.env.CLUSTERING_COHERENCE_THRESHOLD || '0.7'),
  },

  analysis: {
    similarityThreshold: parseFloat(process.env.SEMANTIC_SIMILARITY_THRESHOLD || '0.8'),
    uniquenessThreshold: parseFloat(process.env.UNIQUENESS_SCORE_THRESHOLD || '0.8'),
    tagConfidenceThreshold: parseFloat(process.env.TAG_EXTRACTION_CONFIDENCE_THRESHOLD || '0.6'),
  },

  features: {
    enableSemanticFeatures: process.env.ENABLE_SEMANTIC_FEATURES === 'true',
    enableClusteringDebug: process.env.ENABLE_CLUSTERING_DEBUG === 'true',
  },
};

// Configuration validation
export function validateSemanticConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Redis validation
  if (!semanticConfig.redis.host) {
    errors.push('REDIS_HOST is required');
  }

  if (semanticConfig.redis.port < 1 || semanticConfig.redis.port > 65535) {
    errors.push('REDIS_PORT must be between 1 and 65535');
  }

  // OpenAI validation
  if (
    !['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'].includes(
      semanticConfig.openai.model
    )
  ) {
    errors.push('OPENAI_EMBEDDING_MODEL must be a valid OpenAI embedding model');
  }

  if (semanticConfig.openai.dimensions !== 1536 && semanticConfig.openai.dimensions !== 3072) {
    errors.push(
      'EMBEDDING_DIMENSIONS must be 1536 (text-embedding-3-small) or 3072 (text-embedding-3-large)'
    );
  }

  // Clustering validation
  if (semanticConfig.clustering.minPages < 2) {
    errors.push('CLUSTERING_MIN_PAGES must be at least 2');
  }

  if (semanticConfig.clustering.maxClusters < semanticConfig.clustering.minPages) {
    errors.push('CLUSTERING_MAX_CLUSTERS must be >= CLUSTERING_MIN_PAGES');
  }

  if (
    semanticConfig.clustering.coherenceThreshold < 0 ||
    semanticConfig.clustering.coherenceThreshold > 1
  ) {
    errors.push('CLUSTERING_COHERENCE_THRESHOLD must be between 0 and 1');
  }

  // Thresholds validation
  if (
    semanticConfig.analysis.similarityThreshold < 0 ||
    semanticConfig.analysis.similarityThreshold > 1
  ) {
    errors.push('SEMANTIC_SIMILARITY_THRESHOLD must be between 0 and 1');
  }

  if (
    semanticConfig.analysis.uniquenessThreshold < 0 ||
    semanticConfig.analysis.uniquenessThreshold > 1
  ) {
    errors.push('UNIQUENESS_SCORE_THRESHOLD must be between 0 and 1');
  }

  if (
    semanticConfig.analysis.tagConfidenceThreshold < 0 ||
    semanticConfig.analysis.tagConfidenceThreshold > 1
  ) {
    errors.push('TAG_EXTRACTION_CONFIDENCE_THRESHOLD must be between 0 and 1');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Configuration summary for logging
export function getConfigSummary(): string {
  return `
Semantic Enhancement Configuration:
- Redis: ${semanticConfig.redis.host}:${semanticConfig.redis.port} (DB ${semanticConfig.redis.db})
- OpenAI Model: ${semanticConfig.openai.model} (${semanticConfig.openai.dimensions}D)
- Cache TTL: ${semanticConfig.cache.ttlDays} days
- Clustering: ${semanticConfig.clustering.algorithm} (${semanticConfig.clustering.minPages}-${semanticConfig.clustering.maxClusters} clusters)
- Features Enabled: ${semanticConfig.features.enableSemanticFeatures}
- Debug Mode: ${semanticConfig.features.enableClusteringDebug}
  `.trim();
}

// Export individual config sections for convenience
export const {
  redis: redisConfig,
  openai: openaiConfig,
  cache: cacheConfig,
  clustering: clusteringConfig,
  analysis: analysisConfig,
  features: featureFlags,
} = semanticConfig;
