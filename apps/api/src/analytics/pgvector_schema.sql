-- apps/api/src/analytics/pgvector_schema.sql
-- PostgreSQL / pgvector Trajectory DDL for 12-dimensional occupancy vectors.
--
-- Each row represents a completed screening's hourly occupancy trajectory,
-- enabling cosine-similarity nearest-neighbor retrieval against historical
-- blockbuster drop patterns.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS showtime_trajectories (
    showtime_id VARCHAR(64) PRIMARY KEY,
    movie_title VARCHAR(128) NOT NULL,
    format VARCHAR(32) NOT NULL,
    occupancy_trajectory vector(12) NOT NULL,  -- 12 hourly occupancy snapshots
    total_drops INT NOT NULL DEFAULT 0,
    final_churn_rate FLOAT NOT NULL DEFAULT 0.0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW Vector Index for sub-millisecond cosine distance retrieval.
-- m=16 balances recall vs memory; ef_construction=64 gives high index quality.
CREATE INDEX IF NOT EXISTS idx_trajectories_hnsw
ON showtime_trajectories USING hnsw (occupancy_trajectory vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ---------------------------------------------------------------------------
-- Analytical Retrieval Query (reference):
-- Finds the 5 most similar historical screening trajectories
-- ---------------------------------------------------------------------------
-- SELECT
--     movie_title,
--     format,
--     final_churn_rate,
--     total_drops,
--     1 - (occupancy_trajectory <=> :query_vector) AS cosine_similarity
-- FROM showtime_trajectories
-- WHERE format = :target_format
-- ORDER BY occupancy_trajectory <=> :query_vector ASC
-- LIMIT 5;
