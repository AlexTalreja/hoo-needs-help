-- Migration 10: Add full_name to users table
-- Description: Adds full_name column to users table for better user profiles
-- Run this after: 09_create_auth_trigger.sql

-- Add full_name column if it doesn't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update the handle_new_user function to use the new column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Added full_name column to users table successfully!';
END $$;
