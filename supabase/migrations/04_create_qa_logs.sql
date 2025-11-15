-- Migration 04: Create QA Logs Table
-- Description: Creates qa_logs table for question/answer history and analytics
-- Depends on: 02_create_core_tables.sql

-- QA logs table (for analytics and history)
CREATE TABLE IF NOT EXISTS public.qa_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  ai_answer TEXT NOT NULL,
  sources_cited JSONB DEFAULT '[]', -- Array of citation objects
  rating INTEGER CHECK (rating IN (-1, 1)), -- -1 for thumbs down, 1 for thumbs up
  status TEXT NOT NULL DEFAULT 'answered' CHECK (status IN ('answered', 'flagged', 'reviewed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'QA logs table created successfully!';
END $$;
