-- Migration 11: Create Course Enrollments Table
-- Description: Creates a junction table for students to enroll in courses
-- Run this after: 10_add_user_full_name.sql

-- Course enrollments table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  UNIQUE(user_id, course_id) -- Prevent duplicate enrollments
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.course_enrollments(course_id);

-- RLS Policies for course_enrollments

-- Enable RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Students can view their own enrollments
CREATE POLICY "Students can view own enrollments"
ON public.course_enrollments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Students can enroll themselves in courses
CREATE POLICY "Students can enroll in courses"
ON public.course_enrollments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'student'
  )
);

-- Students can unenroll themselves (update status)
CREATE POLICY "Students can update own enrollments"
ON public.course_enrollments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Instructors and TAs can view all enrollments for their courses
CREATE POLICY "Instructors/TAs can view course enrollments"
ON public.course_enrollments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.users u ON c.instructor_id = u.id
    WHERE c.id = course_enrollments.course_id
    AND u.id = auth.uid()
    AND u.role IN ('instructor', 'ta')
  )
);

-- Update courses table to add enrollment settings
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enrollment_code TEXT,
ADD COLUMN IF NOT EXISTS max_students INTEGER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Course enrollments table created successfully!';
  RAISE NOTICE 'Students can now enroll in courses';
END $$;
