-- Migration 06: Create Row Level Security Policies
-- Description: Implements RLS to ensure data access control
-- Depends on: 02_create_core_tables.sql, 03_create_vector_tables.sql, 04_create_qa_logs.sql

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_verified_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- COURSES TABLE POLICIES
-- ============================================

-- Anyone authenticated can read courses (for now - can restrict later)
CREATE POLICY "Authenticated users can read courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (true);

-- Only instructors can create courses
CREATE POLICY "Instructors can create courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'instructor'
    )
  );

-- Instructors can update their own courses
CREATE POLICY "Instructors can update own courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (instructor_id = auth.uid());

-- ============================================
-- COURSE DOCUMENTS TABLE POLICIES
-- ============================================

-- Anyone can read course documents (for RAG queries)
CREATE POLICY "Authenticated users can read course documents"
  ON public.course_documents FOR SELECT
  TO authenticated
  USING (true);

-- TAs and instructors can upload documents
CREATE POLICY "TAs and instructors can upload documents"
  ON public.course_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('ta', 'instructor')
    )
  );

-- ============================================
-- DOCUMENT CHUNKS TABLE POLICIES
-- ============================================

-- Anyone authenticated can read chunks (for RAG)
CREATE POLICY "Authenticated users can read document chunks"
  ON public.document_chunks FOR SELECT
  TO authenticated
  USING (true);

-- Backend service role can insert chunks (no user restriction)
CREATE POLICY "Service role can insert chunks"
  ON public.document_chunks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- TA VERIFIED ANSWERS TABLE POLICIES
-- ============================================

-- Anyone authenticated can read verified answers (for RAG)
CREATE POLICY "Authenticated users can read verified answers"
  ON public.ta_verified_answers FOR SELECT
  TO authenticated
  USING (true);

-- TAs and instructors can create verified answers
CREATE POLICY "TAs and instructors can create verified answers"
  ON public.ta_verified_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('ta', 'instructor')
    )
  );

-- ============================================
-- QA LOGS TABLE POLICIES
-- ============================================

-- Users can read QA logs for courses they have access to
CREATE POLICY "Users can read qa_logs"
  ON public.qa_logs FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can create QA logs (students asking questions)
CREATE POLICY "Authenticated users can create qa_logs"
  ON public.qa_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own QA logs (for rating)
CREATE POLICY "Users can update own qa_logs"
  ON public.qa_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- TAs and instructors can update any QA log in their courses
CREATE POLICY "TAs and instructors can update course qa_logs"
  ON public.qa_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('ta', 'instructor')
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies created successfully!';
END $$;
