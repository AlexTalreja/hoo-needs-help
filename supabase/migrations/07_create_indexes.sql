-- Migration 07: Create Performance Indexes
-- Description: Creates indexes for faster queries and vector similarity search
-- Depends on: 02_create_core_tables.sql, 03_create_vector_tables.sql, 04_create_qa_logs.sql

-- ============================================
-- B-TREE INDEXES (for foreign keys and queries)
-- ============================================

-- Courses table indexes
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);

-- Course documents table indexes
CREATE INDEX IF NOT EXISTS idx_course_documents_course_id ON public.course_documents(course_id);
CREATE INDEX IF NOT EXISTS idx_course_documents_type ON public.course_documents(type);
CREATE INDEX IF NOT EXISTS idx_course_documents_status ON public.course_documents(processing_status);

-- Document chunks table indexes
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);

-- TA verified answers table indexes
CREATE INDEX IF NOT EXISTS idx_ta_verified_answers_course_id ON public.ta_verified_answers(course_id);
CREATE INDEX IF NOT EXISTS idx_ta_verified_answers_created_by ON public.ta_verified_answers(created_by);

-- QA logs table indexes
CREATE INDEX IF NOT EXISTS idx_qa_logs_course_id ON public.qa_logs(course_id);
CREATE INDEX IF NOT EXISTS idx_qa_logs_user_id ON public.qa_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_logs_status ON public.qa_logs(status);
CREATE INDEX IF NOT EXISTS idx_qa_logs_created_at ON public.qa_logs(created_at DESC);

-- ============================================
-- VECTOR INDEXES (for similarity search)
-- ============================================

-- IVFFLAT index for document chunks embeddings
-- lists = number of clusters (rule of thumb: rows/1000, min 10)
-- For small datasets, start with lists=100
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON public.document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- IVFFLAT index for TA verified answers embeddings
CREATE INDEX IF NOT EXISTS idx_ta_verified_answers_embedding
  ON public.ta_verified_answers
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- PARTIAL INDEXES (for specific queries)
-- ============================================

-- Index for flagged QA logs (for TA review queue)
CREATE INDEX IF NOT EXISTS idx_qa_logs_flagged
  ON public.qa_logs(course_id, created_at DESC)
  WHERE status = 'flagged';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Indexes created successfully!';
  RAISE NOTICE 'Note: Vector indexes may take a moment to build for large datasets.';
END $$;
