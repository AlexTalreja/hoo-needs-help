-- Seed Data for Testing
-- Description: Creates sample data for development and testing
-- OPTIONAL: Only run this if you want test data

-- NOTE: This assumes you have created a test user in Supabase Auth
-- Replace 'YOUR_USER_ID_HERE' with your actual Supabase user ID

-- Insert a test instructor user
-- First, create a user in Supabase Auth dashboard, then run this:
INSERT INTO public.users (id, email, role) VALUES
  ('2298780b-5374-44f6-9cab-1fc59b74b48a', 'instructor@test.com', 'instructor')
ON CONFLICT (id) DO NOTHING;

-- Insert a test course
INSERT INTO public.courses (id, name, instructor_id, system_prompt) VALUES
  ('11111111-1111-1111-1111-111111111111',
   'CS 101: Introduction to Computer Science',
   '2298780b-5374-44f6-9cab-1fc59b74b48a',
   'You are a friendly and helpful teaching assistant for CS 101. You help students understand programming concepts in Python, explain algorithms clearly, and encourage learning through examples.')
ON CONFLICT (id) DO NOTHING;

-- Insert sample course document
INSERT INTO public.course_documents (id, course_id, file_name, storage_path, type, processing_status) VALUES
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   'syllabus.pdf',
   '11111111-1111-1111-1111-111111111111/syllabus.pdf',
   'pdf',
   'completed')
ON CONFLICT (id) DO NOTHING;

-- Insert a sample document chunk (without embedding for now)
INSERT INTO public.document_chunks (document_id, content, metadata) VALUES
  ('22222222-2222-2222-2222-222222222222',
   'Recursion is a programming technique where a function calls itself to solve a problem. Every recursive function needs a base case to stop the recursion and a recursive case that breaks down the problem.',
   '{"page": 3, "file_name": "syllabus.pdf", "type": "pdf"}')
ON CONFLICT DO NOTHING;

-- Insert a sample TA-verified answer (without embedding for now)
INSERT INTO public.ta_verified_answers (course_id, question, answer, created_by) VALUES
  ('11111111-1111-1111-1111-111111111111',
   'What is recursion?',
   'Recursion is when a function calls itself. It''s like looking in a mirror that reflects another mirror - you see copies going on forever until something stops it. In programming, we use a "base case" to stop the recursion. For example, calculating factorial: factorial(5) = 5 * factorial(4) = 5 * 4 * factorial(3), and so on until we reach factorial(1) which is just 1 (the base case).',
   '2298780b-5374-44f6-9cab-1fc59b74b48a')
ON CONFLICT DO NOTHING;

-- Insert sample QA logs
INSERT INTO public.qa_logs (course_id, user_id, question, ai_answer, sources_cited, rating, status) VALUES
  ('11111111-1111-1111-1111-111111111111',
   '2298780b-5374-44f6-9cab-1fc59b74b48a',
   'What is a loop?',
   'A loop is a programming construct that repeats a block of code multiple times. There are different types of loops like for loops and while loops.',
   '[{"type": "pdf", "file_name": "syllabus.pdf", "page": 2}]',
   1,
   'answered'),
  ('11111111-1111-1111-1111-111111111111',
   '2298780b-5374-44f6-9cab-1fc59b74b48a',
   'How do I debug my code?',
   'Debugging involves finding and fixing errors in your code. Common techniques include using print statements, debuggers, and reading error messages carefully.',
   '[{"type": "pdf", "file_name": "syllabus.pdf", "page": 5}]',
   -1,
   'flagged')
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Seed data inserted successfully!';
  RAISE NOTICE 'IMPORTANT: Replace 2298780b-5374-44f6-9cab-1fc59b74b48a with your actual user ID from Supabase Auth.';
END $$;
