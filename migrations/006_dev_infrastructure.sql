-- Migration: Add development infrastructure tables for semantic features
-- Created: 2025-01-30
-- Description: Add A/B testing, monitoring, and benchmarking tables

-- A/B Testing Tables
CREATE TABLE IF NOT EXISTS ab_experiments (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    feature_flag text,
    status text NOT NULL DEFAULT 'draft', -- draft, running, paused, completed
    traffic_allocation decimal(5,2) NOT NULL DEFAULT 100.00, -- 0-100%
    variants jsonb NOT NULL,
    targeting_rules jsonb,
    metrics jsonb NOT NULL,
    start_date timestamp,
    end_date timestamp,
    winner_variant text,
    confidence decimal(5,2),
    created_by text NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ab_experiment_assignments (
    id serial PRIMARY KEY,
    experiment_id integer NOT NULL REFERENCES ab_experiments(id),
    user_id text,
    session_id text,
    variant text NOT NULL,
    assigned_at timestamp DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb
);

CREATE TABLE IF NOT EXISTS ab_experiment_events (
    id serial PRIMARY KEY,
    experiment_id integer NOT NULL REFERENCES ab_experiments(id),
    assignment_id integer REFERENCES ab_experiment_assignments(id),
    user_id text,
    session_id text,
    variant text NOT NULL,
    event_type text NOT NULL, -- impression, conversion, click, etc.
    event_value decimal(10,2), -- Optional numeric value
    event_properties jsonb, -- Additional event data
    timestamp timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Semantic Monitoring Tables
CREATE TABLE IF NOT EXISTS semantic_logs (
    id serial PRIMARY KEY,
    user_id text,
    session_id text,
    feature text NOT NULL, -- clustering, semantic_tags, enhanced_descriptions, etc.
    operation text NOT NULL, -- generate_embeddings, cluster_content, enhance_descriptions, etc.
    status text NOT NULL, -- success, error, partial_success
    duration integer, -- milliseconds
    input_size integer, -- number of pages/items processed
    output_size integer, -- number of results generated
    token_usage integer, -- OpenAI tokens consumed
    cost decimal(8,4), -- Cost in USD
    error_message text,
    metadata jsonb,
    timestamp timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS semantic_performance_metrics (
    id serial PRIMARY KEY,
    feature text NOT NULL,
    operation text NOT NULL,
    metric text NOT NULL, -- response_time, throughput, error_rate, cache_hit_rate
    value decimal(10,4) NOT NULL,
    unit text NOT NULL, -- ms, requests/sec, percentage, etc.
    aggregation_type text NOT NULL, -- avg, max, min, count, rate
    time_window text NOT NULL, -- 1m, 5m, 1h, 1d
    timestamp timestamp DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb
);

CREATE TABLE IF NOT EXISTS semantic_feature_usage (
    id serial PRIMARY KEY,
    feature text NOT NULL,
    date text NOT NULL, -- YYYY-MM-DD
    hour integer, -- 0-23, null for daily aggregates
    total_requests integer NOT NULL DEFAULT 0,
    successful_requests integer NOT NULL DEFAULT 0,
    failed_requests integer NOT NULL DEFAULT 0,
    avg_duration decimal(8,2),
    total_token_usage integer NOT NULL DEFAULT 0,
    total_cost decimal(10,4) NOT NULL DEFAULT 0,
    unique_users integer NOT NULL DEFAULT 0,
    cache_hit_rate decimal(5,2),
    UNIQUE(feature, date, hour)
);

-- Performance Benchmarking Tables
CREATE TABLE IF NOT EXISTS performance_benchmarks (
    id serial PRIMARY KEY,
    benchmark_suite text NOT NULL, -- 'clustering', 'embeddings', 'database', 'integration'
    benchmark_name text NOT NULL,
    version text NOT NULL DEFAULT '1.0',
    environment text NOT NULL, -- 'development', 'staging', 'production'
    duration integer NOT NULL, -- milliseconds
    throughput decimal(10,2), -- operations per second
    memory_usage integer, -- bytes
    cpu_usage decimal(5,2), -- percentage
    error_count integer NOT NULL DEFAULT 0,
    success_count integer NOT NULL DEFAULT 0,
    metadata jsonb,
    results jsonb,
    passed boolean NOT NULL DEFAULT true,
    run_by text,
    run_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX IF NOT EXISTS idx_ab_experiment_assignments_experiment_id ON ab_experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiment_assignments_user_id ON ab_experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiment_assignments_session_id ON ab_experiment_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiment_events_experiment_id ON ab_experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiment_events_timestamp ON ab_experiment_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_semantic_logs_feature ON semantic_logs(feature);
CREATE INDEX IF NOT EXISTS idx_semantic_logs_timestamp ON semantic_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_semantic_logs_user_id ON semantic_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_semantic_performance_metrics_feature ON semantic_performance_metrics(feature);
CREATE INDEX IF NOT EXISTS idx_semantic_performance_metrics_timestamp ON semantic_performance_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_semantic_feature_usage_feature_date ON semantic_feature_usage(feature, date);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_suite_name ON performance_benchmarks(benchmark_suite, benchmark_name);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_run_at ON performance_benchmarks(run_at);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_environment ON performance_benchmarks(environment);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ab_assignments_experiment_user ON ab_experiment_assignments(experiment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_experiment_variant ON ab_experiment_events(experiment_id, variant);
CREATE INDEX IF NOT EXISTS idx_semantic_logs_feature_status_timestamp ON semantic_logs(feature, status, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_suite_environment_run_at ON performance_benchmarks(benchmark_suite, environment, run_at);

-- Add comments for documentation
COMMENT ON TABLE ab_experiments IS 'A/B testing experiment configurations';
COMMENT ON TABLE ab_experiment_assignments IS 'User assignments to experiment variants';
COMMENT ON TABLE ab_experiment_events IS 'A/B testing event tracking';
COMMENT ON TABLE semantic_logs IS 'Semantic feature operation logs';
COMMENT ON TABLE semantic_performance_metrics IS 'Real-time performance metrics';
COMMENT ON TABLE semantic_feature_usage IS 'Aggregated feature usage statistics';
COMMENT ON TABLE performance_benchmarks IS 'Performance benchmark results';

-- Add update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ab_experiments_updated_at 
    BEFORE UPDATE ON ab_experiments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Development infrastructure migration completed successfully';
    RAISE NOTICE 'Added tables: A/B testing (3), Semantic monitoring (3), Performance benchmarks (1)';
    RAISE NOTICE 'Created indexes and triggers for optimal performance';
END
$$;