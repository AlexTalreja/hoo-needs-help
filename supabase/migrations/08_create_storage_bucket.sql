-- Migration 08: Create Storage Bucket for Course Documents
-- Description: Creates Supabase Storage bucket for PDFs, videos, and transcripts
-- Run this after: 07_create_indexes.sql

-- Create storage bucket (public for serving files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-documents', 'course-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course-documents bucket

-- 1. Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-documents');

-- 2. Allow authenticated users to read files
CREATE POLICY IF NOT EXISTS "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-documents');

-- 3. Allow public reads (for serving files via URLs)
CREATE POLICY IF NOT EXISTS "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-documents');

-- 4. Allow authenticated users to update files
CREATE POLICY IF NOT EXISTS "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-documents');

-- 5. Allow TAs and instructors to delete files
CREATE POLICY IF NOT EXISTS "Allow TAs/instructors to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-documents'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('ta', 'instructor')
  )
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Storage bucket and policies created successfully!';
  RAISE NOTICE 'Bucket: course-documents (public)';
END $$;
