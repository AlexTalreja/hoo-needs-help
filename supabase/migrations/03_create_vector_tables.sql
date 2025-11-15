-- Migration 03: Create Vector Tables
-- Description: Creates document_chunks and ta_verified_answers with vector embeddings
-- Depends on: 01_enable_pgvector.sql, 02_create_core_tables.sql

-- Document chunks table (with vector embeddings)
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.course_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(768), -- text-embedding-004 produces 768-dimensional vectors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TA verified answers table (with vector embeddings for questions)
CREATE TABLE IF NOT EXISTS public.ta_verified_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  embedding vector(768), -- embedding of the question for similarity search
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at trigger for ta_verified_answers
CREATE TRIGGER update_ta_verified_answers_updated_at BEFORE UPDATE ON public.ta_verified_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Vector tables created successfully!';
END $$;
