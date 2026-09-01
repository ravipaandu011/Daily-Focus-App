-- ==============================================================================
-- 🚀 DAILY FOCUS SUPABASE DATABASE SCHEMA & RLS POLICIES
-- Copy and run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create the `todos` Table
CREATE TABLE IF NOT EXISTS public.todos (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  section TEXT NOT NULL,
  date TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'none',
  tag TEXT,
  recurrence TEXT,
  subtasks JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  "order" NUMERIC,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Index on user_id & section & date for ultra-fast queries
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user_date ON public.todos(user_id, date);
CREATE INDEX IF NOT EXISTS idx_todos_user_section ON public.todos(user_id, section);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for User Isolation
DROP POLICY IF EXISTS "Users can select their own todos" ON public.todos;
CREATE POLICY "Users can select their own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own todos" ON public.todos;
CREATE POLICY "Users can insert their own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own todos" ON public.todos;
CREATE POLICY "Users can update their own todos"
  ON public.todos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;
CREATE POLICY "Users can delete their own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Enable Realtime Sync on `todos`
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- 6. Create `custom_categories` Table (for User Created Tabs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  gradient JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_categories_user_id ON public.custom_categories(user_id);

ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own categories" ON public.custom_categories;
CREATE POLICY "Users can select their own categories"
  ON public.custom_categories FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own categories" ON public.custom_categories;
CREATE POLICY "Users can insert their own categories"
  ON public.custom_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own categories" ON public.custom_categories;
CREATE POLICY "Users can update their own categories"
  ON public.custom_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own categories" ON public.custom_categories;
CREATE POLICY "Users can delete their own categories"
  ON public.custom_categories FOR DELETE
  USING (auth.uid() = user_id);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_categories;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
