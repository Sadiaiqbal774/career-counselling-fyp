-- Run this script in the Supabase SQL editor.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  academic_level TEXT NOT NULL DEFAULT 'Intermediate',
  school TEXT NOT NULL DEFAULT '',
  marks TEXT NOT NULL DEFAULT '',
  intermediate_marks TEXT NOT NULL DEFAULT '',
  intermediate_group TEXT NOT NULL DEFAULT 'Pre-Engineering',
  entry_test TEXT NOT NULL DEFAULT 'ECAT',
  entry_test_score TEXT NOT NULL DEFAULT '',
  preferred_field TEXT NOT NULL DEFAULT 'Technology',
  interests TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intermediate_marks TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intermediate_group TEXT NOT NULL DEFAULT 'Pre-Engineering';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS entry_test TEXT NOT NULL DEFAULT 'ECAT';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS entry_test_score TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation TEXT NOT NULL,
  highest_category TEXT,
  top_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.recommendations;
CREATE POLICY "Users can view their own recommendations"
  ON public.recommendations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recommendations" ON public.recommendations;
CREATE POLICY "Users can insert their own recommendations"
  ON public.recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
