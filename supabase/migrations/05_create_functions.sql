-- Migration 05: Create Database Functions
-- Description: Creates vector similarity search functions for RAG
-- Depends on: 03_create_vector_tables.sql

-- Function to match document chunks by vector similarity
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  filter_course_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  INNER JOIN public.course_documents cd ON dc.document_id = cd.id
  WHERE
    (filter_course_id IS NULL OR cd.course_id = filter_course_id)
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to match TA-verified answers by vector similarity
CREATE OR REPLACE FUNCTION match_verified_answers(
  query_embedding vector(768),
  match_count INT DEFAULT 2,
  filter_course_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tva.id,
    tva.question,
    tva.answer,
    1 - (tva.embedding <=> query_embedding) AS similarity
  FROM public.ta_verified_answers tva
  WHERE
    (filter_course_id IS NULL OR tva.course_id = filter_course_id)
    AND tva.embedding IS NOT NULL
  ORDER BY tva.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database functions created successfully!';
END $$;
