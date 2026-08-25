-- ============================================================
-- Personal Expense Tracker — Database Schema
-- Run this SQL in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create the expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  details TEXT NOT NULL CHECK (char_length(trim(details)) > 0),
  price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index on date for fast monthly filtering
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date DESC);

-- 3. Index on user_id for faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);

-- 4. Index on details for search queries
CREATE INDEX IF NOT EXISTS idx_expenses_details ON expenses USING gin (to_tsvector('english', details));

-- 5. Trigger to auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 6. Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies: Restrict access to authenticated user's own data
DROP POLICY IF EXISTS "Allow all operations" ON expenses;
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;

CREATE POLICY "Users can view their own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);
