-- ============================================================
-- Migration: Add Secure Authentication & Row Level Security
-- Run this SQL in Supabase SQL Editor
-- ============================================================

-- 1. Clear existing unauthenticated data (since this is a dev DB and existing data has no owner)
DELETE FROM expenses;

-- 2. Add user_id column, referencing the built-in auth.users table
ALTER TABLE expenses 
  ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Create index for faster querying by user
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);

-- 4. Update Row Level Security (RLS) Policies
-- First, drop the insecure public policy
DROP POLICY IF EXISTS "Allow all operations" ON expenses;

-- Create secure policies that only allow users to access their own data
-- Read policy
CREATE POLICY "Users can view their own expenses" 
  ON expenses FOR SELECT 
  USING (auth.uid() = user_id);

-- Insert policy
CREATE POLICY "Users can insert their own expenses" 
  ON expenses FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Update policy
CREATE POLICY "Users can update their own expenses" 
  ON expenses FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Delete policy
CREATE POLICY "Users can delete their own expenses" 
  ON expenses FOR DELETE 
  USING (auth.uid() = user_id);
