-- Migration 01: Enable pgvector Extension
-- Description: Enables the pgvector extension for vector similarity search
-- Run this first before creating any tables

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'pgvector extension enabled successfully!';
END $$;
