-- Migration 12: Add confidence_score to qa_logs
-- Description: Adds a confidence_score column to track AI answer confidence (0.0-1.0)
-- Depends on: 04_create_qa_logs.sql

-- Add confidence_score column to qa_logs table
ALTER TABLE public.qa_logs
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);

-- Add comment explaining the column
COMMENT ON COLUMN public.qa_logs.confidence_score IS 'AI confidence score (0.0-1.0) indicating how confident the model is in its answer. Conservative estimates preferred.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'confidence_score column added to qa_logs table successfully!';
END $$;
